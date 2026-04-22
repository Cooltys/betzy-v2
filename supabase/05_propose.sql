-- ============================================================
-- Betzy V2 — Propose & Approve flow (apply after 01-04)
-- Players can now propose bets; host approves/rejects.
-- ============================================================

-- ------------------------------------------------------------
-- b2_create_question — any member can call.
-- Non-host proposals get is_approved = false, no expires_at yet.
-- Host calls directly → is_approved = true (unchanged from v1).
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
  caller_id uuid;
  is_caller_host boolean;
  q public.b2_questions;
  opt text;
  pos integer := 0;
  new_expires timestamptz;
  new_approved boolean;
  new_status text;
begin
  if uid is null then
    raise exception 'auth_required' using errcode = 'P0001';
  end if;

  select * into s from public.b2_sessions where id = p_session_id;
  if not found then
    raise exception 'room_not_found' using errcode = 'P0001';
  end if;

  select id into caller_id from public.b2_players
    where session_id = p_session_id and auth_user_id = uid;
  if caller_id is null then
    raise exception 'not_member' using errcode = 'P0001';
  end if;

  is_caller_host := (s.host_player_id = caller_id);

  if array_length(p_options, 1) < 2 then
    raise exception 'need_min_2_options' using errcode = 'P0001';
  end if;

  -- Host: approved immediately, timer runs
  -- Player proposal: not approved, no timer until host approves
  if is_caller_host then
    new_approved := true;
    new_status := 'open';
    new_expires := now() + (p_expires_in_sec || ' seconds')::interval;
  else
    new_approved := false;
    new_status := 'open';
    new_expires := null;
  end if;

  insert into public.b2_questions (
    session_id, title, description, status, expires_at,
    created_by_player_id, is_approved
  ) values (
    p_session_id, p_title, p_description, new_status, new_expires,
    caller_id, new_approved
  ) returning * into q;

  foreach opt in array p_options loop
    insert into public.b2_options (question_id, text, position)
    values (q.id, opt, pos);
    pos := pos + 1;
  end loop;

  insert into public.b2_events (session_id, player_id, kind, payload)
  values (
    p_session_id, caller_id,
    case when is_caller_host then 'question_created' else 'question_proposed' end,
    jsonb_build_object('question_id', q.id, 'title', q.title)
  );

  return q.id;
end; $$;

-- ------------------------------------------------------------
-- b2_approve_question — host approves a player's proposal.
-- Sets is_approved = true and starts the timer.
-- ------------------------------------------------------------
create or replace function public.b2_approve_question(
  p_question_id uuid,
  p_expires_in_sec integer default 60
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

  if q.is_approved then
    raise exception 'already_approved' using errcode = 'P0001';
  end if;

  select * into s from public.b2_sessions where id = q.session_id;
  select id into host_id from public.b2_players
    where session_id = q.session_id and auth_user_id = uid;
  if s.host_player_id is distinct from host_id then
    raise exception 'not_host' using errcode = 'P0001';
  end if;

  update public.b2_questions set
    is_approved = true,
    status = 'open',
    expires_at = now() + (p_expires_in_sec || ' seconds')::interval
  where id = q.id;

  insert into public.b2_events (session_id, player_id, kind, payload)
  values (q.session_id, host_id, 'question_approved',
    jsonb_build_object('question_id', q.id, 'proposed_by', q.created_by_player_id));
end; $$;

-- ------------------------------------------------------------
-- b2_reject_question — host rejects a proposal. Deletes it.
-- ------------------------------------------------------------
create or replace function public.b2_reject_question(
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

  if q.is_approved then
    raise exception 'already_approved' using errcode = 'P0001';
  end if;

  select * into s from public.b2_sessions where id = q.session_id;
  select id into host_id from public.b2_players
    where session_id = q.session_id and auth_user_id = uid;
  if s.host_player_id is distinct from host_id then
    raise exception 'not_host' using errcode = 'P0001';
  end if;

  -- Log event before deletion (payload carries context)
  insert into public.b2_events (session_id, player_id, kind, payload)
  values (q.session_id, host_id, 'question_rejected',
    jsonb_build_object('question_id', q.id, 'title', q.title, 'proposed_by', q.created_by_player_id));

  delete from public.b2_questions where id = q.id;
end; $$;

grant execute on function public.b2_approve_question(uuid, integer) to anon, authenticated;
grant execute on function public.b2_reject_question(uuid) to anon, authenticated;
