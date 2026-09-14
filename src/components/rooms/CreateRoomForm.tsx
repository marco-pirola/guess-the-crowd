"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/lib/i18n/LocaleContext";
import { assertValidMaxPlayers, assertValidNickname, ValidationError } from "@/lib/validation";
import { ROOM_MAX_PLAYERS_MAX, ROOM_MAX_PLAYERS_MIN, ROOM_ROUND_COUNTS, RoomRoundCount } from "@/lib/rooms/types";
import { RoomApiError, apiCreateRoom } from "@/lib/rooms/roomClient";
import { roomErrorTranslationKey } from "@/lib/rooms/roomErrorKey";
import { GameCard } from "@/components/GameCard";
import { Button } from "@/components/Button";
import { useSound } from "@/lib/sound/SoundContext";

const MAX_PLAYERS_OPTIONS = Array.from(
  { length: ROOM_MAX_PLAYERS_MAX - ROOM_MAX_PLAYERS_MIN + 1 },
  (_, i) => ROOM_MAX_PLAYERS_MIN + i
);

export function CreateRoomForm() {
  const { t } = useLocale();
  const { play } = useSound();
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [roundCount, setRoundCount] = useState<RoomRoundCount>(10);
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    try {
      assertValidNickname(nickname);
      assertValidMaxPlayers(maxPlayers);
    } catch (err) {
      if (err instanceof ValidationError) setErrorMessage(err.message);
      return;
    }

    setBusy(true);
    try {
      const room = await apiCreateRoom(nickname, maxPlayers, roundCount);
      play("action");
      router.push(`/rooms/${room.code}`);
    } catch (err) {
      setErrorMessage(t(roomErrorTranslationKey(err instanceof RoomApiError ? err.code : undefined)));
      setBusy(false);
    }
  }

  return (
    <GameCard className="flex w-full max-w-md flex-col gap-6">
      <h1 className="text-center text-2xl font-extrabold">{t("room_createTitle")}</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">{t("room_nicknameLabel")}</span>
          <input
            type="text"
            required
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={20}
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-4 focus-visible:ring-accent/30"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">{t("room_maxPlayersLabel")}</span>
          <select
            value={maxPlayers}
            onChange={(e) => setMaxPlayers(Number(e.target.value))}
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-4 focus-visible:ring-accent/30"
          >
            {MAX_PLAYERS_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">{t("room_roundCountLabel")}</span>
          <div className="flex gap-1 rounded-full border border-border bg-surface p-1">
            {ROOM_ROUND_COUNTS.map((count) => (
              <button
                key={count}
                type="button"
                onClick={() => setRoundCount(count)}
                className={`flex-1 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/30 ${
                  roundCount === count ? "bg-accent text-accent-foreground" : "text-muted hover:text-foreground"
                }`}
              >
                {count}
              </button>
            ))}
          </div>
        </div>

        {errorMessage && (
          <p role="alert" className="text-center text-sm text-danger">
            {errorMessage}
          </p>
        )}

        <Button type="submit" loading={busy} className="w-full">
          {t("room_create")}
        </Button>
      </form>
    </GameCard>
  );
}
