"use client";

import { useEffect, useState } from "react";
import { LeaderboardContext, LeaderboardEntry } from "@/lib/types";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { EmptyState } from "@/components/EmptyState";
import { track } from "@/lib/analytics";
import { useLocale } from "@/lib/i18n/LocaleContext";
import { TranslationKey } from "@/lib/i18n/translations";

type Range = "today" | "all";

export function LeaderboardTable() {
  const { t } = useLocale();
  const [range, setRange] = useState<Range>("today");
  const [entriesByRange, setEntriesByRange] = useState<Partial<Record<Range, LeaderboardEntry[]>>>(
    {}
  );
  const [contextByRange, setContextByRange] = useState<
    Partial<Record<Range, LeaderboardContext | null>>
  >({});

  useEffect(() => {
    track("leaderboard_viewed", { range });
    let cancelled = false;
    fetch(`/api/leaderboard?range=${range}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setEntriesByRange((prev) => ({ ...prev, [range]: data.leaderboard }));
        setContextByRange((prev) => ({ ...prev, [range]: data.context }));
      });
    return () => {
      cancelled = true;
    };
  }, [range]);

  const entries = entriesByRange[range] ?? null;
  const context = contextByRange[range];

  return (
    <div className="flex w-full max-w-lg flex-col gap-6">
      <div className="flex flex-col items-center gap-1 text-center">
        <h1 className="text-2xl font-extrabold sm:text-3xl">{t("leaderboard_title")}</h1>
        <p className="text-sm font-medium text-foreground">{t("leaderboard_subtitle")}</p>
        <p className="text-xs text-muted">{t("leaderboard_scoreExplainer")}</p>
      </div>

      <div className="flex gap-1 self-center rounded-full border border-border bg-surface p-1">
        {(["today", "all"] as const).map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
              range === r
                ? "bg-accent text-accent-foreground"
                : "text-muted hover:text-foreground"
            }`}
          >
            {r === "today" ? t("leaderboard_today") : t("leaderboard_allTime")}
          </button>
        ))}
      </div>

      {entries === null ? (
        <LoadingSpinner label={t("leaderboard_loading")} />
      ) : entries.length === 0 ? (
        <EmptyState
          title={t("leaderboard_noScoresTitle")}
          description={
            range === "today" ? t("leaderboard_noScoresTodayDesc") : t("leaderboard_noScoresAllDesc")
          }
        />
      ) : (
        <ol className="flex flex-col gap-2">
          <li
            aria-hidden
            className="flex items-center justify-between px-4 text-[11px] font-semibold uppercase tracking-wider text-muted"
          >
            <div className="flex items-center gap-3">
              <span className="w-6">{t("leaderboard_colRank")}</span>
              <span>{t("leaderboard_colPlayer")}</span>
            </div>
            <span>{t("leaderboard_colScore")}</span>
          </li>
          {entries.map((entry) => (
            <li
              key={entry.playerId}
              className={`rounded-2xl border px-4 py-3 ${
                entry.isCurrentPlayer
                  ? "border-accent bg-accent/10"
                  : "border-border bg-surface"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-6 text-sm font-semibold text-muted">{entry.rank}</span>
                  <span className="font-medium">
                    {entry.username}
                    {entry.isCurrentPlayer && <span className="text-muted"> {t("leaderboard_you")}</span>}
                  </span>
                </div>
                <span className="font-semibold tabular-nums">{entry.score}</span>
              </div>
              {entry.isCurrentPlayer && context && (
                <p className="mt-1 pl-9 text-xs text-muted">{overtakeCopy(t, context)}</p>
              )}
            </li>
          ))}
          {context && !entries.some((e) => e.isCurrentPlayer) && (
            <li className="rounded-2xl border border-accent bg-accent/10 px-4 py-3">
              <p className="text-sm font-semibold">
                {t("leaderboard_yourPosition", { rank: context.rank, score: context.score })}
              </p>
              <p className="mt-1 text-xs text-muted">{overtakeCopy(t, context)}</p>
            </li>
          )}
        </ol>
      )}
    </div>
  );
}

function overtakeCopy(
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string,
  context: LeaderboardContext
): string {
  if (context.isTop) return t("leaderboard_top");
  const diff = (context.aboveScore ?? 0) - context.score;
  return t("leaderboard_overtake", { diff, rank: context.rank - 1 });
}
