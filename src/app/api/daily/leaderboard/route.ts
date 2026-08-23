import { NextResponse } from "next/server";
import { toErrorResponse } from "@/lib/apiError";
import { getDailyLeaderboard } from "@/lib/store";
import { getPlayerId } from "@/lib/player";
import { todayUtcDateString } from "@/lib/dailyChallenge";

export async function GET() {
  try {
    const playerId = await getPlayerId();
    const date = todayUtcDateString();
    const leaderboard = await getDailyLeaderboard(date, playerId);
    return NextResponse.json({ date, leaderboard });
  } catch (error) {
    return toErrorResponse(error);
  }
}
