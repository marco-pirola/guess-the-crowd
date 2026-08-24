"use client";

import { useEffect, useState } from "react";
import { useLocale } from "@/lib/i18n/LocaleContext";

const BADGE_CLASSES =
  "inline-flex items-center gap-1 rounded-full border border-accent/30 bg-accent-soft px-2 py-1 text-xs font-semibold tabular-nums text-accent sm:gap-1.5 sm:px-3 sm:py-1.5 sm:text-sm";

export function StreakBadge() {
  const { t } = useLocale();
  // undefined = not fetched yet (reserve layout space); null = fetched, nothing to show.
  const [streak, setStreak] = useState<number | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled) setStreak(data?.currentStreak ?? null);
      })
      .catch(() => {
        if (!cancelled) setStreak(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (streak === undefined) {
    return (
      <span aria-hidden className={`invisible ${BADGE_CLASSES}`}>
        🔥00
      </span>
    );
  }

  if (!streak) return null;

  return (
    <span className={`animate-pop-in ${BADGE_CLASSES}`}>
      <span aria-hidden>🔥</span>
      {streak}
      <span className="hidden font-medium text-accent/80 sm:inline">
        {streak === 1 ? t("streak_dayOne") : t("streak_dayMany")}
      </span>
    </span>
  );
}
