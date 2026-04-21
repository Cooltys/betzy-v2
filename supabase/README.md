# Betzy V2 — Supabase Setup

## Overview

Betzy V2 uses the **same Supabase project** as V1, but with a `b2_` prefix for all tables, views, and functions. V1 and V2 coexist without conflicts.

## Tables (all prefixed `b2_`)

- `b2_sessions` — rooms
- `b2_players` — players in rooms (with Anonymous Auth)
- `b2_questions` — bets
- `b2_options` — options for each bet
- `b2_bets` — stakes placed
- `b2_bonuses` — host bonuses
- `b2_events` — activity feed

## Views

- `b2_option_stakes` — aggregated stakes per option (live multiplier data)
- `b2_question_summary` — question + pool size + bettor count + effective_status
- `b2_leaderboard` — ranked players in session

## Run Order

1. **01_schema.sql** — creates all tables, views, indexes, RLS policies
2. **02_rpc.sql** — all RPC functions (join_room, place_bet, resolve_question, etc.)
3. **03_seed.sql** — optional: creates demo room "KRZYS-42" with 4 players

## Auth

Uses **Supabase Auth Anonymous**. Enable it in:
**Authentication → Providers → Anonymous Sign-Ins → toggle ON**

Client flow:
1. `supabase.auth.signInAnonymously()` on first load (if no JWT yet)
2. `auth.uid()` becomes the player identity
3. `b2_join_room(code, nick, emoji, color)` RPC looks up `auth.uid()` — creates player or resumes

## RLS

All tables have RLS enabled:
- **Read**: members of the session can read session data (via `b2_is_member(session_id)` helper)
- **Write**: blocked from client — all writes go through `SECURITY DEFINER` RPC functions

## Realtime

All 7 tables are added to `supabase_realtime` publication. Client subscribes with filters on `session_id`.

## Error Codes

RPC functions raise exceptions with these error messages (frontend maps to user copy):

| Code | PL copy |
|------|---------|
| `auth_required` | Brak sesji — odśwież stronę |
| `room_not_found` | Nie ma takiego pokoju |
| `room_closed` | Pokój jest zamknięty |
| `wrong_password` | Złe hasło pokoju |
| `nick_taken` | Nick zajęty, wybierz inny |
| `question_not_found` | Zakład nie istnieje |
| `question_not_open` | Ten zakład nie przyjmuje stawek |
| `time_expired` | Czas na zakład minął |
| `invalid_amount` | Stawka musi być > 0 |
| `insufficient_balance` | Za mało punktów |
| `invalid_option` | Nieprawidłowa opcja |
| `not_host` | Tylko host może to zrobić |
| `not_member` | Nie jesteś w tym pokoju |
| `already_resolved` | Zakład już rozstrzygnięty |
| `need_min_2_options` | Zakład musi mieć min. 2 opcje |
| `player_not_in_room` | Gracz nie jest w pokoju |
