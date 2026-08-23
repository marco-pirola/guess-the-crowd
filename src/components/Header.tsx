"use client";

import Link from "next/link";
import { Logo } from "@/components/Logo";
import { StreakBadge } from "@/components/StreakBadge";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useLocale } from "@/lib/i18n/LocaleContext";

export function Header() {
  const { t } = useLocale();

  return (
    <header className="sticky top-0 z-10 border-b border-border/70 bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4 sm:px-8">
        <Logo />
        <nav className="flex items-center gap-2 sm:gap-3">
          <StreakBadge />
          <Link
            href="/leaderboard"
            className="rounded-full px-3 py-1.5 text-sm font-medium text-muted transition-colors hover:bg-surface-sunken hover:text-foreground"
          >
            {t("nav_leaderboard")}
          </Link>
          <LanguageToggle />
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
