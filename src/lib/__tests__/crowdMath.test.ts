import { describe, expect, it } from "vitest";
import {
  computeActualPercentageA,
  computeBlendedPercentageA,
  priorStrengthFromMinimumVotes,
} from "@/lib/crowdMath";

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

describe("priorStrengthFromMinimumVotes", () => {
  it("is 2x minimumVotes", () => {
    expect(priorStrengthFromMinimumVotes(5)).toBe(10);
    expect(priorStrengthFromMinimumVotes(20)).toBe(40);
  });

  it("falls back to the default for invalid input", () => {
    expect(priorStrengthFromMinimumVotes(0)).toBe(10);
    expect(priorStrengthFromMinimumVotes(-3)).toBe(10);
    expect(priorStrengthFromMinimumVotes(NaN)).toBe(10);
  });
});

describe("computeBlendedPercentageA", () => {
  it("returns exactly the seed when there are no real votes yet", () => {
    expect(computeBlendedPercentageA(0, 0, 50, 10)).toBe(50);
    expect(computeBlendedPercentageA(0, 0, 70, 10)).toBe(70);
  });

  it("never lets a single vote produce a false 100%/0% certainty claim", () => {
    // The exact case called out in the spec: one real vote for B only.
    expect(computeBlendedPercentageA(0, 1, 50, 10)).toBe(45); // naive would be 0
    expect(computeBlendedPercentageA(1, 0, 50, 10)).toBe(55); // naive would be 100
  });

  it("matches the worked-example table for seed=50, k=10, converging toward a true 80% split", () => {
    expect(computeBlendedPercentageA(0, 0, 50, 10)).toBe(50);
    expect(computeBlendedPercentageA(1, 0, 50, 10)).toBe(55);
    expect(computeBlendedPercentageA(4, 1, 50, 10)).toBe(60);
    expect(computeBlendedPercentageA(8, 2, 50, 10)).toBe(65);
    expect(computeBlendedPercentageA(16, 4, 50, 10)).toBe(70);
    expect(computeBlendedPercentageA(40, 10, 50, 10)).toBe(75);
    expect(computeBlendedPercentageA(80, 20, 50, 10)).toBe(77);
  });

  it("matches the worked-example table for seed=70, k=10, converging toward a true 80% split", () => {
    expect(computeBlendedPercentageA(0, 0, 70, 10)).toBe(70);
    expect(computeBlendedPercentageA(1, 0, 70, 10)).toBe(73);
    expect(computeBlendedPercentageA(4, 1, 70, 10)).toBe(73);
    expect(computeBlendedPercentageA(8, 2, 70, 10)).toBe(75);
    expect(computeBlendedPercentageA(16, 4, 70, 10)).toBe(77);
    expect(computeBlendedPercentageA(40, 10, 70, 10)).toBe(78);
    expect(computeBlendedPercentageA(80, 20, 70, 10)).toBe(79);
  });

  it("converges toward the raw observed rate as votes grow, monotonically, for two different priors", () => {
    for (const seed of [50, 70]) {
      const trueRateA = 0.8;
      let prevDistanceFromTrue = Infinity;
      for (const total of [0, 1, 5, 10, 20, 50, 100]) {
        const votesA = Math.round(trueRateA * total);
        const votesB = total - votesA;
        const blended = computeBlendedPercentageA(votesA, votesB, seed, 10);
        const distanceFromTrue = Math.abs(blended - 80);
        expect(distanceFromTrue).toBeLessThanOrEqual(prevDistanceFromTrue);
        prevDistanceFromTrue = distanceFromTrue;
      }
    }
  });

  it("moves gradually, never jumping more than a few points between adjacent vote counts", () => {
    let prev = computeBlendedPercentageA(0, 0, 50, 10);
    for (let total = 1; total <= 100; total++) {
      const votesA = Math.round(0.8 * total);
      const votesB = total - votesA;
      const blended = computeBlendedPercentageA(votesA, votesB, 50, 10);
      expect(Math.abs(blended - prev)).toBeLessThanOrEqual(10);
      prev = blended;
    }
  });
});
