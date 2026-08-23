import { track } from "@/lib/analytics";

const FIRST_GAME_KEY = "gtc:firstGameStarted";
const SESSION_COUNT_KEY = "gtc:sessionQuestionsCompleted";

/**
 * Lightweight, localStorage/sessionStorage-backed markers for the funnel
 * events Part 14 (Analytics readiness) asks for — no session/user tracking
 * infrastructure beyond what src/lib/analytics.ts already provides, just
 * enough state to know "has this happened before" without a backend.
 */

/** Fires once, ever, per browser — the very first prediction a player locks in. */
export function markFirstGameStarted(): void {
  if (typeof window === "undefined") return;
  try {
    if (localStorage.getItem(FIRST_GAME_KEY)) return;
    localStorage.setItem(FIRST_GAME_KEY, "1");
    track("first_game_started", {});
  } catch {
    // Storage unavailable (private mode, quota) — skip, never block gameplay over analytics.
  }
}

/** Fires once per browser tab session, at the 2nd and 5th completed question. */
export function markQuestionCompleted(): void {
  if (typeof window === "undefined") return;
  try {
    const count = (parseInt(sessionStorage.getItem(SESSION_COUNT_KEY) ?? "0", 10) || 0) + 1;
    sessionStorage.setItem(SESSION_COUNT_KEY, String(count));
    if (count === 2) track("question_2_reached", {});
    if (count === 5) track("five_questions_completed", {});
  } catch {
    // ignore
  }
}
