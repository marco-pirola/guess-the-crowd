"use client";

import { useEffect, useState } from "react";
import { DailyLeaderboardEntry } from "@/lib/types";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { EmptyState } from "@/components/EmptyState";
import { useLocale } from "@/lib/i18n/LocaleContext";

export function DailyLeaderboard() {
  const { t } = useLocale();
  const [entries, setEntries] = useState<DailyLeaderboardEntry[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/daily/leaderboard")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setEntries(data.leaderboard);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex w-full flex-col gap-3">
      <h2 className="text-center text-sm font-semibold uppercase tracking-wider text-muted">
        {t("daily_leaderboardTitle")}
      </h2>
      {entries === null ? (
        <LoadingSpinner label={t("leaderboard_loading")} />
      ) : entries.length === 0 ? (
        <EmptyState title={t("daily_noResultsYet")} />
      ) : (
        <ol className="flex flex-col gap-2">
          {entries.map((entry) => (
            <li
              key={entry.playerId}
              className={`flex items-center justify-between rounded-2xl border px-4 py-3 ${
                entry.isCurrentPlayer ? "border-accent bg-accent/10" : "border-border bg-surface"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="w-6 text-sm font-semibold text-muted">{entry.rank}</span>
                <span className="font-medium">
                  {entry.username}
                  {entry.isCurrentPlayer && <span className="text-muted"> {t("daily_you")}</span>}
                </span>
              </div>
              <span className="font-semibold tabular-nums">{entry.score}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
