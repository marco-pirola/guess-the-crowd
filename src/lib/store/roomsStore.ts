import { createServerSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { GameFlowError } from "@/lib/store/errors";
import {
  RoomLeaderboardEntry,
  RoomRoundCount,
  RoomRoundState,
  RoomState,
} from "@/lib/rooms/types";

/**
 * Rooms data-access layer. Deliberately NOT part of src/lib/store/index.ts's
 * local-file/Supabase facade — multiplayer inherently requires a shared
 * backend, and the local JSON dev fallback is explicitly single-device/
 * dev-only (see that file's header), so a "local rooms store" would be
 * throwaway work. Every function here requires Supabase to be configured;
 * see assertRoomsAvailable below for the deliberate, clearly-messaged error
 * otherwise, and src/app/rooms (Pass 2) for how the UI gates on this.
 *
 * Every RPC derives the acting player from auth.uid() on the caller's own
 * session — nothing here ever trusts a client-supplied player id. See
 * supabase/migration_rooms.sql for the full security model (RLS enabled,
 * zero client-facing policies, every read/write RPC-mediated).
 */

const PG_UNIQUE_VIOLATION = "23505";

const ROOM_ERROR_CODES: GameFlowError["code"][] = [
  "ROOM_NOT_FOUND",
  "ROOM_FULL",
  "ROOM_ALREADY_STARTED",
  "NOT_HOST",
  "NOT_ROOM_MEMBER",
  "ROUND_NOT_ACTIVE",
  "ROUND_NOT_REVEALED",
  "TOO_MANY_ACTIVE_ROOMS",
  "TOO_MANY_JOIN_ATTEMPTS",
  "NOT_ENOUGH_QUESTIONS",
  "INVALID_NICKNAME",
  "INVALID_MAX_PLAYERS",
  "INVALID_ROUND_COUNT",
  "INVALID_PREDICTION",
  "INVALID_OPTION",
];

const ROOM_ERROR_MESSAGES: Record<string, string> = {
  ROOM_NOT_FOUND: "Room not found.",
  ROOM_FULL: "This room is full.",
  ROOM_ALREADY_STARTED: "This room has already started.",
  NOT_HOST: "Only the host can do that.",
  NOT_ROOM_MEMBER: "You're not in this room.",
  ROUND_NOT_ACTIVE: "This round isn't active.",
  ROUND_NOT_REVEALED: "The result hasn't been revealed yet.",
  TOO_MANY_ACTIVE_ROOMS: "You already have too many active rooms.",
  TOO_MANY_JOIN_ATTEMPTS: "Too many attempts — try again in a minute.",
  NOT_ENOUGH_QUESTIONS: "Not enough questions available right now.",
  INVALID_NICKNAME: "Nickname must be 3-20 characters: letters, numbers, and underscores only.",
  INVALID_MAX_PLAYERS: "Choose between 2 and 20 players.",
  INVALID_ROUND_COUNT: "Choose 5, 10, 15, or 20 rounds.",
  INVALID_PREDICTION: "Invalid prediction.",
  INVALID_OPTION: "Invalid option.",
};

/** Maps a Postgres/RPC error to the matching GameFlowError, or rethrows unchanged. */
function mapRoomError(error: { message: string; code?: string }): never {
  for (const code of ROOM_ERROR_CODES) {
    if (error.message.includes(code)) {
      throw new GameFlowError(ROOM_ERROR_MESSAGES[code] ?? error.message, code);
    }
  }
  if (error.code === PG_UNIQUE_VIOLATION) {
    throw new GameFlowError("You already submitted this round.", "ALREADY_SUBMITTED");
  }
  throw error;
}

function assertRoomsAvailable(): void {
  if (!isSupabaseConfigured) {
    throw new GameFlowError(
      "Rooms require Supabase to be configured. See README.md > Supabase setup.",
      "ROOMS_UNAVAILABLE"
    );
  }
}

interface RoomRow {
  id: string;
  code: string;
}

export async function createRoom(
  nickname: string,
  maxPlayers: number,
  roundCount: RoomRoundCount
): Promise<{ code: string }> {
  assertRoomsAvailable();
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .rpc("create_room", {
      p_max_players: maxPlayers,
      p_round_count: roundCount,
      p_nickname: nickname,
    })
    .single<RoomRow>();
  if (error) mapRoomError(error);
  return { code: data.code };
}

export async function joinRoom(code: string, nickname: string): Promise<{ id: string; code: string }> {
  assertRoomsAvailable();
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .rpc("join_room", { p_code: code, p_nickname: nickname })
    .single<RoomRow>();
  if (error) mapRoomError(error);
  return { id: data.id, code: data.code };
}

/** Returns the room's id (or null if the code didn't match a room), used to send the post-mutation realtime broadcast. */
export async function leaveRoom(code: string): Promise<string | null> {
  assertRoomsAvailable();
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("leave_room", { p_code: code });
  if (error) mapRoomError(error);
  return data as string | null;
}

/** Returns the room's id, used to send the post-mutation realtime broadcast. */
export async function startRoom(code: string): Promise<string> {
  assertRoomsAvailable();
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("start_room", { p_code: code });
  if (error) mapRoomError(error);
  return data as string;
}

export async function submitRound(
  code: string,
  predictedPercentageA: number,
  selectedOption: "A" | "B"
): Promise<string> {
  assertRoomsAvailable();
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("submit_round", {
    p_code: code,
    p_predicted_percentage_a: predictedPercentageA,
    p_selected_option: selectedOption,
  });
  if (error) mapRoomError(error);
  return data as string;
}

export async function revealRound(code: string): Promise<string> {
  assertRoomsAvailable();
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("reveal_round", { p_code: code });
  if (error) mapRoomError(error);
  return data as string;
}

export async function nextRound(code: string): Promise<string> {
  assertRoomsAvailable();
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("next_round", { p_code: code });
  if (error) mapRoomError(error);
  return data as string;
}

export async function getRoomState(code: string): Promise<RoomState> {
  assertRoomsAvailable();
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("get_room_state", { p_code: code });
  if (error) mapRoomError(error);
  return data as RoomState;
}

export async function getRoomRoundState(code: string): Promise<RoomRoundState> {
  assertRoomsAvailable();
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("get_room_round_state", { p_code: code });
  if (error) mapRoomError(error);
  return data as RoomRoundState;
}

interface RoomLeaderboardRow {
  player_id: string;
  nickname: string;
  total_score: number;
  rounds_played: number;
}

export async function getRoomLeaderboard(
  code: string,
  currentPlayerId: string
): Promise<RoomLeaderboardEntry[]> {
  assertRoomsAvailable();
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("get_room_leaderboard", { p_code: code });
  if (error) mapRoomError(error);

  return ((data ?? []) as RoomLeaderboardRow[]).map((row) => ({
    playerId: row.player_id,
    nickname: row.nickname,
    totalScore: Number(row.total_score),
    roundsPlayed: Number(row.rounds_played),
    isCurrentPlayer: row.player_id === currentPlayerId,
  }));
}
