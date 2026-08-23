"use client";

import { useEffect, useState } from "react";
import { useLocale } from "@/lib/i18n/LocaleContext";

export function StreakBadge() {
  const { t } = useLocale();
  const [streak, setStreak] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data) setStreak(data.currentStreak);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  if (!streak) return null;

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-sm font-semibold tabular-nums">
      <span aria-hidden>🔥</span>
      {streak}
      <span className="font-medium text-muted">
        {streak === 1 ? t("streak_dayOne") : t("streak_dayMany")}
      </span>
    </span>
  );
}
