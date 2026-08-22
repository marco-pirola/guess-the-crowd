# Guess the Crowd

Predict what percentage of the crowd will pick each answer, lock it in, then vote yourself. Score is based on how close your prediction was — not on whether your own opinion was "right."

## Run it locally

```bash
npm install
npm run dev
```

Open http://localhost:3000. No account, no setup — an anonymous player id is assigned automatically via a cookie, and all game data is stored in `.local-data/db.json` (gitignored).

Other commands:

```bash
npm run test   # scoring + validation unit tests
npm run lint   # ESLint
npm run build  # production build
```

## How the game works

`Home → /play (today's featured question) → predict → lock → vote → result → next question`

The fairness rule: a player can never see the crowd's result before they've locked a prediction and voted. The API enforces this order server-side (`403` if you try to skip a step), not just the UI.

## Architecture

- **Next.js App Router + TypeScript + Tailwind CSS v4.**
- **Data layer** (`src/lib/store/`): every route/component calls the functions in `src/lib/store/index.ts`, never a backend directly. Today that facade points at `localFileStore.ts` (a single JSON file). Moving to real Supabase later means writing a `supabaseStore.ts` with the same function signatures against `supabase/schema.sql` and repointing that one facade file — nothing else changes.
- **Identity**: `src/proxy.ts` (Next's middleware/proxy convention) assigns every visitor a stable anonymous UUID cookie on first request. This stands in for Supabase anonymous auth (`signInAnonymously()`); swapping it in later changes only where the id comes from.
- **Scoring** (`src/lib/scoring.ts`): `calculatePredictionScore(predicted, actual)` — deterministic, unit-tested, 0–1000. Quadratic falloff on error so accuracy is rewarded disproportionately: a perfect guess scores 1000, a complete miss (off by 100 points) scores 0.
- **Questions** (`src/lib/store/seedQuestions.ts`): 30 original binary questions across 8 categories. Each has a `seededResultPercentageA` used until a question collects `minimumVotes` real votes, at which point the live tally takes over (`resultSource: "seeded" | "live"`) — the UI is explicit about which one a result came from, so it never claims fake community size.

## Environment variables

None required to run locally. See `.env.example` for the Supabase variables the project will need once it moves off the local file store — never commit real values, and never prefix a service-role key with `NEXT_PUBLIC_`.

## Database setup (future Supabase migration)

1. Create a Supabase project; enable **anonymous sign-ins** under Authentication → Providers.
2. Run `supabase/schema.sql` in the SQL editor (tables, indexes, RLS policies, leaderboard views).
3. Run `supabase/seed.sql` to load the same 30 demo questions (regenerate it with `npm run gen:seed-sql` if you edit `seedQuestions.ts`).
4. Fill in `.env.local` from `.env.example`.
5. Implement `src/lib/store/supabaseStore.ts` against the same exports as `localFileStore.ts`, and point `src/lib/store/index.ts` at it.

## Known limitations (MVP)

- Single-device local storage: scores/streaks live in a JSON file on your machine, not a shared database. Fine for solo testing; not for multiple real players until Supabase is wired in.
- Binary (2-option) questions only.
- Streak/day boundaries use UTC, not the player's local timezone.
- No account upgrade path yet (anonymous only) — planned for when Supabase auth lands.
- No custom Open Graph image generation yet — share previews use text metadata only.
