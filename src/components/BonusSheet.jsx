import { useState, useEffect } from 'react'
import BottomSheet from './BottomSheet'
import { supabase } from '../lib/supabase'
import { errorMessage } from '../lib/tokens'

const PRESETS = [100, 250, 500, 1000]

export default function BonusSheet({ open, onClose, sessionId, players, onGranted, onError }) {
  const [targetId, setTargetId] = useState('') // '' = all
  const [amount, setAmount] = useState(250)
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [history, setHistory] = useState([])

  // Reset + load history when opened
  useEffect(() => {
    if (!open) return
    setTargetId('')
    setAmount(250)
    setReason('')
    loadHistory()
  }, [open, sessionId])

  async function loadHistory() {
    const { data } = await supabase
      .from('b2_bonuses')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(20)
    setHistory(data || [])
  }

  const canSubmit = amount !== 0 && !submitting

  const submit = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    const targets = targetId ? [targetId] : players.map(p => p.id)

    for (const pid of targets) {
      const { error } = await supabase.rpc('b2_award_bonus', {
        p_session_id: sessionId,
        p_player_id: pid,
        p_amount: amount,
        p_reason: reason.trim() || null,
      })
      if (error) {
        setSubmitting(false)
        onError?.(errorMessage(error))
        return
      }
    }

    setSubmitting(false)
    onGranted?.({ count: targets.length, amount })
    setAmount(250)
    setReason('')
    loadHistory()
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="🎁 Bonus">
      <div className="p-5 space-y-5">
        {/* Target */}
        <div>
          <label className="k-label block mb-2">Dla kogo</label>
          <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
            <button
              type="button"
              onClick={() => setTargetId('')}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${
                targetId === ''
                  ? 'bg-amber-brand/[0.12] border-amber-brand/40'
                  : 'bg-white/[0.03] border-white/10'
              }`}
            >
              <div className="w-9 h-9 rounded-lg bg-amber-brand/20 flex items-center justify-center text-lg">🎉</div>
              <div className="flex-1 text-left">
                <div className="text-sm font-semibold text-white">Wszyscy gracze</div>
                <div className="text-[11px] text-slate-400">{players.length} osób</div>
              </div>
            </button>
            {players.map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => setTargetId(p.id)}
                className={`w-full flex items-center gap-3 p-2.5 rounded-xl border transition-all ${
                  targetId === p.id
                    ? 'bg-amber-brand/[0.12] border-amber-brand/40'
                    : 'bg-white/[0.03] border-white/10'
                }`}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-base"
                  style={{ background: p.color }}
                >
                  {p.emoji}
                </div>
                <div className="flex-1 text-left text-sm font-semibold text-white truncate">{p.nick}</div>
                <div className="text-[11px] font-mono text-slate-400">{p.balance.toLocaleString()}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Amount */}
        <div>
          <label className="k-label block mb-2">Ilość punktów (może być ujemna)</label>
          <div className="grid grid-cols-4 gap-2 mb-2">
            {PRESETS.map(v => (
              <button
                key={v}
                type="button"
                onClick={() => setAmount(v)}
                className={`py-2.5 rounded-lg text-xs font-bold transition-all ${
                  amount === v
                    ? 'bg-amber-brand/[0.15] border border-amber-brand/40 text-amber-brand'
                    : 'bg-white/[0.03] border border-white/10 text-slate-300'
                }`}
              >
                +{v}
              </button>
            ))}
          </div>
          <input
            type="number"
            value={amount}
            onChange={e => setAmount(parseInt(e.target.value) || 0)}
            step={50}
            className="w-full px-4 py-3 rounded-xl bg-bg text-white text-center text-xl font-mono font-bold outline-none border border-white/[0.14] focus:border-amber-brand/50"
          />
        </div>

        {/* Reason */}
        <div>
          <label className="k-label block mb-2">Powód (opcjonalny)</label>
          <input
            value={reason}
            onChange={e => setReason(e.target.value)}
            maxLength={60}
            placeholder="np. za pierwszy taniec"
            className="w-full px-4 py-3 rounded-xl bg-bg text-white text-sm outline-none border border-white/[0.14] focus:border-amber-brand/50"
          />
        </div>

        {/* History */}
        {history.length > 0 && (
          <div>
            <div className="k-label mb-2">Ostatnie bonusy</div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {history.map(b => {
                const player = players.find(p => p.id === b.player_id)
                return (
                  <div key={b.id} className="flex items-center gap-2 py-1.5 px-2 text-xs">
                    <span className="truncate flex-1 text-slate-300">
                      {player?.emoji} {player?.nick || '?'}
                      {b.reason && <span className="text-slate-500 italic"> — {b.reason}</span>}
                    </span>
                    <span className={`font-mono font-bold shrink-0 ${b.amount > 0 ? 'text-win' : 'text-loss'}`}>
                      {b.amount > 0 ? '+' : ''}{b.amount}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      <div className="p-5 pt-3 border-t border-white/10 safe-bottom">
        <button
          onClick={submit}
          disabled={!canSubmit}
          className="w-full py-4 rounded-[14px] bg-amber-brand text-black font-bold text-sm uppercase tracking-wider transition-all active:scale-95 shadow-amber disabled:opacity-40"
        >
          {submitting
            ? 'Przyznawanie…'
            : `Przyznaj ${amount > 0 ? '+' : ''}${amount} pts ${targetId ? '1 osobie' : `${players.length} osobom`}`}
        </button>
      </div>
    </BottomSheet>
  )
}
