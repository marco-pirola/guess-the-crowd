-- Guess the Crowd — Rooms (private multiplayer MVP). Apply manually, AFTER
-- every prior migration (this one only depends on `profiles` and
-- `questions`, both already present by then).
--
-- DESIGN: three new, fully isolated tables — no changes to
-- profiles/questions/predictions/votes/daily_* or their policies/functions.
-- A room's "crowd" is scoped to that room's own players (its own Bayesian
-- blend against the question's seeded baseline), never pooled into the
-- public Quick Play/Daily tally — a private room of friends is not the
-- general public.
--
-- SECURITY MODEL: RLS is enabled on all three tables with NO client-facing
-- policies at all. Every read and write goes through the SECURITY DEFINER
-- functions below, which (like every existing function in this project) are
-- owned by a role that bypasses RLS. This is deliberate, not an oversight —
-- it's the only way to guarantee:
--   - other players' predictions/choices are structurally impossible to
--     read before the host reveals (there is no policy that could
--     accidentally over-expose them);
--   - host-only actions can never be bypassed by a direct client write;
--   - room membership is always re-checked server-side, never assumed from
--     a client-supplied id.

-- ── rooms ────────────────────────────────────────────────────────────────
create table if not exists rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  host_id uuid not null references profiles (id) on delete cascade,
  status text not null default 'lobby'
    check (status in ('lobby', 'in_round', 'revealed', 'finished')),
  max_players smallint not null check (max_players between 2 and 20),
  round_count smallint not null check (round_count in (5, 10, 15, 20)),
  -- 0 = not started yet. Once started this is a 1-based index into
  -- question_ids (Postgres arrays are 1-indexed by default, so no off-by-one
  -- translation is needed anywhere this is used).
  current_round smallint not null default 0,
  -- Frozen once, by start_room — every player sees the same sequence for
  -- the lifetime of this room, same "freeze at start" principle as
  -- daily_challenges.question_ids.
  question_ids text[],
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz
);

alter table rooms enable row level security;
-- No policies — see file header. Reachable only via the functions below.

-- Abuse-prevention lookup ("how many rooms is this player currently
-- hosting") — partial index since finished rooms never need to be counted.
create index if not exists rooms_host_active_idx on rooms (host_id) where status <> 'finished';

-- ── room_players ─────────────────────────────────────────────────────────
create table if not exists room_players (
  room_id uuid not null references rooms (id) on delete cascade,
  player_id uuid not null references profiles (id) on delete cascade,
  -- Room-scoped display name — deliberately separate from profiles.username
  -- (Part rooms: a room nickname is never required to match the account
  -- username, and never touches global stats).
  nickname text not null,
  joined_at timestamptz not null default now(),
  -- Soft-leave: set by leave_room. Keeping the row (instead of deleting it)
  -- means a player who leaves mid-game still appears in the final
  -- leaderboard with whatever they'd already scored, and a rejoin before
  -- the game starts just clears this back to null.
  left_at timestamptz,
  primary key (room_id, player_id)
);

alter table room_players enable row level security;
-- No policies — see file header.

-- ── room_submissions ─────────────────────────────────────────────────────
-- One combined prediction+choice per (room, round, player) — this MVP's
-- round has a single submission step, not the two-phase predict/vote gate
-- Quick Play and Daily use. The composite primary key is what makes a
-- second submission for the same round physically impossible, the same
-- "unique constraint is the real enforcement" pattern predictions/votes
-- already rely on.
create table if not exists room_submissions (
  room_id uuid not null references rooms (id) on delete cascade,
  round_number smallint not null,
  player_id uuid not null references profiles (id) on delete cascade,
  predicted_percentage_a smallint not null check (predicted_percentage_a between 0 and 100),
  selected_option text not null check (selected_option in ('A', 'B')),
  -- Both null until reveal_round freezes them — same "frozen once, never
  -- recomputed" contract as predictions.score/actual_percentage_snapshot.
  score smallint check (score between 0 and 1000),
  actual_percentage_snapshot smallint check (actual_percentage_snapshot between 0 and 100),
  created_at timestamptz not null default now(),
  primary key (room_id, round_number, player_id)
);

alter table room_submissions enable row level security;
-- No policies — see file header. This is the table where getting this
-- wrong would let players see each other's answers before reveal, so it
-- gets no client-facing read path at all, not even an own-row policy:
-- get_room_round_state (below) is the only way a client ever sees this
-- table's data, and it deliberately returns only a submitted-count
-- pre-reveal.

-- ── room_join_attempts ───────────────────────────────────────────────────
-- Minimal, self-contained throttle for join_room (Part rooms security:
-- "room-code joining must be protected against obvious brute-force/spam").
-- Not a general-purpose rate limiter — just enough to stop a script from
-- hammering codes. Rows older than an hour are opportunistically deleted
-- inside join_room itself, so this table never needs a separate cleanup job.
create table if not exists room_join_attempts (
  id bigint generated always as identity primary key,
  player_id uuid not null references profiles (id) on delete cascade,
  attempted_at timestamptz not null default now()
);

create index if not exists room_join_attempts_player_time_idx
  on room_join_attempts (player_id, attempted_at desc);

alter table room_join_attempts enable row level security;
-- No policies — written/read only from inside join_room.

-- ── generate_room_code ───────────────────────────────────────────────────
-- Internal helper (not granted to `authenticated` — only ever called from
-- inside create_room below). 5 characters, uppercase, from an alphabet that
-- excludes visually confusable characters (0/O, 1/I/L), with a collision
-- retry loop backed by the unique constraint on rooms.code.
create or replace function generate_room_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_alphabet text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  v_code text;
  v_exists boolean;
begin
  loop
    v_code := '';
    for i in 1..5 loop
      v_code := v_code || substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::int, 1);
    end loop;
    select exists(select 1 from rooms where code = v_code) into v_exists;
    exit when not v_exists;
  end loop;
  return v_code;
