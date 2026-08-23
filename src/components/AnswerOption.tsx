"use client";

interface AnswerOptionProps {
  label: string;
  emoji: string;
  tone: "a" | "b";
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

/** Tone mirrors the prediction slider's two-tone coding, so the game "feels" continuous. */
export function AnswerOption({ label, emoji, tone, selected, disabled, onClick }: AnswerOptionProps) {
  const toneClasses =
    tone === "a"
      ? "border-accent/25 bg-accent-soft hover:border-accent/50"
      : "border-border bg-surface-sunken hover:border-foreground/25";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className={`flex min-h-32 flex-1 flex-col items-center justify-center gap-2 rounded-2xl border-2 px-4 py-6 text-base font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/30
        ${selected ? "border-accent bg-accent text-accent-foreground" : `${toneClasses} text-foreground`}
        ${disabled ? "opacity-60" : "cursor-pointer hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:scale-[0.98]"}
      `}
    >
      <span className="text-4xl" aria-hidden>
        {emoji}
      </span>
      <span className="text-balance text-center">{label}</span>
    </button>
  );
}
