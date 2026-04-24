import { useEffect, useRef, useState } from 'react'

/**
 * LiveOdds — collapsed by default (small chip), expands into drama view:
 * sparkline + lock-in → live multi + ∆ + projection.
 *
 * History is kept client-side in a ref owned by the parent (BetCard),
 * pushed whenever the live multi changes. Session-only.
 */
export default function LiveOddsPanel({
  myStake,
  lockInMulti,
  currentMulti,
  history = [],
  showMulti = true,
  hasPool = true,
}) {
  const [open, setOpen] = useState(false)

  const liveMulti = hasPool ? currentMulti : lockInMulti
  const delta = liveMulti - lockInMulti
  const up = delta >= 0

  const projection = Math.floor(myStake * liveMulti)
  const lockInProjection = Math.floor(myStake * lockInMulti)
  const projDiff = projection - lockInProjection

  const [tickKey, setTickKey] = useState(0)
  const prevProj = useRef(projection)
  useEffect(() => {
    if (prevProj.current !== projection) {
      setTickKey(k => k + 1)
      prevProj.current = projection
    }
  }, [projection])

  const deltaColor = up ? 'text-win' : 'text-loss'
  const deltaBg = up ? 'bg-win/10' : 'bg-loss/10'

  if (!open) {
    return (
      <div className="px-3 pb-3">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full text-[10px] font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-200 transition-colors py-1.5"
        >
          📈 Szczegóły zakładu ↓
        </button>
      </div>
    )
  }

  return (
    <div className="px-3 pb-3">
      <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-3 space-y-3">
        {/* Multi comparison */}
        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="k-label">Twój mnożnik</div>
            <div className="text-slate-200 font-semibold font-mono text-base mt-0.5">
              ×{lockInMulti.toFixed(2)}
            </div>
          </div>
          <div className="text-slate-600 text-xs pb-1">→</div>
          <div className="text-right">
            <div className="k-label flex items-center justify-end gap-1.5">
              {showMulti && <span className="w-1 h-1 rounded-full bg-amber-brand animate-pulse" />}
              Live
            </div>
            {showMulti ? (
              <div
                key={tickKey}
                className={`font-semibold font-mono text-base mt-0.5 ${deltaColor}`}
                style={{ animation: 'loTick 0.4s ease' }}
              >
                ×{liveMulti.toFixed(2)}
              </div>
            ) : (
              <div className="font-mono font-semibold text-base text-slate-600 mt-0.5">—</div>
            )}
          </div>
          {showMulti && Math.abs(delta) >= 0.01 && (
            <div className={`text-[11px] px-2 py-1 rounded font-bold font-mono ${deltaColor} ${deltaBg}`}>
              {up ? '↑' : '↓'} {Math.abs(delta).toFixed(2)}
            </div>
          )}
        </div>

        {/* Sparkline */}
        <Sparkline points={history} lockInMulti={lockInMulti} />

        {/* Projection */}
        <div className="flex items-baseline justify-between gap-3 pt-2 border-t border-white/5">
          <div>
            <div className="k-label">Jeśli teraz</div>
            <div
              key={tickKey + 'p'}
              className="text-lg font-bold text-amber-brand font-mono mt-0.5"
              style={{ animation: 'loTick 0.4s ease' }}
            >
              ≈{projection.toLocaleString('pl-PL')} pts
            </div>
          </div>
          {showMulti && Math.abs(projDiff) > 0 && (
            <div className={`text-right ${deltaColor}`}>
              <div className="k-label">vs Twój</div>
              <div className="text-sm font-mono font-semibold mt-0.5">
                {up ? '+' : ''}{projDiff.toLocaleString('pl-PL')}
              </div>
            </div>
          )}
        </div>

        <p className="text-[10px] text-slate-500 leading-relaxed">
          Mnożnik żyje — im więcej osób obstawi tę opcję, tym niższy. Ostateczna wygrana z puli w momencie zamknięcia.
        </p>

        <button
          type="button"
          onClick={() => setOpen(false)}
          className="w-full text-[10px] font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-200 transition-colors"
        >
          Zwiń ↑
        </button>
      </div>
    </div>
  )
}

function Sparkline({ points, lockInMulti, width = 300, height = 56 }) {
  if (!points || points.length < 2) {
    return (
      <div className="h-14 flex items-center justify-center text-[10px] text-slate-600 italic">
        Historia mnożnika zbuduje się w miarę ruchu na stole
      </div>
    )
  }

  const allVals = [...points, lockInMulti]
  const min = Math.min(...allVals) * 0.95
  const max = Math.max(...allVals) * 1.05
  const range = max - min || 1
  const step = width / (points.length - 1)
  const toY = (v) => height - ((v - min) / range) * height

  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${i * step} ${toY(p)}`).join(' ')
  const fillPath = `${path} L ${width} ${height} L 0 ${height} Z`
  const last = points[points.length - 1]
  const lockY = toY(lockInMulti)

  const up = last >= lockInMulti
  const stroke = up ? '#4ade80' : '#f87171'

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ display: 'block', width: '100%' }}
    >
      <defs>
        <linearGradient id="loGrad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.35" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fillPath} fill="url(#loGrad)" />
      <path
        d={path}
        stroke={stroke}
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line
        x1="0"
        y1={lockY}
        x2={width}
        y2={lockY}
        stroke="#eab308"
        strokeDasharray="3 3"
        strokeWidth="1"
        opacity="0.5"
      />
      <circle cx="0" cy={lockY} r="3" fill="#eab308" />
      <circle cx={width} cy={toY(last)} r="4" fill={stroke}>
        <animate attributeName="r" values="4;6;4" dur="1.4s" repeatCount="indefinite" />
      </circle>
    </svg>
  )
}
