import { NextResponse } from "next/server";
import { ValidationError } from "@/lib/validation";
import { GameFlowError } from "@/lib/store";

const GAME_FLOW_STATUS: Record<GameFlowError["code"], number> = {
  QUESTION_NOT_FOUND: 404,
  ALREADY_PREDICTED: 409,
  ALREADY_VOTED: 409,
  PREDICT_BEFORE_VOTE: 403,
  VOTE_BEFORE_RESULT: 403,
  USERNAME_TAKEN: 409,
  USERNAME_COOLDOWN: 403,
  // Rooms
  ROOMS_UNAVAILABLE: 503,
  ROOM_NOT_FOUND: 404,
  ROOM_FULL: 409,
  ROOM_ALREADY_STARTED: 409,
  NOT_HOST: 403,
  NOT_ROOM_MEMBER: 403,
  ALREADY_SUBMITTED: 409,
  ROUND_NOT_ACTIVE: 403,
  ROUND_NOT_REVEALED: 403,
  TOO_MANY_ACTIVE_ROOMS: 429,
  TOO_MANY_JOIN_ATTEMPTS: 429,
  NOT_ENOUGH_QUESTIONS: 503,
  INVALID_NICKNAME: 400,
  INVALID_MAX_PLAYERS: 400,
  INVALID_ROUND_COUNT: 400,
  INVALID_PREDICTION: 400,
  INVALID_OPTION: 400,
};

/** Maps known domain errors to sensible HTTP responses; never leaks stack traces. */
export function toErrorResponse(error: unknown): NextResponse {
  if (error instanceof ValidationError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (error instanceof GameFlowError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: GAME_FLOW_STATUS[error.code] }
    );
  }
  console.error(error);
  return NextResponse.json(
    { error: "Something went wrong. Try again." },
    { status: 500 }
  );
}
