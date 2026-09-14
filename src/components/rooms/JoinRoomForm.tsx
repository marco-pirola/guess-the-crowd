"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/lib/i18n/LocaleContext";
import { assertValidNickname, assertValidRoomCode, ValidationError } from "@/lib/validation";
import { normalizeRoomCode } from "@/lib/rooms/roomCode";
import { RoomApiError, apiJoinRoom } from "@/lib/rooms/roomClient";
import { roomErrorTranslationKey } from "@/lib/rooms/roomErrorKey";
import { GameCard } from "@/components/GameCard";
import { Button } from "@/components/Button";
import { useSound } from "@/lib/sound/SoundContext";

export function JoinRoomForm({
  presetCode,
  onJoined,
}: {
  /** Code already known (e.g. from an invite link) — skips the code input entirely, never asks for it again. */
  presetCode?: string;
  /** Called instead of navigating to /rooms/[code] — used when this form is already rendered inline on that page. */
  onJoined?: () => void;
} = {}) {
  const { t } = useLocale();
  const { play } = useSound();
  const router = useRouter();
  const [code, setCode] = useState(presetCode ?? "");
  const [nickname, setNickname] = useState("");
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);

    let normalizedCode: string;
    try {
      normalizedCode = assertValidRoomCode(presetCode ?? code);
      assertValidNickname(nickname);
    } catch (err) {
      if (err instanceof ValidationError) setErrorMessage(err.message);
      return;
    }

    setBusy(true);
    try {
      const room = await apiJoinRoom(normalizedCode, nickname);
      play("action");
      if (onJoined) {
        onJoined();
      } else {
        router.push(`/rooms/${room.code}`);
      }
    } catch (err) {
      setErrorMessage(t(roomErrorTranslationKey(err instanceof RoomApiError ? err.code : undefined)));
      setBusy(false);
    }
  }

  return (
    <GameCard className="flex w-full max-w-md flex-col gap-6">
      <h1 className="text-center text-2xl font-extrabold">
        {presetCode ? t("room_joinPromptTitle") : t("room_joinTitle")}
      </h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {presetCode ? (
          <div className="flex flex-col items-center gap-1 text-center">
            <span className="text-sm font-medium text-muted">{t("room_codeLabel")}</span>
            <p className="text-2xl font-extrabold tracking-[0.3em] text-accent tabular-nums">{presetCode}</p>
          </div>
        ) : (
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium">{t("room_codeLabel")}</span>
            <input
              type="text"
              required
              value={code}
              onChange={(e) => setCode(normalizeRoomCode(e.target.value))}
              maxLength={5}
              autoCapitalize="characters"
              className="rounded-xl border border-border bg-background px-3 py-2 text-center text-lg font-bold tracking-[0.3em] outline-none focus-visible:ring-4 focus-visible:ring-accent/30"
            />
          </label>
        )}

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

        {errorMessage && (
          <p role="alert" className="text-center text-sm text-danger">
            {errorMessage}
          </p>
        )}

        <Button type="submit" loading={busy} className="w-full">
          {t("room_join")}
        </Button>
      </form>
    </GameCard>
  );
}
