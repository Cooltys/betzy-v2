-- ============================================================
-- Betzy V2 — RPC Functions
-- All functions prefixed b2_
-- All use SECURITY DEFINER to bypass RLS for controlled writes
-- ============================================================

-- ------------------------------------------------------------
-- Helper: generate join code like "KRZYS-42" (5 letters + 2 digits)
-- ------------------------------------------------------------
create or replace function public.b2_gen_join_code()
returns text language plpgsql as $$
declare
  letters text := 'ABCDEFGHJKLMNPQRSTUVWXYZ'; -- no I, O for readability
  result text;
  i integer;
  attempts integer := 0;
begin
  loop
    result := '';
    for i in 1..5 loop
      result := result || substr(letters, 1 + floor(random() * length(letters))::int, 1);
    end loop;
    result := result || '-' || lpad((floor(random() * 100))::int::text, 2, '0');

    if not exists (select 1 from public.b2_sessions where join_code = result) then
      return result;
    end if;

    attempts := attempts + 1;
    if attempts > 20 then
      raise exception 'Could not generate unique join code';
    end if;
  end loop;
end; $$;

-- ------------------------------------------------------------
-- create_room — host creates a new room
-- ------------------------------------------------------------
create or replace function public.b2_create_room(
  p_room_name text,
  p_host_nick text,
  p_host_emoji text default '👑',
  p_host_color text default '#eab308',
  p_emoji text default '🎯',
  p_starting_balance integer default 5000,
  p_virtual_seed integer default 500
) returns jsonb language plpgsql security definer as $$
declare
  uid uuid := auth.uid();
  s public.b2_sessions;
  p public.b2_players;
  code text;
begin
  if uid is null then
    raise exception 'auth_required' using errcode = 'P0001';
  end if;

  code := public.b2_gen_join_code();

  insert into public.b2_sessions (room_name, emoji, join_code, starting_balance, virtual_seed, status)
  values (p_room_name, p_emoji, code, p_starting_balance, p_virtual_seed, 'open')
  returning * into s;

  insert into public.b2_players (session_id, auth_user_id, nick, emoji, color, balance)
  values (s.id, uid, p_host_nick, p_host_emoji, p_host_color, p_starting_balance)
  returning * into p;

  update public.b2_sessions set host_player_id = p.id where id = s.id;

  insert into public.b2_events (session_id, player_id, kind, payload)
  values (s.id, p.id, 'room_created', jsonb_build_object('room_name', p_room_name));

  return jsonb_build_object(
    'session_id', s.id,
    'player_id', p.id,
    'join_code', s.join_code
  );
end; $$;

-- ------------------------------------------------------------
-- join_room — player joins by code
-- ------------------------------------------------------------
create or replace function public.b2_join_room(
  p_join_code text,
  p_nick text,
  p_emoji text default '🎯',
  p_color text default '#eab308',
  p_password text default null
) returns jsonb language plpgsql security definer as $$
declare
  uid uuid := auth.uid();
  s public.b2_sessions;
  p public.b2_players;
begin
  if uid is null then
    raise exception 'auth_required' using errcode = 'P0001';
  end if;

  select * into s from public.b2_sessions where join_code = p_join_code;
  if not found then
    raise exception 'room_not_found' using errcode = 'P0001';
  end if;

  if s.status <> 'open' then
    raise exception 'room_closed' using errcode = 'P0001';
  end if;

  if s.room_password is not null and s.room_password <> coalesce(p_password, '') then
    raise exception 'wrong_password' using errcode = 'P0001';
  end if;

  -- resume: already in this room?
  select * into p from public.b2_players
    where session_id = s.id and auth_user_id = uid;
  if found then
    update public.b2_players set last_seen_at = now() where id = p.id;
    return jsonb_build_object(
      'session_id', s.id,
      'player_id', p.id,
      'resumed', true
    );
  end if;

  -- new player: check nick free
  if exists (select 1 from public.b2_players where session_id = s.id and nick = p_nick) then
    raise exception 'nick_taken' using errcode = 'P0001';
  end if;

  insert into public.b2_players (session_id, auth_user_id, nick, emoji, color, balance)
  values (s.id, uid, p_nick, p_emoji, p_color, s.starting_balance)
  returning * into p;

  insert into public.b2_events (session_id, player_id, kind)
  values (s.id, p.id, 'player_joined');

  return jsonb_build_object(
    'session_id', s.id,
    'player_id', p.id,
    'resumed', false
  );
