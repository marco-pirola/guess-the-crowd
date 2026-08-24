"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/lib/i18n/LocaleContext";
import { createBrowserSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { getHashErrorCode } from "@/lib/auth/hashError";
import { LoadingSpinner } from "@/components/LoadingSpinner";

type State = "resolving" | "error";

/**
 * /auth/callback (a server route) can't see a hash-fragment error — only the
 * browser has it. This page is where that error actually gets read: when
 * SaveProgress's linkIdentity fails because the Google identity already
 * belongs to another account, GoTrue redirects here (via /auth/callback)
 * with #error=server_error&error_code=identity_already_exists in the hash.
 * That's the one case handled specially; everything else just continues on
 * to "/", same as the old unconditional redirect used to.
 */
export default function ResolveAuthPage() {
  const { t } = useLocale();
  const router = useRouter();
  const [state, setState] = useState<State>("resolving");

  useEffect(() => {
    let cancelled = false;

    async function resolve() {
      const errorCode = getHashErrorCode(window.location.hash);
      // Strip the raw GoTrue error out of the address bar either way.
      window.history.replaceState(null, "", window.location.pathname);

      if (errorCode !== "identity_already_exists" || !isSupabaseConfigured) {
        router.replace("/");
        return;
      }

      try {
        const supabase = createBrowserSupabaseClient();
        const { error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo: `${window.location.origin}/auth/callback` },
        });
        if (error) throw error;
        // On success the browser navigates away to Google — nothing more to
        // do here.
      } catch {
        if (!cancelled) setState("error");
      }
    }

    resolve();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (state === "error") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center">
        <p role="alert" className="text-sm text-danger">
          {t("profile_menu_linkError")}
        </p>
        <button
          type="button"
          onClick={() => router.replace("/")}
          className="text-sm font-semibold text-accent"
        >
          {t("profile_menu_linkErrorRetry")}
        </button>
      </div>
    );
  }

  return <LoadingSpinner />;
}
