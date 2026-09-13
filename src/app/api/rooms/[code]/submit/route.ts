import { NextResponse } from "next/server";
import { toErrorResponse } from "@/lib/apiError";
import { assertValidPercentage, assertValidRoomCode, assertValidVoteOption } from "@/lib/validation";
import { getPlayerId } from "@/lib/player";
import { submitRound } from "@/lib/store/roomsStore";
import { broadcastRoomUpdate } from "@/lib/rooms/broadcastRoomUpdate";

export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    await getPlayerId();
    const { code: rawCode } = await params;
    const code = assertValidRoomCode(rawCode);
    const body = await request.json();
    const predictedPercentageA = assertValidPercentage(body?.predictedPercentageA);
    const selectedOption = assertValidVoteOption(body?.selectedOption);

    // One atomic action (prediction + choice together) — no separate
    // predict/vote phases for rooms. The database's composite primary key
    // on room_submissions is what actually prevents a duplicate submission.
    const roomId = await submitRound(code, predictedPercentageA, selectedOption);
    await broadcastRoomUpdate(roomId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