end; $$;

-- ------------------------------------------------------------
-- create_question — host creates a bet
-- ------------------------------------------------------------
create or replace function public.b2_create_question(
  p_session_id uuid,
  p_title text,
  p_description text,
  p_options text[],
  p_expires_in_sec integer
) returns uuid language plpgsql security definer as $$
declare
  uid uuid := auth.uid();
  s public.b2_sessions;
  host_id uuid;
  q public.b2_questions;
  opt text;
  pos integer := 0;
begin
  if uid is null then
    raise exception 'auth_required' using errcode = 'P0001';
  end if;

  select * into s from public.b2_sessions where id = p_session_id;
  if not found then
    raise exception 'room_not_found' using errcode = 'P0001';
  end if;

  select id into host_id from public.b2_players
    where session_id = p_session_id and auth_user_id = uid;
  if s.host_player_id is distinct from host_id then
    raise exception 'not_host' using errcode = 'P0001';
  end if;

  if array_length(p_options, 1) < 2 then
    raise exception 'need_min_2_options' using errcode = 'P0001';
  end if;

  insert into public.b2_questions (
    session_id, title, description, status, expires_at, created_by_player_id
  ) values (
    p_session_id, p_title, p_description, 'open',
    now() + (p_expires_in_sec || ' seconds')::interval,
    host_id
  ) returning * into q;

  foreach opt in array p_options loop
    insert into public.b2_options (question_id, text, position)
    values (q.id, opt, pos);
    pos := pos + 1;
  end loop;

  insert into public.b2_events (session_id, player_id, kind, payload)
  values (p_session_id, host_id, 'question_created',
    jsonb_build_object('question_id', q.id, 'title', q.title));

  return q.id;
end; $$;

-- ------------------------------------------------------------
-- place_bet — player stakes on an option
-- ------------------------------------------------------------
create or replace function public.b2_place_bet(
  p_question_id uuid,
  p_option_id uuid,
  p_amount integer
) returns jsonb language plpgsql security definer as $$
declare
  uid uuid := auth.uid();
  q public.b2_questions;
  s public.b2_sessions;
  pl public.b2_players;
  b public.b2_bets;
  total_stake integer;
  option_stake integer;
  opt_count integer;
  multi numeric;
begin
  if uid is null then
    raise exception 'auth_required' using errcode = 'P0001';
  end if;

  if p_amount <= 0 then
    raise exception 'invalid_amount' using errcode = 'P0001';
  end if;

  select * into q from public.b2_questions where id = p_question_id for update;
  if not found then
    raise exception 'question_not_found' using errcode = 'P0001';
  end if;
  if q.status <> 'open' then
    raise exception 'question_not_open' using errcode = 'P0001';
  end if;
  if q.expires_at is not null and q.expires_at < now() then
    raise exception 'time_expired' using errcode = 'P0001';
  end if;

  select * into s from public.b2_sessions where id = q.session_id;

  select * into pl from public.b2_players
    where session_id = q.session_id and auth_user_id = uid
    for update;
  if not found then
    raise exception 'not_member' using errcode = 'P0001';
  end if;
  if pl.balance < p_amount then
    raise exception 'insufficient_balance' using errcode = 'P0001';
  end if;

  -- verify option belongs to question
  if not exists (select 1 from public.b2_options where id = p_option_id and question_id = q.id) then
    raise exception 'invalid_option' using errcode = 'P0001';
  end if;

  -- compute multiplier at placement (display only)
  select count(*) into opt_count from public.b2_options where question_id = q.id;
  select coalesce(sum(amount), 0) into total_stake from public.b2_bets where question_id = q.id;
  select coalesce(sum(amount), 0) into option_stake from public.b2_bets where option_id = p_option_id;
  multi := (total_stake + p_amount + s.virtual_seed)::numeric
         / (option_stake + p_amount + s.virtual_seed::numeric / opt_count);

  update public.b2_players set balance = balance - p_amount where id = pl.id;

  insert into public.b2_bets (session_id, question_id, option_id, player_id, amount, multiplier_at_placement)
  values (q.session_id, q.id, p_option_id, pl.id, p_amount, multi)
  returning * into b;

  insert into public.b2_events (session_id, player_id, kind, payload)
  values (q.session_id, pl.id, 'bet_placed',
    jsonb_build_object('question_id', q.id, 'option_id', p_option_id, 'amount', p_amount));

  return jsonb_build_object(
    'bet_id', b.id,
    'new_balance', pl.balance - p_amount,
    'multiplier', multi
  );
