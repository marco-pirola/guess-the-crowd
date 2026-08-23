-- Guess the Crowd — leaderboard "points to overtake" support.
-- Apply manually, any order relative to the other new migrations (no
-- dependency on them). Adds the caller's own rank/score plus the row
-- immediately above them, for the leaderboard's muted secondary line
-- ("#12 · 640 pts / 117 pts to overtake #11"). Returns zero rows if the
-- caller has no scored predictions in the requested range yet.
create or replace function get_leaderboard_context(p_range text default 'today')
returns table (
  rank integer,
  score bigint,
  is_top boolean,
  above_username text,
  above_score bigint
)
language sql
security definer
set search_path = public
stable
as $$
  with totals as (
    select p.player_id, pr.username, sum(p.score) as score
    from predictions p
    join profiles pr on pr.id = p.player_id
    where p.score is not null
      and (p_range = 'all' or (p.created_at at time zone 'utc')::date = (now() at time zone 'utc')::date)
    group by p.player_id, pr.username
  ),
  ranked as (
    select *, row_number() over (order by score desc) as rnk
    from totals
  )
  select
    r.rnk::integer as rank,
    r.score,
    (r.rnk = 1) as is_top,
    above.username as above_username,
    above.score as above_score
  from ranked r
  left join ranked above on above.rnk = r.rnk - 1
  where r.player_id = auth.uid();
$$;

revoke all on function get_leaderboard_context(text) from public;
grant execute on function get_leaderboard_context(text) to authenticated;
