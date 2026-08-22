import { NextResponse } from "next/server";
import { assertValidQuestionId } from "@/lib/validation";
import { toErrorResponse } from "@/lib/apiError";
import { getPredictionResult } from "@/lib/store";
import { getPlayerId } from "@/lib/player";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const questionId = assertValidQuestionId(id);
    const playerId = await getPlayerId();
    const result = await getPredictionResult(questionId, playerId);
    return NextResponse.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}
