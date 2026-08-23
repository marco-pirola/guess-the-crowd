/**
 * Single source of truth for the slider's left/right <-> stored-value mapping.
 *
 * `predictedPercentageA` (stored, sent to the API, scored) is always the LEFT
 * option's share. The draggable control itself is driven by the RIGHT
 * option's share, so that dragging/pressing right on the track always
 * increases the right-hand option's percentage — see PredictionSlider.tsx for
 * why binding a native <input type="range"> to the left value would make
 * dragging right increase the *left* option instead.
 *
 * Both directions are plain integer subtraction from 100, so the two
 * percentages a caller derives from either function always sum to exactly
 * 100 with no floating-point drift.
 */
export function rightPercentFromPredictedA(predictedPercentageA: number): number {
  return 100 - predictedPercentageA;
}

export function predictedAFromRightPercent(rightPercent: number): number {
  return 100 - rightPercent;
}
