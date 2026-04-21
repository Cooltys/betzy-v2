-- ============================================================
-- Betzy V2 — Schema
-- Prefix: b2_ (all tables, views, functions)
-- Target: Supabase (same project as V1)
-- ============================================================

-- ============================================================
-- 1. TABLES
-- ============================================================

create table if not exists public.b2_sessions (
  id uuid primary key default gen_random_uuid(),
  room_name text not null,
  emoji text default '🎯',
  join_code text unique not null,
  host_player_id uuid,
  starting_balance integer not null default 5000,
  virtual_seed integer not null default 500,
  status text not null default 'open'
    check (status in ('open', 'paused', 'closed')),
  planned_rounds integer,
  room_password text,
  created_at timestamptz default now(),
  ended_at timestamptz
);

create index b2_sessions_join_code_idx on public.b2_sessions(join_code);
create index b2_sessions_status_idx on public.b2_sessions(status);

create table if not exists public.b2_players (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.b2_sessions(id) on delete cascade,
  auth_user_id uuid references auth.users(id) on delete cascade,
  nick text not null,
  pin text,
  emoji text default '🎯',
  color text default '#eab308',
  balance integer not null,
  joined_at timestamptz default now(),
  last_seen_at timestamptz default now(),
  unique (session_id, nick)
);

create unique index b2_players_session_auth_idx
  on public.b2_players(session_id, auth_user_id)
  where auth_user_id is not null;

-- add FK from sessions.host_player_id now that players exists
alter table public.b2_sessions
  add constraint b2_sessions_host_fk
  foreign key (host_player_id) references public.b2_players(id) on delete set null;

create table if not exists public.b2_questions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.b2_sessions(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'open'
    check (status in ('open', 'closed', 'resolved', 'cancelled')),
  winning_option_id uuid,
  created_by_player_id uuid references public.b2_players(id) on delete set null,
  is_approved boolean default true,
  created_at timestamptz default now(),
  expires_at timestamptz,
  result_announcement_at timestamptz
);

create index b2_questions_session_idx on public.b2_questions(session_id, created_at desc);
create index b2_questions_status_idx on public.b2_questions(status);

create table if not exists public.b2_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.b2_questions(id) on delete cascade,
  text text not null,
  position integer default 0
);

create index b2_options_question_idx on public.b2_options(question_id, position);

-- add FK from questions.winning_option_id now that options exists
alter table public.b2_questions
  add constraint b2_questions_winning_option_fk
  foreign key (winning_option_id) references public.b2_options(id) on delete set null;

create table if not exists public.b2_bets (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.b2_sessions(id) on delete cascade,
  question_id uuid not null references public.b2_questions(id) on delete cascade,
  option_id uuid not null references public.b2_options(id) on delete cascade,
  player_id uuid not null references public.b2_players(id) on delete cascade,
  amount integer not null check (amount > 0),
  payout_amount integer default 0,
  multiplier_at_placement numeric(5, 2),
  placed_at timestamptz default now()
);

create index b2_bets_question_idx on public.b2_bets(question_id);
create index b2_bets_player_idx on public.b2_bets(player_id);
create index b2_bets_session_idx on public.b2_bets(session_id);

create table if not exists public.b2_bonuses (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.b2_sessions(id) on delete cascade,
  player_id uuid not null references public.b2_players(id) on delete cascade,
  awarded_by_player_id uuid references public.b2_players(id) on delete set null,
  amount integer not null,
  reason text,
  created_at timestamptz default now()
);

create index b2_bonuses_session_idx on public.b2_bonuses(session_id, created_at desc);
create index b2_bonuses_player_idx on public.b2_bonuses(player_id);

create table if not exists public.b2_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.b2_sessions(id) on delete cascade,
  player_id uuid references public.b2_players(id) on delete set null,
  kind text not null,
  payload jsonb,
  created_at timestamptz default now()
);

create index b2_events_session_idx on public.b2_events(session_id, created_at desc);

-- ============================================================
-- 2. VIEWS
-- ============================================================

create or replace view public.b2_option_stakes as
select
  o.id,
  o.question_id,
  o.text,
  o.position,
  coalesce(sum(b.amount), 0)::integer as total_stake,
  count(distinct b.player_id)::integer as bettor_count
from public.b2_options o
left join public.b2_bets b on b.option_id = o.id
group by o.id;

