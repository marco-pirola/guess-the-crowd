import { describe, expect, it } from "vitest";
import { computeDailyRank } from "@/lib/store/localFileStore";

const DATE = "2026-08-23";
const OTHER_DATE = "2026-08-22";
const ME = "player-me";

interface Row {
  challengeDate: string;
  playerId: string;
  totalScore: number;
}

/**
 * Regression tests for the get_daily_status semantic fix (Part: Crowd
 * Confidence audit) — daily_rank must be null (not a placeholder like 1)
 * for a player who hasn't completed today's Daily Challenge, even when
 * other players have. This is the exact contract get_daily_status
 * (supabase/migration_daily_challenge.sql) must also satisfy; that SQL
 * function can't be exercised by this test suite (no Postgres in `npm
 * test`), so this pins the reference TS behavior the SQL was fixed to match.
 */
describe("computeDailyRank", () => {
  it("is null when the player has no result for that date, even with no other players either", () => {
    expect(computeDailyRank([], DATE, ME)).toBeNull();
  });

  it("is null when the player hasn't completed, even though other players HAVE completed with real scores", () => {
    // This is exactly the bug: a naive implementation that defaults the
    // player's own (missing) score to some large sentinel before comparing
    // would count zero players as "better" and report rank 1 — as if the
    // player were in first place despite not having played at all.
    const rows: Row[] = [
      { challengeDate: DATE, playerId: "p1", totalScore: 9000 },
      { challengeDate: DATE, playerId: "p2", totalScore: 5000 },
      { challengeDate: DATE, playerId: "p3", totalScore: 100 },
    ];
    expect(computeDailyRank(rows, DATE, ME)).toBeNull();
  });

  it("is 1 when the player has completed and nobody scored higher", () => {
    const rows: Row[] = [{ challengeDate: DATE, playerId: ME, totalScore: 10000 }];
    expect(computeDailyRank(rows, DATE, ME)).toBe(1);
  });

  it("correctly ranks the player among others once they've completed", () => {
    const rows: Row[] = [
      { challengeDate: DATE, playerId: "p1", totalScore: 9000 },
      { challengeDate: DATE, playerId: ME, totalScore: 5000 },
      { challengeDate: DATE, playerId: "p3", totalScore: 100 },
    ];
    expect(computeDailyRank(rows, DATE, ME)).toBe(2);
  });

  it("ties do not skip a rank ahead of the tied player (equal scores don't count as 'better')", () => {
    const rows: Row[] = [
      { challengeDate: DATE, playerId: "p1", totalScore: 5000 },
      { challengeDate: DATE, playerId: ME, totalScore: 5000 },
    ];
    expect(computeDailyRank(rows, DATE, ME)).toBe(1);
  });

  it("only considers results for the requested date, not other dates", () => {
    const rows: Row[] = [
      { challengeDate: OTHER_DATE, playerId: "p1", totalScore: 9999 },
      { challengeDate: DATE, playerId: ME, totalScore: 500 },
    ];
    expect(computeDailyRank(rows, DATE, ME)).toBe(1);
  });
});
