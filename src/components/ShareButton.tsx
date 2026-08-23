"use client";

import { useState } from "react";
import { track } from "@/lib/analytics";
import { useLocale } from "@/lib/i18n/LocaleContext";
import { Button } from "@/components/Button";

export function ShareButton({ text, url }: { text: string; url: string }) {
  const { t } = useLocale();
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    track("share_clicked");
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ text, url });
        return;
      } catch {
        // user cancelled or share failed — fall through to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(`${text} ${url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable; nothing more we can do silently
    }
  }

  return (
    <Button variant="secondary" onClick={handleShare} className="w-full sm:w-auto">
      {copied ? t("share_linkCopied") : t("share_result")}
    </Button>
  );
}
