import Link from "next/link";

/** Three overlapping dots stand in for "the crowd" — the smallest possible crowd. */
export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/"
      className={`inline-flex items-center gap-2 font-extrabold tracking-tight text-foreground ${className}`}
    >
      <svg width="26" height="18" viewBox="0 0 26 18" aria-hidden className="shrink-0">
        <circle cx="7" cy="9" r="6.5" fill="var(--border)" />
        <circle cx="19" cy="9" r="6.5" fill="var(--border)" />
        <circle cx="13" cy="9" r="7" fill="var(--accent)" />
      </svg>
      <span>Guess the Crowd</span>
    </Link>
  );
}
