import { promises as fs } from "fs";
import path from "path";
import {
  AvatarKey,
  DailyLeaderboardEntry,
  LeaderboardContext,
  LeaderboardEntry,
  Player,
  Prediction,
  PredictionResult,
  PublicQuestion,
  Question,
  QuestionResult,
  Vote,
  VoteOption,
} from "@/lib/types";
import { seedQuestions } from "@/lib/store/seedQuestions";
import {
  DailyCandidateQuestion,
  RECENCY_WINDOW_DAYS,
  isDailyComplete,
  selectDailyQuestions,
  sumDailyScore,
  todayUtcDateString,
} from "@/lib/dailyChallenge";
import { calculatePercentile, calculatePredictionScore } from "@/lib/scoring";
import { computeBlendedPercentageA, priorStrengthFromMinimumVotes } from "@/lib/crowdMath";
import { randomUsername } from "@/lib/username";
import { usernameCooldownStatus } from "@/lib/usernameCooldown";
import { GameFlowError } from "@/lib/store/errors";

interface DailyPrediction extends Prediction {
  challengeDate: string;
}

interface DailyVote extends Vote {
  challengeDate: string;
}

interface DailyResult {
  challengeDate: string;
  playerId: string;
  totalScore: number;
  completedAt: string;
}

/**
 * MVP data layer: a single JSON file under `.local-data/`, gitignored.
 *
 * This exists so the game is fully playable with zero external accounts —
 * `npm run dev` just works. It is intentionally the *only* place that knows
 * about the on-disk format. Every other module calls the functions below,
 * never the file directly, so this file is the one that gets replaced with
 * `@supabase/supabase-js` calls when the project moves to real Supabase
 * (see supabase/schema.sql for the matching Postgres schema).
 */

interface Db {
  players: Record<string, Player>;
  predictions: Prediction[];
  votes: Vote[];
  dailyChallenges: Record<string, string[]>; // UTC date -> ordered question ids
  dailyPredictions: DailyPrediction[];
  dailyVotes: DailyVote[];
  dailyResults: DailyResult[];
}

const DB_PATH = path.join(process.cwd(), ".local-data", "db.json");

let writeQueue: Promise<unknown> = Promise.resolve();

function emptyDb(): Db {
  return {
    players: {},
    predictions: [],
    votes: [],
    dailyChallenges: {},
    dailyPredictions: [],
    dailyVotes: [],
    dailyResults: [],
  };
}

/** Defensive against a db.json written before the Daily Challenge fields existed. */
function withDefaults(db: Partial<Db>): Db {
  return { ...emptyDb(), ...db };
}

async function readDb(): Promise<Db> {
  try {
    const raw = await fs.readFile(DB_PATH, "utf-8");
    return withDefaults(JSON.parse(raw) as Partial<Db>);
  } catch {
    return emptyDb();
  }
}

async function writeDb(db: Db): Promise<void> {
  await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
  await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2), "utf-8");
}

/** Serializes all writes so concurrent requests in dev never clobber each other. */
function withDb<T>(fn: (db: Db) => Promise<T> | T): Promise<T> {
  const result = writeQueue.then(async () => {
    const db = await readDb();
    const value = await fn(db);
    await writeDb(db);
    return value;
  });
  writeQueue = result.catch(() => undefined);
  return result;
}

function getQuestion(questionId: string): Question {
  const question = seedQuestions.find((q) => q.id === questionId);
  if (!question) {
    throw new GameFlowError(`Unknown question: ${questionId}`, "QUESTION_NOT_FOUND");
  }
  return question;
}

/** async for interface parity with supabaseStore.ts — both are exported through the same store facade. */
export async function getPublicQuestionById(questionId: string): Promise<PublicQuestion> {
  const question = getQuestion(questionId);
  const position = seedQuestions.findIndex((q) => q.id === question.id);
  return {
    id: question.id,
    dailyNumber: position + 1,
    text: question.text,
    category: question.category,
    optionA: question.optionA,
    optionB: question.optionB,
    emojiA: question.emojiA,
    emojiB: question.emojiB,
    textIt: question.textIt,
    optionAIt: question.optionAIt,
    optionBIt: question.optionBIt,
  };
}

