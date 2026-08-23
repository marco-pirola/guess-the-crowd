import { NextResponse } from "next/server";
import { assertValidQuestionId, assertValidVoteOption } from "@/lib/validation";
import { toErrorResponse } from "@/lib/apiError";
import { recordDailyVote } from "@/lib/store";
import { getPlayerId } from "@/lib/player";
import { todayUtcDateString } from "@/lib/dailyChallenge";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const questionId = assertValidQuestionId(id);
    const body = await request.json();
    const selectedOption = assertValidVoteOption(body?.selectedOption);

    const playerId = await getPlayerId();
    await recordDailyVote(todayUtcDateString(), questionId, playerId, selectedOption);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
