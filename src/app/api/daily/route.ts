import { NextResponse } from "next/server";
import { toErrorResponse } from "@/lib/apiError";
import { getDailyStatus, getOrCreateDailyChallenge } from "@/lib/store";
import { getPlayerId } from "@/lib/player";
import { todayUtcDateString } from "@/lib/dailyChallenge";
import { DailyChallengeStatus } from "@/lib/types";

export async function GET() {
  try {
    const playerId = await getPlayerId();
    const date = todayUtcDateString();
    const questionIds = await getOrCreateDailyChallenge(date);
    const { answeredCount, officialScore, dailyRank } = await getDailyStatus(date, playerId);

    const status: DailyChallengeStatus = {
      date,
      questionIds,
      answeredCount,
      completed: officialScore !== null,
      officialScore,
      dailyRank,
    };
    return NextResponse.json(status);
  } catch (error) {
    return toErrorResponse(error);
  }
}
