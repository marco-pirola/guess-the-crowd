import Link from "next/link";
import { Logo } from "@/components/Logo";
import { StreakBadge } from "@/components/StreakBadge";

export function Header() {
  return (
    <header className="flex items-center justify-between px-5 py-4 sm:px-8">
      <Logo />
      <nav className="flex items-center gap-4">
        <StreakBadge />
        <Link
          href="/leaderboard"
          className="text-sm font-medium text-muted transition-colors hover:text-foreground"
        >
          Leaderboard
        </Link>
      </nav>
    </header>
  );
}