end;
$$;

revoke all on function generate_room_code() from public;

-- ── create_room ──────────────────────────────────────────────────────────
-- Host is derived from auth.uid(), never a client-supplied id. Calls
-- get_or_create_profile() (existing function, not duplicated) to guarantee
-- the FK reference is satisfiable even if this is the very first thing this
-- session has ever done.
create or replace function create_room(
  p_max_players smallint,
  p_round_count smallint,
  p_nickname text
)
returns rooms
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player_id uuid := auth.uid();
  v_room rooms%rowtype;
  v_active_count integer;
begin
  if v_player_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if p_max_players is null or p_max_players < 2 or p_max_players > 20 then
    raise exception 'INVALID_MAX_PLAYERS';
  end if;

  if p_round_count is null or p_round_count not in (5, 10, 15, 20) then
    raise exception 'INVALID_ROUND_COUNT';
  end if;

  if p_nickname !~ '^[A-Za-z0-9_]{3,20}$' then
    raise exception 'INVALID_NICKNAME';
  end if;

  perform get_or_create_profile();

  -- Abuse prevention (Part rooms security: "basic per-player active-room
  -- limit"): cap concurrently-hosted, not-yet-finished rooms.
  select count(*) into v_active_count from rooms
    where host_id = v_player_id and status <> 'finished';
  if v_active_count >= 3 then
    raise exception 'TOO_MANY_ACTIVE_ROOMS';
  end if;

  insert into rooms (code, host_id, max_players, round_count)
  values (generate_room_code(), v_player_id, p_max_players, p_round_count)
  returning * into v_room;

  insert into room_players (room_id, player_id, nickname)
  values (v_room.id, v_player_id, p_nickname);

  return v_room;
end;
$$;

revoke all on function create_room(smallint, smallint, text) from public;
grant execute on function create_room(smallint, smallint, text) to authenticated;

-- ── join_room ────────────────────────────────────────────────────────────
-- Looks up + validates the code atomically inside the function (never a
-- separate client check-then-act round trip), `for update` locks the room
-- row so two near-simultaneous joins near capacity can't both slip past the
-- max_players check. Idempotent for an already-active member (a refreshed
-- player calling this again just gets the room back, no error) — but a
-- player who explicitly left cannot rejoin once the room has left 'lobby'.
create or replace function join_room(p_code text, p_nickname text)
returns rooms
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player_id uuid := auth.uid();
  v_room rooms%rowtype;
  v_active_count integer;
  v_already_member boolean;
  v_recent_attempts integer;
begin
  if v_player_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if p_nickname !~ '^[A-Za-z0-9_]{3,20}$' then
    raise exception 'INVALID_NICKNAME';
  end if;

  perform get_or_create_profile();

  -- Throttle (Part rooms security). Opportunistic cleanup first so this
  -- table never needs an external cron job.
  delete from room_join_attempts where attempted_at < now() - interval '1 hour';

  select count(*) into v_recent_attempts
    from room_join_attempts
    where player_id = v_player_id and attempted_at > now() - interval '1 minute';
  if v_recent_attempts >= 10 then
    raise exception 'TOO_MANY_JOIN_ATTEMPTS';
  end if;

  insert into room_join_attempts (player_id) values (v_player_id);

  select * into v_room from rooms where code = upper(trim(p_code)) for update;
  if not found then
    raise exception 'ROOM_NOT_FOUND';
  end if;

  select exists(
    select 1 from room_players
    where room_id = v_room.id and player_id = v_player_id and left_at is null
  ) into v_already_member;

  if v_already_member then
    return v_room;
  end if;

  if v_room.status <> 'lobby' then
    raise exception 'ROOM_ALREADY_STARTED';
  end if;

  select count(*) into v_active_count
    from room_players where room_id = v_room.id and left_at is null;
  if v_active_count >= v_room.max_players then
    raise exception 'ROOM_FULL';
  end if;

  insert into room_players (room_id, player_id, nickname)
  values (v_room.id, v_player_id, p_nickname)
  on conflict (room_id, player_id) do update set nickname = excluded.nickname, left_at = null;

  return v_room;
end;
$$;

revoke all on function join_room(text, text) from public;
grant execute on function join_room(text, text) to authenticated;

-- ── leave_room ───────────────────────────────────────────────────────────
-- Idempotent no-op if the caller isn't a member / already left. Deliberately
-- does nothing special when the leaving player is the host — Part rooms
-- decision 4: no migration, no auto-cancel, the room may simply stall.
--
-- Returns the room id (like start_room/submit_round/reveal_round/next_round)
-- so the API route can send the post-mutation Realtime Broadcast signal —
-- without this, other already-connected clients never learn a player left.
create or replace function leave_room(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player_id uuid := auth.uid();
  v_room_id uuid;
begin
  if v_player_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select id into v_room_id from rooms where code = upper(trim(p_code));
  if v_room_id is null then
    return null;
  end if;

  update room_players set left_at = now()
    where room_id = v_room_id and player_id = v_player_id and left_at is null;

  return v_room_id;
end;
$$;

revoke all on function leave_room(text) from public;
grant execute on function leave_room(text) to authenticated;

-- ── start_room ───────────────────────────────────────────────────────────
-- Host-only (server-checked, not just UI-gated). Freezes exactly
-- round_count randomly chosen published questions — rooms are ad-hoc, so
-- unlike Daily Challenge there's no need for a date-seeded/reproducible
-- selection; each room just needs its own fresh set.
create or replace function start_room(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player_id uuid := auth.uid();
  v_room rooms%rowtype;
  v_question_ids text[];
  v_available integer;
begin
  if v_player_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select * into v_room from rooms where code = upper(trim(p_code)) for update;
  if not found then
    raise exception 'ROOM_NOT_FOUND';
  end if;

  if v_room.host_id <> v_player_id then
    raise exception 'NOT_HOST';
  end if;

  if v_room.status <> 'lobby' then
    raise exception 'ROOM_ALREADY_STARTED';
  end if;

  select count(*) into v_available from questions where status = 'published';
  if v_available < v_room.round_count then
    raise exception 'NOT_ENOUGH_QUESTIONS';
  end if;

  select array_agg(id) into v_question_ids
    from (
      select id from questions where status = 'published'
      order by random() limit v_room.round_count
    ) q;

  update rooms set
    status = 'in_round',
    question_ids = v_question_ids,
    current_round = 1,
    started_at = now()
    where id = v_room.id;

  return v_room.id;
end;
$$;

revoke all on function start_room(text) from public;
grant execute on function start_room(text) to authenticated;

-- ── submit_round ─────────────────────────────────────────────────────────
-- One atomic action: predicted percentage for A + chosen option, together —
-- no separate predict/vote gates. The composite primary key on
-- room_submissions (not application logic) is what makes a duplicate
-- submission for this room/round impossible; the unique_violation this
-- raises is mapped to ALREADY_SUBMITTED at the TypeScript layer, the same
-- way predictions/votes already map PG_UNIQUE_VIOLATION.
--
-- Locks the room row FOR UPDATE (the same row reveal_round locks) before
-- checking status — this is what actually serializes a submission against a
-- concurrent reveal. Without it, a submission could commit in the gap
-- between reveal_round's tally SELECT and its scoring UPDATE, landing in
-- room_submissions after the crowd tally was computed but still getting
-- silently swept up and scored by that same blind UPDATE — frozen against a
-- tally that never counted its own vote. With the lock, whichever call
-- (submit or reveal) reaches the row first fully finishes (commits or
-- rolls back) before the other proceeds: if reveal wins the race, the
-- blocked submit re-reads status as 'revealed' and is cleanly rejected
-- with ROUND_NOT_ACTIVE; if submit wins, its insert is fully committed
-- before reveal's tally can even begin, so it's always counted.
create or replace function submit_round(
  p_code text,
  p_predicted_percentage_a smallint,
  p_selected_option text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player_id uuid := auth.uid();
  v_room rooms%rowtype;
  v_is_member boolean;
begin
  if v_player_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if p_predicted_percentage_a is null or p_predicted_percentage_a < 0 or p_predicted_percentage_a > 100 then
    raise exception 'INVALID_PREDICTION';
  end if;

  if p_selected_option is null or p_selected_option not in ('A', 'B') then
    raise exception 'INVALID_OPTION';
  end if;

  select * into v_room from rooms where code = upper(trim(p_code)) for update;
  if not found then
    raise exception 'ROOM_NOT_FOUND';
  end if;

  if v_room.status <> 'in_round' then
    raise exception 'ROUND_NOT_ACTIVE';
  end if;

  select exists(
    select 1 from room_players
    where room_id = v_room.id and player_id = v_player_id and left_at is null
  ) into v_is_member;
  if not v_is_member then
    raise exception 'NOT_ROOM_MEMBER';
  end if;

  insert into room_submissions (room_id, round_number, player_id, predicted_percentage_a, selected_option)
  values (v_room.id, v_room.current_round, v_player_id, p_predicted_percentage_a, p_selected_option);

  return v_room.id;
end;
$$;

revoke all on function submit_round(text, smallint, text) from public;
grant execute on function submit_round(text, smallint, text) to authenticated;

-- ── reveal_round ─────────────────────────────────────────────────────────
-- Host-only. Computes this room's own crowd result for the current round
-- (its own players only — never pooled with the public Quick Play/Daily
-- tally) using the exact same Bayesian-blend-toward-seeded-baseline and
-- quadratic scoring formula as get_prediction_result, then freezes
-- score/actual_percentage_snapshot on every submission for this round in
-- one set-based update (never recomputed afterward).
create or replace function reveal_round(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player_id uuid := auth.uid();
  v_room rooms%rowtype;
  v_question_id text;
  v_votes_a integer;
  v_votes_total integer;
  v_actual_pct integer;
  v_seeded_pct integer;
  v_min_votes integer;
  v_prior_strength numeric;
begin
  if v_player_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select * into v_room from rooms where code = upper(trim(p_code)) for update;
  if not found then
    raise exception 'ROOM_NOT_FOUND';
  end if;

  if v_room.host_id <> v_player_id then
    raise exception 'NOT_HOST';
  end if;

  if v_room.status <> 'in_round' then
    raise exception 'ROUND_NOT_ACTIVE';
  end if;

  v_question_id := v_room.question_ids[v_room.current_round];

  select
    count(*) filter (where selected_option = 'A'),
    count(*)
    into v_votes_a, v_votes_total
    from room_submissions
    where room_id = v_room.id and round_number = v_room.current_round;

  select seeded_result_percentage_a, minimum_votes
    into v_seeded_pct, v_min_votes
    from questions where id = v_question_id;

  v_prior_strength := greatest(coalesce(v_min_votes, 5), 1) * 2;
  v_actual_pct := round(
    ((coalesce(v_seeded_pct, 50) / 100.0 * v_prior_strength) + coalesce(v_votes_a, 0))
    / (v_prior_strength + coalesce(v_votes_total, 0))
    * 100
  );

  update room_submissions set
    actual_percentage_snapshot = v_actual_pct,
    score = greatest(0, least(1000, round(
      1000 * power(1 - (abs(predicted_percentage_a - v_actual_pct)::numeric / 100), 2)
    )::integer))
    where room_id = v_room.id and round_number = v_room.current_round;

  update rooms set status = 'revealed' where id = v_room.id;

  return v_room.id;
end;
$$;

revoke all on function reveal_round(text) from public;
grant execute on function reveal_round(text) to authenticated;

-- ── next_round ───────────────────────────────────────────────────────────
-- Host-only. Only callable after a reveal (status must be 'revealed') —
-- enforces the exact Reveal -> Scores -> Next Round order from the product
-- spec. Finishes the room instead of advancing once round_count is reached.
create or replace function next_round(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player_id uuid := auth.uid();
  v_room rooms%rowtype;
begin
  if v_player_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select * into v_room from rooms where code = upper(trim(p_code)) for update;
  if not found then
    raise exception 'ROOM_NOT_FOUND';
  end if;

  if v_room.host_id <> v_player_id then
    raise exception 'NOT_HOST';
  end if;

  if v_room.status <> 'revealed' then
    raise exception 'ROUND_NOT_REVEALED';
  end if;

  if v_room.current_round >= v_room.round_count then
    update rooms set status = 'finished', finished_at = now() where id = v_room.id;
  else
    update rooms set status = 'in_round', current_round = current_round + 1 where id = v_room.id;
  end if;

  return v_room.id;
end;
$$;

revoke all on function next_round(text) from public;
grant execute on function next_round(text) to authenticated;

-- ── get_room_state ───────────────────────────────────────────────────────
-- Everything a client needs to render the lobby/round/reveal/finished shell
-- and reconstruct state after a refresh, in one round trip: the room row,
-- the active player list (nicknames + who's host), whether the room ids
-- exist, and whether the caller has already submitted this round — but
-- never any other player's submission content (see get_room_round_state for
-- that, which deliberately withholds it until reveal).
create or replace function get_room_state(p_code text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player_id uuid := auth.uid();
  v_room rooms%rowtype;
  v_is_member boolean;
  v_result json;
begin
  if v_player_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select * into v_room from rooms where code = upper(trim(p_code));
  if not found then
    raise exception 'ROOM_NOT_FOUND';
  end if;

  select exists(
    select 1 from room_players
    where room_id = v_room.id and player_id = v_player_id and left_at is null
  ) into v_is_member;
  if not v_is_member then
    raise exception 'NOT_ROOM_MEMBER';
  end if;

  select json_build_object(
    'id', v_room.id,
    'code', v_room.code,
    'hostId', v_room.host_id,
    'status', v_room.status,
    'maxPlayers', v_room.max_players,
    'roundCount', v_room.round_count,
    'currentRound', v_room.current_round,
    'currentQuestionId', case
      when v_room.status = 'lobby' then null
      else v_room.question_ids[v_room.current_round]
    end,
    'players', (
      select coalesce(json_agg(json_build_object(
        'playerId', rp.player_id,
        'nickname', rp.nickname,
        'isHost', rp.player_id = v_room.host_id,
        'joinedAt', rp.joined_at
      ) order by rp.joined_at), '[]'::json)
      from room_players rp
      where rp.room_id = v_room.id and rp.left_at is null
    ),
    'mySubmitted', exists(
      select 1 from room_submissions
      where room_id = v_room.id and round_number = v_room.current_round and player_id = v_player_id
    )
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function get_room_state(text) from public;
grant execute on function get_room_state(text) to authenticated;

-- ── get_room_round_state ─────────────────────────────────────────────────
-- Pre-reveal ('in_round'): only a submitted count + which player ids have
-- submitted — never their predicted percentage or chosen option. Post-reveal
-- ('revealed'/'finished'): the full per-player breakdown for that round.
-- This split is what makes "other players' submissions stay hidden until
-- reveal" an actual guarantee rather than a client-side convention.
create or replace function get_room_round_state(p_code text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player_id uuid := auth.uid();
  v_room rooms%rowtype;
  v_is_member boolean;
  v_result json;
begin
  if v_player_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select * into v_room from rooms where code = upper(trim(p_code));
  if not found then
    raise exception 'ROOM_NOT_FOUND';
  end if;

  select exists(
    select 1 from room_players
    where room_id = v_room.id and player_id = v_player_id and left_at is null
  ) into v_is_member;
  if not v_is_member then
    raise exception 'NOT_ROOM_MEMBER';
  end if;

  if v_room.status = 'lobby' then
    raise exception 'ROUND_NOT_ACTIVE';
  end if;

  if v_room.status = 'in_round' then
    select json_build_object(
      'status', 'in_round',
      'roundNumber', v_room.current_round,
      'submittedCount', (
        select count(*)::integer from room_submissions
        where room_id = v_room.id and round_number = v_room.current_round
      ),
      'activePlayerCount', (
        select count(*)::integer from room_players
        where room_id = v_room.id and left_at is null
      ),
      'submittedPlayerIds', (
        select coalesce(json_agg(player_id), '[]'::json) from room_submissions
        where room_id = v_room.id and round_number = v_room.current_round
      )
    ) into v_result;
  else
    select json_build_object(
      'status', v_room.status,
      'roundNumber', v_room.current_round,
      'actualPercentageA', (
        select actual_percentage_snapshot from room_submissions
        where room_id = v_room.id and round_number = v_room.current_round
        limit 1
      ),
      'results', (
        select coalesce(json_agg(json_build_object(
          'playerId', rs.player_id,
          'nickname', rp.nickname,
          'predictedPercentageA', rs.predicted_percentage_a,
          'selectedOption', rs.selected_option,
          'score', rs.score
        ) order by rs.score desc nulls last), '[]'::json)
        from room_submissions rs
        join room_players rp on rp.room_id = rs.room_id and rp.player_id = rs.player_id
        where rs.room_id = v_room.id and rs.round_number = v_room.current_round
      )
    ) into v_result;
  end if;

  return v_result;
end;
$$;

revoke all on function get_room_round_state(text) from public;
grant execute on function get_room_round_state(text) to authenticated;

-- ── get_room_leaderboard ─────────────────────────────────────────────────
-- Standings across every scored round so far (usable mid-game or at
-- 'finished'). Includes players who left mid-game with whatever they'd
-- already scored — leaving doesn't erase what you earned.
create or replace function get_room_leaderboard(p_code text)
returns table (
  player_id uuid,
  nickname text,
  total_score bigint,
  rounds_played integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player_id uuid := auth.uid();
  v_room rooms%rowtype;
  v_is_member boolean;
begin
  if v_player_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select * into v_room from rooms where code = upper(trim(p_code));
  if not found then
    raise exception 'ROOM_NOT_FOUND';
  end if;

  select exists(
    select 1 from room_players rp
    where rp.room_id = v_room.id and rp.player_id = v_player_id and rp.left_at is null
  ) into v_is_member;
  if not v_is_member then
    raise exception 'NOT_ROOM_MEMBER';
  end if;

  return query
    select
      rp.player_id,
      rp.nickname,
      coalesce(sum(rs.score), 0)::bigint,
      count(rs.score)::integer
    from room_players rp
    left join room_submissions rs
      on rs.room_id = rp.room_id and rs.player_id = rp.player_id and rs.score is not null
    where rp.room_id = v_room.id
    group by rp.player_id, rp.nickname
    order by coalesce(sum(rs.score), 0) desc;
end;
$$;

revoke all on function get_room_leaderboard(text) from public;
grant execute on function get_room_leaderboard(text) to authenticated;
