"use client";

interface PredictionSliderProps {
  value: number;
  onChange: (value: number) => void;
  optionA: string;
  optionB: string;
}

export function PredictionSlider({ value, onChange, optionA, optionB }: PredictionSliderProps) {
  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-sm font-medium text-muted">
        What percentage do you think will choose {optionA}?
      </p>
      <p className="text-5xl font-bold tabular-nums text-accent" aria-live="polite">
        {value}%
      </p>
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={`Predicted percentage choosing ${optionA}`}
        className="h-2 w-full max-w-sm cursor-pointer appearance-none rounded-full bg-border accent-[var(--accent)]"
      />
      <div className="flex w-full max-w-sm justify-between text-xs font-medium text-muted">
        <span>{optionA} 0%</span>
        <span>{optionB} 100%</span>
      </div>
    </div>
  );
}
