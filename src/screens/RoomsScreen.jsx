import { useNavigate } from 'react-router-dom'
import StatusBar from '../components/StatusBar'
import { useProfile } from '../hooks/useProfile'
import { useAuth } from '../hooks/useAuth'
import { useMyRooms } from '../hooks/useMyRooms'

export default function RoomsScreen() {
  const navigate = useNavigate()
  const { profile } = useProfile()
  const { user } = useAuth()
  const { rooms, loading } = useMyRooms(user?.id)

  return (
    <div className="flex-1 flex flex-col bg-bg text-white">
      <StatusBar />

      {/* Header */}
      <div className="px-5 pt-2.5 pb-4 flex items-center gap-3 shrink-0">
        <button
          onClick={() => navigate('/')}
          className="w-9 h-9 rounded-[10px] bg-white/[0.05] border border-white/10 flex items-center justify-center shrink-0"
          aria-label="Edytuj profil"
        >
          <div
            className="w-[22px] h-[22px] rounded-md flex items-center justify-center text-sm"
            style={{ background: profile.color }}
          >
            {profile.emoji}
          </div>
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-[17px] font-bold text-white leading-tight">{profile.nick || 'Gracz'}</div>
          <div className="text-[11px] font-mono text-slate-500 tracking-wider mt-0.5">
            TWOJE POKOJE
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-5">
        {loading && (
          <div className="text-center py-16 text-slate-500 text-sm">Ładowanie…</div>
        )}

        {!loading && rooms.length === 0 && (
          <div className="text-center py-16 px-6">
            <div className="text-[56px] mb-4">🎯</div>
            <h3 className="text-xl font-bold text-white mb-2">Brak pokoi</h3>
            <p className="text-sm text-slate-400 leading-relaxed mb-6">
              Dołącz do istniejącego pokoju przez kod od hosta albo stwórz własny.
            </p>
          </div>
        )}

        {!loading && rooms.length > 0 && (
          <div className="space-y-2.5">
            {rooms.map(r => {
              const s = r.session
              const isHost = s.host_player_id === r.id
              const isLive = s.status === 'open'
              return (
                <button
                  key={s.id}
                  onClick={() => navigate(`/room/${s.id}`)}
                  className="w-full text-left flex items-center gap-3.5 p-3.5 bg-white/[0.03] border border-white/10 rounded-2xl hover:border-amber-brand/40 hover:bg-white/[0.05] transition-all"
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-[28px] shrink-0"
                    style={{ background: 'rgba(234,179,8,0.12)' }}
                  >
                    {s.emoji || '🎯'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <div className="font-bold text-white truncate">{s.room_name}</div>
                      {isHost && (
                        <span className="text-[9px] font-mono font-semibold tracking-wider px-1.5 py-0.5 rounded bg-amber-brand/15 text-amber-brand uppercase">
                          Host
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className={`inline-flex items-center gap-1.5 font-mono tracking-wider ${isLive ? 'text-win' : 'text-slate-500'}`}>
                        {isLive && <span className="w-1.5 h-1.5 rounded-full bg-win animate-pulse" />}
                        {isLive ? 'LIVE' : 'KONIEC'}
                      </span>
                      <span className="text-slate-500">·</span>
                      <span className="font-mono text-slate-400">{s.join_code}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono text-amber-brand font-bold text-sm">{r.balance.toLocaleString()}</div>
                    <div className="text-[10px] font-mono text-slate-500 tracking-wider uppercase">Pts</div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Bottom actions */}
      <div className="px-5 pt-3 pb-6 safe-bottom shrink-0 space-y-2.5 border-t border-white/5 bg-bg">
        <button
          onClick={() => navigate('/join')}
          className="w-full py-3.5 rounded-[14px] bg-white/[0.05] border border-white/10 text-white font-semibold text-sm hover:bg-white/[0.08] transition-all"
        >
          🎟 Dołącz przez kod
        </button>
        <button
          onClick={() => navigate('/create')}
          className="w-full py-4 rounded-[14px] bg-amber-brand text-black font-bold text-sm uppercase tracking-wider transition-all active:scale-95 shadow-amber"
        >
          + Stwórz pokój
        </button>
      </div>
    </div>
  )
}
