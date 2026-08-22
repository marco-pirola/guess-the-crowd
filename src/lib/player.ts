import { cookies } from "next/headers";
import { PLAYER_ID_COOKIE } from "@/proxy";

/** Reads the anonymous player id set by middleware. Server-only. */
export async function getPlayerId(): Promise<string> {
  const store = await cookies();
  const id = store.get(PLAYER_ID_COOKIE)?.value;
  if (!id) {
    throw new Error(
      "Missing player id cookie. Middleware should have set this before any route handler runs."
    );
  }
  return id;
}
