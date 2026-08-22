import { NextResponse } from "next/server";
import { assertValidQuestionId, assertValidVoteOption } from "@/lib/validation";
import { toErrorResponse } from "@/lib/apiError";
import { recordVote } from "@/lib/store";
import { getPlayerId } from "@/lib/player";

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
    await recordVote(questionId, playerId, selectedOption);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
