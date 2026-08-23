"use client";

import { Header } from "@/components/Header";
import { ErrorState } from "@/components/ErrorState";
import { useLocale } from "@/lib/i18n/LocaleContext";

export default function ChallengeError({ reset }: { error: Error; reset: () => void }) {
  const { t } = useLocale();
  return (
    <>
      <Header />
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-8">
        <ErrorState message={t("challenge_loadError")} onRetry={reset} />
      </main>
    </>
  );
}
