import { describe, expect, it } from "vitest";
import { isValidRoomCodeFormat, normalizeRoomCode } from "@/lib/rooms/roomCode";

describe("normalizeRoomCode", () => {
  it("trims and uppercases", () => {
    expect(normalizeRoomCode(" abcde ")).toBe("ABCDE");
    expect(normalizeRoomCode("PqRsT")).toBe("PQRST");
  });
});

describe("isValidRoomCodeFormat", () => {
  it("accepts 5 characters from the confusable-free alphabet", () => {
    expect(isValidRoomCodeFormat("ABCDE")).toBe(true);
    expect(isValidRoomCodeFormat("23456")).toBe(true);
    expect(isValidRoomCodeFormat("XY9PQ")).toBe(true);
  });

  it("rejects visually confusable characters", () => {
    expect(isValidRoomCodeFormat("ABCD0")).toBe(false); // 0
    expect(isValidRoomCodeFormat("ABCDO")).toBe(false); // O
    expect(isValidRoomCodeFormat("ABCD1")).toBe(false); // 1
    expect(isValidRoomCodeFormat("ABCDI")).toBe(false); // I
    expect(isValidRoomCodeFormat("ABCDL")).toBe(false); // L
  });

  it("rejects the wrong length", () => {
    expect(isValidRoomCodeFormat("ABCD")).toBe(false);
    expect(isValidRoomCodeFormat("ABCDEF")).toBe(false);
    expect(isValidRoomCodeFormat("")).toBe(false);
  });

  it("rejects lowercase (format check runs after normalization, not instead of it)", () => {
    expect(isValidRoomCodeFormat("abcde")).toBe(false);
  });
});
