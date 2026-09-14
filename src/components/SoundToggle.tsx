"use client";

import { useSound } from "@/lib/sound/SoundContext";
import { useLocale } from "@/lib/i18n/LocaleContext";

export function SoundToggle() {
  const { enabled, setEnabled } = useSound();
  const { t } = useLocale();

  return (
    <button
      type="button"
      onClick={() => setEnabled(!enabled)}
      aria-label={enabled ? t("settings_soundOff") : t("settings_soundOn")}
      title={enabled ? t("settings_soundOff") : t("settings_soundOn")}
      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-base transition-colors hover:bg-surface-sunken"
    >
      <span aria-hidden>{enabled ? "🔊" : "🔇"}</span>
    </button>
  );
}
