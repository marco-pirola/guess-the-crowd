"use client";

import { useLocale } from "@/lib/i18n/LocaleContext";

export function PrivacyContent() {
  const { t } = useLocale();

  return (
    <article className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-10 sm:py-14">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{t("privacy_title")}</h1>
        <p className="mt-3 text-base text-muted">{t("privacy_intro")}</p>
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">{t("privacy_dataTitle")}</h2>
        <p className="text-sm text-muted">{t("privacy_dataBody")}</p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">{t("privacy_cookiesTitle")}</h2>
        <p className="text-sm text-muted">{t("privacy_cookiesBody")}</p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">{t("privacy_analyticsTitle")}</h2>
        <p className="text-sm text-muted">{t("privacy_analyticsBody")}</p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">{t("privacy_linkingTitle")}</h2>
        <p className="text-sm text-muted">{t("privacy_linkingBody")}</p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">{t("privacy_deletionTitle")}</h2>
        <p className="text-sm text-muted">{t("privacy_deletionBody")}</p>
      </section>

      <section className="flex flex-col gap-2 border-t border-border/70 pt-6">
        <h2 className="text-lg font-semibold">{t("privacy_disclaimerTitle")}</h2>
        <p className="text-sm text-muted">{t("privacy_disclaimerBody")}</p>
      </section>

      <p className="text-xs text-muted">{t("privacy_lastUpdated")}</p>
    </article>
  );
}
