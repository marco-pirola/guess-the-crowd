export type QuestionCategory =
  | "Food"
  | "Movies"
  | "Sport"
  | "Technology"
  | "School"
  | "Everyday Life"
  | "Random"
  | "Internet Culture";

export type ResultSource = "seeded" | "live";

export interface Question {
  id: string;
  text: string;
  category: QuestionCategory;
  optionA: string;
  optionB: string;
  emojiA: string;
  emojiB: string;
  /**
   * Italian display text. Optional/nullable and additive — most of the
   * question pool has no Italian text yet, in which case the client falls
   * back to the English fields above (see src/lib/i18n/localizeQuestion.ts).
   * Never used for scoring, matching, or IDs — display only.
   */
  textIt?: string | null;
  optionAIt?: string | null;
  optionBIt?: string | null;
  /** Only present for demo/seed questions. Used until enough live votes exist. */
  seededResultPercentageA: number;
  /** Minimum number of live votes required before we trust live data over the seed. */
  minimumVotes: number;
  status: "published";
  createdAt: string;
}

/** Public shape sent to the client before it has predicted+voted. Never includes the result. */
export interface PublicQuestion {
  id: string;
  dailyNumber: number;
  text: string;
  category: QuestionCategory;
  optionA: string;
  optionB: string;
  emojiA: string;
  emojiB: string;
  /** See Question.textIt above — same fallback-to-English contract. */
  textIt?: string | null;
  optionAIt?: string | null;
  optionBIt?: string | null;
}

export interface Prediction {
  id: string;
  questionId: string;
  playerId: string;
  predictedPercentageA: number;
  createdAt: string;
  /** Populated once, the first time the result is revealed to this player. */
  score?: number;
  actualPercentageSnapshot?: number;
  resultSourceSnapshot?: ResultSource;
}

export type VoteOption = "A" | "B";

export interface Vote {
  id: string;
  questionId: string;
  playerId: string;
  selectedOption: VoteOption;
  createdAt: string;
}

export type AvatarKey = "fox" | "owl" | "raven" | "hawk" | "wolf" | "tiger" | "lynx";

export interface Player {
  id: string;
  username: string;
  avatarKey: AvatarKey;
  /** Null until the player has manually chosen a username once. */
  usernameChangedAt: string | null;
  /** Highest single-question score ever (0-1000). Null until the first scored question. */
  bestScore: number | null;
  currentStreak: number;
  longestStreak: number;
  lastPlayedDate: string | null; // YYYY-MM-DD, UTC
  totalScore: number;
  gamesPlayed: number;
  createdAt: string;
}

export interface QuestionResult {
  resultSource: ResultSource;
  actualPercentageA: number;
  totalVotes: number;
  votesA: number;
  votesB: number;
}

export interface PredictionResult {
  predictedPercentageA: number;
  chosenOption: VoteOption;
  actualPercentageA: number;
  error: number;
  score: number;
  resultSource: ResultSource;
  totalVotes: number;
  percentile: number | null;
  streak: {
    current: number;
    longest: number;
  };
}

export interface LeaderboardEntry {
  rank: number;
  playerId: string;
  username: string;
  score: number;
  gamesPlayed: number;
  isCurrentPlayer: boolean;
}

/** GET/PATCH /api/me response shape — client-side profile summary. */
export interface ProfileSummary {
  username: string;
  avatarKey: AvatarKey;
  hasCustomUsername: boolean;
  bestScore: number;
  currentStreak: number;
  longestStreak: number;
  totalScore: number;
  gamesPlayed: number;
  questionsAnswered: number;
  globalRank: number;
  canChangeUsername: boolean;
  usernameAvailableAt: string | null;
}

/** The player's own position, for the "points to overtake" line — not part of the top-20 list itself. */
export interface LeaderboardContext {
  rank: number;
  score: number;
  isTop: boolean;
  /** Null only if isTop is true (nobody to overtake). */
  aboveUsername: string | null;
  aboveScore: number | null;
}

/** GET /api/daily response — today's fixed 10-question set, UTC date convention. */
export interface DailyChallengeStatus {
  date: string; // YYYY-MM-DD, UTC
  questionIds: string[];
  /** How many of the 10 this player has already answered (official run). */
  answeredCount: number;
  completed: boolean;
  officialScore: number | null;
  dailyRank: number | null;
}

export interface DailyLeaderboardEntry {
  rank: number;
  playerId: string;
  username: string;
  score: number;
  isCurrentPlayer: boolean;
}
