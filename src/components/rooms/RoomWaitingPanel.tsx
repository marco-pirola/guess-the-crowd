"use client";

import { useLocale } from "@/lib/i18n/LocaleContext";
import { RoomRoundWaiting } from "@/lib/rooms/types";
import { GameCard } from "@/components/GameCard";
import { Button } from "@/components/Button";
import { LoadingSpinner } from "@/components/LoadingSpinner";

/**
 * Shown once the current player has submitted, while the round is still
 * 'in_round' — never shows other players' answers, only how many have
 * submitted so far (see get_room_round_state's pre-reveal shape). The host
 * sees the same waiting view plus a Reveal control; nothing here forces a
 * reveal once everyone's in, matching "no forced timer."
 */
export function RoomWaitingPanel({
  roundState,
  isHost,
  onReveal,
  busy,
  actionErrorMessage,
}: {
  roundState: RoomRoundWaiting;
  isHost: boolean;
  onReveal: () => void;
  busy: boolean;
  actionErrorMessage: string | null;
}) {
  const { t } = useLocale();

  return (
    <GameCard className="flex w-full max-w-lg animate-fade-in-up flex-col items-center gap-5 text-center">
      <LoadingSpinner label={t("room_waitingForSubmissions")} />
      <p className="text-lg font-semibold tabular-nums">
        {t("room_submittedCount", {
          count: roundState.submittedCount,
          total: roundState.activePlayerCount,
        })}
      </p>

      {isHost ? (
        <Button onClick={onReveal} loading={busy} className="w-full">
          {t("room_reveal")}
        </Button>
      ) : (
        <p className="text-sm text-muted">{t("room_waitingForHostReveal")}</p>
      )}

      {actionErrorMessage && (
        <p role="alert" className="text-sm text-danger">
          {actionErrorMessage}
        </p>
      )}
    </GameCard>
  );
}
