import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/server";

/**
 * Lands here after: (a) the Google OAuth redirect from
 * supabase.auth.linkIdentity({ provider: "google" }), or (b) clicking the
 * confirmation link Supabase emails after supabase.auth.updateUser({ email })
 * — both PKCE flows hand back a `code` query param that must be exchanged
 * for a session server-side. Either way this is completing an identity
 * *link* on the existing anonymous session (see src/proxy.ts's
 * signInAnonymously + ProfileMenu.tsx), never creating a second account.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const redirectTo = searchParams.get("next") ?? "/";

  if (code && isSupabaseConfigured) {
    const supabase = await createServerSupabaseClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(`${origin}${redirectTo}`);
}
