import BottomSheet from './BottomSheet'

/**
 * Bottom sheet that shows who staked what on each option of a question.
 * Props:
 *   open, onClose,
 *   question, options (for this question), bets (for this question), players, me
 */
export default function BettorsSheet({ open, onClose, question, options, bets, players = [], me }) {
  if (!question) return null

  const opts = options
    .filter(o => o.question_id === question.id)
    .sort((a, b) => a.position - b.position)

  const playerById = new Map(players.map(p => [p.id, p]))

  return (
    <BottomSheet open={open} onClose={onClose} title="Kto co postawił">
      <div className="p-5 space-y-5">
        <div className="text-center">
          <div className="text-xs font-mono text-slate-500 tracking-wider uppercase mb-1">Zakład</div>
          <div className="text-lg font-bold">{question.title}</div>
        </div>

        {opts.map(opt => {
          const betsOnOpt = bets.filter(b => b.question_id === question.id && b.option_id === opt.id)
          const byPlayer = new Map()
          betsOnOpt.forEach(b => {
            byPlayer.set(b.player_id, (byPlayer.get(b.player_id) || 0) + b.amount)
          })
          const rows = Array.from(byPlayer.entries())
            .map(([pid, amount]) => ({ player: playerById.get(pid), amount }))
            .filter(r => r.player)
            .sort((a, b) => b.amount - a.amount)

          const totalOnOpt = rows.reduce((s, r) => s + r.amount, 0)

          return (
            <div key={opt.id} className="bg-white/[0.03] border border-white/10 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-white/5">
                <div className="font-semibold text-white truncate">{opt.text}</div>
                <div className="shrink-0 text-[11px] font-mono text-slate-400">
                  {totalOnOpt.toLocaleString()} pts · {rows.length} {rows.length === 1 ? 'os.' : 'os.'}
                </div>
              </div>
              {rows.length === 0 ? (
                <div className="px-4 py-3 text-xs text-slate-500 italic">Nikt nie postawił</div>
              ) : (
                <div className="divide-y divide-white/5">
                  {rows.map(({ player, amount }) => {
                    const isMe = player.id === me?.id
                    return (
                      <div key={player.id} className={`flex items-center gap-3 px-4 py-2 ${isMe ? 'bg-amber-brand/[0.04]' : ''}`}>
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-sm shrink-0"
                          style={{ background: player.color }}
                        >
                          {player.emoji}
                        </div>
                        <div className="flex-1 text-sm font-semibold truncate">
                          {player.nick}
                          {isMe && <span className="text-[10px] font-mono text-amber-brand/80 ml-1">(TY)</span>}
                        </div>
                        <div className="font-mono font-bold text-amber-brand shrink-0">{amount.toLocaleString()}</div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </BottomSheet>
  )
}
