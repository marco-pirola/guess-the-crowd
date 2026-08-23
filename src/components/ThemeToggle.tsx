"use client";

import { useTheme } from "@/lib/theme/ThemeContext";
import { useLocale } from "@/lib/i18n/LocaleContext";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const { t } = useLocale();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? t("settings_light") : t("settings_dark")}
      title={isDark ? t("settings_light") : t("settings_dark")}
      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-base transition-colors hover:bg-surface-sunken"
    >
      <span aria-hidden>{isDark ? "🌙" : "☀️"}</span>
    </button>
  );
}
