"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/Logo";
import { StreakBadge } from "@/components/StreakBadge";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useLocale } from "@/lib/i18n/LocaleContext";
import { TranslationKey } from "@/lib/i18n/translations";

const NAV_LINK_BASE =
  "rounded-full px-2.5 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/30 sm:px-3 sm:py-1.5";
const NAV_LINK_INACTIVE = "text-muted hover:bg-surface-sunken hover:text-foreground";
const NAV_LINK_ACTIVE = "bg-accent-soft font-semibold text-accent";

const NAV_ITEMS: { href: string; labelKey: TranslationKey }[] = [
  { href: "/daily", labelKey: "daily_title" },
  { href: "/leaderboard", labelKey: "nav_leaderboard" },
];

export function Header() {
  const { t } = useLocale();
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-10 border-b border-border/70 bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-3 sm:flex-nowrap sm:px-8 sm:py-4">
        <Logo />
        <div className="flex flex-1 flex-wrap items-center justify-end gap-x-2 gap-y-2 sm:flex-nowrap sm:gap-3">
          <StreakBadge />
          <nav aria-label={t("nav_ariaLabel")} className="flex items-center gap-1 sm:gap-1.5">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={`${NAV_LINK_BASE} ${isActive ? NAV_LINK_ACTIVE : NAV_LINK_INACTIVE}`}
                >
                  {t(item.labelKey)}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}
