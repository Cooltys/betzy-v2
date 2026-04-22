import { useEffect, useState } from 'react'

/**
 * Bet card — 3 states:
 *   - open: amber, timer, options with multipliers, CTA "Postaw"
 *   - closed: slate, "Czeka na wynik", host can resolve
 *   - resolved: green/red, own result, all winners list
 *
 * Multipliers are computed locally:
 *   optionMultiplier = (totalPool + seed) / (optionSum + seed/optCount)
 *
 * Props:
 *   question, options, bets, seed, isHost, me,
 *   onOpenStake(optionId), onResolve(optionId), onClose, onCancel
 */
export default function BetCard({ question, options, bets, seed, isHost, me, onOpenStake, onResolve, onClose, onCancel, onRevert }) {
  const q = question
  const qOpts = options.filter(o => o.question_id === q.id).sort((a, b) => a.position - b.position)
  const qBets = bets.filter(b => b.question_id === q.id)
  const totalPool = qBets.reduce((s, b) => s + b.amount, 0)
  const optCount = qOpts.length || 1
  const seedPerOption = seed / optCount

  // Resolved/cancelled bets are collapsed by default
  const [expanded, setExpanded] = useState(false)

  // Tick every second while open so we detect expiry without a manual refresh
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (q.status !== 'open' || !q.expires_at) return
    const tick = () => setNow(Date.now())
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [q.status, q.expires_at])

  // Effective status: if open but expired, show as 'closed'
  const isExpired = q.expires_at && new Date(q.expires_at).getTime() < now
  const effStatus = q.status === 'open' && isExpired ? 'closed' : q.status

  const myBets = qBets.filter(b => b.player_id === me?.id)
  const myStaked = myBets.reduce((s, b) => s + b.amount, 0)

  // Tailwind palette per state
  const palette = {
    open: {
      border: 'border-amber-brand/30',
      bg: 'bg-white/[0.03]',
      accent: 'text-amber-brand',
      tag: 'bg-amber-brand/15 text-amber-brand border-amber-brand/30',
      tagText: 'LIVE',
    },
    closed: {
      border: 'border-slate-600/40',
      bg: 'bg-white/[0.02]',
      accent: 'text-slate-300',
      tag: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
      tagText: 'CZEKA NA WYNIK',
    },
    resolved: {
      border: 'border-win/30',
      bg: 'bg-win/[0.05]',
      accent: 'text-win',
      tag: 'bg-win/15 text-win border-win/30',
      tagText: 'ROZSTRZYGNIĘTY',
    },
    cancelled: {
      border: 'border-white/10',
      bg: 'bg-white/[0.02]',
      accent: 'text-slate-500',
      tag: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
      tagText: 'ANULOWANY',
    },
  }[effStatus] || { border: 'border-white/10', bg: 'bg-white/[0.02]', accent: 'text-slate-400', tag: 'bg-slate-500/10 text-slate-500 border-slate-500/20', tagText: effStatus.toUpperCase() }

  return (
    <div className={`rounded-2xl border ${palette.border} ${palette.bg} p-4 space-y-3`}>
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className={`inline-flex items-center gap-1.5 text-[9px] font-mono font-semibold tracking-wider px-2 py-0.5 rounded-full border ${palette.tag}`}>
            {effStatus === 'open' && <span className="w-1 h-1 rounded-full bg-amber-brand animate-pulse" />}
            {palette.tagText}
          </div>
          <h3 className="text-[17px] font-bold text-white mt-2 leading-tight">{q.title}</h3>
          {q.description && (
            <p className="text-xs text-slate-400 mt-1 leading-snug">{q.description}</p>
          )}
        </div>
        {effStatus === 'open' && q.expires_at && (
          <CountdownTimer expiresAt={q.expires_at} />
        )}
      </div>

      {/* My staked banner */}
      {myStaked > 0 && effStatus === 'open' && (
        <div className="text-[11px] font-mono text-amber-brand/80 tracking-wide">
          Postawiłeś {myStaked.toLocaleString()} pts
        </div>
      )}

      {/* Compact resolved summary (collapsed by default) */}
      {effStatus === 'resolved' && !expanded && (
        <CompactResolvedSummary
          qOpts={qOpts}
          winningOptionId={q.winning_option_id}
          myBets={myBets}
          myStaked={myStaked}
          onExpand={() => setExpanded(true)}
        />
      )}

      {/* Cancelled compact note */}
      {effStatus === 'cancelled' && !expanded && (
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="text-slate-400">Zakład anulowany — stawki zwrócone</span>
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="text-slate-500 hover:text-slate-300 font-semibold uppercase tracking-wider"
          >
            Pokaż opcje ↓
          </button>
        </div>
      )}

      {/* Full options list — always for open/closed, only when expanded for resolved/cancelled */}
      {(effStatus === 'open' || effStatus === 'closed' || expanded) && (
      <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
        {qOpts.map(opt => {
          const optSum = qBets.filter(b => b.option_id === opt.id).reduce((s, b) => s + b.amount, 0)
          const mult = optSum + seedPerOption > 0
            ? ((totalPool + seed) / (optSum + seedPerOption))
            : (optCount + 1)
          const pct = totalPool > 0 ? (optSum / totalPool) * 100 : 0
          const myOnOpt = myBets.filter(b => b.option_id === opt.id).reduce((s, b) => s + b.amount, 0)
          const isWinning = effStatus === 'resolved' && q.winning_option_id === opt.id
          const iMissed = effStatus === 'resolved' && q.winning_option_id !== opt.id && myOnOpt > 0
          const canBet = effStatus === 'open' && me && me.balance > 0

          return (
            <div key={opt.id} className={`relative rounded-xl overflow-hidden border ${
              isWinning ? 'border-win/50 bg-win/10' :
              iMissed ? 'border-loss/30 bg-loss/5' :
              myOnOpt > 0 ? 'border-amber-brand/40 bg-amber-brand/5' :
              'border-white/10 bg-white/[0.02]'
            }`}>
              {/* Stake proportion bar */}
              {effStatus !== 'resolved' && (
                <div
                  className="absolute inset-y-0 left-0 bg-white/5 pointer-events-none"
                  style={{ width: `${pct}%` }}
                  aria-hidden
                />
              )}
              <div
                role={canBet ? 'button' : undefined}
                tabIndex={canBet ? 0 : undefined}
                onClick={() => canBet && onOpenStake?.(opt.id)}
                onKeyDown={canBet ? (e) => { if (e.key === 'Enter' || e.key === ' ') onOpenStake?.(opt.id) } : undefined}
                className={`relative w-full flex items-center gap-3 p-3 text-left ${canBet ? 'cursor-pointer' : ''}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-semibold text-white truncate">{opt.text}</span>
                    {isWinning && <span className="text-[10px] font-mono text-win tracking-wider">WYGRANA</span>}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-[11px] font-mono text-slate-400">
                    <span>{optSum.toLocaleString()} pts</span>
                    {myOnOpt > 0 && (
                      <span className="text-amber-brand">Ty: {myOnOpt.toLocaleString()}</span>
                    )}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className={`font-mono font-bold text-lg ${palette.accent}`}>
                    ×{mult.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Host resolve button (when closed) */}
              {effStatus === 'closed' && isHost && (
                <div className="px-3 pb-3">
                  <button
                    type="button"
                    onClick={() => onResolve?.(opt.id)}
                    className="w-full py-2 rounded-lg bg-win/20 border border-win/40 text-win text-xs font-bold uppercase tracking-wider hover:bg-win/30 transition-colors"
                  >
                    🏆 Wygrała ta opcja
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
      )}

      {/* Collapse back button for resolved/cancelled when expanded */}
      {(effStatus === 'resolved' || effStatus === 'cancelled') && expanded && (
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="w-full text-center text-[11px] text-slate-500 hover:text-slate-300 font-semibold uppercase tracking-wider py-1"
        >
          Zwiń ↑
        </button>
      )}

      {/* Host actions for open/closed */}
      {isHost && (effStatus === 'open' || effStatus === 'closed') && (
        <div className="flex gap-2 pt-2 border-t border-white/5">
          {effStatus === 'open' && (
            <button
              onClick={onClose}
              className="flex-1 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-xs font-semibold text-slate-300 hover:bg-white/[0.06] transition-colors"
            >
              Zamknij
            </button>
          )}
          <button
            onClick={onCancel}
            className="flex-1 py-2 rounded-lg bg-loss/10 border border-loss/30 text-xs font-semibold text-loss hover:bg-loss/20 transition-colors"
          >
            Anuluj (zwrot stawek)
          </button>
        </div>
      )}

      {/* Resolved — personal result */}
      {effStatus === 'resolved' && myStaked > 0 && (
        <ResolvedResult myBets={myBets} winningOptionId={q.winning_option_id} />
      )}

      {/* Host: revert resolution */}
      {effStatus === 'resolved' && isHost && onRevert && (
        <button
          type="button"
          onClick={onRevert}
          className="w-full py-2 rounded-lg bg-white/[0.03] border border-white/10 text-[11px] font-semibold text-slate-400 hover:bg-white/[0.06] hover:text-slate-200 transition-colors"
        >
          ↻ Cofnij wynik (pomyłka)
        </button>
      )}
    </div>
  )
}

function ResolvedResult({ myBets, winningOptionId }) {
  const myStaked = myBets.reduce((s, b) => s + b.amount, 0)
  const myPayout = myBets
    .filter(b => b.option_id === winningOptionId)
    .reduce((s, b) => s + (b.payout_amount || 0), 0)
  const diff = myPayout - myStaked

  if (diff > 0) {
    return (
      <div className="text-center py-2 bg-win/10 border border-win/30 rounded-xl">
        <div className="text-[10px] font-mono text-win/70 tracking-wider uppercase">Wygrałeś</div>
        <div className="text-xl font-bold text-win mt-0.5">+{diff.toLocaleString()} pts</div>
      </div>
    )
  }
  if (diff === 0) {
    return (
      <div className="text-center py-2 bg-slate-500/10 border border-slate-500/20 rounded-xl">
        <div className="text-xs text-slate-400">±0 pts</div>
      </div>
    )
  }
  return (
    <div className="text-center py-2 bg-loss/10 border border-loss/30 rounded-xl">
      <div className="text-[10px] font-mono text-loss/70 tracking-wider uppercase">Straciłeś</div>
      <div className="text-xl font-bold text-loss mt-0.5">{diff.toLocaleString()} pts</div>
    </div>
  )
}

function CompactResolvedSummary({ qOpts, winningOptionId, myBets, myStaked, onExpand }) {
  const winOpt = qOpts.find(o => o.id === winningOptionId)
  const myPayout = myBets
    .filter(b => b.option_id === winningOptionId)
    .reduce((s, b) => s + (b.payout_amount || 0), 0)
  const diff = myPayout - myStaked

  let myLine = null
  if (myStaked === 0) {
    myLine = <span className="text-slate-500">Nie brałeś udziału</span>
  } else if (diff > 0) {
    myLine = <span className="text-win font-mono font-bold">+{diff.toLocaleString()} pts</span>
  } else if (diff < 0) {
    myLine = <span className="text-loss font-mono font-bold">{diff.toLocaleString()} pts</span>
  } else {
    myLine = <span className="text-slate-400 font-mono">±0 pts</span>
  }

  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-slate-500 shrink-0">Wygrała:</span>
          <span className="text-win font-bold truncate">{winOpt?.text || '?'}</span>
        </div>
        <div className="mt-1">{myLine}</div>
      </div>
      <button
        type="button"
        onClick={onExpand}
        className="shrink-0 text-slate-500 hover:text-slate-300 font-semibold uppercase tracking-wider"
      >
        Szczegóły ↓
      </button>
    </div>
  )
}

function CountdownTimer({ expiresAt }) {
  const [diff, setDiff] = useState(() => Math.max(0, new Date(expiresAt).getTime() - Date.now()))

  useEffect(() => {
    const tick = () => setDiff(Math.max(0, new Date(expiresAt).getTime() - Date.now()))
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [expiresAt])

  if (diff <= 0) {
    return (
      <div className="shrink-0 text-[10px] font-mono tracking-wider text-loss uppercase">
        Czas minął
      </div>
    )
  }

  const totalSec = Math.floor(diff / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  const urgent = diff < 30000
  const warning = diff < 60000 && !urgent

  const timeStr = h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`

  return (
    <div className={`shrink-0 font-mono font-bold tracking-wider ${
      urgent ? 'text-loss text-xl animate-pulse' :
      warning ? 'text-warn text-lg' :
      'text-amber-brand text-sm'
    }`}>
      {timeStr}
    </div>
  )
}