/**
 * The full pool of playable question ids, for randomized "next question"
 * selection (see src/lib/questionSelection.ts). Content itself is never
 * returned here — just enough to pick from, matching supabaseStore.ts.
 */
export async function listQuestionIds(): Promise<{ id: string }[]> {
  return seedQuestions
    .filter((q) => q.status === "published")
    .map((q) => ({ id: q.id }));
}

export async function getOrCreatePlayer(playerId: string): Promise<Player> {
  return withDb((db) => {
    const existing = db.players[playerId];
    if (existing) return existing;
    const player: Player = {
      id: playerId,
      username: randomUsername(),
      avatarKey: "fox",
      usernameChangedAt: null,
      bestScore: null,
      currentStreak: 0,
      longestStreak: 0,
      lastPlayedDate: null,
      totalScore: 0,
      gamesPlayed: 0,
      createdAt: new Date().toISOString(),
    };
    db.players[playerId] = player;
    return player;
  });
}

export async function updateUsername(playerId: string, username: string): Promise<Player> {
  return withDb((db) => {
    const player = db.players[playerId];
    if (!player) {
      throw new GameFlowError("Unknown player.", "QUESTION_NOT_FOUND");
    }
    if (!usernameCooldownStatus(player.usernameChangedAt).canChangeUsername) {
      throw new GameFlowError("Username changes are on cooldown.", "USERNAME_COOLDOWN");
    }
    const taken = Object.values(db.players).some(
      (p) => p.id !== playerId && p.username.toLowerCase() === username.toLowerCase()
    );
    if (taken) {
      throw new GameFlowError("That username is taken.", "USERNAME_TAKEN");
    }
    player.username = username;
    player.usernameChangedAt = new Date().toISOString();
    return player;
  });
}

export async function updateAvatar(playerId: string, avatarKey: AvatarKey): Promise<Player> {
  return withDb((db) => {
    const player = db.players[playerId];
    if (!player) {
      throw new GameFlowError("Unknown player.", "QUESTION_NOT_FOUND");
    }
    player.avatarKey = avatarKey;
    return player;
  });
}

/** Position in the all-time leaderboard ordering (sum of scores desc), same source as getLeaderboard. */
export async function getPlayerRank(playerId: string): Promise<number> {
  const db = await readDb();
  const totals = new Map<string, number>();
  for (const p of db.predictions) {
    if (p.score === undefined) continue;
    totals.set(p.playerId, (totals.get(p.playerId) ?? 0) + p.score);
  }
  const mine = totals.get(playerId) ?? 0;
  const ahead = [...totals.values()].filter((score) => score > mine).length;
  return ahead + 1;
}

/**
 * Completed question rounds, deliberately distinct from `gamesPlayed`
 * (which keeps its existing, Quick-Play-only meaning — see getOrCreatePlayer
 * and getPredictionResult above). Counts every scored prediction across
 * BOTH Quick Play and Daily Challenge, so replaying the same question in
 * both modes counts as two answered questions, not one game — the two
 * stats are computed from independent sources and can diverge.
 * Exported as a pure function (mirroring computeQuestionResult above) so
 * this can be unit-tested without touching the filesystem.
 */
export function computeQuestionsAnsweredCount(
  predictions: Pick<Prediction, "playerId" | "score">[],
  dailyPredictions: Pick<Prediction, "playerId" | "score">[],
  playerId: string
): number {
  const quickPlay = predictions.filter(
    (p) => p.playerId === playerId && p.score !== undefined
  ).length;
  const daily = dailyPredictions.filter(
    (p) => p.playerId === playerId && p.score !== undefined
  ).length;
  return quickPlay + daily;
}

export async function getQuestionsAnsweredCount(playerId: string): Promise<number> {
  const db = await readDb();
  return computeQuestionsAnsweredCount(db.predictions, db.dailyPredictions, playerId);
}

