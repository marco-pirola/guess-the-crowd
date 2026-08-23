import { describe, expect, it } from "vitest";
import { computeActualPercentageA } from "@/lib/crowdMath";

describe("computeActualPercentageA", () => {
  it("matches the worked example: 2 of 3 votes for A rounds to 67%", () => {
    const a = computeActualPercentageA(2, 3);
    expect(a).toBe(67);
    expect(100 - a).toBe(33); // B is always the complement, never independently rounded
  });

  it("handles a single real vote correctly (no fabricated crowd)", () => {
    expect(computeActualPercentageA(1, 1)).toBe(100);
    expect(computeActualPercentageA(0, 1)).toBe(0);
  });

  it("handles zero votes without dividing by zero", () => {
    expect(computeActualPercentageA(0, 0)).toBe(0);
  });

  it("always produces a value whose complement is a whole number summing to 100", () => {
    for (let votesA = 0; votesA <= 20; votesA++) {
      for (let total = votesA; total <= 20; total++) {
        if (total === 0) continue;
        const a = computeActualPercentageA(votesA, total);
        expect(Number.isInteger(a)).toBe(true);
        expect(a).toBeGreaterThanOrEqual(0);
        expect(a).toBeLessThanOrEqual(100);
        expect(a + (100 - a)).toBe(100);
      }
    }
  });
});
