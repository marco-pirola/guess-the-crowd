import { describe, expect, it } from "vitest";
import { seedQuestions } from "@/lib/store/seedQuestions";

const VALID_CATEGORIES = new Set([
  "Food",
  "Movies",
  "Sport",
  "Technology",
  "School",
  "Everyday Life",
  "Random",
  "Internet Culture",
]);

describe("seedQuestions", () => {
  it("has a healthy pool size (roughly 300-500 questions)", () => {
    expect(seedQuestions.length).toBeGreaterThanOrEqual(300);
    expect(seedQuestions.length).toBeLessThanOrEqual(500);
  });

  it("has no duplicate ids", () => {
    const ids = seedQuestions.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has no duplicate question text", () => {
    const texts = seedQuestions.map((q) => q.text);
    expect(new Set(texts).size).toBe(texts.length);
  });

  it("every question has exactly two non-empty, distinct options", () => {
    for (const q of seedQuestions) {
      expect(q.optionA.trim().length).toBeGreaterThan(0);
      expect(q.optionB.trim().length).toBeGreaterThan(0);
      expect(q.optionA).not.toBe(q.optionB);
    }
  });

  it("every question has non-empty text and emojis", () => {
    for (const q of seedQuestions) {
      expect(q.text.trim().length).toBeGreaterThan(0);
      expect(q.emojiA.trim().length).toBeGreaterThan(0);
      expect(q.emojiB.trim().length).toBeGreaterThan(0);
    }
  });

  it("every question has a valid category", () => {
    for (const q of seedQuestions) {
      expect(VALID_CATEGORIES.has(q.category)).toBe(true);
    }
  });

  it("every question has a valid id (kebab-case, non-empty)", () => {
    for (const q of seedQuestions) {
      expect(q.id).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it("every seeded result percentage is between 0 and 100", () => {
    for (const q of seedQuestions) {
      expect(q.seededResultPercentageA).toBeGreaterThanOrEqual(0);
      expect(q.seededResultPercentageA).toBeLessThanOrEqual(100);
      expect(Number.isInteger(q.seededResultPercentageA)).toBe(true);
    }
  });

  it("every question is published with a positive minimum vote threshold", () => {
    for (const q of seedQuestions) {
      expect(q.status).toBe("published");
      expect(q.minimumVotes).toBeGreaterThan(0);
    }
  });

  it("keeps category distribution reasonably balanced (no category dominates)", () => {
    const counts = new Map<string, number>();
    for (const q of seedQuestions) {
      counts.set(q.category, (counts.get(q.category) ?? 0) + 1);
    }
    const max = Math.max(...counts.values());
    const min = Math.min(...counts.values());
    // No category should be wildly over- or under-represented.
    expect(max).toBeLessThanOrEqual(min * 2);
  });
});
