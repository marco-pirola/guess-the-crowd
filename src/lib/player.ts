import { cookies } from "next/headers";
import { PLAYER_ID_COOKIE } from "@/proxy";
import { createServerSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/server";

/**
 * Resolves the current visitor's stable player id. Server-only.
 *
 * With Supabase configured, this is their real `auth.users.id` (anonymous or
 * upgraded), re-validated against Supabase Auth — not just decoded from a
 * cookie — so it can't be spoofed. Without Supabase configured, it falls
 * back to the placeholder UUID cookie the local dev store uses.
 *
 * Either way, the middleware (src/proxy.ts) guarantees this identity already
 * exists before any route handler runs.
 */
export async function getPlayerId(): Promise<string> {
  if (isSupabaseConfigured) {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) {
      throw new Error(
        "Missing Supabase session. Middleware should have signed in an anonymous user before any route handler runs."
      );
    }
    return user.id;
  }

  const store = await cookies();
  const id = store.get(PLAYER_ID_COOKIE)?.value;
  if (!id) {
    throw new Error(
      "Missing player id cookie. Middleware should have set this before any route handler runs."
    );
  }
  return id;
}
