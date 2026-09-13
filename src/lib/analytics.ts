import { track as vercelTrack } from "@vercel/analytics";

/**
 * Analytics abstraction so a real provider (PostHog, Plausible, etc.) can be
 * dropped in later without touching call sites. No personal data — just the
 * anonymous player id already used for gameplay.
 */
export type AnalyticsEvent =
  | "page_view"
  | "game_started"
  | "prediction_started"
  | "prediction_submitted"
  | "vote_submitted"
  | "result_viewed"
  | "share_clicked"
  | "replay_clicked"
  | "leaderboard_viewed"
  // Retention/Daily funnel (Part 14) — see src/lib/analyticsProgress.ts for
  // the first_game_started/question_2_reached/five_questions_completed
  // localStorage/sessionStorage markers that decide when these fire once.
  | "first_game_started"
  | "question_2_reached"
  | "five_questions_completed"
  | "daily_question_started"
  | "daily_started"
  | "daily_completed"
  | "daily_official_score_recorded"
  | "return_visit";

/**
 * Vercel's custom-event API only accepts flat string/number/boolean/null
 * values. Every call site today already passes only those, but this is a
 * deliberate backstop — an accidental object (e.g. a whole question or
 * profile) gets dropped instead of silently leaking whatever it contains.
 */
function toSafeProperties(props: Record<string, unknown>): Record<string, string | number | boolean | null> {
  const safe: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(props)) {
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean" || value === null) {
      safe[key] = value;
    }
  }
  return safe;
}

export function track(event: AnalyticsEvent, props: Record<string, unknown> = {}): void {
  if (process.env.NODE_ENV !== "production") {
    console.log(`[analytics] ${event}`, props);
    return;
  }
  vercelTrack(event, toSafeProperties(props));
}
