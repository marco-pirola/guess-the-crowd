import { describe, expect, it } from "vitest";
import { calculatePercentile, calculatePredictionScore, getPredictionError } from "@/lib/scoring";

describe("calculatePredictionScore", () => {
  it("gives the maximum score for a perfect prediction", () => {
    expect(calculatePredictionScore(60, 60)).toBe(1000);
  });

  it("gives a very high score for a 1-point miss", () => {
    const score = calculatePredictionScore(60, 61);
    expect(score).toBeGreaterThan(900);
    expect(score).toBeLessThan(1000);
  });

  it("gives a lower score for a bigger miss", () => {
    const close = calculatePredictionScore(60, 61);
    const far = calculatePredictionScore(60, 80);
    expect(far).toBeLessThan(close);
  });

  it("gives the minimum score for a complete miss", () => {
    expect(calculatePredictionScore(0, 100)).toBe(0);
    expect(calculatePredictionScore(100, 0)).toBe(0);
  });

  it("is symmetric regardless of which side is predicted vs actual", () => {
    expect(calculatePredictionScore(30, 40)).toBe(calculatePredictionScore(40, 30));
  });

  it("never returns a value outside [0, 1000]", () => {
    for (let predicted = 0; predicted <= 100; predicted += 10) {
      for (let actual = 0; actual <= 100; actual += 10) {
        const score = calculatePredictionScore(predicted, actual);
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(1000);
      }
    }
  });
});

describe("getPredictionError", () => {
  it("returns the absolute difference", () => {
    expect(getPredictionError(64, 61)).toBe(3);
    expect(getPredictionError(10, 61)).toBe(51);
  });
});

describe("calculatePercentile", () => {
  it("returns null when there is not enough data", () => {
    expect(calculatePercentile(900, [800, 700])).toBeNull();
  });

  it("returns the share of scores at or below this one", () => {
    const all = [100, 200, 300, 400, 500];
    expect(calculatePercentile(300, all)).toBe(60);
  });
});
