const STEPS = ["Predict", "Choose", "Reveal"] as const;

/** Makes the two-phase (predict, then choose) structure of the game legible at a glance. */
export function PhaseSteps({ current }: { current: 0 | 1 | 2 }) {
  return (
    <ol className="flex items-center gap-2" aria-label="Game progress">
      {STEPS.map((label, i) => (
        <li key={label} className="flex items-center gap-2">
          <span
            className={`flex items-center gap-1.5 text-xs font-semibold transition-colors ${
              i === current ? "text-accent" : i < current ? "text-foreground" : "text-muted"
            }`}
          >
            <span
              aria-hidden
              className={`h-1.5 w-1.5 rounded-full transition-colors ${
                i <= current ? "bg-accent" : "bg-border"
              }`}
            />
            {label}
          </span>
          {i < STEPS.length - 1 && <span aria-hidden className="h-px w-4 bg-border" />}
        </li>
      ))}
    </ol>
  );
}
