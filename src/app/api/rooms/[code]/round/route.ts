import { NextResponse } from "next/server";
import { toErrorResponse } from "@/lib/apiError";
import { assertValidRoomCode } from "@/lib/validation";
import { getPlayerId } from "@/lib/player";
import { getRoomRoundState } from "@/lib/store/roomsStore";

/**
 * Before reveal, get_room_round_state returns only a submitted count and
 * which player ids have submitted — never their predicted percentage or
 * chosen option. This route never has more to give out than that RPC
 * returns, so there is no way for it to leak other players' answers early.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    await getPlayerId();
    const { code: rawCode } = await params;
    const code = assertValidRoomCode(rawCode);

    const roundState = await getRoomRoundState(code);
    return NextResponse.json(roundState);
  } catch (error) {
    return toErrorResponse(error);
  }
}
