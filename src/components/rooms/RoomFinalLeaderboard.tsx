"use client";

import Link from "next/link";
import { useLocale } from "@/lib/i18n/LocaleContext";
import { RoomLeaderboardEntry } from "@/lib/rooms/types";
import { GameCard } from "@/components/GameCard";
import { ScoreDisplay } from "@/components/ScoreDisplay";

/** get_room_leaderboard already returns entries sorted by score desc (see supabase/migration_rooms.sql) — never re-sorted client-side. */
export function RoomFinalLeaderboard({ entries }: { entries: RoomLeaderboardEntry[] }) {
  const { t } = useLocale();

  return (
    <GameCard className="flex w-full max-w-lg animate-fade-in-up flex-col gap-5">
      <div className="flex flex-col items-center gap-1 text-center">
        <h1 className="text-2xl font-extrabold sm:text-3xl">{t("room_finalLeaderboard")}</h1>
        <p className="text-xs text-muted">{t("room_roomScoresNote")}</p>
      </div>

      <ol className="flex flex-col gap-2">
        {entries.map((entry, i) => {
          const isWinner = i === 0;
          return (
            <li
              key={entry.playerId}
              className={`flex items-center justify-between rounded-2xl border px-4 py-3 ${
                isWinner
                  ? "border-accent bg-accent-soft"
                  : entry.isCurrentPlayer
                    ? "border-accent bg-accent/10"
                    : "border-border bg-surface"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="w-6 text-sm font-semibold text-muted">{i + 1}</span>
                <span className="font-medium">
                  {isWinner && <span aria-hidden>🏆 </span>}
                  {entry.nickname}
                  {entry.isCurrentPlayer && <span className="text-muted"> {t("leaderboard_you")}</span>}
                  {isWinner && (
                    <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent-foreground">
                      {t("room_winner")}
                    </span>
                  )}
                </span>
              </div>
              <ScoreDisplay value={entry.totalScore} className="font-semibold tabular-nums" />
            </li>
          );
        })}
      </ol>

      <Link
        href="/rooms"
        className="text-center text-sm font-medium text-muted underline-offset-4 hover:text-foreground hover:underline"
      >
        {t("room_backToRooms")}
      </Link>
    </GameCard>
  );
}
