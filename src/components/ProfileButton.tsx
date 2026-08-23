"use client";

import { useState } from "react";
import { useLocale } from "@/lib/i18n/LocaleContext";
import { useProfile } from "@/lib/profile/ProfileContext";
import { AvatarIcon } from "@/components/AvatarIcon";
import { ProfileMenu } from "@/components/ProfileMenu";

/**
 * Persistent circular avatar button, bottom-left, on every route (mounted
 * once in layout.tsx). Positioned to clear the ResultCard's bottom
 * "Next Question" button (which is centered/full-width, not edge-anchored)
 * and padded for iOS safe areas, since nothing else in the app accounts for
 * those yet.
 */
export function ProfileButton() {
  const { t } = useLocale();
  const { profile } = useProfile();
  const [open, setOpen] = useState(false);

  if (!profile) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("profile_button_label")}
        className="fixed z-40 rounded-full border border-border bg-surface transition-transform hover:scale-105 active:scale-95"
        style={{
          left: "1rem",
          bottom: "calc(1rem + env(safe-area-inset-bottom, 0px))",
          boxShadow: "var(--shadow-card)",
        }}
      >
        <AvatarIcon avatarKey={profile.avatarKey} size="md" />
      </button>
      {open && <ProfileMenu onClose={() => setOpen(false)} />}
    </>
  );
}
