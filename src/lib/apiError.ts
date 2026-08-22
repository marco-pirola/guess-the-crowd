import { NextResponse } from "next/server";
import { ValidationError } from "@/lib/validation";
import { GameFlowError } from "@/lib/store";

const GAME_FLOW_STATUS: Record<GameFlowError["code"], number> = {
  QUESTION_NOT_FOUND: 404,
  ALREADY_PREDICTED: 409,
  ALREADY_VOTED: 409,
  PREDICT_BEFORE_VOTE: 403,
  VOTE_BEFORE_RESULT: 403,
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
