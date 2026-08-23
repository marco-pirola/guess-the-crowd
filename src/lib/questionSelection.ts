/**
 * Pure selection logic for "what question comes next" — kept separate from
 * any storage/localStorage/network concerns so it's trivially testable with
 * an injectable RNG. See src/app/api/questions/next/route.ts for the caller.
 */

export interface SelectableQuestion {
  id: string;
}

export interface PickNextQuestionOptions {
  /** The question just answered, if any — never repeated immediately. */
  currentId?: string | null;
  /** Recently seen question ids (most-recent-last), best-effort avoided. */
  recentIds?: string[];
  /** Injectable for deterministic tests; defaults to Math.random. */
  random?: () => number;
}

/**
 * Picks a random next question id, avoiding `currentId` and `recentIds`
 * where possible. Falls back to a smaller exclusion set (then no exclusion
 * at all) when the pool is too small to honor every constraint, so this
 * never throws as long as `pool` is non-empty.
 */
export function pickNextQuestionId(
  pool: SelectableQuestion[],
  options: PickNextQuestionOptions = {}
): string {
  if (pool.length === 0) {
    throw new Error("Cannot pick a question from an empty pool.");
  }

  const { currentId = null, recentIds = [], random = Math.random } = options;

  const excluded = new Set(recentIds);
  if (currentId) excluded.add(currentId);

  let candidates = pool.filter((q) => !excluded.has(q.id));
  if (candidates.length === 0 && currentId) {
    candidates = pool.filter((q) => q.id !== currentId);
  }
  if (candidates.length === 0) {
    candidates = pool;
  }

  const index = Math.floor(random() * candidates.length);
  return candidates[Math.min(index, candidates.length - 1)].id;
}
