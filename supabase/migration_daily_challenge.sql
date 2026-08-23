-- Guess the Crowd — Daily Challenge. Apply manually, LAST, in this order:
--   1. migration_crowd_reliability.sql
--   2. migration_player_identity.sql
--   3. migration_leaderboard_context.sql (independent — order doesn't matter
--      relative to the others, but this file must still come after 1 and 2)
--   4. migration_daily_challenge.sql (this file)
--
-- This file MUST be applied AFTER BOTH migration_crowd_reliability.sql AND
-- migration_player_identity.sql — not "any order relative to
-- migration_player_identity.sql" as an earlier version of this comment
-- claimed. Two concrete reasons:
--   - Its get_prediction_result (below) sets profiles.best_score, a column
--     that only exists once migration_player_identity.sql's ALTER TABLE has
--     run. CREATE OR REPLACE FUNCTION does not validate column references
--     against the catalog at creation time, so applying this file first
--     would succeed silently and only fail later, at runtime, the first
--     time a player completes a question ("column best_score does not
--     exist").
--   - get_crowd_result/get_prediction_result are replaced again here (to
--     also pool daily_votes) — CREATE OR REPLACE needs the full current
--     body each time, so if migration_player_identity.sql were applied
--     AFTER this file instead, its own get_prediction_result (no daily_votes
--     pooling) would silently overwrite this one, leaving get_crowd_result
--     (display) and get_prediction_result (scoring) inconsistent.
--
-- DESIGN: daily_predictions/daily_votes/daily_results are separate tables
-- from predictions/votes, not an altered unique constraint on them. This is
-- the safest additive path (Part 16: no changes to existing tables'
-- constraints) and it sidesteps a real conflict: a player may have already
-- answered a question picked for today's Daily via ordinary Quick Play,
-- which would collide with predictions' unique(question_id, player_id) if
-- Daily reused that table. Daily is a deliberately separate, parallel
-- scoring track (own leaderboard, own official score) — it does NOT feed
-- profiles.total_score/games_played/best_score/streak or the Today/All-time
-- leaderboard. Daily VOTES still pool into the shared public crowd tally
-- (get_crowd_result), because a Daily vote is still a real vote.

create table if not exists daily_challenges (
  challenge_date date primary key,
  question_ids text[] not null,
  created_at timestamptz not null default now()
);

alter table daily_challenges enable row level security;

create policy "daily challenges are publicly readable"
  on daily_challenges for select
  using (true);

create table if not exists daily_predictions (
  id uuid primary key default gen_random_uuid(),
  challenge_date date not null references daily_challenges (challenge_date),
  question_id text not null references questions (id),
  player_id uuid not null references profiles (id),
  predicted_percentage_a smallint not null check (predicted_percentage_a between 0 and 100),
  score smallint check (score between 0 and 1000),
  actual_percentage_snapshot smallint,
  created_at timestamptz not null default now(),
  unique (challenge_date, question_id, player_id)
);

alter table daily_predictions enable row level security;

create policy "users can insert their own daily predictions"
  on daily_predictions for insert
  with check (auth.uid() = player_id);

create policy "users can select their own daily predictions"
  on daily_predictions for select
  using (auth.uid() = player_id);

create table if not exists daily_votes (
  id uuid primary key default gen_random_uuid(),
  challenge_date date not null references daily_challenges (challenge_date),
  question_id text not null references questions (id),
  player_id uuid not null references profiles (id),
  selected_option text not null check (selected_option in ('A', 'B')),
  created_at timestamptz not null default now(),
  unique (challenge_date, question_id, player_id)
);

alter table daily_votes enable row level security;

create policy "users can insert their own daily votes"
  on daily_votes for insert
  with check (
    auth.uid() = player_id
    and exists (
      select 1 from daily_predictions p
      where p.challenge_date = daily_votes.challenge_date
        and p.question_id = daily_votes.question_id
        and p.player_id = auth.uid()
    )
  );

create policy "users can select their own daily votes"
  on daily_votes for select
  using (auth.uid() = player_id);

create table if not exists daily_results (
  challenge_date date not null references daily_challenges (challenge_date),
  player_id uuid not null references profiles (id),
  total_score integer not null,
  completed_at timestamptz not null default now(),
  primary key (challenge_date, player_id)
);

alter table daily_results enable row level security;

create policy "daily results are publicly readable"
  on daily_results for select
  using (true);

-- No direct insert/update policy for daily_results — only the
-- SECURITY DEFINER get_daily_prediction_result function writes to it
-- (bypasses RLS), so "official score recorded once" can't be bypassed by a
-- direct client insert the way an open insert policy would allow.

-- ── get_or_create_daily_challenge ───────────────────────────────────────
-- Deterministic given the date, but this always inserts-then-selects rather
-- than recomputing on every call, so once generated the list is frozen for
-- that date even if vote counts shift afterward (see selectDailyQuestions /
-- src/lib/dailyChallenge.ts for the same algorithm, mirrored here in SQL).
create or replace function get_or_create_daily_challenge(p_date date)
returns text[]
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing text[];
  v_question_ids text[];
begin
  select question_ids into v_existing from daily_challenges where challenge_date = p_date;
  if v_existing is not null then
    return v_existing;
  end if;

  with recent as (
    select unnest(question_ids) as question_id
    from daily_challenges
    where challenge_date >= p_date - 14 and challenge_date < p_date
  ),
  vote_counts as (
    select question_id, count(*) as votes
    from (
      select question_id from votes
      union all
      select question_id from daily_votes
    ) v
    group by question_id
  ),
  candidates as (
    select
      q.id,
      q.category,
      coalesce(vc.votes, 0) as votes,
      (q.id in (select question_id from recent)) as recently_used,
      -- Deterministic per-date tiebreak/shuffle: hash the date + question id.
      md5(p_date::text || q.id) as shuffle_key
    from questions q
    left join vote_counts vc on vc.question_id = q.id
    where q.status = 'published'
  ),
  pool_size as (
    select count(*) as n from candidates where not recently_used
  ),
  pool as (
    -- Relax the "not recently used" filter if it would leave too few candidates.
    select * from candidates
    where (select n from pool_size) >= 10 and not recently_used
    union all
    select * from candidates
    where (select n from pool_size) < 10
  ),
  ranked as (
    select *, row_number() over (order by votes desc, shuffle_key) as rn
    from pool
  ),
  capped as (
    -- Greedy category cap of 2, in vote-rank order.
    select *,
      row_number() over (partition by category order by rn) as cat_rn
    from ranked
  ),
  first_pass as (
    select id, rn from capped where cat_rn <= 2 order by rn limit 10
  ),
  -- Fallback candidates (category cap relaxed), only used if first_pass came
  -- up short — e.g. a very small or category-skewed pool. The +1000000
  -- offset guarantees every first_pass id always sorts ahead of every
  -- remaining id in final_pick below, so remaining never displaces a
  -- first_pass pick — it only fills leftover slots when first_pass < 10.
  remaining as (
    select id, rn + 1000000 as rn from ranked
    where id not in (select id from first_pass)
    order by rn
  ),
  combined as (
    select id, rn from first_pass
    union all
    select id, rn from remaining
  ),
  final_pick as (
    select id, rn from combined order by rn limit 10
  )
  select array_agg(id order by rn) into v_question_ids from final_pick;

  insert into daily_challenges (challenge_date, question_ids)
  values (p_date, v_question_ids)
  on conflict (challenge_date) do nothing;

  select question_ids into v_existing from daily_challenges where challenge_date = p_date;
  return v_existing;
end;
$$;

revoke all on function get_or_create_daily_challenge(date) from public;
grant execute on function get_or_create_daily_challenge(date) to authenticated;

-- ── get_daily_status ─────────────────────────────────────────────────────
-- daily_rank must be null (not a placeholder like 1) until the caller has
-- an official result for p_date — the old version defaulted a missing own
-- score to a huge sentinel (2147483647) before comparing, so nobody's
-- total_score could ever exceed it, count(*) was always 0, and daily_rank
-- was always 1 for a player who hadn't even played — as if they were in
-- first place. Fixed by computing "my" result once and returning null
-- directly when it doesn't exist, only ranking against others when it does
-- (same comparison as before: count of strictly-higher scores, plus one —
-- see src/lib/store/localFileStore.ts's computeDailyRank for the identical
-- reference behavior this now matches, including its regression tests).
create or replace function get_daily_status(p_date date)
returns table (
  answered_count integer,
  official_score integer,
  daily_rank integer
)
language sql
security definer
set search_path = public
stable
as $$
  with my as (
    select total_score from daily_results
    where challenge_date = p_date and player_id = auth.uid()
  )
  select
    (select count(*)::integer from daily_predictions
      where challenge_date = p_date and player_id = auth.uid() and score is not null),
    (select total_score from my),
    case
      when not exists (select 1 from my) then null
      else (
        select (count(*) + 1)::integer from daily_results
        where challenge_date = p_date and total_score > (select total_score from my)
      )
    end;
$$;

revoke all on function get_daily_status(date) from public;
grant execute on function get_daily_status(date) to authenticated;

-- ── get_daily_prediction_result ─────────────────────────────────────────
-- Same shape/contract as get_prediction_result, scoped to daily_predictions/
-- daily_votes, plus: once ALL of this date's questions are scored for this
-- player, records the official daily_results row (once — never overwritten).
create or replace function get_daily_prediction_result(p_date date, p_question_id text)
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
  v_prediction daily_predictions%rowtype;
  v_vote daily_votes%rowtype;
  v_profile profiles%rowtype;
  v_crowd_votes_a integer;
  v_crowd_total integer;
  v_crowd_actual_pct integer;
  v_seeded_pct integer;
  v_min_votes integer;
  v_prior_strength numeric;
  v_error integer;
  v_score integer;
  v_all_scores integer[];
  v_lower_or_equal integer;
  v_percentile integer;
  v_current_total_votes integer;
  v_challenge_question_ids text[];
  v_scored_count integer;
  v_total_score integer;
begin
  if v_player_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select * into v_prediction from daily_predictions
    where challenge_date = p_date and question_id = p_question_id and player_id = v_player_id
    for update;
  if not found then
    raise exception 'PREDICT_BEFORE_VOTE';
  end if;

  select * into v_vote from daily_votes
    where challenge_date = p_date and question_id = p_question_id and player_id = v_player_id;
  if not found then
    raise exception 'VOTE_BEFORE_RESULT';
  end if;

  if v_prediction.score is null then
    select
      count(*) filter (where selected_option = 'A'),
      count(*)
      into v_crowd_votes_a, v_crowd_total
      from (
        select selected_option from votes where question_id = p_question_id
        union all
        select selected_option from daily_votes where question_id = p_question_id
      ) all_votes;

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

    update daily_predictions set
      score = v_score,
      actual_percentage_snapshot = v_crowd_actual_pct
      where id = v_prediction.id
      returning * into v_prediction;

    select question_ids into v_challenge_question_ids from daily_challenges where challenge_date = p_date;
    if not exists (
      select 1 from daily_results where challenge_date = p_date and player_id = v_player_id
    ) and v_challenge_question_ids is not null then
      select count(*), coalesce(sum(daily_predictions.score), 0)
        into v_scored_count, v_total_score
        from daily_predictions
        where challenge_date = p_date and player_id = v_player_id and daily_predictions.score is not null;

      if v_scored_count >= array_length(v_challenge_question_ids, 1) then
        insert into daily_results (challenge_date, player_id, total_score)
        values (p_date, v_player_id, v_total_score)
        on conflict (challenge_date, player_id) do nothing;
      end if;
    end if;
  end if;

  select count(*) into v_current_total_votes
    from (
      select 1 from votes where question_id = p_question_id
      union all
      select 1 from daily_votes where question_id = p_question_id
    ) all_votes;

  select array_agg(all_scores.score) into v_all_scores from (
    select predictions.score from predictions where question_id = p_question_id and predictions.score is not null
    union all
    select daily_predictions.score from daily_predictions where question_id = p_question_id and daily_predictions.score is not null
  ) all_scores;

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
    'live'::text,
    v_current_total_votes,
    v_percentile,
    coalesce(v_profile.current_streak, 0),
    coalesce(v_profile.longest_streak, 0);
end;
$$;

revoke all on function get_daily_prediction_result(date, text) from public;
grant execute on function get_daily_prediction_result(date, text) to authenticated;

-- ── get_daily_leaderboard ────────────────────────────────────────────────
create or replace function get_daily_leaderboard(p_date date)
returns table (
  rank integer,
  player_id uuid,
  username text,
  score integer
)
language sql
security definer
set search_path = public
stable
as $$
  select
    row_number() over (order by r.total_score desc)::integer as rank,
    r.player_id,
    pr.username,
    r.total_score
  from daily_results r
  join profiles pr on pr.id = r.player_id
  where r.challenge_date = p_date
  order by r.total_score desc;
$$;

revoke all on function get_daily_leaderboard(date) from public;
grant execute on function get_daily_leaderboard(date) to authenticated;

-- ── get_crowd_result / get_prediction_result (pool daily_votes too) ─────
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
  with tally as (
    select
      count(*) filter (where selected_option = 'A')::integer as votes_a,
      count(*) filter (where selected_option = 'B')::integer as votes_b,
      count(*)::integer as total_votes
    from (
      select selected_option from votes where question_id = p_question_id
      union all
      select selected_option from daily_votes where question_id = p_question_id
    ) all_votes
  ),
  prior as (
    select
      seeded_result_percentage_a,
      greatest(minimum_votes, 1) * 2 as prior_strength
    from questions
    where id = p_question_id
  )
  -- LEFT JOIN, not a comma/cross join — see migration_crowd_reliability.sql's
  -- get_crowd_result for the full explanation. `tally` always has exactly
  -- one row (aggregate without GROUP BY); `prior` has zero rows for a
  -- question_id that doesn't exist, which used to collapse the whole result
  -- to zero rows and break the `.single()` caller. Preserving tally's row
  -- and letting prior's columns (and so actual_percentage_a) come back NULL
  -- instead matches getQuestionResult()'s existing `?? 0` fallback.
  select
    tally.votes_a,
    tally.votes_b,
    tally.total_votes,
    round(
      ((prior.seeded_result_percentage_a / 100.0 * prior.prior_strength) + tally.votes_a)
      / (prior.prior_strength + tally.total_votes)
      * 100
    )::integer as actual_percentage_a
  from tally left join prior on true;
$$;

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
      from (
        select selected_option from votes where question_id = p_question_id
        union all
        select selected_option from daily_votes where question_id = p_question_id
      ) all_votes;

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

  select count(*) into v_current_total_votes
    from (
      select 1 from votes where question_id = p_question_id
      union all
      select 1 from daily_votes where question_id = p_question_id
    ) all_votes;

  select array_agg(p.score) into v_all_scores from (
    select predictions.score from predictions where question_id = p_question_id and predictions.score is not null
    union all
    select daily_predictions.score from daily_predictions where question_id = p_question_id and daily_predictions.score is not null
  ) p(score);

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
