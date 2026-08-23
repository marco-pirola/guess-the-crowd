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

export function track(event: AnalyticsEvent, props: Record<string, unknown> = {}): void {
  if (process.env.NODE_ENV !== "production") {
    console.log(`[analytics] ${event}`, props);
  }
  // Swap in a real provider call here later.
}
