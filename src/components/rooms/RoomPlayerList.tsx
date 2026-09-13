"use client";

import { useLocale } from "@/lib/i18n/LocaleContext";
import { RoomPlayerSummary } from "@/lib/rooms/types";

/** Connected-players list — host crown, current-player tag. No avatars: room players have no avatar data (nicknames are room-scoped, not account profiles). */
export function RoomPlayerList({
  players,
  myPlayerId,
}: {
  players: RoomPlayerSummary[];
  myPlayerId: string | null;
}) {
  const { t } = useLocale();

  return (
    <ul className="flex w-full flex-col gap-2">
      {players.map((player) => (
        <li
          key={player.playerId}
          className={`flex items-center justify-between rounded-2xl border px-4 py-2.5 text-sm font-medium ${
            player.playerId === myPlayerId ? "border-accent bg-accent/10" : "border-border bg-surface"
          }`}
        >
          <span className="flex items-center gap-2">
            {player.isHost && (
              <span aria-hidden title={t("room_hostBadge")}>
                👑
              </span>
            )}
            <span>{player.nickname}</span>
            {player.playerId === myPlayerId && <span className="text-muted">{t("leaderboard_you")}</span>}
          </span>
          {player.isHost && <span className="text-xs font-semibold uppercase text-muted">{t("room_hostBadge")}</span>}
        </li>
      ))}
    </ul>
  );
}
