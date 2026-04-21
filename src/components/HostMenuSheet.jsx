import { useState } from 'react'
import BottomSheet from './BottomSheet'
import { supabase } from '../lib/supabase'
import { errorMessage } from '../lib/tokens'

export default function HostMenuSheet({
  open, onClose,
  sessionId,
  players,
  myPlayerId,
  onShare,
  onBonus,
  onError,
  onEnded,
}) {
  const [transferOpen, setTransferOpen] = useState(false)

  const handleTransfer = async (newHostId) => {
    const newHost = players.find(p => p.id === newHostId)
    if (!confirm(`Przekazać hosting graczowi ${newHost?.nick}?`)) return
    const { error } = await supabase.rpc('b2_transfer_host', {
      p_session_id: sessionId,
      p_new_host_player_id: newHostId,
    })
    if (error) onError?.(errorMessage(error))
    else {
      setTransferOpen(false)
      onClose?.()
    }
  }

  const handleEnd = async () => {
    if (!confirm('Zakończyć pokój? Gracze zobaczą podium i ranking końcowy.')) return
    const { error } = await supabase.rpc('b2_end_session', { p_session_id: sessionId })
    if (error) onError?.(errorMessage(error))
    else {
      onEnded?.()
      onClose?.()
    }
  }

  const otherPlayers = players.filter(p => p.id !== myPlayerId)

  return (
    <BottomSheet open={open} onClose={onClose} title="Menu hosta">
      <div className="p-5 space-y-2">
        <MenuItem icon="🔗" label="Zaproś graczy" desc="Kod + QR + link" onClick={() => { onClose?.(); onShare?.() }} />
        <MenuItem icon="🎁" label="Przyznaj bonus" desc="Punkty za coś fajnego" onClick={() => { onClose?.(); onBonus?.() }} />
        <MenuItem
          icon="👑"
          label="Przekaż hosting"
          desc={otherPlayers.length === 0 ? 'Brak innych graczy' : 'Inny gracz zostaje hostem'}
          onClick={() => otherPlayers.length > 0 && setTransferOpen(true)}
          disabled={otherPlayers.length === 0}
        />
        <MenuItem
          icon="🏁"
          label="Zakończ pokój"
          desc="Wszyscy zobaczą podium"
          onClick={handleEnd}
          danger
        />
      </div>

      {/* Transfer host sub-sheet */}
      {transferOpen && (
        <div className="border-t border-white/10 p-5 space-y-2">
          <div className="k-label mb-3">Wybierz nowego hosta</div>
          {otherPlayers.map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => handleTransfer(p.id)}
              className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/10 hover:border-amber-brand/30 transition-all"
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center text-lg shrink-0"
                style={{ background: p.color }}
              >
                {p.emoji}
              </div>
              <div className="flex-1 text-left">
                <div className="text-sm font-semibold text-white">{p.nick}</div>
                <div className="text-[11px] font-mono text-slate-400">{p.balance.toLocaleString()} pts</div>
              </div>
              <div className="text-lg">→</div>
            </button>
          ))}
          <button
            type="button"
            onClick={() => setTransferOpen(false)}
            className="w-full py-2 text-xs text-slate-500 hover:text-slate-300"
          >
            Anuluj
          </button>
        </div>
      )}
    </BottomSheet>
  )
}

function MenuItem({ icon, label, desc, onClick, danger, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all ${
        disabled
          ? 'bg-white/[0.02] border border-white/5 opacity-40 cursor-not-allowed'
          : danger
          ? 'bg-loss/[0.05] border border-loss/20 hover:bg-loss/[0.1] hover:border-loss/30'
          : 'bg-white/[0.03] border border-white/10 hover:bg-white/[0.06]'
      }`}
    >
      <div className="text-2xl shrink-0">{icon}</div>
      <div className="flex-1 text-left">
        <div className={`text-sm font-semibold ${danger ? 'text-loss' : 'text-white'}`}>{label}</div>
        <div className="text-[11px] text-slate-400 mt-0.5">{desc}</div>
      </div>
    </button>
  )
}
