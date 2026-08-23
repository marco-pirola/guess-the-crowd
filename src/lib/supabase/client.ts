import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Same truth as src/lib/supabase/server.ts's isSupabaseConfigured, computed
 * independently here because that file imports next/headers and can't be
 * imported from a Client Component. Both read the same NEXT_PUBLIC_ env
 * vars, which are inlined into the client bundle at build time.
 */
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

/**
 * Browser-side Supabase client, needed only for the account-linking flow
 * (Part C: supabase.auth.linkIdentity / updateUser must run client-side).
 * Reads/writes to app data still go through the server's request-scoped
 * client (src/lib/supabase/server.ts) and its RLS-bound session — this
 * client shares the same auth session (via the sb-* cookies @supabase/ssr
 * manages) but is never used to bypass RLS or call SECURITY DEFINER RPCs
 * directly from the browser.
 */
export function createBrowserSupabaseClient(): SupabaseClient {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase is not configured.");
  }
  return createBrowserClient(SUPABASE_URL!, SUPABASE_ANON_KEY!);
}
