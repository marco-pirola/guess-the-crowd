"use client";

import { useRef } from "react";
import { useLocale } from "@/lib/i18n/LocaleContext";
import { useDialogFocus } from "@/lib/useDialogFocus";
import { Button } from "@/components/Button";

/**
 * A first-time-only overlay explaining the predict → choose → reveal loop in
 * one glance. Shown by GameScreen when `hasSeenOnboarding()` is false; never
 * gates data loading, just sits on top of it.
 */
export function Onboarding({ onDismiss }: { onDismiss: () => void }) {
  const { t } = useLocale();
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogFocus(dialogRef, onDismiss);

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
      tabIndex={-1}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm px-4 py-8"
    >
      <div
        className="w-full max-w-sm animate-pop-in rounded-3xl border border-border bg-surface p-6 text-center sm:p-8"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <h2 id="onboarding-title" className="text-balance text-2xl font-extrabold leading-tight">
          {t("onboarding_title")}
        </h2>
        <p className="mt-3 text-sm text-muted">{t("onboarding_body")}</p>
        <Button onClick={onDismiss} className="mt-6 w-full">
          {t("onboarding_cta")}
        </Button>
      </div>
    </div>
  );
}
