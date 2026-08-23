import {
  LeaderboardEntry,
  Player,
  Prediction,
  PredictionResult,
  PublicQuestion,
  QuestionResult,
  ResultSource,
  Vote,
  VoteOption,
} from "@/lib/types";
import { seedQuestions } from "@/lib/store/seedQuestions";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { GameFlowError } from "@/lib/store/errors";

/**
 * Real, persistent data layer backed by Supabase Postgres (see
 * supabase/schema.sql + supabase/functions.sql). Same exported function
 * signatures as localFileStore.ts, on purpose — src/lib/store/index.ts picks
 * between the two, and nothing else in the app needs to know which is active.
 *
 * Every query here runs through a request-scoped client bound to the calling
 * player's own session cookie, so Postgres Row Level Security — not this
 * file — is what actually decides what can be read or written. Reads/writes
 * that must cross player boundaries (aggregating everyone's votes, freezing
 * a score once) go through SECURITY DEFINER RPC functions that derive the
 * acting user from auth.uid(), never from a value this file supplies.
 *
 * `seedQuestions` is imported for exactly one purpose: figuring out which
 * question is "today's" and what the next one is (src/lib/dailyChallenge.ts
 * uses the same array the same way). It is never used as question *content*
 * here — every question's text/options/emoji comes from the `questions`
 * table, which supabase/seed.sql populates from this same list.
 */

// Postgres error codes (see https://www.postgresql.org/docs/current/errcodes-appendix.html)
const PG_UNIQUE_VIOLATION = "23505";
const PG_FOREIGN_KEY_VIOLATION = "23503";
const PG_RLS_VIOLATION = "42501";

interface ProfileRow {
  id: string;
  username: string;
  current_streak: number;
  longest_streak: number;
  last_played_date: string | null;
  total_score: number;
  games_played: number;
  created_at: string;
}

function mapProfile(row: ProfileRow): Player {
  return {
    id: row.id,
    username: row.username,
    currentStreak: row.current_streak,
    longestStreak: row.longest_streak,
    lastPlayedDate: row.last_played_date,
    totalScore: row.total_score,
    gamesPlayed: row.games_played,
    createdAt: row.created_at,
  };
}

export async function getPublicQuestionById(questionId: string): Promise<PublicQuestion> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("questions")
    .select("id, text, category, option_a, option_b, emoji_a, emoji_b, text_it, option_a_it, option_b_it")
    .eq("id", questionId)
    .eq("status", "published")
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new GameFlowError(`Unknown question: ${questionId}`, "QUESTION_NOT_FOUND");
  }

  // Ordering-only lookup, not a content source — see file header.
  const dailyNumber = seedQuestions.findIndex((q) => q.id === questionId) + 1;

  return {
    id: data.id,
    dailyNumber: dailyNumber > 0 ? dailyNumber : 1,
    text: data.text,
    category: data.category,
    optionA: data.option_a,
    optionB: data.option_b,
    emojiA: data.emoji_a,
    emojiB: data.emoji_b,
    textIt: data.text_it,
    optionAIt: data.option_a_it,
    optionBIt: data.option_b_it,
  };
}

/**
 * The full pool of playable question ids, for randomized "next question"
 * selection (see src/lib/questionSelection.ts). Content itself is never
 * returned here — just enough to pick from. Reads through the same public
 * "published questions are publicly readable" RLS policy as
 * getPublicQuestionById above, so no RPC is needed.
 */
export async function listQuestionIds(): Promise<{ id: string }[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("questions")
    .select("id")
    .eq("status", "published");

  if (error) throw error;
  return (data ?? []) as { id: string }[];
}

export async function getOrCreatePlayer(playerId: string): Promise<Player> {
  // playerId is intentionally unused for the query itself — the RPC derives
  // the acting player from auth.uid() on the caller's own session, which is
  // the authoritative identity. The parameter only exists so this function's
  // signature matches localFileStore.ts's (see src/lib/store/index.ts).
  void playerId;
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("get_or_create_profile").single<ProfileRow>();
  if (error) throw error;
  return mapProfile(data);
}

interface CrowdResultRow {
  votes_a: number;
  votes_b: number;
  total_votes: number;
  actual_percentage_a: number | null;
}

/**
 * The real crowd tally, straight from the `votes` table — never blended
 * with or falling back to a seeded/demo number. With 0 real votes this
 * returns actualPercentageA: 0 (never invoked with 0 votes in practice,
 * since getPredictionResult only computes a result after the caller's own
 * vote is already recorded, guaranteeing totalVotes >= 1).
 */
export async function getQuestionResult(questionId: string): Promise<QuestionResult> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .rpc("get_crowd_result", { p_question_id: questionId })
    .single<CrowdResultRow>();
  if (error) throw error;

  return {
    resultSource: "live",
    actualPercentageA: data.actual_percentage_a ?? 0,
    totalVotes: data.total_votes,
    votesA: data.votes_a,
    votesB: data.votes_b,
  };
}

