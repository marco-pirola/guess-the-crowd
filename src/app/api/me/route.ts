import { NextResponse } from "next/server";
import { toErrorResponse } from "@/lib/apiError";
import { getOrCreatePlayer } from "@/lib/store";
import { getPlayerId } from "@/lib/player";

export async function GET() {
  try {
    const playerId = await getPlayerId();
    const player = await getOrCreatePlayer(playerId);
    return NextResponse.json({
      username: player.username,
      currentStreak: player.currentStreak,
      longestStreak: player.longestStreak,
      totalScore: player.totalScore,
      gamesPlayed: player.gamesPlayed,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
