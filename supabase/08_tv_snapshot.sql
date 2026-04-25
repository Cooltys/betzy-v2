-- ============================================================
-- Betzy V2 — TV snapshot (public read for /tv/:sessionId)
-- ============================================================
-- Single RPC returning everything needed for the TV view.
-- SECURITY DEFINER + public grant = no auth required.
-- Polling-based on the client (every ~5s), no realtime needed.

create or replace function public.b2_tv_snapshot(
  p_session_id uuid
) returns jsonb language plpgsql security definer stable as $$
declare
  s public.b2_sessions;
  result jsonb;
begin
  select * into s from public.b2_sessions where id = p_session_id;
  if not found then
    raise exception 'session_not_found' using errcode = 'P0001';
  end if;

  result := jsonb_build_object(
    'session', jsonb_build_object(
      'id', s.id,
      'join_code', s.join_code,
      'room_name', s.room_name,
      'emoji', s.emoji,
      'status', s.status,
      'virtual_seed', s.virtual_seed,
      'planned_rounds', s.planned_rounds,
      'host_player_id', s.host_player_id,
      'created_at', s.created_at,
      'ended_at', s.ended_at
    ),
    'players', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id,
        'nick', p.nick,
        'emoji', p.emoji,
        'color', p.color,
        'balance', p.balance,
        'is_host', (p.id = s.host_player_id)
      ) order by p.balance desc)
      from public.b2_players p
      where p.session_id = p_session_id
    ), '[]'::jsonb),
    'questions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', q.id,
        'title', q.title,
        'description', q.description,
        'status', q.status,
        'expires_at', q.expires_at,
        'winning_option_id', q.winning_option_id,
        'is_approved', q.is_approved,
        'result_announcement_at', q.result_announcement_at,
        'created_at', q.created_at
      ) order by q.created_at desc)
      from public.b2_questions q
      where q.session_id = p_session_id
        and (q.is_approved is null or q.is_approved = true)
    ), '[]'::jsonb),
    'options', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', o.id,
        'question_id', o.question_id,
        'text', o.text,
        'position', o.position
      ) order by o.position)
      from public.b2_options o
      join public.b2_questions q on q.id = o.question_id
      where q.session_id = p_session_id
    ), '[]'::jsonb),
    'bets', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', b.id,
        'question_id', b.question_id,
        'option_id', b.option_id,
        'player_id', b.player_id,
        'amount', b.amount,
        'payout_amount', b.payout_amount
      ))
      from public.b2_bets b
      where b.session_id = p_session_id
    ), '[]'::jsonb)
  );

  return result;
end; $$;

grant execute on function public.b2_tv_snapshot(uuid) to anon, authenticated;
