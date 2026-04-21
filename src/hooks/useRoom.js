import { useEffect, useRef, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Full room state hook.
 * Fetches session + players + questions + options + bets + events
 * and keeps them in sync via realtime subscriptions.
 *
 * Returns:
 *   { session, players, questions, options, bets, events, me, isHost,
 *     loading, error, refresh }
 */
export function useRoom(sessionId, userId) {
  const [state, setState] = useState({
    session: null,
    players: [],
    questions: [],
    options: [],
    bets: [],
    events: [],
    loading: true,
    error: null,
  })

  const stateRef = useRef(state)
  stateRef.current = state

  const setPartial = useCallback((patch) => {
    setState(prev => ({ ...prev, ...(typeof patch === 'function' ? patch(prev) : patch) }))
  }, [])

  const fetchAll = useCallback(async () => {
    if (!sessionId) return
    try {
      const [sessionRes, playersRes, questionsRes, betsRes, eventsRes] = await Promise.all([
        supabase.from('b2_sessions').select('*').eq('id', sessionId).single(),
        supabase.from('b2_players').select('*').eq('session_id', sessionId).order('joined_at', { ascending: true }),
        supabase.from('b2_questions').select('*').eq('session_id', sessionId).order('created_at', { ascending: false }),
        supabase.from('b2_bets').select('*').eq('session_id', sessionId),
        supabase.from('b2_events').select('*').eq('session_id', sessionId).order('created_at', { ascending: false }).limit(50),
      ])

      if (sessionRes.error) throw sessionRes.error
      if (playersRes.error) throw playersRes.error
      if (questionsRes.error) throw questionsRes.error
      if (betsRes.error) throw betsRes.error

      // Fetch options separately — filter by question_ids we have
      const qIds = (questionsRes.data || []).map(q => q.id)
      let optionsData = []
      if (qIds.length > 0) {
        const optionsRes = await supabase
          .from('b2_options')
          .select('*')
          .in('question_id', qIds)
          .order('position', { ascending: true })
        if (optionsRes.error) throw optionsRes.error
        optionsData = optionsRes.data || []
      }

      setPartial({
        session: sessionRes.data,
        players: playersRes.data || [],
        questions: questionsRes.data || [],
        options: optionsData,
        bets: betsRes.data || [],
        events: eventsRes.data || [],
        loading: false,
        error: null,
      })
    } catch (error) {
      setPartial({ error, loading: false })
    }
  }, [sessionId, setPartial])

  // Initial fetch
  useEffect(() => {
    setPartial({ loading: true, error: null })
    fetchAll()
  }, [sessionId, fetchAll, setPartial])

  // Realtime subscriptions
  useEffect(() => {
    if (!sessionId) return

    const channel = supabase
      .channel(`b2:room:${sessionId}`)
      // sessions: session config changes (status, host transfer)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'b2_sessions', filter: `id=eq.${sessionId}`
      }, (payload) => {
        if (payload.eventType === 'DELETE') return
        setPartial(prev => ({ session: payload.new || prev.session }))
      })
      // players: join, balance updates, last_seen
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'b2_players', filter: `session_id=eq.${sessionId}`
      }, (payload) => {
        setPartial(prev => {
          if (payload.eventType === 'INSERT') {
            if (prev.players.some(p => p.id === payload.new.id)) return prev
            return { players: [...prev.players, payload.new] }
          }
          if (payload.eventType === 'UPDATE') {
            return { players: prev.players.map(p => p.id === payload.new.id ? payload.new : p) }
          }
          if (payload.eventType === 'DELETE') {
            return { players: prev.players.filter(p => p.id !== payload.old.id) }
          }
          return prev
        })
      })
      // questions
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'b2_questions', filter: `session_id=eq.${sessionId}`
      }, (payload) => {
        setPartial(prev => {
          if (payload.eventType === 'INSERT') {
            if (prev.questions.some(q => q.id === payload.new.id)) return prev
            return { questions: [payload.new, ...prev.questions] }
          }
          if (payload.eventType === 'UPDATE') {
            return { questions: prev.questions.map(q => q.id === payload.new.id ? payload.new : q) }
          }
          if (payload.eventType === 'DELETE') {
            return { questions: prev.questions.filter(q => q.id !== payload.old.id) }
          }
          return prev
        })
      })
      // options: INSERT only (created with question, not mutated)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'b2_options'
      }, async (payload) => {
        // Options don't have session_id column, so we can't filter at subscription level.
        // Check locally: does this option belong to a question in our session?
        const qIds = stateRef.current.questions.map(q => q.id)
        if (qIds.includes(payload.new.question_id)) {
          setPartial(prev => {
            if (prev.options.some(o => o.id === payload.new.id)) return prev
            return { options: [...prev.options, payload.new] }
          })
        } else {
          // Question might not be in our state yet; refetch options for current questions
          const { data } = await supabase
            .from('b2_options')
            .select('*')
            .in('question_id', qIds.concat(payload.new.question_id))
            .order('position', { ascending: true })
          if (data) setPartial({ options: data })
        }
      })
      // bets
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'b2_bets', filter: `session_id=eq.${sessionId}`
      }, (payload) => {
        setPartial(prev => {
          if (prev.bets.some(b => b.id === payload.new.id)) return prev
          return { bets: [...prev.bets, payload.new] }
        })
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'b2_bets', filter: `session_id=eq.${sessionId}`
      }, (payload) => {
        setPartial(prev => ({
          bets: prev.bets.map(b => b.id === payload.new.id ? payload.new : b)
        }))
      })
      // events
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'b2_events', filter: `session_id=eq.${sessionId}`
      }, (payload) => {
        setPartial(prev => ({
          events: [payload.new, ...prev.events].slice(0, 50)
        }))
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [sessionId, setPartial])

  // Heartbeat every 30s to update last_seen_at
  useEffect(() => {
    if (!sessionId || !userId) return
    const send = async () => {
      try { await supabase.rpc('b2_heartbeat', { p_session_id: sessionId }) } catch {}
    }
    send()
    const interval = setInterval(send, 30000)
    return () => clearInterval(interval)
  }, [sessionId, userId])

  // Derive me + isHost
  const me = state.players.find(p => p.auth_user_id === userId) || null
  const isHost = me && state.session && state.session.host_player_id === me.id

  return {
    ...state,
    me,
    isHost,
    refresh: fetchAll,
  }
}
