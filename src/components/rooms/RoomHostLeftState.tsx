"use client";

import Link from "next/link";
import { useLocale } from "@/lib/i18n/LocaleContext";
import { GameCard } from "@/components/GameCard";

/**
 * Shown to every remaining player once the host's row drops out of
 * get_room_state's players array (left_at set on leave) — no host
 * migration, no timers, no change to scores already earned. RoomExperience
 * detects this purely from the existing response (no player has
 * isHost: true), so no backend change was needed.
 */
export function RoomHostLeftState() {
  const { t } = useLocale();

  return (
    <GameCard className="flex w-full max-w-lg animate-fade-in-up flex-col items-center gap-4 text-center">
      <h1 className="text-xl font-extrabold">{t("room_hostLeftTitle")}</h1>
      <p className="text-sm text-muted">{t("room_hostLeftBody")}</p>
      <Link
        href="/rooms"
        className="inline-flex items-center justify-center rounded-full bg-accent px-6 py-3 text-base font-semibold text-accent-foreground transition-all hover:scale-[1.02] hover:brightness-110 active:scale-[0.98]"
      >
        {t("room_backToRooms")}
      </Link>
    </GameCard>
  );
}