end; $$;

-- ------------------------------------------------------------
-- resolve_question — host announces winner, payout distributed
-- ------------------------------------------------------------
create or replace function public.b2_resolve_question(
  p_question_id uuid,
  p_winning_option_id uuid
) returns void language plpgsql security definer as $$
declare
  uid uuid := auth.uid();
  q public.b2_questions;
  s public.b2_sessions;
  host_id uuid;
  total_stake integer;
  winning_stake integer;
  pool_plus_seed integer;
begin
  if uid is null then
    raise exception 'auth_required' using errcode = 'P0001';
  end if;

  select * into q from public.b2_questions where id = p_question_id for update;
  if not found then
    raise exception 'question_not_found' using errcode = 'P0001';
  end if;
  if q.status = 'resolved' then
    raise exception 'already_resolved' using errcode = 'P0001';
  end if;

  select * into s from public.b2_sessions where id = q.session_id;
  select id into host_id from public.b2_players
    where session_id = q.session_id and auth_user_id = uid;
  if s.host_player_id is distinct from host_id then
    raise exception 'not_host' using errcode = 'P0001';
  end if;

  -- verify winning option
  if not exists (select 1 from public.b2_options where id = p_winning_option_id and question_id = q.id) then
    raise exception 'invalid_option' using errcode = 'P0001';
  end if;

  select coalesce(sum(amount), 0) into total_stake
    from public.b2_bets where question_id = q.id;
  select coalesce(sum(amount), 0) into winning_stake
    from public.b2_bets where option_id = p_winning_option_id;

  pool_plus_seed := total_stake + s.virtual_seed;

  if winning_stake = 0 then
    -- nobody won — refund all stakes
    update public.b2_players p set balance = balance + coalesce((
      select sum(amount) from public.b2_bets
      where question_id = q.id and player_id = p.id
    ), 0)
    where session_id = q.session_id;
  else
    -- winners: pro-rata of (pool + seed)
    update public.b2_bets set
      payout_amount = round((amount::numeric / winning_stake) * pool_plus_seed)
    where question_id = q.id and option_id = p_winning_option_id;

    -- credit winners
    update public.b2_players p set balance = balance + coalesce((
      select sum(payout_amount) from public.b2_bets
      where question_id = q.id and player_id = p.id and option_id = p_winning_option_id
    ), 0)
    where session_id = q.session_id;
  end if;

  update public.b2_questions set
    status = 'resolved',
    winning_option_id = p_winning_option_id
  where id = q.id;

  insert into public.b2_events (session_id, player_id, kind, payload)
  values (q.session_id, host_id, 'question_resolved',
    jsonb_build_object(
      'question_id', q.id,
      'winning_option_id', p_winning_option_id,
      'pool', pool_plus_seed,
      'winners', winning_stake
    ));
end; $$;

-- ------------------------------------------------------------
-- close_question — host closes early (no more bets, but not resolved)
-- ------------------------------------------------------------
create or replace function public.b2_close_question(
  p_question_id uuid
) returns void language plpgsql security definer as $$
declare
  uid uuid := auth.uid();
  q public.b2_questions;
  s public.b2_sessions;
  host_id uuid;
