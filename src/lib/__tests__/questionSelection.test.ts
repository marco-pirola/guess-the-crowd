import { describe, expect, it } from "vitest";
import { pickNextQuestionId, SelectableQuestion } from "@/lib/questionSelection";

function pool(n: number): SelectableQuestion[] {
  return Array.from({ length: n }, (_, i) => ({ id: `q${i}` }));
}

/** Deterministic RNG: always returns the same fraction, e.g. always picks index 0. */
function fixedRandom(fraction: number): () => number {
  return () => fraction;
}

describe("pickNextQuestionId", () => {
  it("returns a question id that exists in the pool", () => {
    const p = pool(10);
    const id = pickNextQuestionId(p, { random: fixedRandom(0.5) });
    expect(p.some((q) => q.id === id)).toBe(true);
  });

  it("never immediately repeats the current question", () => {
    const p = pool(5);
    // Sweep the RNG across the whole [0, 1) range and confirm currentId never comes back.
    for (let i = 0; i < 100; i++) {
      const id = pickNextQuestionId(p, { currentId: "q2", random: fixedRandom(i / 100) });
      expect(id).not.toBe("q2");
    }
  });

  it("excludes recently seen questions when the pool is large enough", () => {
    const p = pool(10);
    const recentIds = ["q1", "q2", "q3", "q4"];
    for (let i = 0; i < 100; i++) {
      const id = pickNextQuestionId(p, { currentId: "q0", recentIds, random: fixedRandom(i / 100) });
      expect(recentIds).not.toContain(id);
      expect(id).not.toBe("q0");
    }
  });

  it("falls back to allowing recent questions when the pool is too small to exclude them all", () => {
    // Only 2 questions total; current + "recent" would exclude everything.
    const p = pool(2);
    const id = pickNextQuestionId(p, { currentId: "q0", recentIds: ["q0", "q1"], random: fixedRandom(0.5) });
    // Still must return a valid question — falls back to excluding just currentId.
    expect(id).toBe("q1");
  });

  it("still returns the only question available in a single-question pool", () => {
    const p = pool(1);
    const id = pickNextQuestionId(p, { currentId: "q0", recentIds: ["q0"], random: fixedRandom(0.5) });
    expect(id).toBe("q0");
  });

  it("never gets stuck across a long run of repeated selection", () => {
    const p = pool(8);
    let currentId: string | null = null;
    const recent: string[] = [];
    for (let i = 0; i < 200; i++) {
      const id = pickNextQuestionId(p, { currentId, recentIds: recent, random: Math.random });
      expect(p.some((q) => q.id === id)).toBe(true);
      if (currentId) expect(id).not.toBe(currentId);
      recent.push(id);
      if (recent.length > 4) recent.shift();
      currentId = id;
    }
  });

  it("throws only when the pool itself is empty", () => {
    expect(() => pickNextQuestionId([])).toThrow();
  });

  it("distributes across the whole pool rather than always picking the same candidate", () => {
    const p = pool(4);
    const seen = new Set<string>();
    for (let i = 0; i < 4; i++) {
      seen.add(pickNextQuestionId(p, { random: fixedRandom(i / 4) }));
    }
    expect(seen.size).toBe(4);
  });
});
