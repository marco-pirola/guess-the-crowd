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
  ) {
    super(message);
  }
}