export async function getLeaderboardContext(
  range: "today" | "all",
  playerId: string
): Promise<LeaderboardContext | null> {
  const db = await readDb();
  const today = todayUtcDateString();
  const scoped =
    range === "today"
      ? db.predictions.filter((p) => p.score !== undefined && p.createdAt.slice(0, 10) === today)
      : db.predictions.filter((p) => p.score !== undefined);

  const totals = new Map<string, number>();
  for (const p of scoped) {
    totals.set(p.playerId, (totals.get(p.playerId) ?? 0) + (p.score as number));
  }
  if (!totals.has(playerId)) return null;

  const ranked = [...totals.entries()].sort((a, b) => b[1] - a[1]);
  const index = ranked.findIndex(([id]) => id === playerId);
  const [, myScore] = ranked[index];
  const isTop = index === 0;
  const above = isTop ? null : ranked[index - 1];

  return {
    rank: index + 1,
    score: myScore,
    isTop,
    aboveUsername: above ? db.players[above[0]]?.username ?? "Player" : null,
    aboveScore: above ? above[1] : null,
  };
}

/**
 * Real votes, shrunk toward the seeded baseline via Bayesian (Beta-Binomial)
 * smoothing — matching supabaseStore.ts exactly. The seed is never treated
 * as a hard fallback/override; it's a prior worth `2 x minimumVotes`
 * pseudo-votes that real votes progressively outweigh as they accumulate.
 * See src/lib/crowdMath.ts for the formula and reasoning.
 */
function computeQuestionResult(question: Question, votes: Vote[]): QuestionResult {
  const questionVotes = votes.filter((v) => v.questionId === question.id);
  const votesA = questionVotes.filter((v) => v.selectedOption === "A").length;
  const votesB = questionVotes.length - votesA;
  const totalVotes = questionVotes.length;
  const priorStrength = priorStrengthFromMinimumVotes(question.minimumVotes);

  return {
    resultSource: "live",
    actualPercentageA: computeBlendedPercentageA(
      votesA,
      votesB,
      question.seededResultPercentageA,
      priorStrength
    ),
    totalVotes,
    votesA,
    votesB,
  };
}

/** A Daily Challenge vote is still a real crowd vote — pooled with Quick Play votes for the crowd tally. */
function pooledVotes(db: Db): Vote[] {
  return [...db.votes, ...db.dailyVotes];
}

export async function getQuestionResult(questionId: string): Promise<QuestionResult> {
  const question = getQuestion(questionId);
  const db = await readDb();
  return computeQuestionResult(question, pooledVotes(db));
}

export async function recordPrediction(
  questionId: string,
  playerId: string,
  predictedPercentageA: number
): Promise<Prediction> {
  getQuestion(questionId);
  return withDb((db) => {
    const already = db.predictions.find(
      (p) => p.questionId === questionId && p.playerId === playerId
    );
    if (already) {
      throw new GameFlowError("You already predicted this question.", "ALREADY_PREDICTED");
    }
    const prediction: Prediction = {
      id: crypto.randomUUID(),
      questionId,
      playerId,
      predictedPercentageA,
      createdAt: new Date().toISOString(),
    };
    db.predictions.push(prediction);
    return prediction;
  });
}

export async function recordVote(
  questionId: string,
  playerId: string,
  selectedOption: VoteOption
): Promise<Vote> {
  getQuestion(questionId);
  return withDb((db) => {
    const prediction = db.predictions.find(
      (p) => p.questionId === questionId && p.playerId === playerId
    );
    if (!prediction) {
      throw new GameFlowError(
        "Lock in a prediction before voting.",
        "PREDICT_BEFORE_VOTE"
      );
    }
    const alreadyVoted = db.votes.find(
      (v) => v.questionId === questionId && v.playerId === playerId
    );
    if (alreadyVoted) {
      throw new GameFlowError("You already voted on this question.", "ALREADY_VOTED");
    }
    const vote: Vote = {
      id: crypto.randomUUID(),
      questionId,
      playerId,
      selectedOption,
      createdAt: new Date().toISOString(),
    };
    db.votes.push(vote);
    return vote;
  });
}

