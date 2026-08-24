import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const exchangeCodeForSession = vi.fn().mockResolvedValue({ error: null });
const createServerSupabaseClient = vi.fn(async () => ({
  auth: { exchangeCodeForSession },
}));

vi.mock("@/lib/supabase/server", () => ({
  get isSupabaseConfigured() {
    return true;
  },
  createServerSupabaseClient: () => createServerSupabaseClient(),
}));

const { GET } = await import("@/app/auth/callback/route");

beforeEach(() => {
  exchangeCodeForSession.mockClear();
  createServerSupabaseClient.mockClear();
});

describe("GET /auth/callback", () => {
  it("exchanges a valid code and redirects to / (unchanged happy path)", async () => {
    const request = new NextRequest("https://example.com/auth/callback?code=abc123");
    const response = await GET(request);

    expect(exchangeCodeForSession).toHaveBeenCalledWith("abc123");
    expect(response.headers.get("location")).toBe("https://example.com/");
  });

  it("honors an explicit next param when a code is present", async () => {
    const request = new NextRequest("https://example.com/auth/callback?code=abc123&next=%2Fleaderboard");
    const response = await GET(request);

    expect(exchangeCodeForSession).toHaveBeenCalledWith("abc123");
    expect(response.headers.get("location")).toBe("https://example.com/leaderboard");
  });

  it("redirects to /auth/resolve (not /) when there is no code, so a hash-only error can be read client-side", async () => {
    const request = new NextRequest("https://example.com/auth/callback");
    const response = await GET(request);

    expect(exchangeCodeForSession).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe("https://example.com/auth/resolve");
  });
});
