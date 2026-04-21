-- ============================================================
-- Betzy V2 — Patches (apply after 01-03)
-- ============================================================

-- ------------------------------------------------------------
-- revert_resolution — host can undo a resolved question
-- (reclaims payouts, restores bet amounts to players, reopens as 'closed')
-- ------------------------------------------------------------
create or replace function public.b2_revert_resolution(
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
  if q.status <> 'resolved' then
    raise exception 'not_resolved' using errcode = 'P0001';
  end if;

  select * into s from public.b2_sessions where id = q.session_id;
  select id into host_id from public.b2_players
    where session_id = q.session_id and auth_user_id = uid;
  if s.host_player_id is distinct from host_id then
    raise exception 'not_host' using errcode = 'P0001';
  end if;

  -- reclaim payouts from winners
  update public.b2_players p set balance = balance - coalesce((
    select sum(payout_amount) from public.b2_bets
    where question_id = q.id and player_id = p.id
  ), 0)
  where session_id = q.session_id;

  -- clear payout amounts
  update public.b2_bets set payout_amount = 0
  where question_id = q.id;

  -- reopen as closed (host re-resolves)
  update public.b2_questions set
    status = 'closed',
    winning_option_id = null
  where id = q.id;

  insert into public.b2_events (session_id, player_id, kind, payload)
  values (q.session_id, host_id, 'resolution_reverted',
    jsonb_build_object('question_id', q.id));
end; $$;

grant execute on function public.b2_revert_resolution(uuid) to anon, authenticated;