function applyStreak(player: Player, playedOn: string): void {
  if (player.lastPlayedDate === playedOn) return; // already played today
  const yesterday = new Date(Date.parse(`${playedOn}T00:00:00.000Z`) - 86_400_000)
    .toISOString()
    .slice(0, 10);
  player.currentStreak = player.lastPlayedDate === yesterday ? player.currentStreak + 1 : 1;
  player.longestStreak = Math.max(player.longestStreak, player.currentStreak);
  player.lastPlayedDate = playedOn;
}

export async function getPredictionResult(
  questionId: string,
  playerId: string
): Promise<PredictionResult> {
  const question = getQuestion(questionId);
  return withDb((db) => {
    const prediction = db.predictions.find(
      (p) => p.questionId === questionId && p.playerId === playerId
    );
    const vote = db.votes.find((v) => v.questionId === questionId && v.playerId === playerId);
    if (!prediction) {
      throw new GameFlowError("Lock in a prediction first.", "PREDICT_BEFORE_VOTE");
    }
    if (!vote) {
      throw new GameFlowError("Submit your vote before seeing the result.", "VOTE_BEFORE_RESULT");
    }

    // Score is computed once and frozen, so it never shifts under a player as
    // more of the crowd votes after them.
    if (prediction.score === undefined) {
      const result = computeQuestionResult(question, pooledVotes(db));
      prediction.score = calculatePredictionScore(
        prediction.predictedPercentageA,
        result.actualPercentageA
      );
      prediction.actualPercentageSnapshot = result.actualPercentageA;
      prediction.resultSourceSnapshot = result.resultSource;

      const player = db.players[playerId];
      if (player) {
        player.totalScore += prediction.score;
        player.gamesPlayed += 1;
        player.bestScore = Math.max(player.bestScore ?? 0, prediction.score);
        applyStreak(player, todayUtcDateString(new Date(prediction.createdAt)));
      }
    }

    const allScoresForQuestion = db.predictions
      .filter((p) => p.questionId === questionId && p.score !== undefined)
      .map((p) => p.score as number);

    const player = db.players[playerId];
    return {
      predictedPercentageA: prediction.predictedPercentageA,
      chosenOption: vote.selectedOption,
      actualPercentageA: prediction.actualPercentageSnapshot!,
      error: Math.abs(prediction.predictedPercentageA - prediction.actualPercentageSnapshot!),
      score: prediction.score,
      resultSource: prediction.resultSourceSnapshot!,
      totalVotes: computeQuestionResult(question, pooledVotes(db)).totalVotes,
      percentile: calculatePercentile(prediction.score, allScoresForQuestion),
      streak: {
        current: player?.currentStreak ?? 0,
        longest: player?.longestStreak ?? 0,
      },
    };
  });
}

