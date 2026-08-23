"use client";

import { useState } from "react";
import { useLocale } from "@/lib/i18n/LocaleContext";
import { useProfile } from "@/lib/profile/ProfileContext";
import { AVATAR_KEYS } from "@/lib/avatars";
import { AvatarKey } from "@/lib/types";
import { AvatarIcon } from "@/components/AvatarIcon";
import { Button } from "@/components/Button";

/**
 * First-time-only modal: choose a username (replacing the invisible
 * auto-generated one) and an avatar, before playing. Same dialog convention
 * as Onboarding.tsx. Shown by GameScreen, ahead of Onboarding, whenever
 * profile.hasCustomUsername is false — every player gets exactly one of
 * these, new or pre-existing (see final report for why).
 */
export function ProfileSetup({ onDone }: { onDone: () => void }) {
  const { t } = useLocale();
  const { profile, patch } = useProfile();
  const [username, setUsername] = useState(profile?.username ?? "");
  const [avatarKey, setAvatarKey] = useState<AvatarKey>(profile?.avatarKey ?? "fox");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await patch({ username, avatarKey });
      onDone();
    } catch (err) {
      const code = err instanceof Error ? err.message : "";
      if (code === "USERNAME_TAKEN") setError(t("profile_menu_usernameTaken"));
      else if (code.includes("Username")) setError(t("profile_menu_usernameInvalid"));
      else setError(t("profile_menu_updateError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-setup-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm px-4 py-8"
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm animate-pop-in rounded-3xl border border-border bg-surface p-6 text-center sm:p-8"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <h2 id="profile-setup-title" className="text-balance text-2xl font-extrabold leading-tight">
          {t("profile_setup_title")}
        </h2>
        <p className="mt-2 text-sm text-muted">{t("profile_setup_body")}</p>

        <label className="mt-6 block text-left text-xs font-semibold uppercase tracking-wider text-muted">
          {t("profile_setup_usernameLabel")}
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder={t("profile_setup_usernamePlaceholder")}
            maxLength={20}
            required
            className="mt-2 block w-full rounded-xl border border-border bg-background px-4 py-2.5 text-base font-normal normal-case text-foreground outline-none focus-visible:ring-4 focus-visible:ring-accent/30"
          />
        </label>

        <div className="mt-5 text-left">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">
            {t("profile_setup_avatarLabel")}
          </p>
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            {AVATAR_KEYS.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setAvatarKey(key)}
                aria-pressed={avatarKey === key}
                className={`rounded-full transition-transform hover:scale-105 ${
                  avatarKey === key ? "ring-2 ring-accent ring-offset-2 ring-offset-surface" : ""
                }`}
              >
                <AvatarIcon avatarKey={key} size="lg" />
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p role="alert" className="mt-4 text-sm text-danger">
            {error}
          </p>
        )}

        <Button type="submit" loading={busy} className="mt-6 w-full">
          {busy ? t("profile_setup_saving") : t("profile_setup_cta")}
        </Button>
      </form>
    </div>
  );
}
