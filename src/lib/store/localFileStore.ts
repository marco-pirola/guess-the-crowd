import { promises as fs } from "fs";
import path from "path";
import {
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
import { todayUtcDateString } from "@/lib/dailyChallenge";
import { calculatePercentile, calculatePredictionScore } from "@/lib/scoring";

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

export class GameFlowError extends Error {
  constructor(
    message: string,
    public code:
      | "QUESTION_NOT_FOUND"
      | "ALREADY_PREDICTED"
      | "ALREADY_VOTED"
      | "PREDICT_BEFORE_VOTE"
      | "VOTE_BEFORE_RESULT"
  ) {
    super(message);
  }
}

interface Db {
  players: Record<string, Player>;
  predictions: Prediction[];
  votes: Vote[];
}

const DB_PATH = path.join(process.cwd(), ".local-data", "db.json");
const ADJECTIVES = [
  "Quick",
  "Clever",
  "Bold",
  "Lucky",
  "Sharp",
  "Calm",
  "Swift",
  "Bright",
  "Sly",
  "Keen",
];
const ANIMALS = [
  "Fox",
  "Owl",
  "Wolf",
  "Hawk",
  "Otter",
  "Lynx",
  "Falcon",
  "Panda",
  "Tiger",
  "Raven",
];

let writeQueue: Promise<unknown> = Promise.resolve();

async function readDb(): Promise<Db> {
  try {
    const raw = await fs.readFile(DB_PATH, "utf-8");
    return JSON.parse(raw) as Db;
  } catch {
    return { players: {}, predictions: [], votes: [] };
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

export function getPublicQuestionById(questionId: string): PublicQuestion {
  return toPublicQuestion(getQuestion(questionId));
}

export function toPublicQuestion(question: Question): PublicQuestion {
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
  };
}

function randomUsername(): string {
  const adjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  const number = Math.floor(100 + Math.random() * 900);
  return `${adjective}${animal}${number}`;
}

export async function getOrCreatePlayer(playerId: string): Promise<Player> {
  return withDb((db) => {
    const existing = db.players[playerId];
    if (existing) return existing;
    const player: Player = {
      id: playerId,
      username: randomUsername(),
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

function computeQuestionResult(question: Question, votes: Vote[]): QuestionResult {
  const questionVotes = votes.filter((v) => v.questionId === question.id);
  const votesA = questionVotes.filter((v) => v.selectedOption === "A").length;
  const votesB = questionVotes.length - votesA;
  const totalVotes = questionVotes.length;

  if (totalVotes >= question.minimumVotes) {
    return {
      resultSource: "live",
      actualPercentageA: Math.round((votesA / totalVotes) * 100),
      totalVotes,
      votesA,
      votesB,
    };
  }
  return {
    resultSource: "seeded",
    actualPercentageA: question.seededResultPercentageA,
    totalVotes,
    votesA,
    votesB,
  };
}

export async function getQuestionResult(questionId: string): Promise<QuestionResult> {
  const question = getQuestion(questionId);
  const db = await readDb();
  return computeQuestionResult(question, db.votes);
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
      const result = computeQuestionResult(question, db.votes);
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
      totalVotes: computeQuestionResult(question, db.votes).totalVotes,
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
