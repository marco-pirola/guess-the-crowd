-- Guess the Crowd — persistent player identity (username/avatar/profile
-- stats). Apply manually, in order, AFTER migration_crowd_reliability.sql
-- (this file's get_prediction_result replacement builds on that one's
-- Bayesian-blend + total_score/games_played bugfix, adding best_score on
-- top — CREATE OR REPLACE always needs the full current function body).
--
-- PREFLIGHT: usernames have never been unique-constrained. Before running
-- this file, check for existing case-insensitive collisions (there
-- shouldn't be any among the ~17-18 current auto-generated usernames, but
-- verify):
--   select lower(username), count(*) from profiles group by 1 having count(*) > 1;
-- If that returns rows, rename one of each colliding pair manually first —
-- the unique index below will fail to create otherwise.

alter table profiles
  add column if not exists avatar_key text not null default 'fox'
    check (avatar_key in ('fox','owl','raven','hawk','wolf','tiger','lynx')),
  add column if not exists username_changed_at timestamptz,
  add column if not exists best_score smallint check (best_score is null or best_score between 0 and 1000);

create unique index if not exists profiles_username_lower_unique_idx
  on profiles (lower(username));

-- SECURITY FIX: this policy let any authenticated player directly PATCH
-- their own profiles row via the client (not just via the SECURITY DEFINER
-- RPCs) — including total_score, games_played, current_streak/longest_streak,
-- and now username/username_changed_at/best_score, completely bypassing the
-- score-freezing, streak, and (new) username-cooldown/uniqueness logic those
-- RPCs enforce. Nothing in the app actually performs a direct client-side
-- profiles update (grepped: every write goes through get_or_create_profile /
-- get_prediction_result / the new update_username / update_avatar below, all
-- SECURITY DEFINER, which are unaffected by RLS), so this policy was dead
-- weight that only widened the attack surface. Dropping it is what makes the
-- username cooldown/uniqueness rule below actually enforceable server-side,
-- per Part 17 (preserve RLS, don't allow leaderboard abuse).
drop policy if exists "users can update their own profile" on profiles;

-- ── update_username ──────────────────────────────────────────────────────
-- Free the first time (username_changed_at is null); after that, only once
-- every 30 days. Case-insensitively unique.
create or replace function update_username(p_username text)
returns profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player_id uuid := auth.uid();
  v_profile profiles%rowtype;
  v_now timestamptz := now();
begin
  if v_player_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if p_username !~ '^[A-Za-z0-9_]{3,20}$' then
    raise exception 'INVALID_USERNAME';
  end if;

  select * into v_profile from profiles where id = v_player_id for update;
  if not found then
    raise exception 'PROFILE_NOT_FOUND';
  end if;

  if v_profile.username_changed_at is not null
     and v_now < v_profile.username_changed_at + interval '30 days' then
    raise exception 'USERNAME_COOLDOWN';
  end if;

  if exists (
    select 1 from profiles
    where lower(username) = lower(p_username) and id <> v_player_id
  ) then
    raise exception 'USERNAME_TAKEN';
  end if;

  update profiles set username = p_username, username_changed_at = v_now
    where id = v_player_id
    returning * into v_profile;

  return v_profile;
end;
$$;

revoke all on function update_username(text) from public;
grant execute on function update_username(text) to authenticated;

-- ── update_avatar ────────────────────────────────────────────────────────
-- Freely changeable, no cooldown — cosmetic only.
create or replace function update_avatar(p_avatar_key text)
returns profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player_id uuid := auth.uid();
  v_profile profiles%rowtype;
begin
  if v_player_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if p_avatar_key not in ('fox','owl','raven','hawk','wolf','tiger','lynx') then
    raise exception 'INVALID_AVATAR';
  end if;

  update profiles set avatar_key = p_avatar_key
    where id = v_player_id
    returning * into v_profile;

  if not found then
    raise exception 'PROFILE_NOT_FOUND';
  end if;

  return v_profile;
end;
$$;

revoke all on function update_avatar(text) from public;
grant execute on function update_avatar(text) to authenticated;

-- ── get_player_rank ──────────────────────────────────────────────────────
-- The caller's position in the all-time leaderboard ordering (same "sum of
-- scores desc" ordering get_leaderboard uses — total_score is kept in sync
-- with that sum at every score-freeze, see get_prediction_result). O(1)
-- round trip instead of scanning the full ranked leaderboard just to find
-- one player's position.
create or replace function get_player_rank()
returns integer
language sql
security definer
set search_path = public
stable
as $$
  select (count(*) + 1)::integer
  from profiles
  where total_score > coalesce((select total_score from profiles where id = auth.uid()), -1);
