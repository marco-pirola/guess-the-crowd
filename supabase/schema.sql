-- Guess the Crowd — Supabase schema.
--
-- This is the real, persistent data layer (src/lib/store/supabaseStore.ts)
-- used whenever NEXT_PUBLIC_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_ANON_KEY are
-- configured. Without them, the app falls back to a local JSON file
-- (src/lib/store/localFileStore.ts) purely so it still runs with zero setup
-- — see README.md. The shape here mirrors src/lib/types.ts.
--
-- Run this in the Supabase SQL editor (or via `supabase db push`) on a fresh
-- project, after enabling anonymous sign-ins under Authentication > Providers.
-- Then run supabase/functions.sql, then supabase/seed.sql.

-- gen_random_uuid() is built into Postgres 13+ (which every Supabase project
-- runs), so this is just defensive belt-and-suspenders for reproducing the
-- schema from scratch on an older or non-Supabase Postgres.
create extension if not exists pgcrypto;

-- ── profiles ─────────────────────────────────────────────────────────────
-- One row per auth.users id (anonymous or upgraded). Created on first visit.
create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  last_played_date date,
  total_score integer not null default 0,
  games_played integer not null default 0,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "profiles are publicly readable"
  on profiles for select
  using (true);

create policy "users can insert their own profile"
  on profiles for insert
  with check (auth.uid() = id);

create policy "users can update their own profile"
  on profiles for update
  using (auth.uid() = id);

-- ── questions ────────────────────────────────────────────────────────────
create type question_category as enum (
  'Food', 'Movies', 'Sport', 'Technology', 'School',
  'Everyday Life', 'Random', 'Internet Culture'
);

create type result_source as enum ('seeded', 'live');

create table if not exists questions (
  id text primary key,
  text text not null,
  category question_category not null,
  option_a text not null,
  option_b text not null,
  emoji_a text not null,
  emoji_b text not null,
  seeded_result_percentage_a smallint not null check (seeded_result_percentage_a between 0 and 100),
  minimum_votes integer not null default 20,
  status text not null default 'published' check (status in ('draft', 'published', 'archived')),
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table questions enable row level security;

create policy "published questions are publicly readable"
  on questions for select
  using (status = 'published');

-- Never expose vote tallies through this table directly from the client —
-- always go through a server-side function so results stay hidden until a
-- player has predicted AND voted (see get_prediction_result below).

-- ── predictions ──────────────────────────────────────────────────────────
create table if not exists predictions (
  id uuid primary key default gen_random_uuid(),
  question_id text not null references questions (id),
  player_id uuid not null references profiles (id),
  predicted_percentage_a smallint not null check (predicted_percentage_a between 0 and 100),
  score smallint check (score between 0 and 1000),
  actual_percentage_snapshot smallint check (actual_percentage_snapshot between 0 and 100),
  result_source_snapshot result_source,
  created_at timestamptz not null default now(),
  unique (question_id, player_id)
);

create index if not exists predictions_question_id_idx on predictions (question_id);
create index if not exists predictions_player_id_idx on predictions (player_id);

alter table predictions enable row level security;

create policy "players can read their own predictions"
  on predictions for select
  using (auth.uid() = player_id);

create policy "players can insert their own prediction"
  on predictions for insert
  with check (auth.uid() = player_id);

-- No update/delete policy: predictions are immutable once cast. Scoring
-- fields are filled in once by a server-side function (security definer),
-- not by client updates.

-- ── votes ────────────────────────────────────────────────────────────────
create table if not exists votes (
  id uuid primary key default gen_random_uuid(),
  question_id text not null references questions (id),
  player_id uuid not null references profiles (id),
  selected_option text not null check (selected_option in ('A', 'B')),
  created_at timestamptz not null default now(),
  unique (question_id, player_id)
);

create index if not exists votes_question_id_idx on votes (question_id);

alter table votes enable row level security;

create policy "players can read their own vote"
  on votes for select
  using (auth.uid() = player_id);

create policy "players can insert their own vote"
  on votes for insert
  with check (
    auth.uid() = player_id
    and exists (
      select 1 from predictions
      where predictions.question_id = votes.question_id
        and predictions.player_id = auth.uid()
    )
  );

-- ── leaderboard view ─────────────────────────────────────────────────────
create or replace view leaderboard_all_time as
  select
    p.player_id,
    pr.username,
    sum(p.score) as score,
    count(*) as games_played
  from predictions p
  join profiles pr on pr.id = p.player_id
  where p.score is not null
  group by p.player_id, pr.username
  order by score desc;

create or replace view leaderboard_today as
  select
    p.player_id,
    pr.username,
    sum(p.score) as score,
    count(*) as games_played
  from predictions p
  join profiles pr on pr.id = p.player_id
  where p.score is not null
    and p.created_at::date = current_date
  group by p.player_id, pr.username
  order by score desc;
