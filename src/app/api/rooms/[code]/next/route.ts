import { NextResponse } from "next/server";
import { toErrorResponse } from "@/lib/apiError";
import { assertValidRoomCode } from "@/lib/validation";
import { getPlayerId } from "@/lib/player";
import { nextRound } from "@/lib/store/roomsStore";
import { broadcastRoomUpdate } from "@/lib/rooms/broadcastRoomUpdate";

export async function POST(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    await getPlayerId();
    const { code: rawCode } = await params;
    const code = assertValidRoomCode(rawCode);

    // next_round re-checks auth.uid() === rooms.host_id server-side.
    const roomId = await nextRound(code);
    await broadcastRoomUpdate(roomId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
