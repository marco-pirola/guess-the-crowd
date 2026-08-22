import Link from "next/link";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/"
      className={`inline-flex items-center gap-2 font-semibold tracking-tight text-foreground ${className}`}
    >
      <span
        aria-hidden
        className="inline-block h-2.5 w-2.5 rounded-full bg-accent"
      />
      Guess the Crowd
    </Link>
  );
}