begin
  if uid is null then
    raise exception 'auth_required' using errcode = 'P0001';
  end if;

  select * into q from public.b2_questions where id = p_question_id;
  if not found then
    raise exception 'question_not_found' using errcode = 'P0001';
  end if;

  select * into s from public.b2_sessions where id = q.session_id;
  select id into host_id from public.b2_players
    where session_id = q.session_id and auth_user_id = uid;
  if s.host_player_id is distinct from host_id then
    raise exception 'not_host' using errcode = 'P0001';
  end if;

  if q.status <> 'open' then
    raise exception 'question_not_open' using errcode = 'P0001';
  end if;

  update public.b2_questions set status = 'closed' where id = q.id;

  insert into public.b2_events (session_id, player_id, kind, payload)
  values (q.session_id, host_id, 'question_closed',
    jsonb_build_object('question_id', q.id));
end; $$;

-- ------------------------------------------------------------
-- cancel_question — refund all stakes, mark cancelled
-- ------------------------------------------------------------
create or replace function public.b2_cancel_question(
  p_question_id uuid
) returns void language plpgsql security definer as $$
declare
  uid uuid := auth.uid();
  q public.b2_questions;
  s public.b2_sessions;
  host_id uuid;
begin
  if uid is null then
    raise exception 'auth_required' using errcode = 'P0001';
  end if;

  select * into q from public.b2_questions where id = p_question_id for update;
  if not found then
    raise exception 'question_not_found' using errcode = 'P0001';
  end if;
  if q.status = 'resolved' then
    raise exception 'already_resolved' using errcode = 'P0001';
  end if;

  select * into s from public.b2_sessions where id = q.session_id;
  select id into host_id from public.b2_players
    where session_id = q.session_id and auth_user_id = uid;
  if s.host_player_id is distinct from host_id then
    raise exception 'not_host' using errcode = 'P0001';
  end if;

  -- refund stakes
  update public.b2_players p set balance = balance + coalesce((
    select sum(amount) from public.b2_bets
    where question_id = q.id and player_id = p.id
  ), 0)
  where session_id = q.session_id;

  update public.b2_questions set status = 'cancelled' where id = q.id;

  insert into public.b2_events (session_id, player_id, kind, payload)
  values (q.session_id, host_id, 'question_cancelled',
    jsonb_build_object('question_id', q.id));
end; $$;

-- ------------------------------------------------------------
-- award_bonus — host gives bonus points to a player
-- ------------------------------------------------------------
create or replace function public.b2_award_bonus(
  p_session_id uuid,
  p_player_id uuid,
  p_amount integer,
  p_reason text default null
) returns void language plpgsql security definer as $$
declare
  uid uuid := auth.uid();
  s public.b2_sessions;
  host_id uuid;
begin
  if uid is null then
    raise exception 'auth_required' using errcode = 'P0001';
  end if;

  select * into s from public.b2_sessions where id = p_session_id;
  if not found then
    raise exception 'room_not_found' using errcode = 'P0001';
  end if;

  select id into host_id from public.b2_players
    where session_id = p_session_id and auth_user_id = uid;
  if s.host_player_id is distinct from host_id then
    raise exception 'not_host' using errcode = 'P0001';
  end if;

  insert into public.b2_bonuses (session_id, player_id, awarded_by_player_id, amount, reason)
  values (p_session_id, p_player_id, host_id, p_amount, p_reason);

  update public.b2_players set balance = balance + p_amount where id = p_player_id;

  insert into public.b2_events (session_id, player_id, kind, payload)
  values (p_session_id, p_player_id, 'bonus_awarded',
    jsonb_build_object('amount', p_amount, 'reason', p_reason));
end; $$;

-- ------------------------------------------------------------
-- transfer_host — pass hosting to another player
-- ------------------------------------------------------------
create or replace function public.b2_transfer_host(
  p_session_id uuid,
  p_new_host_player_id uuid
) returns void language plpgsql security definer as $$
declare
  uid uuid := auth.uid();
  s public.b2_sessions;
  host_id uuid;
