"use client";

interface AnswerOptionProps {
  label: string;
  emoji: string;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

export function AnswerOption({ label, emoji, selected, disabled, onClick }: AnswerOptionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className={`flex flex-1 flex-col items-center gap-2 rounded-2xl border px-6 py-6 text-lg font-semibold transition-all
        ${selected ? "border-accent bg-accent text-accent-foreground" : "border-border bg-surface text-foreground"}
        ${disabled ? "opacity-60" : "hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 cursor-pointer"}
      `}
    >
      <span className="text-3xl" aria-hidden>
        {emoji}
      </span>
      {label}
    </button>
  );
}
