import { NextResponse } from "next/server";
import { toErrorResponse } from "@/lib/apiError";
import { assertValidRoomCode } from "@/lib/validation";
import { getPlayerId } from "@/lib/player";
import { leaveRoom } from "@/lib/store/roomsStore";
import { broadcastRoomUpdate } from "@/lib/rooms/broadcastRoomUpdate";

export async function POST(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    await getPlayerId();
    const { code: rawCode } = await params;
    const code = assertValidRoomCode(rawCode);

    const roomId = await leaveRoom(code);
    // roomId is null only if the code didn't match any room — nothing to
    // notify in that case. Otherwise, tell the remaining connected clients
    // to refetch (same "content-free signal" pattern as every other action).
    if (roomId) await broadcastRoomUpdate(roomId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
