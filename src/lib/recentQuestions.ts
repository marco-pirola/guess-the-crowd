/**
 * Client-side "recently seen" question history, so the next-question picker
 * (see src/app/api/questions/next/route.ts) can avoid repeats within a
 * session. localStorage, not a server session — simplest option that still
 * survives across page loads on this device (see AGENTS.md section 11).
 */

const STORAGE_KEY = "gtc:recentQuestionIds";
const MAX_HISTORY = 20;

export function getRecentQuestionIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export function rememberQuestionId(id: string): void {
  if (typeof window === "undefined") return;
  try {
    const deduped = getRecentQuestionIds().filter((existing) => existing !== id);
    deduped.push(id);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(deduped.slice(-MAX_HISTORY)));
  } catch {
    // localStorage unavailable (private mode, quota, etc.) — history is best-effort only.
  }
}
