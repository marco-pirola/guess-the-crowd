/**
 * Scoring is deterministic and server-authoritative: given the exact same
 * predicted/actual pair it must always return the exact same score.
 *
 * Formula: score = round(1000 * (1 - error/100)^2), clamped to [0, 1000].
 * The square makes accuracy pay off disproportionately (a quadratic falloff),
 * so a near-perfect guess scores far better than a merely-decent one, while a
 * complete miss (error = 100, e.g. predicting 0% when the crowd is 100%)
 * scores exactly 0.
 */
export function calculatePredictionScore(
  predictedPercentage: number,
  actualPercentage: number
): number {
  const error = getPredictionError(predictedPercentage, actualPercentage);
  const accuracy = 1 - error / 100;
  const raw = 1000 * accuracy * accuracy;
  return Math.max(0, Math.min(1000, Math.round(raw)));
}

/** Absolute distance in percentage points between prediction and reality. */
export function getPredictionError(
  predictedPercentage: number,
  actualPercentage: number
): number {
  return Math.abs(predictedPercentage - actualPercentage);
}

/**
 * Percentile of `score` among `allScores` (0-100, higher is better).
 * Returns null when there isn't enough data to make the comparison meaningful.
 */
export function calculatePercentile(
  score: number,
  allScores: number[]
): number | null {
  if (allScores.length < 5) return null;
  const lowerOrEqual = allScores.filter((s) => s <= score).length;
  return Math.round((lowerOrEqual / allScores.length) * 100);
}
