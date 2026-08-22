import { NextRequest, NextResponse } from "next/server";

export const PLAYER_ID_COOKIE = "gtc_player_id";

/**
 * Assigns every visitor a stable anonymous id on their first request, so they
 * can play without creating an account. This is a placeholder for Supabase
 * anonymous auth (`supabase.auth.signInAnonymously()`) — swapping it in later
 * means the id source changes, but nothing that reads `PLAYER_ID_COOKIE`
 * downstream has to.
 */
export function proxy(request: NextRequest) {
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
