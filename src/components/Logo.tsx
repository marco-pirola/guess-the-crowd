import Link from "next/link";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/"
      className={`inline-flex items-center gap-2 font-extrabold tracking-tight text-foreground ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- static SVG asset, no benefit from next/image optimization */}
      <img
        src="/logo.svg"
        alt=""
        aria-hidden
        width={32}
        height={32}
        className="size-7 shrink-0 rounded-lg sm:size-8"
      />
      <span>Guess the Crowd</span>
    </Link>
  );
}
