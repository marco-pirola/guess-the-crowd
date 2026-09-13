/** Shared by every store backend (local file, Supabase) so callers can catch one error type. */
export class GameFlowError extends Error {
  constructor(
    message: string,
    public code:
      | "QUESTION_NOT_FOUND"
      | "ALREADY_PREDICTED"
      | "ALREADY_VOTED"
      | "PREDICT_BEFORE_VOTE"
      | "VOTE_BEFORE_RESULT"
      | "USERNAME_TAKEN"
      | "USERNAME_COOLDOWN"
      // Rooms (see supabase/migration_rooms.sql) — Quick Play/Daily codes above are untouched.
      | "ROOMS_UNAVAILABLE"
      | "ROOM_NOT_FOUND"
      | "ROOM_FULL"
      | "ROOM_ALREADY_STARTED"
      | "NOT_HOST"
      | "NOT_ROOM_MEMBER"
      | "ALREADY_SUBMITTED"
      | "ROUND_NOT_ACTIVE"
      | "ROUND_NOT_REVEALED"
      | "TOO_MANY_ACTIVE_ROOMS"
      | "TOO_MANY_JOIN_ATTEMPTS"
      | "NOT_ENOUGH_QUESTIONS"
      | "INVALID_NICKNAME"
      | "INVALID_MAX_PLAYERS"
      | "INVALID_ROUND_COUNT"
      | "INVALID_PREDICTION"
      | "INVALID_OPTION"
  ) {
    super(message);
  }
}
