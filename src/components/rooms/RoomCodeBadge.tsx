"use client";

import { useState } from "react";
import { useLocale } from "@/lib/i18n/LocaleContext";
import { Button } from "@/components/Button";

/** Prominent room code display + copy actions — same clipboard pattern as ShareButton.tsx. */
export function RoomCodeBadge({ code }: { code: string }) {
  const { t } = useLocale();
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  async function handleCopyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      // clipboard unavailable; nothing more we can do silently
    }
  }

  async function handleCopyLink() {
    try {
      // Current browser origin — never hardcoded, so this works on
      // localhost, previews, and production alike.
      const url = `${window.location.origin}/rooms/${code}`;
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
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
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button variant="secondary" onClick={handleCopyCode}>
          {copiedCode ? t("room_copyCodeCopied") : t("room_copyCode")}
        </Button>
        <Button variant="secondary" onClick={handleCopyLink}>
          {copiedLink ? t("room_copyCodeCopied") : t("room_copyInviteLink")}
        </Button>
      </div>
    </div>
  );
}
