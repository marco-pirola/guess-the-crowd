"use client";

import { useLocale } from "@/lib/i18n/LocaleContext";
import { categoryTranslationKey } from "@/lib/i18n/localizeQuestion";
import { QuestionCategory } from "@/lib/types";

/**
 * The question itself, rendered above the interactive card and kept visible
 * across every phase — predicting, choosing, and revealing all answer the
 * same question, so it should never disappear or get replaced.
 *
 * Full text always renders: no truncate/line-clamp/max-height here. Wraps
 * naturally to as many lines as it needs (see AGENTS.md P0 — never truncate
 * question text). `max-w-lg` matches GameScreen's outer container instead of
 * a narrower fixed width, so long questions get the full card width to wrap
 * against before breaking to a new line.
 */
export function QuestionCard({
  dailyNumber,
  category,
  question,
  className = "",
}: {
  dailyNumber: number;
  category: QuestionCategory;
  question: string;
  className?: string;
}) {
  const { t } = useLocale();

  return (
    <div className={`flex w-full max-w-lg flex-col items-center gap-3 text-center ${className}`}>
      <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-semibold uppercase tracking-wider">
        <span className="rounded-full bg-accent-soft px-2.5 py-1 text-accent">
          {t(categoryTranslationKey(category))}
        </span>
        <span className="text-muted">{t("game_challenge", { n: dailyNumber })}</span>
      </div>
      <h1 className="text-balance w-full text-2xl font-extrabold leading-tight break-words sm:text-3xl">
        {question}
      </h1>
    </div>
  );
}
