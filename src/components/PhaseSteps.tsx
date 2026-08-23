"use client";

import { useLocale } from "@/lib/i18n/LocaleContext";
import { TranslationKey } from "@/lib/i18n/translations";

const STEP_KEYS: TranslationKey[] = ["phase_predict", "phase_choose", "phase_reveal"];

/** Makes the two-phase (predict, then choose) structure of the game legible at a glance. */
export function PhaseSteps({ current }: { current: 0 | 1 | 2 }) {
  const { t } = useLocale();

  return (
    <ol className="flex items-center gap-2" aria-label={t("phase_gameProgress")}>
      {STEP_KEYS.map((key, i) => (
        <li key={key} className="flex items-center gap-2">
          <span
            className={`flex items-center gap-1.5 text-xs font-semibold transition-colors ${
              i === current ? "text-accent" : i < current ? "text-foreground" : "text-muted"
            }`}
          >
            <span
              aria-hidden
              className={`h-1.5 w-1.5 rounded-full transition-colors ${
                i <= current ? "bg-accent" : "bg-border"
              }`}
            />
            {t(key)}
          </span>
          {i < STEP_KEYS.length - 1 && <span aria-hidden className="h-px w-4 bg-border" />}
        </li>
      ))}
    </ol>
  );
}
