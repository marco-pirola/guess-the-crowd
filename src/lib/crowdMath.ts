/**
 * The one place the "votes -> percentage" rounding rule is defined. Only
 * optionA's percentage is ever rounded from raw counts; optionB's is always
 * the complement (100 - a), never independently rounded from its own count.
 * That's what guarantees the two displayed numbers sum to exactly 100 — two
 * independent Math.round calls on a/total and b/total can each round up and
 * overshoot 100 (e.g. 33.5 -> 34 and 66.5 -> 67 -> 101). The Postgres RPC
 * (supabase/functions.sql, get_crowd_result) mirrors this exact formula.
 */
export function computeActualPercentageA(votesA: number, totalVotes: number): number {
  if (totalVotes <= 0) return 0;
  return Math.round((votesA / totalVotes) * 100);
}

/**
 * Beta-Binomial Bayesian shrinkage: the seeded percentage is treated as a
 * prior worth `priorStrength` "pseudo-votes" (Beta(alpha0, beta0) with
 * alpha0 + beta0 = priorStrength), and real votes update it. The result is
 * the posterior mean, i.e. a weighted blend that leans on the seed when
 * votes are scarce and converges to the raw observed rate as votes grow —
 * no discontinuity/cliff at any vote-count threshold, unlike a hard
 * seeded-vs-live switch. Mirrored in supabase/functions.sql (get_crowd_result).
 */
export function computeBlendedPercentageA(
  votesA: number,
  votesB: number,
  seededPercentageA: number,
  priorStrength: number
): number {
  const totalVotes = votesA + votesB;
  const priorAlpha = (seededPercentageA / 100) * priorStrength;
  const posteriorAlpha = priorAlpha + votesA;
  const posteriorTotal = priorStrength + totalVotes;
  return Math.round((posteriorAlpha / posteriorTotal) * 100);
}

/** Default prior strength when a question doesn't specify its own minimumVotes. */
export const DEFAULT_PRIOR_STRENGTH = 10;

/** k = 2 x minimumVotes — see the crowd reliability model writeup for the reasoning. */
export function priorStrengthFromMinimumVotes(minimumVotes: number): number {
  if (!Number.isFinite(minimumVotes) || minimumVotes <= 0) return DEFAULT_PRIOR_STRENGTH;
  return minimumVotes * 2;
}
