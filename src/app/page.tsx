"use client";

import Link from "next/link";
import { Header } from "@/components/Header";
import { useLocale } from "@/lib/i18n/LocaleContext";
import { TranslationKey } from "@/lib/i18n/translations";

const STEPS: { titleKey: TranslationKey; bodyKey: TranslationKey }[] = [
  { titleKey: "home_step1Title", bodyKey: "home_step1Body" },
  { titleKey: "home_step2Title", bodyKey: "home_step2Body" },
  { titleKey: "home_step3Title", bodyKey: "home_step3Body" },
];

export default function Home() {
  const { t } = useLocale();

  return (
    <>
      <Header />
      <main className="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-16 text-center sm:py-24">
        <div className="flex flex-col items-center gap-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            {t("home_tagline")}
          </p>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl">
            {t("home_title")}
          </h1>
          <p className="max-w-sm text-lg text-muted">{t("home_subtitle")}</p>
        </div>

        <div className="flex flex-col items-center gap-3 sm:flex-row">
          <Link
            href="/play"
            className="rounded-full bg-accent px-8 py-3 text-base font-semibold text-accent-foreground transition-all hover:scale-[1.03] hover:brightness-110 active:scale-[0.98]"
          >
            {t("home_playToday")}
          </Link>
          <a
            href="#how-it-works"
            className="rounded-full border border-border px-8 py-3 text-base font-semibold text-foreground transition-colors hover:bg-surface-sunken"
          >
            {t("home_howItWorks")}
          </a>
        </div>
      </main>

      <section
        id="how-it-works"
        className="flex flex-col items-center gap-8 border-t border-border px-4 py-16 sm:py-20"
      >
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
          {t("home_howItWorks")}
        </h2>
        {/*
         * A bordered box in this app always means "you can interact with
         * this" (Button, GameCard, AnswerOption). These three steps are pure
         * explanation, so they deliberately avoid that language: no border,
         * no card background, no hover state — just a numbered timeline a
         * reader scans, never something they'd try to click.
         */}
        <ol className="flex w-full max-w-3xl flex-col gap-6 sm:flex-row sm:gap-4">
          {STEPS.map((step, i) => (
            <li key={step.titleKey} className="flex flex-1 items-start gap-4 sm:flex-col sm:items-center sm:text-center">
              <span
                aria-hidden
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-bold text-accent"
              >
                {i + 1}
              </span>
              <div className="flex flex-col gap-1 sm:items-center">
                <h3 className="text-lg font-bold">{t(step.titleKey)}</h3>
                <p className="text-sm text-muted">{t(step.bodyKey)}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="max-w-sm text-sm text-muted">{t("home_footerNote")}</p>
      </section>
    </>
  );
}
