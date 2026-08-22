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

export interface Player {
  id: string;
  username: string;
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
