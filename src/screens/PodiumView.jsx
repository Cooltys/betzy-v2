import { useNavigate } from 'react-router-dom'
import StatusBar from '../components/StatusBar'

export default function PodiumView({ session, players, startingBalance, me }) {
  const navigate = useNavigate()
  const sorted = [...players].sort((a, b) => b.balance - a.balance)
  const top3 = sorted.slice(0, 3)
  const rest = sorted.slice(3)

  const myRank = me ? sorted.findIndex(p => p.id === me.id) + 1 : null

  return (
    <div className="flex-1 flex flex-col bg-bg text-white">
      <StatusBar />

      <div className="px-5 pt-2.5 pb-4 flex items-center gap-3 shrink-0 border-b border-white/5">
        <button
          onClick={() => navigate('/rooms')}
          className="w-9 h-9 rounded-[10px] bg-white/[0.05] border border-white/10 flex items-center justify-center"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <div>
          <div className="text-[15px] font-bold">{session.room_name}</div>
          <div className="text-[11px] font-mono text-slate-500 tracking-wider mt-0.5">POKÓJ ZAKOŃCZONY</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {/* Winner banner */}
        {top3[0] && (
          <div className="text-center py-6">
            <div className="text-[10px] font-mono text-amber-brand/70 tracking-[0.25em] uppercase mb-2">Zwycięzca</div>
            <div className="relative inline-block">
              <div
                className="w-24 h-24 rounded-3xl flex items-center justify-center text-[44px] mx-auto"
                style={{ background: top3[0].color, boxShadow: `0 20px 50px -12px ${top3[0].color}80` }}
              >
                {top3[0].emoji}
              </div>
              <div className="absolute -top-2 -right-2 text-3xl">👑</div>
            </div>
            <div className="text-2xl font-bold text-white mt-3">{top3[0].nick}</div>
            <div className="text-lg font-mono text-amber-brand font-bold mt-1">
              {top3[0].balance.toLocaleString()} pts
            </div>
          </div>
        )}

        {/* Podium 2-3 */}
        {top3.length > 1 && (
          <div className="grid grid-cols-2 gap-3">
            {top3.slice(1).map((p, i) => (
              <div key={p.id} className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 text-center">
                <div className="text-2xl mb-1">{i === 0 ? '🥈' : '🥉'}</div>
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl mx-auto"
                  style={{ background: p.color }}
                >
                  {p.emoji}
                </div>
                <div className="text-sm font-semibold text-white mt-2 truncate">{p.nick}</div>
                <div className="text-xs font-mono text-amber-brand mt-0.5">
                  {p.balance.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Rest */}
        {rest.length > 0 && (
          <div>
            <div className="k-label mb-2 px-1">Pełny ranking</div>
            <div className="space-y-1">
              {rest.map((p, i) => {
                const profit = p.balance - startingBalance
                const isMe = me?.id === p.id
                return (
                  <div
                    key={p.id}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ${
                      isMe ? 'bg-amber-brand/5 border border-amber-brand/20' : 'bg-white/[0.02]'
                    }`}
                  >
                    <div className="w-6 text-center text-slate-500 font-mono text-sm">#{i + 4}</div>
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0"
                      style={{ background: p.color }}
                    >
                      {p.emoji}
                    </div>
                    <div className="flex-1 text-sm font-semibold truncate">
                      {p.nick} {isMe && <span className="text-[10px] font-mono text-amber-brand/70">(TY)</span>}
                    </div>
                    <div className={`text-[11px] font-mono ${profit > 0 ? 'text-win' : profit < 0 ? 'text-loss' : 'text-slate-500'}`}>
                      {profit > 0 ? '+' : ''}{profit.toLocaleString()}
                    </div>
                    <div className="font-mono font-bold text-amber-brand text-sm">
                      {p.balance.toLocaleString()}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* My result */}
        {myRank && (
          <div className="bg-gradient-to-b from-amber-brand/[0.08] to-transparent border border-amber-brand/25 rounded-2xl p-5 text-center">
            <div className="k-label text-amber-brand/80 mb-1">Twój wynik</div>
            <div className="text-3xl font-bold text-white">#{myRank}</div>
            <div className="text-lg font-mono text-amber-brand mt-1 font-bold">
              {me.balance.toLocaleString()} pts
            </div>
            <div className={`text-sm font-mono mt-1 ${
              me.balance > startingBalance ? 'text-win' :
              me.balance < startingBalance ? 'text-loss' : 'text-slate-500'
            }`}>
              {me.balance > startingBalance ? '+' : ''}{(me.balance - startingBalance).toLocaleString()} pts
            </div>
          </div>
        )}
      </div>

      <div className="p-5 safe-bottom shrink-0">
        <button
          onClick={() => navigate('/rooms')}
          className="w-full py-4 rounded-[14px] bg-amber-brand text-black font-bold text-sm uppercase tracking-wider transition-all active:scale-95 shadow-amber"
        >
          Do listy pokoi
        </button>
      </div>
    </div>
  )
}
