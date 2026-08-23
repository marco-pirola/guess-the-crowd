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
