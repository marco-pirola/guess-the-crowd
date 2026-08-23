export const USERNAME_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;

export interface UsernameCooldownStatus {
  canChangeUsername: boolean;
  /** ISO timestamp of when the next change becomes available, or null if free now/forever-until-first-change. */
  usernameAvailableAt: string | null;
}

/**
 * Free the first time (usernameChangedAt is null); after that, once every
 * USERNAME_COOLDOWN_MS. Pure function — the single source of truth for this
 * math, shared by the API route (display copy) and localFileStore.ts
 * (enforcement); the Postgres RPC (update_username in
 * supabase/migration_player_identity.sql) mirrors the same 30-day rule.
 */
export function usernameCooldownStatus(
  usernameChangedAt: string | null,
  now: Date = new Date()
): UsernameCooldownStatus {
  if (!usernameChangedAt) {
    return { canChangeUsername: true, usernameAvailableAt: null };
  }
  const availableAt = Date.parse(usernameChangedAt) + USERNAME_COOLDOWN_MS;
  return {
    canChangeUsername: now.getTime() >= availableAt,
    usernameAvailableAt: new Date(availableAt).toISOString(),
  };
}
