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

        {/* Quick Play and Daily Challenge are two distinct modes — each gets
            its own labeled card so a new player never confuses "unlimited
            play" with "today's 10-question official score" (Part 13). */}
        <div className="grid w-full max-w-2xl grid-cols-1 gap-4 sm:grid-cols-2">
          <Link
            href="/play"
            className="flex flex-col items-center gap-2 rounded-3xl border border-border bg-surface p-6 text-center transition-transform hover:scale-[1.02]"
            style={{ boxShadow: "var(--shadow-card)" }}
          >
            <span className="text-lg font-bold">{t("home_quickPlayTitle")}</span>
            <span className="text-sm text-muted">{t("home_quickPlayBody")}</span>
            <span className="mt-2 rounded-full bg-accent px-6 py-2 text-sm font-semibold text-accent-foreground">
              {t("home_playToday")}
            </span>
          </Link>
          <Link
            href="/daily"
            className="flex flex-col items-center gap-2 rounded-3xl border border-accent/40 bg-accent-soft p-6 text-center transition-transform hover:scale-[1.02]"
          >
            <span className="text-lg font-bold text-accent">{t("home_dailyChallengeTitle")}</span>
            <span className="text-sm text-muted">{t("home_dailyChallengeBody")}</span>
            <span className="mt-2 rounded-full border border-accent px-6 py-2 text-sm font-semibold text-accent">
              {t("home_playDaily")}
            </span>
          </Link>
        </div>

        <a
          href="#how-it-works"
          className="rounded-full border border-border px-8 py-3 text-base font-semibold text-foreground transition-colors hover:bg-surface-sunken"
        >
          {t("home_howItWorks")}
        </a>
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
      </section>
    </>
  );
}
