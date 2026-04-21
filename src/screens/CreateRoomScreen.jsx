import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import StatusBar from '../components/StatusBar'
import Toast from '../components/Toast'
import { supabase } from '../lib/supabase'
import { useProfile } from '../hooks/useProfile'
import { errorMessage, EMOJI_LIST } from '../lib/tokens'

export default function CreateRoomScreen() {
  const navigate = useNavigate()
  const { profile } = useProfile()
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('🎯')
  const [startingBalance, setStartingBalance] = useState(5000)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState(null)

  const canCreate = name.trim().length >= 2 && profile.nick

  const handleCreate = async () => {
    if (!canCreate || loading) return

    setLoading(true)
    try {
      const { data, error } = await supabase.rpc('b2_create_room', {
        p_room_name: name.trim(),
        p_host_nick: profile.nick,
        p_host_emoji: profile.emoji,
        p_host_color: profile.color,
        p_emoji: emoji,
        p_starting_balance: startingBalance,
        p_virtual_seed: Math.round(startingBalance * 0.1),
      })

      if (error) {
        setToast({ kind: 'error', text: errorMessage(error) })
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
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <div className="text-[17px] font-bold">Nowy pokój</div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pt-2 pb-4 space-y-5">
        {/* Preview */}
        <div className="text-center py-4">
          <div
            className="w-[90px] h-[90px] rounded-[24px] mx-auto mb-3 flex items-center justify-center text-[44px]"
            style={{ background: 'rgba(234,179,8,0.12)' }}
          >
            {emoji}
          </div>
          <div className="text-lg font-bold text-white">{name || 'Nazwa pokoju'}</div>
          <div className="text-[11px] font-mono tracking-wider text-slate-500 mt-1 uppercase">
            Ty jako Host
          </div>
        </div>

        {/* Name */}
        <div>
          <label className="k-label block mb-2">Nazwa pokoju</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            maxLength={40}
            placeholder="np. Wieczór u Krzyśka"
            className="w-full px-4 py-[14px] rounded-xl bg-bg text-white text-base outline-none border border-white/[0.14] focus:border-amber-brand/50"
          />
        </div>

        {/* Emoji */}
        <div>
          <label className="k-label block mb-2">Emoji pokoju</label>
          <div className="grid grid-cols-9 gap-1.5 p-2.5 bg-white/[0.03] border border-white/[0.08] rounded-xl">
            {EMOJI_LIST.map(e => (
              <button
                key={e}
                type="button"
                onClick={() => setEmoji(e)}
                className={`aspect-square rounded-lg text-lg transition-all ${
                  emoji === e
                    ? 'bg-amber-brand/[0.12] border border-amber-brand/35'
                    : 'border border-transparent hover:bg-white/[0.05]'
                }`}
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        {/* Starting balance */}
        <div>
          <label className="k-label block mb-2">Startowy balans gracza</label>
          <div className="grid grid-cols-3 gap-2">
            {[1000, 5000, 10000].map(v => (
              <button
                key={v}
                type="button"
                onClick={() => setStartingBalance(v)}
                className={`py-3 rounded-xl text-sm font-bold transition-all ${
                  startingBalance === v
                    ? 'bg-amber-brand/[0.12] border border-amber-brand/40 text-amber-brand'
                    : 'bg-white/[0.03] border border-white/10 text-slate-300'
                }`}
              >
                {v.toLocaleString()}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-5 pt-3.5 pb-6 safe-bottom shrink-0">
        <button
          onClick={handleCreate}
          disabled={!canCreate || loading}
          className="w-full py-4 rounded-[14px] bg-amber-brand text-black font-bold text-sm uppercase tracking-wider transition-all active:scale-95 shadow-amber disabled:opacity-40"
        >
          {loading ? 'Tworzenie…' : 'Stwórz pokój'}
        </button>
      </div>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  )
}
