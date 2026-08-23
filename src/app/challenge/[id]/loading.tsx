"use client";

import { Header } from "@/components/Header";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useLocale } from "@/lib/i18n/LocaleContext";

export default function Loading() {
  const { t } = useLocale();
  return (
    <>
      <Header />
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-8">
        <LoadingSpinner label={t("challenge_loading")} />
      </main>
    </>
  );
}
