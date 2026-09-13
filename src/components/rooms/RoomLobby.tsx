"use client";

import { useLocale } from "@/lib/i18n/LocaleContext";
import { RoomState } from "@/lib/rooms/types";
import { GameCard } from "@/components/GameCard";
import { Button } from "@/components/Button";
import { RoomCodeBadge } from "@/components/rooms/RoomCodeBadge";
import { RoomPlayerList } from "@/components/rooms/RoomPlayerList";

export function RoomLobby({
  room,
  myPlayerId,
  isHost,
  onStart,
  busy,
  actionErrorMessage,
}: {
  room: RoomState;
  myPlayerId: string | null;
  isHost: boolean;
  onStart: () => void;
  busy: boolean;
  actionErrorMessage: string | null;
}) {
  const { t } = useLocale();
  const activeCount = room.players.length;

  return (
    <GameCard className="flex w-full max-w-lg animate-fade-in-up flex-col items-center gap-6">
      <RoomCodeBadge code={room.code} />

      <div className="flex flex-col items-center gap-1 text-center text-sm text-muted">
        <p>{t("room_playersCount", { count: activeCount, max: room.maxPlayers })}</p>
        <p>{t("room_roundsConfigured", { count: room.roundCount })}</p>
      </div>

      <RoomPlayerList players={room.players} myPlayerId={myPlayerId} />

      {isHost ? (
        <Button onClick={onStart} loading={busy} className="w-full">
          {t("room_startGame")}
        </Button>
      ) : (
        <p className="text-center text-sm text-muted">{t("room_lobbyWaitingForHost")}</p>
      )}

      {actionErrorMessage && (
        <p role="alert" className="text-center text-sm text-danger">
          {actionErrorMessage}
        </p>
      )}
    </GameCard>
  );
}
