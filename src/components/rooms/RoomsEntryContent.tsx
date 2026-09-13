"use client";

import Link from "next/link";
import { useLocale } from "@/lib/i18n/LocaleContext";
import { EmptyState } from "@/components/EmptyState";

export function RoomsEntryContent({ supabaseConfigured }: { supabaseConfigured: boolean }) {
  const { t } = useLocale();

  if (!supabaseConfigured) {
    return <EmptyState title={t("room_error_unavailable")} />;
  }

  return (
    <div className="flex flex-col items-center gap-8 text-center">
      <div className="flex flex-col items-center gap-3">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{t("home_roomsTitle")}</h1>
        <p className="max-w-sm text-muted">{t("room_entryBody")}</p>
      </div>

      <div className="grid w-full max-w-md grid-cols-1 gap-4 sm:grid-cols-2">
        <Link
          href="/rooms/create"
          className="flex flex-col items-center gap-2 rounded-3xl border border-accent/40 bg-accent-soft p-6 text-center transition-transform hover:scale-[1.02]"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <span className="text-lg font-bold text-accent">{t("room_create")}</span>
        </Link>
        <Link
          href="/rooms/join"
          className="flex flex-col items-center gap-2 rounded-3xl border border-border bg-surface p-6 text-center transition-transform hover:scale-[1.02]"
        >
          <span className="text-lg font-bold">{t("room_join")}</span>
        </Link>
      </div>
    </div>
  );
}