interface PredictionRow {
  id: string;
  question_id: string;
  player_id: string;
  predicted_percentage_a: number;
  score: number | null;
  actual_percentage_snapshot: number | null;
  result_source_snapshot: ResultSource | null;
  created_at: string;
}

function mapPrediction(row: PredictionRow): Prediction {
  return {
    id: row.id,
    questionId: row.question_id,
    playerId: row.player_id,
    predictedPercentageA: row.predicted_percentage_a,
    createdAt: row.created_at,
    score: row.score ?? undefined,
    actualPercentageSnapshot: row.actual_percentage_snapshot ?? undefined,
    resultSourceSnapshot: row.result_source_snapshot ?? undefined,
  };
}

export async function recordPrediction(
  questionId: string,
  playerId: string,
  predictedPercentageA: number
): Promise<Prediction> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("predictions")
    .insert({
      question_id: questionId,
      player_id: playerId,
      predicted_percentage_a: predictedPercentageA,
    })
    .select()
    .single<PredictionRow>();

  if (error) {
    if (error.code === PG_UNIQUE_VIOLATION) {
      throw new GameFlowError("You already predicted this question.", "ALREADY_PREDICTED");
    }
    if (error.code === PG_FOREIGN_KEY_VIOLATION) {
      throw new GameFlowError(`Unknown question: ${questionId}`, "QUESTION_NOT_FOUND");
    }
    throw error;
  }

  return mapPrediction(data);
}

interface VoteRow {
  id: string;
  question_id: string;
  player_id: string;
  selected_option: VoteOption;
  created_at: string;
}

export async function recordVote(
  questionId: string,
  playerId: string,
  selectedOption: VoteOption
): Promise<Vote> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("votes")
    .insert({
      question_id: questionId,
      player_id: playerId,
      selected_option: selectedOption,
    })
    .select()
    .single<VoteRow>();

  if (error) {
    if (error.code === PG_UNIQUE_VIOLATION) {
      throw new GameFlowError("You already voted on this question.", "ALREADY_VOTED");
    }
    // The insert's own RLS policy requires a matching prediction to already
    // exist (supabase/schema.sql) — this is what fires when it doesn't.
    if (error.code === PG_RLS_VIOLATION) {
      throw new GameFlowError("Lock in a prediction before voting.", "PREDICT_BEFORE_VOTE");
    }
    if (error.code === PG_FOREIGN_KEY_VIOLATION) {
      throw new GameFlowError(`Unknown question: ${questionId}`, "QUESTION_NOT_FOUND");
    }
    throw error;
  }

  return {
    id: data.id,
    questionId: data.question_id,
    playerId: data.player_id,
    selectedOption: data.selected_option,
    createdAt: data.created_at,
  };
}

interface PredictionResultRow {
  predicted_percentage_a: number;
  chosen_option: VoteOption;
  actual_percentage_a: number;
  error: number;
  score: number;
  result_source: ResultSource;
  total_votes: number;
  percentile: number | null;
  streak_current: number;
  streak_longest: number;
}

export async function getPredictionResult(
  questionId: string,
  playerId: string
): Promise<PredictionResult> {
  // Same reasoning as getOrCreatePlayer above: the RPC uses auth.uid(), not
  // this value. Kept only for signature parity with localFileStore.ts.
  void playerId;
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .rpc("get_prediction_result", { p_question_id: questionId })
    .single<PredictionResultRow>();

  if (error) {
    if (error.message.includes("PREDICT_BEFORE_VOTE")) {
      throw new GameFlowError("Lock in a prediction first.", "PREDICT_BEFORE_VOTE");
    }
    if (error.message.includes("VOTE_BEFORE_RESULT")) {
      throw new GameFlowError("Submit your vote before seeing the result.", "VOTE_BEFORE_RESULT");
    }
    throw error;
  }

  return {
    predictedPercentageA: data.predicted_percentage_a,
    chosenOption: data.chosen_option,
    actualPercentageA: data.actual_percentage_a,
    error: data.error,
    score: data.score,
    resultSource: data.result_source,
    totalVotes: data.total_votes,
    percentile: data.percentile,
    streak: {
      current: data.streak_current,
      longest: data.streak_longest,
    },
  };
}

interface LeaderboardRow {
  rank: number;
  player_id: string;
  username: string;
  score: number;
  games_played: number;
}

export async function getLeaderboard(
  range: "today" | "all",
  currentPlayerId: string
): Promise<LeaderboardEntry[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("get_leaderboard", { p_range: range });
  if (error) throw error;

  return ((data ?? []) as LeaderboardRow[]).map((row) => ({
    rank: row.rank,
    playerId: row.player_id,
    username: row.username,
    score: Number(row.score),
    gamesPlayed: Number(row.games_played),
    isCurrentPlayer: row.player_id === currentPlayerId,
  }));
}
