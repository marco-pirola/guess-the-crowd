import { NextResponse } from "next/server";
import { toErrorResponse } from "@/lib/apiError";
import { assertValidRoomCode } from "@/lib/validation";
import { getPlayerId } from "@/lib/player";
import { getRoomLeaderboard } from "@/lib/store/roomsStore";

export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const playerId = await getPlayerId();
    const { code: rawCode } = await params;
    const code = assertValidRoomCode(rawCode);

    const leaderboard = await getRoomLeaderboard(code, playerId);
    return NextResponse.json(leaderboard);
  } catch (error) {
    return toErrorResponse(error);
  }
}
