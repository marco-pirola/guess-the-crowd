import { describe, expect, it } from "vitest";
import { computeQuestionsAnsweredCount } from "@/lib/store/localFileStore";

const PLAYER = "player-1";
const OTHER = "player-2";

describe("computeQuestionsAnsweredCount", () => {
  it("counts only scored predictions for the given player", () => {
    const predictions = [
      { playerId: PLAYER, score: 800 },
      { playerId: PLAYER, score: undefined }, // not yet revealed — doesn't count
      { playerId: OTHER, score: 900 }, // someone else — doesn't count
    ];
    expect(computeQuestionsAnsweredCount(predictions, [], PLAYER)).toBe(1);
  });

  it("adds Quick Play and Daily Challenge scored predictions together", () => {
    const quickPlay = [
      { playerId: PLAYER, score: 800 },
      { playerId: PLAYER, score: 500 },
    ];
    const daily = [
      { playerId: PLAYER, score: 1000 },
      { playerId: PLAYER, score: 700 },
      { playerId: PLAYER, score: 300 },
    ];
    expect(computeQuestionsAnsweredCount(quickPlay, daily, PLAYER)).toBe(5);
  });

  it("returns 0 for a player with no scored predictions anywhere", () => {
    expect(computeQuestionsAnsweredCount([], [], PLAYER)).toBe(0);
  });

  it("diverges from a Quick-Play-only gamesPlayed counter once Daily Challenge questions are answered", () => {
    // gamesPlayed (profiles.games_played / player.gamesPlayed) only ever
    // increments for Quick Play (see getPredictionResult) — Daily Challenge
    // intentionally never touches it. Questions Answered must NOT reuse
    // that number: playing 2 Quick Play questions + all 10 Daily questions
    // should read gamesPlayed=2 but questionsAnswered=12, not 2.
    const quickPlay = [
      { playerId: PLAYER, score: 800 },
      { playerId: PLAYER, score: 650 },
    ];
    const gamesPlayed = quickPlay.length; // mirrors the existing, unchanged gamesPlayed semantics
    const daily = Array.from({ length: 10 }, (_, i) => ({ playerId: PLAYER, score: 100 * i }));

    const questionsAnswered = computeQuestionsAnsweredCount(quickPlay, daily, PLAYER);

    expect(gamesPlayed).toBe(2);
    expect(questionsAnswered).toBe(12);
    expect(questionsAnswered).not.toBe(gamesPlayed);
  });

  it("still counts correctly when a player answers zero Daily questions (no false divergence)", () => {
    const quickPlay = [
      { playerId: PLAYER, score: 800 },
      { playerId: PLAYER, score: 650 },
      { playerId: PLAYER, score: 400 },
    ];
    expect(computeQuestionsAnsweredCount(quickPlay, [], PLAYER)).toBe(3);
  });
});
