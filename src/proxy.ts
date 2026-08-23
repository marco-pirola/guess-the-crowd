import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export const PLAYER_ID_COOKIE = "gtc_player_id";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

/**
 * Assigns every visitor a stable, anonymous identity on their first request,
 * so they can play without creating an account.
 *
 * With Supabase configured, this is real `supabase.auth.signInAnonymously()`
 * — the visitor gets a genuine `auth.users` row and a session cookie, which
 * is what makes `auth.uid()` (and therefore every RLS policy and RPC
 * function in supabase/schema.sql + supabase/functions.sql) work. Without
 * Supabase configured, it falls back to the original placeholder — a plain
 * random UUID cookie — so local development still works with zero setup.
 */
export async function proxy(request: NextRequest) {
  if (isSupabaseConfigured) return supabaseAnonymousAuth(request);
  return localCookieFallback(request);
}

async function supabaseAnonymousAuth(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // getUser() re-validates the session against Supabase Auth (not just a
  // local JWT decode), which is the safe way to check "is there a real
  // session" from a server context. Signing in anonymously here — rather
  // than lazily in a route handler — guarantees every request downstream
  // already has a session cookie to read.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    await supabase.auth.signInAnonymously();
  }

  return response;
}

function localCookieFallback(request: NextRequest) {
  const existing = request.cookies.get(PLAYER_ID_COOKIE);
  if (existing) return NextResponse.next();

  const playerId = crypto.randomUUID();
  // Also stamp the incoming request so server components/route handlers in
  // *this* request can read it via next/headers cookies(), not just the next one.
  request.cookies.set(PLAYER_ID_COOKIE, playerId);
  const response = NextResponse.next({ request: { headers: request.headers } });
  response.cookies.set(PLAYER_ID_COOKIE, playerId, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });
  return response;
}

export const config = {
  matcher: "/((?!_next/static|_next/image|favicon.ico).*)",
};
