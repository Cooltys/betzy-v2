import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import StatusBar from '../components/StatusBar'
import Toast from '../components/Toast'
import { supabase } from '../lib/supabase'
import { useProfile } from '../hooks/useProfile'
import { errorMessage } from '../lib/tokens'

export default function JoinScreen() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { profile } = useProfile()
  const [code, setCode] = useState(() => (searchParams.get('code') || '').toUpperCase())
  const [password, setPassword] = useState('')
  const [needsPassword, setNeedsPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState(null)

  const canJoin = code.trim().length >= 6 && profile.nick

  const handleJoin = async () => {
    if (!canJoin || loading) return
    if (!profile.nick) {
      setToast({ kind: 'error', text: 'Najpierw ustaw swój nick' })
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase.rpc('b2_join_room', {
        p_join_code: code.trim().toUpperCase(),
        p_nick: profile.nick,
        p_emoji: profile.emoji,
        p_color: profile.color,
        p_password: password || null,
      })

      if (error) {
        const msg = errorMessage(error)
        if (error.message === 'wrong_password' && !needsPassword) {
          setNeedsPassword(true)
          setToast({ kind: 'info', text: 'Ten pokój wymaga hasła' })
        } else {
          setToast({ kind: 'error', text: msg })
        }
        setLoading(false)
        return
      }

      navigate(`/room/${data.session_id}`)
    } catch (e) {
      setToast({ kind: 'error', text: errorMessage(e) })
      setLoading(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col bg-bg text-white">
      <StatusBar />

      <div className="px-5 pt-2.5 pb-4 flex items-center gap-3 shrink-0">
        <button
          onClick={() => navigate('/rooms')}
          className="w-9 h-9 rounded-[10px] bg-white/[0.05] border border-white/10 flex items-center justify-center"
          aria-label="Wróć"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <div className="text-[17px] font-bold">Dołącz do pokoju</div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-8 flex flex-col items-center text-center gap-6">
        <div className="text-[56px]">🎟</div>

        <div>
          <h3 className="text-xl font-bold mb-2">Wpisz kod</h3>
          <p className="text-sm text-slate-400 leading-relaxed max-w-[260px]">
            Kod dostajesz od hosta pokoju — 5 liter, myślnik, 2 cyfry.
          </p>
        </div>

        <input
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ''))}
          maxLength={8}
          placeholder="KRZYS-42"
          autoCapitalize="characters"
          autoCorrect="off"
          className="w-full max-w-[280px] text-center px-4 py-4 rounded-xl bg-bg text-white text-2xl font-mono font-bold tracking-[0.15em] outline-none border border-white/[0.14] focus:border-amber-brand/50"
        />

        {needsPassword && (
          <input
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Hasło pokoju"
            className="w-full max-w-[280px] text-center px-4 py-3 rounded-xl bg-bg text-white text-base outline-none border border-amber-brand/40 focus:border-amber-brand"
          />
        )}

        <button
          onClick={handleJoin}
          disabled={!canJoin || loading}
          className="w-full max-w-[280px] py-4 rounded-[14px] bg-amber-brand text-black font-bold text-sm uppercase tracking-wider transition-all active:scale-95 shadow-amber disabled:opacity-40"
        >
          {loading ? 'Dołączanie…' : 'Dołącz'}
        </button>
      </div>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  )
}
