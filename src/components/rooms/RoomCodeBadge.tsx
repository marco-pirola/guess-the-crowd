"use client";

import { useState } from "react";
import { useLocale } from "@/lib/i18n/LocaleContext";
import { Button } from "@/components/Button";

/** Prominent room code display + copy action — same clipboard pattern as ShareButton.tsx. */
export function RoomCodeBadge({ code }: { code: string }) {
  const { t } = useLocale();
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable; nothing more we can do silently
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <p
        className="rounded-2xl border border-accent/30 bg-accent-soft px-6 py-3 text-4xl font-extrabold tracking-[0.3em] text-accent tabular-nums sm:text-5xl"
        aria-label={code.split("").join(" ")}
      >
        {code}
      </p>
      <Button variant="secondary" onClick={handleCopy}>
        {copied ? t("room_copyCodeCopied") : t("room_copyCode")}
      </Button>
    </div>
  );
}
