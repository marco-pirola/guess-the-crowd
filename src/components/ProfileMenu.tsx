"use client";

import { useRef, useState } from "react";
import { useLocale } from "@/lib/i18n/LocaleContext";
import { useProfile } from "@/lib/profile/ProfileContext";
import { useDialogFocus } from "@/lib/useDialogFocus";
import { AVATAR_KEYS } from "@/lib/avatars";
import { AvatarKey } from "@/lib/types";
import { AvatarIcon } from "@/components/AvatarIcon";
import { SaveProgress } from "@/components/SaveProgress";
import { Button } from "@/components/Button";

function daysUntil(iso: string): number {
  return Math.max(1, Math.ceil((Date.parse(iso) - Date.now()) / (24 * 60 * 60 * 1000)));
}

function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <span className="text-sm text-muted">{label}</span>
      <span className="text-sm font-semibold tabular-nums">{value}</span>
    </div>
  );
}

export function ProfileMenu({ onClose }: { onClose: () => void }) {
  const { t } = useLocale();
  const { profile, patch } = useProfile();
  const [editingUsername, setEditingUsername] = useState(false);
  const [usernameDraft, setUsernameDraft] = useState(profile?.username ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogFocus(dialogRef, onClose);

  if (!profile) return null;

  async function handleUsernameSave() {
    setBusy(true);
    setError(null);
    try {
      await patch({ username: usernameDraft });
      setEditingUsername(false);
    } catch (err) {
      const code = err instanceof Error ? err.message : "";
      if (code === "USERNAME_TAKEN") setError(t("profile_menu_usernameTaken"));
      else setError(t("profile_menu_usernameInvalid"));
    } finally {
      setBusy(false);
    }
  }

  async function handleAvatarPick(avatarKey: AvatarKey) {
    if (avatarKey === profile!.avatarKey) return;
    try {
      await patch({ avatarKey });
    } catch {
      setError(t("profile_menu_updateError"));
    }
  }

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-menu-title"
      tabIndex={-1}
      className="fixed inset-0 z-50 flex items-end justify-start bg-background/60 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[85vh] w-full animate-pop-in overflow-y-auto rounded-t-3xl border border-border bg-surface p-6 sm:max-w-sm sm:rounded-3xl"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AvatarIcon avatarKey={profile.avatarKey} size="lg" />
            <h2 id="profile-menu-title" className="text-lg font-extrabold">
              {profile.username}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("profile_menu_close")}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/30"
          >
            ✕
          </button>
        </div>

        <div className="mt-5 border-t border-border pt-4">
          <StatRow label={t("profile_menu_bestScore")} value={profile.bestScore} />
          <StatRow label={t("profile_menu_gamesPlayed")} value={profile.gamesPlayed} />
          <StatRow label={t("profile_menu_questionsAnswered")} value={profile.questionsAnswered} />
          <StatRow
            label={t("profile_menu_globalRank")}
            value={t("profile_menu_globalRankValue", { rank: profile.globalRank })}
          />
        </div>

        <div className="mt-5 border-t border-border pt-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">
            {t("profile_menu_avatarLabel")}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {AVATAR_KEYS.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => handleAvatarPick(key)}
                aria-pressed={profile.avatarKey === key}
                className={`rounded-full transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/30 ${
                  profile.avatarKey === key ? "ring-2 ring-accent ring-offset-2 ring-offset-surface" : ""
                }`}
              >
                <AvatarIcon avatarKey={key} />
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 border-t border-border pt-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">
            {t("profile_menu_usernameLabel")}
          </p>
          {editingUsername ? (
            <div className="mt-2 flex flex-col gap-2">
              <input
                value={usernameDraft}
                onChange={(e) => setUsernameDraft(e.target.value)}
                maxLength={20}
                className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-4 focus-visible:ring-accent/30"
              />
              <div className="flex gap-2">
                <Button variant="secondary" loading={busy} onClick={handleUsernameSave} className="flex-1">
                  {t("profile_menu_saveUsername")}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setEditingUsername(false);
                    setUsernameDraft(profile.username);
                    setError(null);
                  }}
                >
                  {t("profile_menu_cancel")}
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="text-sm">{profile.username}</span>
              {profile.canChangeUsername ? (
                <button
                  type="button"
                  onClick={() => setEditingUsername(true)}
                  className="text-sm font-semibold text-accent"
                >
                  {t("profile_menu_changeUsername")}
                </button>
              ) : null}
            </div>
          )}
          {!profile.canChangeUsername && profile.usernameAvailableAt && !editingUsername && (
            <p className="mt-1 text-xs text-muted">
              {t("profile_menu_cooldownNotice", { days: daysUntil(profile.usernameAvailableAt) })}
            </p>
          )}
          {error && (
            <p role="alert" className="mt-2 text-sm text-danger">
              {error}
            </p>
          )}
        </div>

        <div className="mt-5 border-t border-border pt-4">
          <SaveProgress />
        </div>
      </div>
    </div>
  );
}
