-- ============================================================
-- Betzy V2 — Seed Data
-- Creates a working test room: KRZYS-42 with 4 players + 2 questions
-- Run AFTER 01_schema.sql and 02_rpc.sql
-- ============================================================

do $$
declare
  sid uuid;
  p1 uuid; p2 uuid; p3 uuid; p4 uuid;
  q1 uuid; q2 uuid;
  q1o1 uuid; q1o2 uuid; q1o3 uuid;
  q2o1 uuid; q2o2 uuid;
begin
  -- clean up any previous seed room with this code
  delete from public.b2_sessions where join_code = 'KRZYS-42';

  -- session
  insert into public.b2_sessions (room_name, emoji, join_code, starting_balance, virtual_seed, status)
  values ('Wieczór u Krzyśka', '🎯', 'KRZYS-42', 5000, 500, 'open')
  returning id into sid;

  -- players (auth_user_id null — seed only; real players get it from Anonymous Auth)
  insert into public.b2_players (session_id, nick, emoji, color, balance)
  values (sid, 'Krzysiek', '👑', '#eab308', 5000) returning id into p1;
  insert into public.b2_players (session_id, nick, emoji, color, balance)
  values (sid, 'Ania', '🎨', '#ec4899', 4800) returning id into p2;
  insert into public.b2_players (session_id, nick, emoji, color, balance)
  values (sid, 'Michał', '🎸', '#22c55e', 5200) returning id into p3;
  insert into public.b2_players (session_id, nick, emoji, color, balance)
  values (sid, 'Zuza', '🚀', '#a855f7', 4600) returning id into p4;

  update public.b2_sessions set host_player_id = p1 where id = sid;

  -- Question 1: OPEN, ~45s to end
  insert into public.b2_questions (
    session_id, title, description, status, expires_at, created_by_player_id
  ) values (
    sid, 'Kto pierwszy opróżni kufel?', 'Ekipa licytuje się na drugim piwie',
    'open', now() + interval '45 seconds', p1
  ) returning id into q1;

  insert into public.b2_options (question_id, text, position) values (q1, 'Michał', 0) returning id into q1o1;
  insert into public.b2_options (question_id, text, position) values (q1, 'Ania', 1) returning id into q1o2;
  insert into public.b2_options (question_id, text, position) values (q1, 'Zuza', 2) returning id into q1o3;

  insert into public.b2_bets (session_id, question_id, option_id, player_id, amount) values
    (sid, q1, q1o1, p2, 200),
    (sid, q1, q1o1, p4, 150),
    (sid, q1, q1o2, p3, 300);
  update public.b2_players set balance = balance - 200 where id = p2;
  update public.b2_players set balance = balance - 150 where id = p4;
  update public.b2_players set balance = balance - 300 where id = p3;

  -- Question 2: RESOLVED (for history)
  insert into public.b2_questions (
    session_id, title, status, expires_at, created_by_player_id
  ) values (
    sid, 'Padnie słowo "deadline"?', 'resolved',
    now() - interval '10 minutes', p1
  ) returning id into q2;

  insert into public.b2_options (question_id, text, position) values (q2, 'Tak', 0) returning id into q2o1;
  insert into public.b2_options (question_id, text, position) values (q2, 'Nie', 1) returning id into q2o2;

  update public.b2_questions set winning_option_id = q2o1 where id = q2;

  insert into public.b2_bets (session_id, question_id, option_id, player_id, amount, payout_amount) values
    (sid, q2, q2o1, p2, 100, 250),
    (sid, q2, q2o2, p3, 100, 0);

  -- some events
  insert into public.b2_events (session_id, player_id, kind) values
    (sid, p1, 'room_created'),
    (sid, p2, 'player_joined'),
    (sid, p3, 'player_joined'),
    (sid, p4, 'player_joined');

  raise notice 'Seed OK — room join_code=KRZYS-42, session_id=%', sid;
end $$;
