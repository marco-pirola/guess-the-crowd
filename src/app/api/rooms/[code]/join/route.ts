import { NextResponse } from "next/server";
import { toErrorResponse } from "@/lib/apiError";
import { assertValidNickname, assertValidRoomCode } from "@/lib/validation";
import { getPlayerId } from "@/lib/player";
import { joinRoom } from "@/lib/store/roomsStore";
import { broadcastRoomUpdate } from "@/lib/rooms/broadcastRoomUpdate";

export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    await getPlayerId();
    const { code: rawCode } = await params;
    const code = assertValidRoomCode(rawCode);
    const body = await request.json();
    const nickname = assertValidNickname(body?.nickname);

    const room = await joinRoom(code, nickname);
    // Without this, a player already sitting in the lobby never learns a new
    // player joined until they manually refresh — see room_updated's
    // consumers in src/lib/rooms/useRoomChannel.ts.
    await broadcastRoomUpdate(room.id);
    return NextResponse.json({ code: room.code });
  } catch (error) {
    return toErrorResponse(error);
  }
}
