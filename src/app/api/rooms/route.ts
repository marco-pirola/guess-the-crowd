import { NextResponse } from "next/server";
import { toErrorResponse } from "@/lib/apiError";
import { assertValidMaxPlayers, assertValidNickname, assertValidRoundCount } from "@/lib/validation";
import { getPlayerId } from "@/lib/player";
import { createRoom } from "@/lib/store/roomsStore";

export async function POST(request: Request) {
  try {
    await getPlayerId();
    const body = await request.json();
    const nickname = assertValidNickname(body?.nickname);
    const maxPlayers = assertValidMaxPlayers(body?.maxPlayers);
    const roundCount = assertValidRoundCount(body?.roundCount);

    const room = await createRoom(nickname, maxPlayers, roundCount);
    return NextResponse.json(room);
  } catch (error) {
    return toErrorResponse(error);
  }
}
