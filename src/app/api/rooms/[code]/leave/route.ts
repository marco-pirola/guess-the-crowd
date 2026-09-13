import { NextResponse } from "next/server";
import { toErrorResponse } from "@/lib/apiError";
import { assertValidRoomCode } from "@/lib/validation";
import { getPlayerId } from "@/lib/player";
import { leaveRoom } from "@/lib/store/roomsStore";

export async function POST(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    await getPlayerId();
    const { code: rawCode } = await params;
    const code = assertValidRoomCode(rawCode);

    await leaveRoom(code);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