create or replace view public.b2_question_summary as
select
  q.*,
  coalesce(sum(b.amount), 0)::integer as total_pool,
  count(distinct b.player_id)::integer as total_bettors,
  case
    when q.status = 'open' and q.expires_at is not null and q.expires_at < now() then 'closed'
    else q.status
  end as effective_status
from public.b2_questions q
left join public.b2_bets b on b.question_id = q.id
group by q.id;

create or replace view public.b2_leaderboard as
select
  p.session_id,
  p.id as player_id,
  p.nick,
  p.emoji,
  p.color,
  p.balance,
  (p.balance - s.starting_balance)::integer as profit,
  rank() over (partition by p.session_id order by p.balance desc) as rank
from public.b2_players p
join public.b2_sessions s on s.id = p.session_id;

-- ============================================================
-- 3. RLS (Row Level Security)
-- ============================================================

alter table public.b2_sessions enable row level security;
alter table public.b2_players enable row level security;
alter table public.b2_questions enable row level security;
alter table public.b2_options enable row level security;
alter table public.b2_bets enable row level security;
alter table public.b2_bonuses enable row level security;
alter table public.b2_events enable row level security;

-- Helper: is the current auth user a member of this session?
create or replace function public.b2_is_member(p_session_id uuid)
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from public.b2_players
    where session_id = p_session_id and auth_user_id = auth.uid()
  );
$$;

-- Sessions: anyone can read if they know the join_code (for join flow),
-- members can read their session by id
create policy "b2_sessions_select_public" on public.b2_sessions
  for select using (true);

-- No direct insert/update/delete — only through RPC
create policy "b2_sessions_insert_none" on public.b2_sessions
  for insert with check (false);
create policy "b2_sessions_update_none" on public.b2_sessions
  for update using (false);
create policy "b2_sessions_delete_none" on public.b2_sessions
  for delete using (false);

-- Players: members of session can see all players in that session
create policy "b2_players_select_members" on public.b2_players
  for select using (public.b2_is_member(session_id));

create policy "b2_players_update_self" on public.b2_players
  for update using (auth_user_id = auth.uid());

create policy "b2_players_insert_none" on public.b2_players
  for insert with check (false);
create policy "b2_players_delete_none" on public.b2_players
  for delete using (false);

-- Questions: members can read, writes via RPC
create policy "b2_questions_select_members" on public.b2_questions
  for select using (public.b2_is_member(session_id));

create policy "b2_questions_write_none" on public.b2_questions
  for all using (false) with check (false);

-- Options: members can read via question
create policy "b2_options_select_members" on public.b2_options
  for select using (
    exists (
      select 1 from public.b2_questions q
      where q.id = question_id and public.b2_is_member(q.session_id)
    )
  );

create policy "b2_options_write_none" on public.b2_options
  for all using (false) with check (false);

-- Bets: members can read all bets in session, writes via RPC
create policy "b2_bets_select_members" on public.b2_bets
  for select using (public.b2_is_member(session_id));

create policy "b2_bets_write_none" on public.b2_bets
  for all using (false) with check (false);

-- Bonuses: members read, writes via RPC
create policy "b2_bonuses_select_members" on public.b2_bonuses
  for select using (public.b2_is_member(session_id));

create policy "b2_bonuses_write_none" on public.b2_bonuses
  for all using (false) with check (false);

-- Events: members read, writes via RPC
create policy "b2_events_select_members" on public.b2_events
  for select using (public.b2_is_member(session_id));

create policy "b2_events_write_none" on public.b2_events
  for all using (false) with check (false);

-- ============================================================
-- 4. GRANTS (views need explicit grants)
-- ============================================================

grant select on public.b2_option_stakes to anon, authenticated;
grant select on public.b2_question_summary to anon, authenticated;
grant select on public.b2_leaderboard to anon, authenticated;

-- ============================================================
-- 5. REALTIME
-- ============================================================

-- Enable realtime for member-facing tables
alter publication supabase_realtime add table public.b2_players;
alter publication supabase_realtime add table public.b2_questions;
alter publication supabase_realtime add table public.b2_options;
alter publication supabase_realtime add table public.b2_bets;
alter publication supabase_realtime add table public.b2_bonuses;
alter publication supabase_realtime add table public.b2_events;
alter publication supabase_realtime add table public.b2_sessions;
