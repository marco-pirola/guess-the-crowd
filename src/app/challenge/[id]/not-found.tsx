"use client";

import Link from "next/link";
import { Header } from "@/components/Header";
import { useLocale } from "@/lib/i18n/LocaleContext";

export default function ChallengeNotFound() {
  const { t } = useLocale();
  return (
    <>
      <Header />
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-8 text-center">
        <p className="text-lg font-medium">{t("challenge_notFound")}</p>
        <Link
          href="/play"
          className="inline-flex items-center justify-center rounded-full bg-accent px-6 py-3 text-base font-semibold text-accent-foreground transition-all hover:scale-[1.02] hover:brightness-110 active:scale-[0.98]"
        >
          {t("challenge_playTodays")}
        </Link>
      </main>
    </>
  );
}
