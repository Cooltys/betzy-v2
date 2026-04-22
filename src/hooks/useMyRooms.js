import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Fetch all rooms where the current auth user is a player.
 * Returns session + player data per row.
 */
export function useMyRooms(userId) {
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!userId) return
    let cancelled = false

    async function fetchRooms() {
      setLoading(true)
      // Fetch player records, then fetch their sessions separately
      // (embed join fails because b2_players and b2_sessions have two FK relations:
      //  players.session_id -> sessions AND sessions.host_player_id -> players)
      const { data: playerRows, error } = await supabase
        .from('b2_players')
        .select('id, session_id, nick, emoji, color, balance, joined_at')
        .eq('auth_user_id', userId)
        .order('joined_at', { ascending: false })

      if (cancelled) return
      if (error) {
        console.error('[useMyRooms] players query error:', error, 'for userId:', userId)
        setError(error)
        setLoading(false)
        return
      }

      if (!playerRows || playerRows.length === 0) {
        console.log('[useMyRooms] no player records for userId:', userId)
        setRooms([])
        setLoading(false)
        return
      }

      const sessionIds = playerRows.map(p => p.session_id)
      const { data: sessionRows, error: sErr } = await supabase
        .from('b2_sessions')
        .select('id, room_name, emoji, join_code, status, starting_balance, host_player_id, created_at, ended_at')
        .in('id', sessionIds)

      if (cancelled) return
      if (sErr) {
        console.error('[useMyRooms] sessions query error:', sErr)
        setError(sErr)
        setLoading(false)
        return
      }

      const byId = new Map(sessionRows.map(s => [s.id, s]))
      const data = playerRows
        .map(p => ({ ...p, session: byId.get(p.session_id) }))
        .filter(r => r.session)

      console.log('[useMyRooms] fetched rooms:', data.length, 'for userId:', userId)
      setRooms(data)
      setLoading(false)
    }

    fetchRooms()
    return () => { cancelled = true }
  }, [userId])

  const refresh = async () => {
    if (!userId) return
    const { data: playerRows } = await supabase
      .from('b2_players')
      .select('id, session_id, nick, emoji, color, balance, joined_at')
      .eq('auth_user_id', userId)
      .order('joined_at', { ascending: false })
    if (!playerRows || playerRows.length === 0) { setRooms([]); return }
    const { data: sessionRows } = await supabase
      .from('b2_sessions')
      .select('id, room_name, emoji, join_code, status, starting_balance, host_player_id, created_at, ended_at')
      .in('id', playerRows.map(p => p.session_id))
    const byId = new Map((sessionRows || []).map(s => [s.id, s]))
    setRooms(playerRows.map(p => ({ ...p, session: byId.get(p.session_id) })).filter(r => r.session))
  }

  return { rooms, loading, error, refresh }
}