begin
  if uid is null then
    raise exception 'auth_required' using errcode = 'P0001';
  end if;

  select * into s from public.b2_sessions where id = p_session_id;
  select id into host_id from public.b2_players
    where session_id = p_session_id and auth_user_id = uid;
  if s.host_player_id is distinct from host_id then
    raise exception 'not_host' using errcode = 'P0001';
  end if;

  -- new host must be a member
  if not exists (select 1 from public.b2_players
    where id = p_new_host_player_id and session_id = p_session_id) then
    raise exception 'player_not_in_room' using errcode = 'P0001';
  end if;

  update public.b2_sessions set host_player_id = p_new_host_player_id where id = p_session_id;

  insert into public.b2_events (session_id, player_id, kind, payload)
  values (p_session_id, p_new_host_player_id, 'host_transferred',
    jsonb_build_object('previous_host', host_id, 'new_host', p_new_host_player_id));
end; $$;

-- ------------------------------------------------------------
-- end_session — host closes the room
-- ------------------------------------------------------------
create or replace function public.b2_end_session(
  p_session_id uuid
) returns void language plpgsql security definer as $$
declare
  uid uuid := auth.uid();
  s public.b2_sessions;
  host_id uuid;
begin
  if uid is null then
    raise exception 'auth_required' using errcode = 'P0001';
  end if;

  select * into s from public.b2_sessions where id = p_session_id;
  select id into host_id from public.b2_players
    where session_id = p_session_id and auth_user_id = uid;
  if s.host_player_id is distinct from host_id then
    raise exception 'not_host' using errcode = 'P0001';
  end if;

  update public.b2_sessions set status = 'closed', ended_at = now() where id = p_session_id;

  insert into public.b2_events (session_id, player_id, kind, payload)
  values (p_session_id, host_id, 'session_ended', jsonb_build_object());
end; $$;

-- ------------------------------------------------------------
-- calc_multiplier — hypothetical multiplier preview for UI slider
-- ------------------------------------------------------------
create or replace function public.b2_calc_multiplier(
  p_question_id uuid,
  p_option_id uuid,
  p_hypothetical_amount integer
) returns numeric language plpgsql stable security definer as $$
declare
  q public.b2_questions;
  s public.b2_sessions;
  total_stake integer;
  option_stake integer;
  opt_count integer;
begin
  select * into q from public.b2_questions where id = p_question_id;
  if not found then return 0; end if;

  select * into s from public.b2_sessions where id = q.session_id;
  select count(*) into opt_count from public.b2_options where question_id = q.id;
  select coalesce(sum(amount), 0) into total_stake from public.b2_bets where question_id = q.id;
  select coalesce(sum(amount), 0) into option_stake from public.b2_bets where option_id = p_option_id;

  if (option_stake + p_hypothetical_amount + s.virtual_seed::numeric / opt_count) = 0 then
    return 0;
  end if;

  return (total_stake + p_hypothetical_amount + s.virtual_seed)::numeric
       / (option_stake + p_hypothetical_amount + s.virtual_seed::numeric / opt_count);
end; $$;

-- ------------------------------------------------------------
-- Heartbeat — mark player as online
-- ------------------------------------------------------------
create or replace function public.b2_heartbeat(p_session_id uuid)
returns void language plpgsql security definer as $$
begin
  update public.b2_players set last_seen_at = now()
  where session_id = p_session_id and auth_user_id = auth.uid();
end; $$;

-- ------------------------------------------------------------
-- Grants: allow anon + authenticated to call RPC
-- ------------------------------------------------------------
grant execute on function public.b2_create_room(text, text, text, text, text, integer, integer) to anon, authenticated;
grant execute on function public.b2_join_room(text, text, text, text, text) to anon, authenticated;
grant execute on function public.b2_create_question(uuid, text, text, text[], integer) to anon, authenticated;
grant execute on function public.b2_place_bet(uuid, uuid, integer) to anon, authenticated;
grant execute on function public.b2_resolve_question(uuid, uuid) to anon, authenticated;
grant execute on function public.b2_close_question(uuid) to anon, authenticated;
grant execute on function public.b2_cancel_question(uuid) to anon, authenticated;
grant execute on function public.b2_award_bonus(uuid, uuid, integer, text) to anon, authenticated;
grant execute on function public.b2_transfer_host(uuid, uuid) to anon, authenticated;
grant execute on function public.b2_end_session(uuid) to anon, authenticated;
grant execute on function public.b2_calc_multiplier(uuid, uuid, integer) to anon, authenticated;
grant execute on function public.b2_heartbeat(uuid) to anon, authenticated;
