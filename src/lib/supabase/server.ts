import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * True once real Supabase credentials are present. Both the app (this file)
 * and the middleware (src/proxy.ts) check this independently — when it's
 * false, the app falls back to the local JSON file store (src/lib/store/
 * localFileStore.ts) so `npm run dev` still works with zero setup. That
 * fallback is dev-only: see src/lib/store/index.ts for the loud warning it
 * logs, and README.md for why it must never be mistaken for real
 * persistence.
 *
 * Only the ANON key is used here — never the service-role key. Every
 * privileged operation (crowd aggregation, atomic scoring) goes through a
 * SECURITY DEFINER Postgres function (see supabase/functions.sql) that
 * derives the acting user from auth.uid(), not from anything the app
 * supplies — so the anon key + Postgres RLS is the actual authority, not
 * this Node process.
 */
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

/**
 * A request-scoped Supabase client bound to the current visitor's session
 * cookie (set by the middleware's anonymous sign-in). Every query made with
 * it is subject to Postgres RLS as *that* user — it can never read or write
 * another player's rows, regardless of what the calling TypeScript code
 * intends. Server-only: never import this from a Client Component.
 */
export async function createServerSupabaseClient(): Promise<SupabaseClient> {
  if (!isSupabaseConfigured) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, " +
        "or use the local dev fallback (see README.md)."
    );
  }
  const cookieStore = await cookies();
  return createServerClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component render, which can't set cookies.
          // Harmless here: the middleware (src/proxy.ts) already refreshes
          // the session cookie on every request.
        }
      },
    },
  });
}
