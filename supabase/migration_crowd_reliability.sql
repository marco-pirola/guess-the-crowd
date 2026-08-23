-- Guess the Crowd — crowd reliability model (Bayesian shrinkage toward the
-- seeded baseline). Apply manually after schema.sql + functions.sql (and
-- after any earlier migrations already applied).
--
-- PROBLEM: get_crowd_result previously ignored questions.seeded_result_percentage_a
-- and questions.minimum_votes entirely and returned the raw vote tally as-is.
-- With ~17-18 real players across 352 questions, most questions have only a
-- handful of real votes, so a single vote produced a false "100% crowd"
-- result — not a statistically meaningful claim about "the crowd".
--
-- FIX: treat questions.seeded_result_percentage_a as a Beta-distribution
-- prior worth `2 x questions.minimum_votes` pseudo-votes (today that's a
-- uniform 10, since every seeded question has minimum_votes = 5). Real votes
-- update that prior; the posterior mean is what's shown and scored. This is
-- the standard closed-form Bayesian estimate for a binomial proportion with
-- a Beta prior (equivalent to Laplace/additive smoothing parameterized in
-- votes), continuous and monotonic in vote count — no cliff-edge switch
-- between "seeded" and "live". See src/lib/crowdMath.ts
-- (computeBlendedPercentageA) for the identical client-side/local-dev
-- formula and the worked examples in the project's final report.
--
-- This changes what "actual_percentage_a" means for BOTH the crowd result
-- display and prediction scoring (get_prediction_result scores against the
-- same blended value) — see the final report's "Preserve scoring meaning"
-- section for the implications. The score FORMULA itself
-- (1000 * (1 - error/100)^2, max 1000) is unchanged.

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
    from votes
    where question_id = p_question_id
  ),
  prior as (
    select
      seeded_result_percentage_a,
      greatest(minimum_votes, 1) * 2 as prior_strength
    from questions
    where id = p_question_id
  )
  -- LEFT JOIN (not the implicit cross join this used to be): `tally` is an
  -- aggregate without GROUP BY, so it always has exactly one row, even for a
  -- question_id with zero votes. `prior` is a plain filtered SELECT, so for
  -- a question_id that doesn't exist in `questions` at all it has ZERO rows
  -- — with the old comma join, that collapsed the whole result to zero rows
  -- instead of one, which made getQuestionResult()'s `.single()` call throw
  -- instead of returning a clean result. With LEFT JOIN ... ON true,
  -- tally's one row is always preserved; prior's columns just come back
  -- NULL for a nonexistent question, and the arithmetic below propagates
  -- that NULL into actual_percentage_a — which src/lib/store/
  -- supabaseStore.ts's getQuestionResult already defaults via `?? 0`.
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

-- ── get_prediction_result ────────────────────────────────────────────────
-- Same as the original in functions.sql, except the score-freezing block now
-- computes the crowd percentage via the same Bayesian blend as
-- get_crowd_result above (inlined here rather than calling get_crowd_result,
-- to stay in one transaction/row-lock scope like the original did).
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

      -- BUGFIX (this migration): total_score/games_played previously lived
      -- inside the "different day" branch below, so only a player's FIRST
      -- scored question of each UTC day updated their cumulative totals —
      -- every subsequent same-day question silently didn't. That went
      -- unnoticed because the leaderboard sums predictions.score directly,
      -- never profiles.total_score, but it corrupts profiles.total_score /
      -- games_played (and would corrupt best_score) for anyone who plays
      -- more than once a day, which is the common case. Now unconditional,
      -- matching localFileStore.ts's getPredictionResult, which always did
      -- this unconditionally.
      update profiles set
        total_score = total_score + v_score,
        games_played = games_played + 1
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

-- Function signatures/grants are unchanged (CREATE OR REPLACE keeps the
-- existing REVOKE/GRANT from functions.sql in effect), so no new
-- revoke/grant statements are needed here.
