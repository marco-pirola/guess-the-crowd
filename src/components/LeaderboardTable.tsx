"use client";

import { useEffect, useState } from "react";
import { LeaderboardEntry } from "@/lib/types";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { EmptyState } from "@/components/EmptyState";
import { track } from "@/lib/analytics";

type Range = "today" | "all";

export function LeaderboardTable() {
  const [range, setRange] = useState<Range>("today");
  const [entriesByRange, setEntriesByRange] = useState<Partial<Record<Range, LeaderboardEntry[]>>>(
    {}
  );

  useEffect(() => {
    track("leaderboard_viewed", { range });
    let cancelled = false;
    fetch(`/api/leaderboard?range=${range}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setEntriesByRange((prev) => ({ ...prev, [range]: data.leaderboard }));
      });
    return () => {
      cancelled = true;
    };
  }, [range]);

  const entries = entriesByRange[range] ?? null;

  return (
    <div className="flex w-full max-w-lg flex-col gap-4">
      <div className="flex gap-2 self-center rounded-full border border-border bg-surface p-1">
        {(["today", "all"] as const).map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              range === r ? "bg-accent text-accent-foreground" : "text-muted"
            }`}
          >
            {r === "today" ? "Today" : "All-time"}
          </button>
        ))}
      </div>

      {entries === null ? (
        <LoadingSpinner label="Loading leaderboard…" />
      ) : entries.length === 0 ? (
        <EmptyState
          title="No scores yet"
          description={
            range === "today"
              ? "Be the first to play today."
              : "Play a challenge to appear on the leaderboard."
          }
        />
      ) : (
        <ol className="flex flex-col gap-2">
          {entries.map((entry) => (
            <li
              key={entry.playerId}
              className={`flex items-center justify-between rounded-2xl border px-4 py-3 ${
                entry.isCurrentPlayer
                  ? "border-accent bg-accent/10"
                  : "border-border bg-surface"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="w-6 text-sm font-semibold text-muted">{entry.rank}</span>
                <span className="font-medium">
                  {entry.username}
                  {entry.isCurrentPlayer && <span className="text-muted"> (you)</span>}
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
