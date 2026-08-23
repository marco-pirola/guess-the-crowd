# Guess the Crowd

Predict what percentage of the crowd will pick each answer, lock it in, then vote yourself. Score is based on how close your prediction was — not on whether your own opinion was "right."

## Run it locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

- **With Supabase configured** (`.env.local` filled in — see below): every prediction, vote, and score is real and persistent, shared across every visitor. This is the real product.
- **Without it**: the app falls back to a local JSON file (`.local-data/db.json`, gitignored) so you can run the game with zero setup. This fallback is single-device, non-persistent, and logs a warning on server startup so it's never mistaken for real data. Use it for UI/gameplay work that doesn't need real persistence; use real Supabase (see below) to test the actual crowd behavior.

Other commands:

```bash
npm run test           # unit tests (scoring, validation, prediction convention, crowd blending, daily selection, username cooldown)
npm run lint            # ESLint
npm run build           # production build
npm run gen:seed-sql    # regenerate supabase/seed.sql from src/lib/store/seedQuestions.ts
```

## How the game works

`Home → /play (today's featured question) → predict → lock → vote → result → next question (randomized)`

"Next question" picks randomly from the full question pool, avoiding the question you're on and whichever ones you've seen recently this session (`src/lib/questionSelection.ts`, `src/app/api/questions/next/route.ts`) — see "Question selection" below.

The fairness rule: a player can never see the crowd's result before they've locked a prediction and voted. This is enforced server-side — in Postgres itself, not just the API or the UI — so it can't be bypassed by skipping steps in a request.

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com) (or run one locally with the Supabase CLI).
2. Under **Authentication → Providers**, enable **Anonymous Sign-Ins**. This is what lets people play with no account — the middleware (`src/proxy.ts`) signs every new visitor in anonymously on their first request.
3. In the SQL editor, run these files **in order**:
   1. `supabase/schema.sql` — tables, indexes, foreign keys, and Row Level Security policies.
   2. `supabase/functions.sql` — the server-side functions the app calls via `supabase.rpc(...)` for anything that has to read across players (the real crowd tally, leaderboard) or must be atomic (freezing a score once). See that file's header comment for why these need `SECURITY DEFINER` and how they stay safe.
   3. `supabase/seed.sql` — loads the ~350 questions from `src/lib/store/seedQuestions.ts` into the `questions` table. Every prediction/vote has a foreign key to a row here, so this step is required before anyone can play.
   4. `supabase/migration_italian_localization.sql` — adds the Italian display-text columns.
   5. `supabase/migration_crowd_reliability.sql` — Bayesian crowd blending (see "How the game works" below). **Must run before** `migration_player_identity.sql`.
   6. `supabase/migration_player_identity.sql` — username/avatar/best_score profile columns + the username cooldown/uniqueness RPCs. Read its preflight comment (checks for pre-existing username collisions) before running.
   7. `supabase/migration_leaderboard_context.sql` — the leaderboard's "points to overtake" support.
   8. `supabase/migration_daily_challenge.sql` — Daily Challenge tables/RPCs. **Must run after** `migration_crowd_reliability.sql`.
   Each migration file is idempotent-ish (`create or replace function`, `add column if not exists`) but is meant to be reviewed and applied manually, once — see each file's own header comment for exact ordering/preflight notes.
4. Under **Authentication → Providers → Google**, and under your project's auth settings, enable **manual identity linking** if you want the "Save your progress" (account linking) feature to work — see "Account linking" below for exact settings.
5. Copy `.env.example` to `.env.local` and fill in your project's `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Project Settings → API). **Never** put the service-role key here or anywhere in this app — it isn't used (see `.env.example`).
6. `npm run dev` and play a question — no further setup needed.

### Testing the real crowd flow

1. Play a question through to the result screen once. With only your own vote in, the result should sit close to that question's seeded baseline, nudged toward your vote — not a raw 100%/0% — see "How the game works" below.
2. Open the same challenge URL in a second browser (or an incognito window, so it gets its own anonymous session) and play it with a different answer. Refresh the first session's result — the percentages and player count should have moved further toward the real votes.
3. In the Supabase dashboard's Table Editor, confirm rows landed in `predictions` and `votes`, and that `profiles.total_score`/`current_streak` updated after a result was viewed.
4. Try voting twice from the same session on the same question (e.g. replay the vote request) — it should be rejected (`ALREADY_VOTED`), enforced by the `votes` table's unique constraint, not just app logic.

### Account linking (Google / email)

"Save your progress" in the profile menu (bottom-left avatar) links the current anonymous session to a permanent identity without creating a new account or losing data — see `src/components/SaveProgress.tsx`. Two Supabase dashboard settings are required beyond the anonymous sign-in provider:

- **Authentication → Providers → Google**: configure a Google OAuth Client ID/Secret and add this app's `/auth/callback` URL to the provider's authorized redirect URIs.
- **Authentication → URL Configuration**: add your deployed origin's `/auth/callback` to **Redirect URLs** (needed for both the Google flow and the email confirmation-link flow).
- **Authentication → Providers → Email → Secure email change**: optional — leave enabled (default) for dual confirmation, or disable it if you want a single-confirmation email-linking flow.
- Manual identity linking (`supabase.auth.linkIdentity`) needs no separate toggle in current Supabase projects, but if your project predates that API, check **Authentication → Providers** for a "manual linking" setting.

