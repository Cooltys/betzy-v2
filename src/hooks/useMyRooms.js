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
      const { data, error } = await supabase
        .from('b2_players')
        .select(`
          id, nick, emoji, color, balance, joined_at,
          session:b2_sessions!inner(
            id, room_name, emoji, join_code, status, starting_balance, host_player_id, created_at, ended_at
          )
        `)
        .eq('auth_user_id', userId)
        .order('joined_at', { ascending: false })

      if (cancelled) return
      if (error) setError(error)
      else setRooms(data || [])
      setLoading(false)
    }

    fetchRooms()
    return () => { cancelled = true }
  }, [userId])

  const refresh = async () => {
    if (!userId) return
    const { data } = await supabase
      .from('b2_players')
      .select(`
        id, nick, emoji, color, balance, joined_at,
        session:b2_sessions!inner(
          id, room_name, emoji, join_code, status, starting_balance, host_player_id, created_at, ended_at
        )
      `)
      .eq('auth_user_id', userId)
      .order('joined_at', { ascending: false })
    setRooms(data || [])
  }

  return { rooms, loading, error, refresh }
}
