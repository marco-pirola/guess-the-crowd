export type RoomStatus = "lobby" | "in_round" | "revealed" | "finished";

export const ROOM_MAX_PLAYERS_MIN = 2;
export const ROOM_MAX_PLAYERS_MAX = 20;

export const ROOM_ROUND_COUNTS = [5, 10, 15, 20] as const;
export type RoomRoundCount = (typeof ROOM_ROUND_COUNTS)[number];

export interface RoomPlayerSummary {
  playerId: string;
  nickname: string;
  isHost: boolean;
  joinedAt: string;
}

/** Returned by create_room/join_room and by GET .../state. */
export interface RoomState {
  id: string;
  code: string;
  hostId: string;
  status: RoomStatus;
  maxPlayers: number;
  roundCount: number;
  currentRound: number;
  /** Null in the lobby (nothing frozen yet). Fetch content via the existing GET /api/questions/[id]. */
  currentQuestionId: string | null;
  players: RoomPlayerSummary[];
  /** Has the calling player already submitted for currentRound. */
  mySubmitted: boolean;
}

/** Pre-reveal: counts only — never other players' predictions/choices. */
export interface RoomRoundWaiting {
  status: "in_round";
  roundNumber: number;
  submittedCount: number;
  activePlayerCount: number;
  submittedPlayerIds: string[];
}

export interface RoomRoundPlayerResult {
  playerId: string;
  nickname: string;
  predictedPercentageA: number;
  selectedOption: "A" | "B";
  score: number;
}

/** Post-reveal: the full per-player breakdown for that round. */
export interface RoomRoundRevealed {
  status: "revealed" | "finished";
  roundNumber: number;
  actualPercentageA: number;
  results: RoomRoundPlayerResult[];
}

export type RoomRoundState = RoomRoundWaiting | RoomRoundRevealed;

export interface RoomLeaderboardEntry {
  playerId: string;
  nickname: string;
  totalScore: number;
  roundsPlayed: number;
  isCurrentPlayer: boolean;
}
