"use client";

import Link from "next/link";
import { useLocale } from "@/lib/i18n/LocaleContext";

export function Footer() {
  const { t } = useLocale();

  return (
    <footer className="border-t border-border/70 px-4 py-6 text-center text-xs text-muted">
      <Link href="/privacy" className="underline-offset-2 hover:text-foreground hover:underline">
        {t("footer_privacy")}
      </Link>
    </footer>
  );
}
