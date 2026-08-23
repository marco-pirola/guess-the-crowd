import { QuestionCategory } from "@/lib/types";

export function todayUtcDateString(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export const DAILY_QUESTION_COUNT = 10;
/** A question already used in the last N days is avoided when there's a large-enough pool to do so. */
export const RECENCY_WINDOW_DAYS = 14;
/** Soft cap: prefer at most this many questions per category before relaxing. */
const MAX_PER_CATEGORY = 2;

export interface DailyCandidateQuestion {
  id: string;
  category: QuestionCategory;
  /** Real votes so far (Quick Play + Daily, pooled) — used as a stability proxy: more votes = tighter posterior. */
  voteCount: number;
}

// ── deterministic PRNG, seeded from the UTC date string ────────────────────
// Same date -> same seed -> same shuffle -> same picks, for everyone. Not
// cryptographic — just needs to be stable and well-distributed.
function hashString(s: string): number {
  let h = 1779033703 ^ s.length;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function deterministicShuffle<T>(arr: T[], rng: () => number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Deterministic per-date selection of DAILY_QUESTION_COUNT questions:
 *  1. deterministically shuffle the candidate pool (seeded by the date
 *     string) so ties/ordering are reproducible, not insertion-order-biased;
 *  2. prefer questions not used in the last RECENCY_WINDOW_DAYS, but fall
 *     back to the full pool if that leaves too few candidates (never blocks
 *     on a small pool);
 *  3. rank by real vote count desc (more votes = a more stable crowd
 *     estimate under the Bayesian blend in src/lib/crowdMath.ts);
 *  4. greedily enforce category variety (cap MAX_PER_CATEGORY), relaxing the
 *     cap only if there still aren't enough picks.
 *
 * Pure and DB-free so it's directly testable; the caller (store layer) is
 * responsible for persisting the result once per date so every player reads
 * the same frozen list thereafter (see getOrCreateDailyChallenge).
 */
export function selectDailyQuestions(
  dateStr: string,
  candidates: DailyCandidateQuestion[],
  recentlyUsedIds: ReadonlySet<string>,
  count: number = DAILY_QUESTION_COUNT
): string[] {
  if (candidates.length === 0) return [];

  const rng = mulberry32(hashString(dateStr));
  const shuffled = deterministicShuffle(candidates, rng);

  const notRecent = shuffled.filter((c) => !recentlyUsedIds.has(c.id));
  const pool = notRecent.length >= count ? notRecent : shuffled;
  const rankedByVotes = [...pool].sort((a, b) => b.voteCount - a.voteCount);

  const picked = new Set<string>();
  const picks: DailyCandidateQuestion[] = [];
  const categoryCounts = new Map<QuestionCategory, number>();

  for (const c of rankedByVotes) {
    if (picks.length >= count) break;
    const catCount = categoryCounts.get(c.category) ?? 0;
    if (catCount >= MAX_PER_CATEGORY) continue;
    picks.push(c);
    picked.add(c.id);
    categoryCounts.set(c.category, catCount + 1);
  }

  if (picks.length < count) {
    for (const c of rankedByVotes) {
      if (picks.length >= count) break;
      if (picked.has(c.id)) continue;
      picks.push(c);
      picked.add(c.id);
    }
  }

  return picks.slice(0, count).map((c) => c.id);
}

/** The official Daily score: sum of the ten existing question scores — no new scoring formula. */
export function sumDailyScore(scores: readonly number[]): number {
  return scores.reduce((total, s) => total + s, 0);
}

/** True once every one of today's fixed questions has been scored for this player. */
export function isDailyComplete(scoredCount: number, totalQuestions: number): boolean {
  return totalQuestions > 0 && scoredCount >= totalQuestions;
}