$$;

revoke all on function get_player_rank() from public;
grant execute on function get_player_rank() to authenticated;

-- ── get_prediction_result (full replacement) ────────────────────────────
-- Identical to migration_crowd_reliability.sql's version, plus: bumps
-- best_score (highest single-question score ever) unconditionally whenever
-- a score is frozen, same call site as total_score/games_played.
create or replace function get_prediction_result(p_question_id text)
returns table (
  predicted_percentage_a integer,
  chosen_option text,
  actual_percentage_a integer,
  error integer,
  score integer,
  result_source text,
  total_votes integer,
  percentile integer,
  streak_current integer,
  streak_longest integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player_id uuid := auth.uid();
  v_prediction predictions%rowtype;
  v_vote votes%rowtype;
  v_profile profiles%rowtype;
  v_crowd_votes_a integer;
  v_crowd_total integer;
  v_crowd_actual_pct integer;
  v_seeded_pct integer;
  v_min_votes integer;
  v_prior_strength numeric;
  v_played_on date;
  v_yesterday date;
  v_new_streak integer;
  v_error integer;
  v_score integer;
  v_all_scores integer[];
  v_lower_or_equal integer;
  v_percentile integer;
  v_current_total_votes integer;
begin
  if v_player_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select * into v_prediction from predictions
    where question_id = p_question_id and player_id = v_player_id
    for update;
  if not found then
    raise exception 'PREDICT_BEFORE_VOTE';
  end if;

  select * into v_vote from votes
    where question_id = p_question_id and player_id = v_player_id;
  if not found then
    raise exception 'VOTE_BEFORE_RESULT';
  end if;

  if v_prediction.score is null then
    select
      count(*) filter (where selected_option = 'A'),
      count(*)
      into v_crowd_votes_a, v_crowd_total
      from votes
      where question_id = p_question_id;

    select seeded_result_percentage_a, minimum_votes
      into v_seeded_pct, v_min_votes
      from questions where id = p_question_id;

    v_prior_strength := greatest(coalesce(v_min_votes, 5), 1) * 2;
    v_crowd_actual_pct := round(
      ((coalesce(v_seeded_pct, 50) / 100.0 * v_prior_strength) + v_crowd_votes_a)
      / (v_prior_strength + v_crowd_total)
      * 100
    );
    v_error := abs(v_prediction.predicted_percentage_a - v_crowd_actual_pct);
    v_score := greatest(0, least(1000, round(1000 * power(1 - (v_error::numeric / 100), 2))::integer));

    update predictions set
      score = v_score,
      actual_percentage_snapshot = v_crowd_actual_pct,
      result_source_snapshot = 'live'
      where id = v_prediction.id
      returning * into v_prediction;

    select * into v_profile from profiles where id = v_player_id;
    if v_profile is not null then
      v_played_on := (v_prediction.created_at at time zone 'utc')::date;

      update profiles set
        total_score = total_score + v_score,
        games_played = games_played + 1,
        best_score = greatest(coalesce(best_score, 0), v_score)
        where id = v_player_id;

      if v_profile.last_played_date is distinct from v_played_on then
        v_yesterday := v_played_on - 1;
        v_new_streak := case
          when v_profile.last_played_date = v_yesterday then v_profile.current_streak + 1
          else 1
        end;

        update profiles set
          current_streak = v_new_streak,
          longest_streak = greatest(v_profile.longest_streak, v_new_streak),
          last_played_date = v_played_on
          where id = v_player_id;
      end if;
    end if;
  end if;

  select count(*) into v_current_total_votes from votes where question_id = p_question_id;

  select array_agg(p.score) into v_all_scores from predictions p
    where p.question_id = p_question_id and p.score is not null;

  if v_all_scores is null or array_length(v_all_scores, 1) < 5 then
    v_percentile := null;
  else
    select count(*) into v_lower_or_equal from unnest(v_all_scores) s where s <= v_prediction.score;
    v_percentile := round((v_lower_or_equal::numeric / array_length(v_all_scores, 1)) * 100);
  end if;

  select * into v_profile from profiles where id = v_player_id;

  return query select
    v_prediction.predicted_percentage_a::integer,
    v_vote.selected_option,
    v_prediction.actual_percentage_snapshot::integer,
    abs(v_prediction.predicted_percentage_a - v_prediction.actual_percentage_snapshot)::integer,
    v_prediction.score::integer,
    v_prediction.result_source_snapshot::text,
    v_current_total_votes,
    v_percentile,
    coalesce(v_profile.current_streak, 0),
    coalesce(v_profile.longest_streak, 0);
end;
$$;
