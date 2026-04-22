-- ============================================================
-- Betzy V2 — Reopen question (closed → open with new timer)
-- ============================================================

create or replace function public.b2_reopen_question(
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

  if q.status = 'resolved' then
    raise exception 'already_resolved' using errcode = 'P0001';
  end if;
  if q.status = 'cancelled' then
    raise exception 'question_cancelled' using errcode = 'P0001';
  end if;

  select * into s from public.b2_sessions where id = q.session_id;
  select id into host_id from public.b2_players
    where session_id = q.session_id and auth_user_id = uid;
  if s.host_player_id is distinct from host_id then
    raise exception 'not_host' using errcode = 'P0001';
  end if;

  update public.b2_questions set
    status = 'open',
    expires_at = now() + (p_expires_in_sec || ' seconds')::interval
  where id = q.id;

  insert into public.b2_events (session_id, player_id, kind, payload)
  values (q.session_id, host_id, 'question_reopened',
    jsonb_build_object('question_id', q.id, 'extended_by_sec', p_expires_in_sec));
end; $$;

grant execute on function public.b2_reopen_question(uuid, integer) to anon, authenticated;
