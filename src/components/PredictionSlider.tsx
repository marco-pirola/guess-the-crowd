"use client";

import { predictedAFromRightPercent, rightPercentFromPredictedA } from "@/lib/predictionConvention";
import { useLocale } from "@/lib/i18n/LocaleContext";

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
  const { t } = useLocale();
  const pctB = 100 - value;
  const rightPercent = rightPercentFromPredictedA(value); // drives the native input; see note above

  return (
    <div className="flex flex-col gap-5">
      <p className="text-center text-sm font-medium text-muted">{t("game_predictPrompt")}</p>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-accent/25 bg-accent-soft p-4 text-center">
          <p className="text-balance break-words text-xs font-semibold uppercase tracking-wide text-accent">
            {optionA}
          </p>
          <p className="mt-1 text-4xl font-extrabold tabular-nums text-accent">
            {value}%
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-surface-sunken p-4 text-center">
          <p className="text-balance break-words text-xs font-semibold uppercase tracking-wide text-foreground/70">
            {optionB}
          </p>
          <p className="mt-1 text-4xl font-extrabold tabular-nums">
            {pctB}%
          </p>
        </div>
      </div>

      {/*
       * No colored fill: user testing repeatedly found any colored split
       * (even a "corrected" one) read as ambiguous about which side it
       * represented. The thumb position is the only indicator of the
       * split; the track stays a single neutral bar. Do not reintroduce
       * a fill here.
       */}
      <div className="relative h-9 w-full touch-none select-none">
        <div className="absolute left-0 right-0 top-1/2 h-3 -translate-y-1/2 rounded-full bg-border" />
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={rightPercent}
          onChange={(e) => onChange(predictedAFromRightPercent(Number(e.target.value)))}
          aria-label={t("game_sliderLabel", { optionA, optionB })}
          aria-valuetext={`${optionA} ${value}%, ${optionB} ${pctB}%`}
          className="peer absolute inset-0 h-full w-full cursor-pointer appearance-none bg-transparent opacity-0"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-accent bg-surface shadow-md transition-transform peer-active:scale-110 peer-focus-visible:ring-4 peer-focus-visible:ring-accent/30"
          style={{ left: `${rightPercent}%` }}
        />
      </div>

      <div className="flex justify-between gap-3 text-xs font-medium text-muted">
        <span className="text-balance break-words">{optionA}</span>
        <span className="text-balance break-words text-right">{optionB}</span>
      </div>
    </div>
  );
}
