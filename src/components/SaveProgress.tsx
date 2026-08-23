"use client";

import { useState } from "react";
import { useLocale } from "@/lib/i18n/LocaleContext";
import { createBrowserSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { Button } from "@/components/Button";

type State = "idle" | "google-loading" | "email-form" | "email-loading" | "email-sent" | "error";

/**
 * "Save your progress": links the current anonymous session to a permanent
 * Google or email identity without creating a new account (Part C). Never
 * mutates local profile state itself — success/failure only ever affects
 * this component's own status, so cancelling or an error loses nothing.
 */
export function SaveProgress() {
  const { t } = useLocale();
  const [state, setState] = useState<State>("idle");
  const [email, setEmail] = useState("");

  async function handleGoogle() {
    if (!isSupabaseConfigured) return;
    setState("google-loading");
    try {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.auth.linkIdentity({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
      // On success the browser navigates away to Google, then back to
      // /auth/callback — nothing more to do here.
    } catch {
      setState("error");
    }
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isSupabaseConfigured) return;
    setState("email-loading");
    try {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.auth.updateUser(
        { email },
        { emailRedirectTo: `${window.location.origin}/auth/callback` }
      );
      if (error) throw error;
      setState("email-sent");
    } catch {
      setState("error");
    }
  }

  if (state === "email-sent") {
    return <p className="text-sm text-success">{t("profile_menu_emailSent")}</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="text-sm font-semibold">{t("profile_menu_saveProgressTitle")}</p>
        <p className="mt-1 text-xs text-muted">{t("profile_menu_saveProgressBody")}</p>
      </div>

      {state === "error" && (
        <p role="alert" className="text-sm text-danger">
          {t("profile_menu_linkError")}
        </p>
      )}

      {state === "email-form" || state === "email-loading" ? (
        <form onSubmit={handleEmailSubmit} className="flex flex-col gap-2">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("profile_menu_emailPlaceholder")}
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-4 focus-visible:ring-accent/30"
          />
          <Button type="submit" variant="secondary" loading={state === "email-loading"}>
            {t("profile_menu_emailSend")}
          </Button>
        </form>
      ) : (
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={handleGoogle}
            loading={state === "google-loading"}
          >
            {t("profile_menu_continueWithGoogle")}
          </Button>
          <Button type="button" variant="ghost" onClick={() => setState("email-form")}>
            {t("profile_menu_continueWithEmail")}
          </Button>
        </div>
      )}
    </div>
  );
}
