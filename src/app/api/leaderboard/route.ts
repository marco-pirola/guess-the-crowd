import { NextResponse } from "next/server";
import { toErrorResponse } from "@/lib/apiError";
import { getLeaderboard, getLeaderboardContext } from "@/lib/store";
import { getPlayerId } from "@/lib/player";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const range = searchParams.get("range") === "all" ? "all" : "today";
    const playerId = await getPlayerId();
    const [leaderboard, context] = await Promise.all([
      getLeaderboard(range, playerId),
      getLeaderboardContext(range, playerId),
    ]);
    return NextResponse.json({ range, leaderboard, context });
  } catch (error) {
    return toErrorResponse(error);
  }
}
