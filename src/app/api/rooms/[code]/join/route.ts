import { NextResponse } from "next/server";
import { toErrorResponse } from "@/lib/apiError";
import { assertValidNickname, assertValidRoomCode } from "@/lib/validation";
import { getPlayerId } from "@/lib/player";
import { joinRoom } from "@/lib/store/roomsStore";

export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    await getPlayerId();
    const { code: rawCode } = await params;
    const code = assertValidRoomCode(rawCode);
    const body = await request.json();
    const nickname = assertValidNickname(body?.nickname);

    const room = await joinRoom(code, nickname);
    return NextResponse.json(room);
  } catch (error) {
    return toErrorResponse(error);
  }
}
