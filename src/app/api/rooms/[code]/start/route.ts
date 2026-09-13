import { NextResponse } from "next/server";
import { toErrorResponse } from "@/lib/apiError";
import { assertValidRoomCode } from "@/lib/validation";
import { getPlayerId } from "@/lib/player";
import { startRoom } from "@/lib/store/roomsStore";
import { broadcastRoomUpdate } from "@/lib/rooms/broadcastRoomUpdate";

export async function POST(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    await getPlayerId();
    const { code: rawCode } = await params;
    const code = assertValidRoomCode(rawCode);

    // start_room re-checks auth.uid() === rooms.host_id server-side — this
    // route never trusts a client-side "I'm the host" assumption.
    const roomId = await startRoom(code);
    await broadcastRoomUpdate(roomId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
