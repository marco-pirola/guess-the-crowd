-- Guess the Crowd — server-side RPC functions (Phase 2: real crowd data).
--
-- Run this after schema.sql. Every function here is SECURITY DEFINER, which
-- lets it read/aggregate across rows that per-row RLS policies otherwise
-- keep private to their own owner (e.g. nobody can SELECT another player's
-- raw vote — see "votes" policies in schema.sql). Each function derives the
-- acting player strictly from auth.uid(), taken from the caller's own
-- verified session — never from a client-supplied id — so none of this can
-- be used to act as, or read private data belonging to, another player.
--
-- `set search_path = public` on every function is a security hardening step
-- recommended for SECURITY DEFINER functions (prevents a malicious search
-- path from shadowing an unqualified table/function reference).

-- ── get_or_create_profile ────────────────────────────────────────────────
-- Same effect as a plain RLS-respecting upsert (the "profiles" insert policy
-- already allows auth.uid() = id), wrapped as one atomic call so a first-time
-- player never has a check-then-insert race across two round trips.
create or replace function get_or_create_profile()
returns profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player_id uuid := auth.uid();
  v_profile profiles%rowtype;
  v_username text;
  v_adjectives text[] := array['Quick','Clever','Bold','Lucky','Sharp','Calm','Swift','Bright','Sly','Keen'];
  v_animals text[] := array['Fox','Owl','Wolf','Hawk','Otter','Lynx','Falcon','Panda','Tiger','Raven'];
begin
  if v_player_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  v_username :=
    v_adjectives[(1 + floor(random() * array_length(v_adjectives, 1)))::int]
    || v_animals[(1 + floor(random() * array_length(v_animals, 1)))::int]
    || floor(100 + random() * 900)::int::text;

  insert into profiles (id, username)
  values (v_player_id, v_username)
  on conflict (id) do update set username = profiles.username -- no-op; just re-selects the existing row
  returning * into v_profile;

  return v_profile;
end;
$$;

revoke all on function get_or_create_profile() from public;
grant execute on function get_or_create_profile() to authenticated;

-- ── get_crowd_result ─────────────────────────────────────────────────────
-- The real crowd tally for a question, aggregated from every stored vote.
-- Never falls back to questions.seeded_result_percentage_a — that column
-- exists for local/dev convenience only (see localFileStore.ts) and is
-- never read here. Safe to expose publicly: it only returns aggregate
-- counts, never who voted for what.
--
-- Only optionA's percentage is rounded from raw counts; optionB's is always
-- the complement (100 - a), so the two always sum to exactly 100 — see
-- src/lib/crowdMath.ts for the same rule applied client-side in the local
-- dev fallback.
create or replace function get_crowd_result(p_question_id text)
returns table (
  votes_a integer,
  votes_b integer,
  total_votes integer,
  actual_percentage_a integer
)
language sql
security definer
set search_path = public
stable
as $$
  select
    count(*) filter (where selected_option = 'A')::integer as votes_a,
    count(*) filter (where selected_option = 'B')::integer as votes_b,
    count(*)::integer as total_votes,
    case when count(*) = 0 then null
      else round((count(*) filter (where selected_option = 'A')::numeric / count(*)) * 100)::integer
    end as actual_percentage_a
  from votes
  where question_id = p_question_id;
$$;

revoke all on function get_crowd_result(text) from public;
grant execute on function get_crowd_result(text) to authenticated;

-- ── get_prediction_result ────────────────────────────────────────────────
-- Mirrors localFileStore.ts's getPredictionResult exactly:
--  - requires a prediction AND a vote to already exist for auth.uid()
--    (raises PREDICT_BEFORE_VOTE / VOTE_BEFORE_RESULT otherwise — the
--    fairness rule that a player can never see the crowd's result before
--    locking a prediction and voting is enforced here, in the database,
--    not just by the UI's step order);
--  - computes and freezes the score + actual-percentage snapshot the FIRST
--    time it's called (never re-scored later as more votes land), using
--    "select ... for update" to close the race if it's somehow called twice
--    concurrently for the same player+question;
--  - updates the player's profile totals + daily UTC streak, once;
--  - always returns the *current* real vote count, even though the score
--    and snapshot shown are frozen from first view.
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

    v_crowd_actual_pct := round((v_crowd_votes_a::numeric / greatest(v_crowd_total, 1)) * 100);
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
      if v_profile.last_played_date is distinct from v_played_on then
        v_yesterday := v_played_on - 1;
        v_new_streak := case
          when v_profile.last_played_date = v_yesterday then v_profile.current_streak + 1
          else 1
        end;

        update profiles set
          current_streak = v_new_streak,
          longest_streak = greatest(v_profile.longest_streak, v_new_streak),
          last_played_date = v_played_on,
          total_score = v_profile.total_score + v_score,
          games_played = v_profile.games_played + 1
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

revoke all on function get_prediction_result(text) from public;
grant execute on function get_prediction_result(text) to authenticated;

-- ── get_leaderboard ──────────────────────────────────────────────────────
-- Ranked totals across all players. Wrapped as a function (rather than
-- querying the leaderboard_* views in schema.sql directly) so it's
-- unambiguous that this bypasses per-row RLS deliberately, the same way the
-- functions above do, instead of depending on Postgres view-ownership
-- semantics being what a reader assumes.
create or replace function get_leaderboard(p_range text default 'today')
returns table (
  rank integer,
  player_id uuid,
  username text,
  score bigint,
  games_played bigint
)
language sql
security definer
set search_path = public
stable
as $$
  select
    row_number() over (order by sum(p.score) desc)::integer as rank,
    p.player_id,
    pr.username,
    sum(p.score) as score,
    count(*) as games_played
  from predictions p
  join profiles pr on pr.id = p.player_id
  where p.score is not null
    and (p_range = 'all' or (p.created_at at time zone 'utc')::date = (now() at time zone 'utc')::date)
  group by p.player_id, pr.username
  order by score desc
  limit 20;
$$;

revoke all on function get_leaderboard(text) from public;
grant execute on function get_leaderboard(text) to authenticated;
