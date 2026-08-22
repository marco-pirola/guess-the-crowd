import { NextResponse } from "next/server";
import { assertValidPercentage, assertValidQuestionId } from "@/lib/validation";
import { toErrorResponse } from "@/lib/apiError";
import { getOrCreatePlayer, recordPrediction } from "@/lib/store";
import { getPlayerId } from "@/lib/player";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const questionId = assertValidQuestionId(id);
    const body = await request.json();
    const predictedPercentageA = assertValidPercentage(body?.predictedPercentageA);

    const playerId = await getPlayerId();
    await getOrCreatePlayer(playerId);
    await recordPrediction(questionId, playerId, predictedPercentageA);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