## Architecture

- **Next.js App Router + TypeScript + Tailwind CSS v4.**
- **Data layer** (`src/lib/store/`): every route/component calls the functions in `src/lib/store/index.ts`, which picks between two backends with identical exported signatures: `supabaseStore.ts` (real, used whenever Supabase env vars are present) and `localFileStore.ts` (the local JSON fallback). Nothing else in the app needs to know which is active.
- **Identity**: `src/proxy.ts` signs every new visitor in via real Supabase anonymous auth (`supabase.auth.signInAnonymously()`) on their first request, when configured; otherwise it falls back to a plain random-UUID cookie. `src/lib/player.ts` resolves the current player id the same way, re-validating the session against Supabase rather than trusting a locally-decoded token.
- **No service-role key anywhere in the app.** Every operation that needs to read across players (crowd tallies, the leaderboard) or must be atomic (freezing a score once, updating streaks) goes through a `SECURITY DEFINER` Postgres function in `supabase/functions.sql`, each of which derives the acting player from `auth.uid()` — never from anything the client supplies. Everything else (submitting your own prediction/vote) is a plain insert that Postgres Row Level Security and unique constraints authorize and de-duplicate, not application code.
- **Scoring** (`src/lib/scoring.ts`): `calculatePredictionScore(predicted, actual)` — deterministic, unit-tested, 0–1000. Quadratic falloff on error so accuracy is rewarded disproportionately: a perfect guess scores 1000, a complete miss (off by 100 points) scores 0. The Postgres RPC in `supabase/functions.sql` implements the identical formula for the real crowd path.
- **Crowd result** (`src/lib/crowdMath.ts`, mirrored in `supabase/migration_crowd_reliability.sql`'s `get_crowd_result`): a Bayesian (Beta-Binomial) blend of the question's seeded baseline (`questions.seeded_result_percentage_a`, treated as a prior worth `2 x minimumVotes` pseudo-votes) and the real vote tally. With very few real votes the seed dominates; as votes accumulate, real data progressively takes over. This replaced a naive `votesA/total` calculation that showed a single vote as a false "100% crowd" — see the project's crowd-reliability report for the worked examples and reasoning. `votesA`/`votesB`/`totalVotes` in API responses are still the raw counts; only the displayed/scored percentage is blended.
- **Questions** (`src/lib/store/seedQuestions.ts`): ~350 original binary questions across 8 categories, loaded into Supabase's `questions` table by `supabase/seed.sql`. The local array is still used for two things — the Daily Challenge selection algorithm (`src/lib/dailyChallenge.ts`) and picking a question's display ordinal — but the actual question content shown to players is always read from the database in the Supabase path. `seededResultPercentageA`/`minimumVotes` feed the crowd-reliability blend above in both backends (no longer dev-only/unused fields).
- **Daily Challenge** (`src/app/daily/`, `src/lib/dailyChallenge.ts`, `supabase/migration_daily_challenge.sql`): a separate, parallel scoring track — 10 fixed questions per UTC date, deterministically selected and identical for every player, official score recorded once (sum of the ten question scores, same scoring formula as Quick Play), with its own leaderboard. Isolated from `profiles.total_score`/`games_played`/`best_score` and the Quick Play Today/All-time leaderboard by design; Daily votes still pool into the shared public crowd tally for that question.
- **Question selection** (`src/lib/questionSelection.ts`): `pickNextQuestionId(pool, { currentId, recentIds })` is a pure, unit-tested function — never repeats the question you're on, and avoids whichever ids the client passes as recently seen, falling back gracefully if the pool is too small to honor both. `GET /api/questions/next` (`src/app/api/questions/next/route.ts`) is the only thing that calls it, backed by `listQuestionIds()` (both store backends), which returns just published ids/categories — never question content or seeded percentages — so the client never gets a peek at answers ahead of time. The client's own recent-history list lives in `localStorage` (`src/lib/recentQuestions.ts`), capped at the last 20 questions seen this session, and is what `GameScreen.tsx`'s "Next question" button sends along.

## Environment variables

| Variable | Required | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | For real persistence | Your Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | For real persistence | Safe to expose — Postgres RLS is what actually protects data, not secrecy of this key. |

Neither is required to run locally (see the local fallback above). See `.env.example`. Never commit real values, and never add a service-role key anywhere in this project.

## Known limitations

- The local JSON fallback (`.local-data/db.json`) is genuinely single-device and non-persistent — it exists purely so the repo runs with zero setup, and it's not what real players use once Supabase is configured.
- Binary (2-option) questions only.
- Streak/day boundaries and the Daily Challenge's date boundary both use UTC, not the player's local timezone.
- Daily Challenge "practice replay" re-enters the same 10 questions but, since the official predictions are already frozen, each one immediately shows its original locked-in result rather than allowing a fresh interactive re-prediction — see the final implementation report for the reasoning.
- No custom Open Graph image generation yet — share previews use text metadata only.
- No question CMS/admin UI — questions are still edited in `src/lib/store/seedQuestions.ts` and pushed to Supabase by re-running `npm run gen:seed-sql` and re-applying `supabase/seed.sql`.
