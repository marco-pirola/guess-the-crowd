import { TranslationKey } from "@/lib/i18n/translations";

/**
 * Maps a room-related GameFlowError code (see src/lib/store/errors.ts) to
 * its translated message key. INVALID_PREDICTION/INVALID_OPTION are
 * omitted on purpose — the UI never lets those reach the API (the slider
 * and answer buttons already guarantee valid values), so they fall through
 * to the generic message like any other unexpected error.
 */
const ROOM_ERROR_KEYS: Record<string, TranslationKey> = {
  ROOMS_UNAVAILABLE: "room_error_unavailable",
  ROOM_NOT_FOUND: "room_error_notFound",
  ROOM_FULL: "room_error_full",
  ROOM_ALREADY_STARTED: "room_error_alreadyStarted",
  NOT_HOST: "room_error_notHost",
  NOT_ROOM_MEMBER: "room_error_notMember",
  ALREADY_SUBMITTED: "room_error_alreadySubmitted",
  ROUND_NOT_ACTIVE: "room_error_roundNotActive",
  ROUND_NOT_REVEALED: "room_error_roundNotRevealed",
  TOO_MANY_ACTIVE_ROOMS: "room_error_tooManyActiveRooms",
  TOO_MANY_JOIN_ATTEMPTS: "room_error_tooManyJoinAttempts",
  NOT_ENOUGH_QUESTIONS: "room_error_notEnoughQuestions",
  INVALID_NICKNAME: "room_error_invalidNickname",
  INVALID_MAX_PLAYERS: "room_error_invalidMaxPlayers",
  INVALID_ROUND_COUNT: "room_error_invalidRoundCount",
};

export function roomErrorTranslationKey(code: string | undefined): TranslationKey {
  return (code && ROOM_ERROR_KEYS[code]) || "room_error_generic";
}