export async function getLeaderboard(
  range: "today" | "all",
  currentPlayerId: string
): Promise<LeaderboardEntry[]> {
  const db = await readDb();
  const today = todayUtcDateString();

  const scoped =
    range === "today"
      ? db.predictions.filter(
          (p) => p.score !== undefined && p.createdAt.slice(0, 10) === today
        )
      : db.predictions.filter((p) => p.score !== undefined);

  const totals = new Map<string, { score: number; games: number }>();
  for (const p of scoped) {
    const entry = totals.get(p.playerId) ?? { score: 0, games: 0 };
    entry.score += p.score as number;
    entry.games += 1;
    totals.set(p.playerId, entry);
  }

  return [...totals.entries()]
    .map(([playerId, { score, games }]) => ({
      playerId,
      username: db.players[playerId]?.username ?? "Player",
      score,
      gamesPlayed: games,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 20)
    .map((entry, index) => ({
      rank: index + 1,
      ...entry,
      isCurrentPlayer: entry.playerId === currentPlayerId,
    }));
}

// ── Daily Challenge ─────────────────────────────────────────────────────
// Deliberately isolated from `predictions`/`votes`/profiles cumulative
// stats (total_score, games_played, best_score, streak) and from the
// Today/All-time leaderboard above — the spec treats Daily as a separate,
// parallel scoring track with its own leaderboard, not folded into Quick
// Play's totals. Daily *votes* still pool into the shared crowd tally
// (pooledVotes above) since they're still real votes on that question.

/** Frozen once per UTC date — every player reads the same list thereafter. */
export async function getOrCreateDailyChallenge(dateStr: string): Promise<string[]> {
  return withDb((db) => {
    const existing = db.dailyChallenges[dateStr];
    if (existing) return existing;

    const cutoffMs = Date.parse(dateStr) - RECENCY_WINDOW_DAYS * 86_400_000;
    const recentlyUsed = new Set<string>();
    for (const [d, ids] of Object.entries(db.dailyChallenges)) {
      const dMs = Date.parse(d);
      if (dMs >= cutoffMs && dMs < Date.parse(dateStr)) {
        ids.forEach((id) => recentlyUsed.add(id));
      }
    }

    const allVotes = pooledVotes(db);
    const candidates: DailyCandidateQuestion[] = seedQuestions
      .filter((q) => q.status === "published")
      .map((q) => ({
        id: q.id,
        category: q.category,
        voteCount: allVotes.filter((v) => v.questionId === q.id).length,
      }));

    const questionIds = selectDailyQuestions(dateStr, candidates, recentlyUsed);
    db.dailyChallenges[dateStr] = questionIds;
    return questionIds;
  });
}

/**
 * The daily rank contract: null until the player has an official result for
 * that date, never a placeholder like 1 — a "you're rank 1" claim would be
 * false for anyone who hasn't actually finished today's challenge yet. Once
 * they have a result, rank is the count of strictly-higher scores that day,
 * plus one. Exported as a pure function (mirrors computeQuestionResult /
 * computeQuestionsAnsweredCount above) so it's directly unit-testable, and
 * because this is the reference behavior the SQL get_daily_status RPC
 * (supabase/migration_daily_challenge.sql) must also match — see that
 * function's own fix/comment for the equivalent SQL-side guard.
 */
export function computeDailyRank(
  dailyResults: { challengeDate: string; playerId: string; totalScore: number }[],
  dateStr: string,
  playerId: string
): number | null {
  const mine = dailyResults.find((r) => r.challengeDate === dateStr && r.playerId === playerId);
  if (!mine) return null;
  const better = dailyResults.filter(
    (r) => r.challengeDate === dateStr && r.totalScore > mine.totalScore
  ).length;
  return better + 1;
}

export async function getDailyStatus(
  dateStr: string,
  playerId: string
): Promise<{ answeredCount: number; officialScore: number | null; dailyRank: number | null }> {
  const db = await readDb();
  const answeredCount = db.dailyPredictions.filter(
    (p) => p.challengeDate === dateStr && p.playerId === playerId && p.score !== undefined
  ).length;

  const mine = db.dailyResults.find((r) => r.challengeDate === dateStr && r.playerId === playerId);
  const dailyRank = computeDailyRank(db.dailyResults, dateStr, playerId);

  return { answeredCount, officialScore: mine?.totalScore ?? null, dailyRank };
}

export async function recordDailyPrediction(
  dateStr: string,
  questionId: string,
  playerId: string,
  predictedPercentageA: number
): Promise<void> {
  getQuestion(questionId);
  await withDb((db) => {
    const already = db.dailyPredictions.find(
      (p) => p.challengeDate === dateStr && p.questionId === questionId && p.playerId === playerId
    );
    if (already) {
      throw new GameFlowError("You already predicted this question.", "ALREADY_PREDICTED");
    }
    db.dailyPredictions.push({
      id: crypto.randomUUID(),
      questionId,
      playerId,
      predictedPercentageA,
      createdAt: new Date().toISOString(),
      challengeDate: dateStr,
    });
  });
}

export async function recordDailyVote(
  dateStr: string,
  questionId: string,
  playerId: string,
  selectedOption: VoteOption
): Promise<void> {
  getQuestion(questionId);
  await withDb((db) => {
    const prediction = db.dailyPredictions.find(
      (p) => p.challengeDate === dateStr && p.questionId === questionId && p.playerId === playerId
    );
    if (!prediction) {
      throw new GameFlowError("Lock in a prediction before voting.", "PREDICT_BEFORE_VOTE");
    }
    const alreadyVoted = db.dailyVotes.find(
      (v) => v.challengeDate === dateStr && v.questionId === questionId && v.playerId === playerId
    );
    if (alreadyVoted) {
      throw new GameFlowError("You already voted on this question.", "ALREADY_VOTED");
    }
    db.dailyVotes.push({
      id: crypto.randomUUID(),
      questionId,
      playerId,
      selectedOption,
      createdAt: new Date().toISOString(),
      challengeDate: dateStr,
    });
  });
}

export async function getDailyPredictionResult(
  dateStr: string,
  questionId: string,
  playerId: string
): Promise<PredictionResult> {
  const question = getQuestion(questionId);
  return withDb((db) => {
    const prediction = db.dailyPredictions.find(
      (p) => p.challengeDate === dateStr && p.questionId === questionId && p.playerId === playerId
    );
    const vote = db.dailyVotes.find(
      (v) => v.challengeDate === dateStr && v.questionId === questionId && v.playerId === playerId
    );
    if (!prediction) {
      throw new GameFlowError("Lock in a prediction first.", "PREDICT_BEFORE_VOTE");
    }
    if (!vote) {
      throw new GameFlowError("Submit your vote before seeing the result.", "VOTE_BEFORE_RESULT");
    }

    if (prediction.score === undefined) {
      const result = computeQuestionResult(question, pooledVotes(db));
      prediction.score = calculatePredictionScore(
        prediction.predictedPercentageA,
        result.actualPercentageA
      );
      prediction.actualPercentageSnapshot = result.actualPercentageA;
      prediction.resultSourceSnapshot = result.resultSource;

      // First time all of this date's questions are scored for this player,
      // record the official Daily score. Never overwritten after that —
      // this is what makes a practice replay harmless (see route handlers).
      const challengeQuestionIds = db.dailyChallenges[dateStr] ?? [];
      const alreadyOfficial = db.dailyResults.some(
        (r) => r.challengeDate === dateStr && r.playerId === playerId
      );
      if (!alreadyOfficial && challengeQuestionIds.length > 0) {
        const scoredForDate = db.dailyPredictions.filter(
          (p) => p.challengeDate === dateStr && p.playerId === playerId && p.score !== undefined
        );
        if (isDailyComplete(scoredForDate.length, challengeQuestionIds.length)) {
          const totalScore = sumDailyScore(scoredForDate.map((p) => p.score ?? 0));
          db.dailyResults.push({
            challengeDate: dateStr,
            playerId,
            totalScore,
            completedAt: new Date().toISOString(),
          });
        }
      }
    }

    const allScoresForQuestion = [...db.predictions, ...db.dailyPredictions]
      .filter((p) => p.questionId === questionId && p.score !== undefined)
      .map((p) => p.score as number);

    const player = db.players[playerId];
    return {
      predictedPercentageA: prediction.predictedPercentageA,
      chosenOption: vote.selectedOption,
      actualPercentageA: prediction.actualPercentageSnapshot!,
      error: Math.abs(prediction.predictedPercentageA - prediction.actualPercentageSnapshot!),
      score: prediction.score,
      resultSource: prediction.resultSourceSnapshot!,
      totalVotes: computeQuestionResult(question, pooledVotes(db)).totalVotes,
      percentile: calculatePercentile(prediction.score, allScoresForQuestion),
      streak: {
        current: player?.currentStreak ?? 0,
        longest: player?.longestStreak ?? 0,
      },
    };
  });
}

export async function getDailyLeaderboard(
  dateStr: string,
  currentPlayerId: string
): Promise<DailyLeaderboardEntry[]> {
  const db = await readDb();
  return db.dailyResults
    .filter((r) => r.challengeDate === dateStr)
    .sort((a, b) => b.totalScore - a.totalScore)
    .map((r, index) => ({
      rank: index + 1,
      playerId: r.playerId,
      username: db.players[r.playerId]?.username ?? "Player",
      score: r.totalScore,
      isCurrentPlayer: r.playerId === currentPlayerId,
    }));
}
