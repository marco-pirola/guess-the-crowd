import { isAvatarKey } from "@/lib/avatars";
import type { AvatarKey } from "@/lib/types";
import { isValidRoomCodeFormat, normalizeRoomCode } from "@/lib/rooms/roomCode";
import { ROOM_MAX_PLAYERS_MAX, ROOM_MAX_PLAYERS_MIN, ROOM_ROUND_COUNTS, RoomRoundCount } from "@/lib/rooms/types";

export class ValidationError extends Error {}

/** Whole-number percentage in [0, 100]. Rejects NaN, floats, out-of-range, and non-numbers. */
export function assertValidPercentage(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new ValidationError("Percentage must be a number.");
  }
  if (!Number.isInteger(value)) {
    throw new ValidationError("Percentage must be a whole number.");
  }
  if (value < 0 || value > 100) {
    throw new ValidationError("Percentage must be between 0 and 100.");
  }
  return value;
}

export function assertValidVoteOption(value: unknown): "A" | "B" {
  if (value !== "A" && value !== "B") {
    throw new ValidationError('Vote option must be "A" or "B".');
  }
  return value;
}

export function assertValidPlayerId(value: unknown): string {
  if (typeof value !== "string" || value.length < 8) {
    throw new ValidationError("Missing or invalid player id.");
  }
  return value;
}

export function assertValidQuestionId(value: unknown): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new ValidationError("Missing or invalid question id.");
  }
  return value;
}

const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,20}$/;

/** 3-20 chars, letters/digits/underscore only — same style as the auto-generated names. */
export function assertValidUsername(value: unknown): string {
  if (typeof value !== "string" || !USERNAME_PATTERN.test(value)) {
    throw new ValidationError(
      "Username must be 3-20 characters: letters, numbers, and underscores only."
    );
  }
  return value;
}

export function assertValidAvatarKey(value: unknown): AvatarKey {
  if (!isAvatarKey(value)) {
    throw new ValidationError("Invalid avatar.");
  }
  return value;
}

// ── Rooms ────────────────────────────────────────────────────────────────
// Same character-class rule as usernames, kept as a separate pattern/error
// on purpose — a room nickname is a distinct, room-scoped concept and must
// never be required to match the account username (Part rooms decision 6).
const NICKNAME_PATTERN = /^[A-Za-z0-9_]{3,20}$/;

export function assertValidNickname(value: unknown): string {
  if (typeof value !== "string" || !NICKNAME_PATTERN.test(value)) {
    throw new ValidationError("Nickname must be 3-20 characters: letters, numbers, and underscores only.");
  }
  return value;
}

export function assertValidRoomCode(value: unknown): string {
  if (typeof value !== "string") {
    throw new ValidationError("Missing or invalid room code.");
  }
  const normalized = normalizeRoomCode(value);
  if (!isValidRoomCodeFormat(normalized)) {
    throw new ValidationError("Room code must be 5 characters (letters and numbers, excluding 0/O/1/I/L).");
  }
  return normalized;
}

export function assertValidMaxPlayers(value: unknown): number {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < ROOM_MAX_PLAYERS_MIN ||
    value > ROOM_MAX_PLAYERS_MAX
  ) {
    throw new ValidationError(`Max players must be between ${ROOM_MAX_PLAYERS_MIN} and ${ROOM_MAX_PLAYERS_MAX}.`);
  }
  return value;
}

export function assertValidRoundCount(value: unknown): RoomRoundCount {
  if (typeof value !== "number" || !ROOM_ROUND_COUNTS.includes(value as RoomRoundCount)) {
    throw new ValidationError(`Round count must be one of: ${ROOM_ROUND_COUNTS.join(", ")}.`);
  }
  return value as RoomRoundCount;
}
