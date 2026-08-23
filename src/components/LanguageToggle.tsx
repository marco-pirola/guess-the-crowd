"use client";

import { useLocale } from "@/lib/i18n/LocaleContext";
import { LOCALE_LABELS } from "@/lib/i18n/translations";

export function LanguageToggle() {
  const { locale, setLocale, t } = useLocale();
  const next = locale === "en" ? "it" : "en";

  return (
    <button
      type="button"
      onClick={() => setLocale(next)}
      aria-label={t("settings_language")}
      title={t("settings_language")}
      className="inline-flex h-9 min-w-9 items-center justify-center rounded-full border border-border bg-surface px-2.5 text-xs font-semibold tabular-nums transition-colors hover:bg-surface-sunken"
    >
      {LOCALE_LABELS[locale]}
    </button>
  );
}
