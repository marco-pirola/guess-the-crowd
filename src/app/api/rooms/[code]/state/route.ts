import { NextResponse } from "next/server";
import { toErrorResponse } from "@/lib/apiError";
import { assertValidRoomCode } from "@/lib/validation";
import { getPlayerId } from "@/lib/player";
import { getRoomState } from "@/lib/store/roomsStore";

export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const playerId = await getPlayerId();
    const { code: rawCode } = await params;
    const code = assertValidRoomCode(rawCode);

    const state = await getRoomState(code);
    // playerId is added at this route layer only (not part of RoomState /
    // get_room_state itself) — the UI needs to know "which player is me" to
    // compute host/self highlighting client-side, and getPlayerId() is
    // already called above for every request regardless.
    return NextResponse.json({ ...state, playerId });
  } catch (error) {
    return toErrorResponse(error);
  }
}
