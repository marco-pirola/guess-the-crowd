import { describe, expect, it } from "vitest";
import {
  DAILY_QUESTION_COUNT,
  DailyCandidateQuestion,
  isDailyComplete,
  selectDailyQuestions,
  sumDailyScore,
  todayUtcDateString,
} from "@/lib/dailyChallenge";
import { QuestionCategory } from "@/lib/types";

const CATEGORIES: QuestionCategory[] = [
  "Food",
  "Movies",
  "Sport",
  "Technology",
  "School",
  "Everyday Life",
  "Random",
  "Internet Culture",
];

function buildCandidates(count: number): DailyCandidateQuestion[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `q-${i}`,
    category: CATEGORIES[i % CATEGORIES.length],
    voteCount: (i * 7) % 23, // arbitrary but deterministic vote counts
  }));
}

describe("todayUtcDateString", () => {
  it("formats as YYYY-MM-DD in UTC", () => {
    const date = new Date(Date.UTC(2026, 5, 3, 23, 59));
    expect(todayUtcDateString(date)).toBe("2026-06-03");
  });
});

describe("selectDailyQuestions", () => {
  const candidates = buildCandidates(50);

  it("picks exactly DAILY_QUESTION_COUNT questions when enough candidates exist", () => {
    const picks = selectDailyQuestions("2026-06-01", candidates, new Set());
    expect(picks).toHaveLength(DAILY_QUESTION_COUNT);
    expect(new Set(picks).size).toBe(DAILY_QUESTION_COUNT); // no duplicates
  });

  it("is deterministic: the same date always produces the same 10 questions", () => {
    const a = selectDailyQuestions("2026-06-01", candidates, new Set());
    const b = selectDailyQuestions("2026-06-01", candidates, new Set());
    expect(a).toEqual(b);
  });

  it("produces every player the same list for a given date (no per-call randomness)", () => {
    const picks = Array.from({ length: 5 }, () =>
      selectDailyQuestions("2026-06-01", candidates, new Set())
    );
    for (const p of picks.slice(1)) {
      expect(p).toEqual(picks[0]);
    }
  });

  it("produces a different set on a different date (in general)", () => {
    const a = selectDailyQuestions("2026-06-01", candidates, new Set());
    const b = selectDailyQuestions("2026-06-02", candidates, new Set());
    expect(a).not.toEqual(b);
  });

  it("avoids questions used within the recency window when the pool is large enough", () => {
    const recentlyUsed = new Set(candidates.slice(0, 10).map((c) => c.id));
    const picks = selectDailyQuestions("2026-06-01", candidates, recentlyUsed);
    const overlap = picks.filter((id) => recentlyUsed.has(id));
    expect(overlap).toHaveLength(0);
  });

  it("falls back to reusing recently-used questions rather than failing when the pool is too small", () => {
    const small = buildCandidates(8);
    const recentlyUsed = new Set(small.map((c) => c.id));
    const picks = selectDailyQuestions("2026-06-01", small, recentlyUsed, 10);
    // Can't reach 10 unique candidates from a pool of 8 either way, but it
    // must return the best available (every distinct candidate) instead of
    // throwing or returning fewer than the pool actually has.
    expect(picks.length).toBe(8);
  });

  it("prefers higher vote counts (more stable crowd estimate) when not constrained by category variety", () => {
    const uniformCategory: DailyCandidateQuestion[] = Array.from({ length: 20 }, (_, i) => ({
      id: `u-${i}`,
      category: "Random",
      voteCount: i,
    }));
    const picks = selectDailyQuestions("2026-06-01", uniformCategory, new Set(), 5);
    // Category cap would normally apply, but with only one category present
    // the cap-relaxation fallback kicks in — the top-5 by vote count should
    // still be favored overall since ranking is vote-count desc before the
    // category pass.
    const pickedVotes = picks.map((id) => Number(id.split("-")[1]));
    const avgPicked = pickedVotes.reduce((a, b) => a + b, 0) / pickedVotes.length;
    expect(avgPicked).toBeGreaterThan(9.5); // top half of 0..19 has avg 14.5
  });

  it("caps at most 2 per category when enough variety is available", () => {
    const picks = selectDailyQuestions("2026-06-01", candidates, new Set());
    const byCategory = new Map<string, number>();
    for (const id of picks) {
      const category = candidates.find((c) => c.id === id)!.category;
      byCategory.set(category, (byCategory.get(category) ?? 0) + 1);
    }
    for (const count of byCategory.values()) {
      expect(count).toBeLessThanOrEqual(2);
    }
  });

  it("returns an empty array for an empty candidate pool instead of throwing", () => {
    expect(selectDailyQuestions("2026-06-01", [], new Set())).toEqual([]);
  });
});

describe("sumDailyScore", () => {
  it("sums the ten existing question scores — no new scoring formula", () => {
    const tenScores = [1000, 900, 850, 700, 650, 500, 420, 300, 150, 0];
    expect(sumDailyScore(tenScores)).toBe(5470);
  });

  it("a perfect run of 10 sums to the documented 10,000 maximum", () => {
    expect(sumDailyScore(Array(10).fill(1000))).toBe(10000);
  });

  it("returns 0 for no scores", () => {
    expect(sumDailyScore([])).toBe(0);
  });
});

describe("isDailyComplete", () => {
  it("is false until every one of today's questions has been scored", () => {
    for (let i = 0; i < 10; i++) {
      expect(isDailyComplete(i, 10)).toBe(false);
    }
  });

  it("is true once the scored count reaches the challenge's question count", () => {
    expect(isDailyComplete(10, 10)).toBe(true);
    expect(isDailyComplete(11, 10)).toBe(true); // defensive: never blocks on a stray extra row
  });

  it("is false for an empty/not-yet-generated challenge (avoids a false-positive completion)", () => {
    expect(isDailyComplete(0, 0)).toBe(false);
  });
});
