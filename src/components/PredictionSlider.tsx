"use client";

import { predictedAFromRightPercent, rightPercentFromPredictedA } from "@/lib/predictionConvention";

interface PredictionSliderProps {
  value: number;
  onChange: (value: number) => void;
  optionA: string;
  optionB: string;
}

/**
 * `value` (in and out) is always the predicted percentage for optionA — the
 * exact same number sent to the API as `predictedPercentageA`. optionB's
 * share is always the complement (100 - value), so the two displayed numbers
 * are structurally guaranteed to sum to 100 with no floating-point drift
 * (both are plain integer subtraction of a 0-100 integer step value).
 *
 * The DOM <input type="range"> itself is driven by `rightPercent` (= 100 -
 * value), not by `value` directly. A native range thumb always sits at a
 * screen position proportional to its own `value`, so binding the input to
 * the LEFT option's percentage would mean dragging right (thumb moves right)
 * *increases the LEFT option's share* — backwards from what a left-to-right
 * "optionA <-> optionB" control should feel like. Binding it to the RIGHT
 * option's percentage instead makes dragging/pressing right on the track
 * always increase optionB's percentage, for mouse, touch, and keyboard.
 */
export function PredictionSlider({ value, onChange, optionA, optionB }: PredictionSliderProps) {
  const pctB = 100 - value;
  const rightPercent = rightPercentFromPredictedA(value); // drives the native input; see note above

  return (
    <div className="flex flex-col gap-5">
      <p className="text-center text-sm font-medium text-muted">
        How do you think everyone else will choose?
      </p>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-accent/25 bg-accent-soft p-4 text-center">
          <p className="truncate text-xs font-semibold uppercase tracking-wide text-accent">
            {optionA}
          </p>
          <p className="mt-1 text-4xl font-extrabold tabular-nums text-accent" aria-live="polite">
            {value}%
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-surface-sunken p-4 text-center">
          <p className="truncate text-xs font-semibold uppercase tracking-wide text-foreground/70">
            {optionB}
          </p>
          <p className="mt-1 text-4xl font-extrabold tabular-nums" aria-live="polite">
            {pctB}%
          </p>
        </div>
      </div>

      <div className="relative h-9 w-full touch-none select-none">
        <div className="absolute left-0 right-0 top-1/2 h-3 -translate-y-1/2 overflow-hidden rounded-full bg-border">
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-150 ease-out"
            style={{ width: `${rightPercent}%` }}
          />
        </div>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={rightPercent}
          onChange={(e) => onChange(predictedAFromRightPercent(Number(e.target.value)))}
          aria-label={`Predicted split between ${optionA} and ${optionB}`}
          aria-valuetext={`${optionA} ${value} percent, ${optionB} ${pctB} percent`}
          className="peer absolute inset-0 h-full w-full cursor-pointer appearance-none bg-transparent opacity-0"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-accent bg-surface shadow-md transition-transform peer-active:scale-110 peer-focus-visible:ring-4 peer-focus-visible:ring-accent/30"
          style={{ left: `${rightPercent}%` }}
        />
      </div>

      <div className="flex justify-between text-xs font-medium text-muted">
        <span>{optionA}</span>
        <span>{optionB}</span>
      </div>
    </div>
  );
}
