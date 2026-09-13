"use client";

import { useLocale } from "@/lib/i18n/LocaleContext";
import { Button } from "@/components/Button";

export function ErrorState({
  message,
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  const { t } = useLocale();
  return (
    <div className="flex flex-1 animate-fade-in-up flex-col items-center justify-center gap-4 py-16 text-center">
      <p className="text-lg font-medium">{message ?? t("common_somethingWrong")}</p>
      {onRetry && <Button onClick={onRetry}>{t("common_tryAgain")}</Button>}
    </div>
  );
}
