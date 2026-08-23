import * as localFileStore from "@/lib/store/localFileStore";
import * as supabaseStore from "@/lib/store/supabaseStore";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export { GameFlowError } from "@/lib/store/errors";

/**
 * Data-access facade. Every route/component imports from here, never from a
 * specific backend file, so swapping backends is a one-line change (this
 * file) rather than a rewrite.
 *
 * With Supabase configured (NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_
 * ANON_KEY), every player interaction is real and persistent — see
 * supabaseStore.ts. Without it, the app falls back to a local JSON file
 * (localFileStore.ts) purely so `npm install && npm run dev` still works
 * with zero setup. That fallback is loudly logged, never silent, and it is
 * a *development convenience only* — real deployments must configure
 * Supabase. See README.md for setup steps.
 */
if (!isSupabaseConfigured && process.env.NODE_ENV !== "test") {
  console.warn(
    "[guess-the-crowd] Supabase is not configured (NEXT_PUBLIC_SUPABASE_URL / " +
      "NEXT_PUBLIC_SUPABASE_ANON_KEY missing) — falling back to local dev storage " +
      "(.local-data/db.json). This is NOT shared, persistent, or real crowd data. " +
      "See README.md > Supabase setup."
  );
}

const activeStore = isSupabaseConfigured ? supabaseStore : localFileStore;

export const {
  getPublicQuestionById,
  listQuestionIds,
  getOrCreatePlayer,
  getQuestionResult,
  recordPrediction,
  recordVote,
  getPredictionResult,
  getLeaderboard,
  updateUsername,
  updateAvatar,
  getPlayerRank,
  getQuestionsAnsweredCount,
  getLeaderboardContext,
  getOrCreateDailyChallenge,
  getDailyStatus,
  recordDailyPrediction,
  recordDailyVote,
  getDailyPredictionResult,
  getDailyLeaderboard,
} = activeStore;
