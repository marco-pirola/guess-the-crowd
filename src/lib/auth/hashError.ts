/**
 * Supabase reports OAuth/link errors (e.g. a failed linkIdentity because the
 * provider identity already belongs to another user) by appending them to the
 * URL *hash* fragment of the redirect target, since that's the only channel
 * available once the error is discovered inside its own callback endpoint —
 * a hash never reaches the server, so this must be read client-side.
 */
export function getHashErrorCode(hash: string): string | null {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!raw) return null;
  return new URLSearchParams(raw).get("error_code");
}
