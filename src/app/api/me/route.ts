import { NextRequest, NextResponse } from "next/server";
import { toErrorResponse } from "@/lib/apiError";
import {
  getOrCreatePlayer,
  getPlayerRank,
  getQuestionsAnsweredCount,
  updateAvatar,
  updateUsername,
} from "@/lib/store";
import { getPlayerId } from "@/lib/player";
import { assertValidAvatarKey, assertValidUsername } from "@/lib/validation";
import { usernameCooldownStatus } from "@/lib/usernameCooldown";
import { Player } from "@/lib/types";

async function summarize(playerId: string, player: Player) {
  const [rank, questionsAnswered] = await Promise.all([
    getPlayerRank(playerId),
    getQuestionsAnsweredCount(playerId),
  ]);
  return {
    username: player.username,
    avatarKey: player.avatarKey,
    hasCustomUsername: player.usernameChangedAt !== null,
    bestScore: player.bestScore ?? 0,
    currentStreak: player.currentStreak,
    longestStreak: player.longestStreak,
    totalScore: player.totalScore,
    // Games Played keeps its existing, Quick-Play-only meaning (unchanged).
    // Questions Answered is a separate count — every scored question across
    // Quick Play AND Daily Challenge (see getQuestionsAnsweredCount) — so the
    // two are free to diverge, e.g. once a player has played the Daily.
    gamesPlayed: player.gamesPlayed,
    questionsAnswered,
    globalRank: rank,
    ...usernameCooldownStatus(player.usernameChangedAt),
  };
}

export async function GET() {
  try {
    const playerId = await getPlayerId();
    const player = await getOrCreatePlayer(playerId);
    return NextResponse.json(await summarize(playerId, player));
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const playerId = await getPlayerId();
    const body = await request.json();
    let player = await getOrCreatePlayer(playerId);

    if (typeof body.username === "string") {
      const username = assertValidUsername(body.username);
      player = await updateUsername(playerId, username);
    }
    if (typeof body.avatarKey === "string") {
      const avatarKey = assertValidAvatarKey(body.avatarKey);
      player = await updateAvatar(playerId, avatarKey);
    }

    return NextResponse.json(await summarize(playerId, player));
  } catch (error) {
    return toErrorResponse(error);
  }
}
