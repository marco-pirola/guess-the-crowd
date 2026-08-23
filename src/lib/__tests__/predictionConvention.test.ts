import { describe, expect, it } from "vitest";
import { predictedAFromRightPercent, rightPercentFromPredictedA } from "@/lib/predictionConvention";

describe("prediction slider convention", () => {
  it("matches the worked example: right option at 70% means left is 30%", () => {
    expect(predictedAFromRightPercent(70)).toBe(30);
  });

  it("matches the extremes", () => {
    expect(predictedAFromRightPercent(0)).toBe(100); // slider at left end: LEFT = 100%
    expect(predictedAFromRightPercent(100)).toBe(0); // slider at right end: RIGHT = 100%
  });

  it("matches the center", () => {
    expect(predictedAFromRightPercent(50)).toBe(50);
  });

  it("always sums to exactly 100 for every integer position, with no float drift", () => {
    for (let right = 0; right <= 100; right++) {
      const left = predictedAFromRightPercent(right);
      expect(left + right).toBe(100);
      expect(Number.isInteger(left)).toBe(true);
    }
  });

  it("round-trips through rightPercentFromPredictedA", () => {
    for (let a = 0; a <= 100; a++) {
      expect(predictedAFromRightPercent(rightPercentFromPredictedA(a))).toBe(a);
    }
  });
});
