import { RoomLeaderboardEntry, RoomRoundState, RoomState } from "@/lib/rooms/types";

/**
 * Thin client-side fetch wrappers around the existing Rooms API routes
 * (src/app/api/rooms/**) — no new backend behavior, just centralizes the
 * fetch/parse/error boilerplate that would otherwise be repeated in every
 * room component. Mirrors the shape of src/lib/store/roomsStore.ts on the
 * server side.
 */

export class RoomApiError extends Error {
  constructor(
    message: string,
    public code?: string
  ) {
    super(message);
  }
}

async function parseJsonOrThrow<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new RoomApiError(data?.error ?? "Request failed", data?.code);
  }
  return data as T;
}

/** GET .../state's response — same shape as RoomState plus the route's added playerId (see that route's comment). */
export interface RoomStateResponse extends RoomState {
  playerId: string;
}

export async function apiCreateRoom(
  nickname: string,
  maxPlayers: number,
  roundCount: number
): Promise<{ code: string }> {
  const res = await fetch("/api/rooms", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nickname, maxPlayers, roundCount }),
  });
  return parseJsonOrThrow(res);
}

export async function apiJoinRoom(code: string, nickname: string): Promise<{ code: string }> {
  const res = await fetch(`/api/rooms/${code}/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nickname }),
  });
  return parseJsonOrThrow(res);
}

export async function apiLeaveRoom(code: string): Promise<void> {
  const res = await fetch(`/api/rooms/${code}/leave`, { method: "POST" });
  await parseJsonOrThrow(res);
}

export async function apiStartRoom(code: string): Promise<void> {
  const res = await fetch(`/api/rooms/${code}/start`, { method: "POST" });
  await parseJsonOrThrow(res);
}

export async function apiSubmitRound(
  code: string,
  predictedPercentageA: number,
  selectedOption: "A" | "B"
): Promise<void> {
  const res = await fetch(`/api/rooms/${code}/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ predictedPercentageA, selectedOption }),
  });
  await parseJsonOrThrow(res);
}

export async function apiRevealRound(code: string): Promise<void> {
  const res = await fetch(`/api/rooms/${code}/reveal`, { method: "POST" });
  await parseJsonOrThrow(res);
}

export async function apiNextRound(code: string): Promise<void> {
  const res = await fetch(`/api/rooms/${code}/next`, { method: "POST" });
  await parseJsonOrThrow(res);
}

export async function apiFetchRoomState(code: string): Promise<RoomStateResponse> {
  const res = await fetch(`/api/rooms/${code}/state`);
  return parseJsonOrThrow(res);
}

export async function apiFetchRoomRoundState(code: string): Promise<RoomRoundState> {
  const res = await fetch(`/api/rooms/${code}/round`);
  return parseJsonOrThrow(res);
}

export async function apiFetchRoomLeaderboard(code: string): Promise<RoomLeaderboardEntry[]> {
  const res = await fetch(`/api/rooms/${code}/leaderboard`);
  return parseJsonOrThrow(res);
}
