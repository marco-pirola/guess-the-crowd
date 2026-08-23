import { describe, expect, it } from "vitest";
import {
  ValidationError,
  assertValidAvatarKey,
  assertValidPercentage,
  assertValidPlayerId,
  assertValidQuestionId,
  assertValidUsername,
  assertValidVoteOption,
} from "@/lib/validation";

describe("assertValidPercentage", () => {
  it("accepts whole numbers from 0 to 100", () => {
    expect(assertValidPercentage(0)).toBe(0);
    expect(assertValidPercentage(64)).toBe(64);
    expect(assertValidPercentage(100)).toBe(100);
  });

  it("rejects negative numbers", () => {
    expect(() => assertValidPercentage(-1)).toThrow(ValidationError);
  });

  it("rejects numbers above 100", () => {
    expect(() => assertValidPercentage(101)).toThrow(ValidationError);
  });

  it("rejects non-integers", () => {
    expect(() => assertValidPercentage(50.5)).toThrow(ValidationError);
  });

  it("rejects NaN and non-numbers", () => {
    expect(() => assertValidPercentage(NaN)).toThrow(ValidationError);
    expect(() => assertValidPercentage("64")).toThrow(ValidationError);
    expect(() => assertValidPercentage(undefined)).toThrow(ValidationError);
  });
});

describe("assertValidVoteOption", () => {
  it("accepts A or B", () => {
    expect(assertValidVoteOption("A")).toBe("A");
    expect(assertValidVoteOption("B")).toBe("B");
  });

  it("rejects anything else", () => {
    expect(() => assertValidVoteOption("C")).toThrow(ValidationError);
    expect(() => assertValidVoteOption("")).toThrow(ValidationError);
  });
});

describe("assertValidPlayerId / assertValidQuestionId", () => {
  it("rejects empty or missing ids", () => {
    expect(() => assertValidPlayerId("")).toThrow(ValidationError);
    expect(() => assertValidPlayerId(undefined)).toThrow(ValidationError);
    expect(() => assertValidQuestionId("")).toThrow(ValidationError);
  });

  it("accepts well-formed ids", () => {
    expect(assertValidPlayerId("00000000-0000-0000-0000-000000000000")).toBeTruthy();
    expect(assertValidQuestionId("pizza-or-burger")).toBe("pizza-or-burger");
  });
});

describe("assertValidUsername", () => {
  it("accepts 3-20 alphanumeric/underscore characters", () => {
    expect(assertValidUsername("abc")).toBe("abc");
    expect(assertValidUsername("Marco_012")).toBe("Marco_012");
    expect(assertValidUsername("a".repeat(20))).toBe("a".repeat(20));
  });

  it("rejects too short or too long names", () => {
    expect(() => assertValidUsername("ab")).toThrow(ValidationError);
    expect(() => assertValidUsername("a".repeat(21))).toThrow(ValidationError);
  });

  it("rejects disallowed characters (spaces, punctuation, emoji)", () => {
    expect(() => assertValidUsername("bad name")).toThrow(ValidationError);
    expect(() => assertValidUsername("bad-name")).toThrow(ValidationError);
    expect(() => assertValidUsername("bad!")).toThrow(ValidationError);
    expect(() => assertValidUsername("")).toThrow(ValidationError);
  });

  it("rejects non-strings", () => {
    expect(() => assertValidUsername(undefined)).toThrow(ValidationError);
    expect(() => assertValidUsername(123)).toThrow(ValidationError);
  });
});

describe("assertValidAvatarKey", () => {
  it("accepts every curated avatar key", () => {
    for (const key of ["fox", "owl", "raven", "hawk", "wolf", "tiger", "lynx"]) {
      expect(assertValidAvatarKey(key)).toBe(key);
    }
  });

  it("rejects anything outside the curated set", () => {
    expect(() => assertValidAvatarKey("cat")).toThrow(ValidationError);
    expect(() => assertValidAvatarKey("")).toThrow(ValidationError);
    expect(() => assertValidAvatarKey(undefined)).toThrow(ValidationError);
  });
});
