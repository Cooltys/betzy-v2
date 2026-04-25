import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { supabase } from '../lib/supabase'

const POLL_MS = 5000
const ROTATE_MS = 10000

/**
 * Public TV view — no auth, polling-based, full-screen rotating slides.
 *
 * URL: /tv/:sessionId
 * Query params:
 *   ?qr=hide   — hide the QR slide (default: shown)
 *   ?slide=N   — start on slide N (debug)
 *
 * Keyboard:
 *   ← →       — manual prev/next slide
 *   space     — pause/resume auto-rotate
 *   q         — toggle QR slide visibility
 *   1-9       — jump to slide N
 */
export default function TvScreen() {
  const { sessionId } = useParams()
  const [searchParams] = useSearchParams()
  const initialQrHidden = searchParams.get('qr') === 'hide'

  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [paused, setPaused] = useState(false)
  const [qrHidden, setQrHidden] = useState(initialQrHidden)
  const [tick, setTick] = useState(0)
  const [activeIdx, setActiveIdx] = useState(0)

  // Polling
  useEffect(() => {
    let stopped = false
    const fetchSnapshot = async () => {
      try {
        const { data: snap, error: rpcErr } = await supabase.rpc('b2_tv_snapshot', {
          p_session_id: sessionId,
        })
        if (stopped) return
        if (rpcErr) { setError(rpcErr.message); return }
        setError(null)
        setData(snap)
      } catch (e) {
        if (!stopped) setError(e.message || String(e))
      }
    }
    fetchSnapshot()
    const interval = setInterval(fetchSnapshot, POLL_MS)
    return () => { stopped = true; clearInterval(interval) }
  }, [sessionId])

  // Tick (1s) for live timers
  useEffect(() => {
    const t = setInterval(() => setTick(x => x + 1), 1000)
    return () => clearInterval(t)
  }, [])

  // Slide visibility logic
  const slides = useMemo(() => {
    const out = []
    if (!data) return out

    out.push({ key: 'ranking' })

    const active = (data.questions || []).filter(q => q.status === 'open' || q.status === 'closed')
    if (active.length > 0) out.push({ key: 'active', count: active.length })

    const resolved = (data.questions || []).filter(q => q.status === 'resolved')
    if (resolved.length > 0) out.push({ key: 'results' })

    if (!qrHidden) out.push({ key: 'qr' })

    return out
  }, [data, qrHidden])

  // Auto-rotate
  useEffect(() => {
    if (paused || slides.length <= 1) return
    const t = setInterval(() => setActiveIdx(i => (i + 1) % slides.length), ROTATE_MS)
    return () => clearInterval(t)
  }, [paused, slides.length])

  // Clamp activeIdx if slides shrink
  useEffect(() => {
    if (slides.length === 0) return
    if (activeIdx >= slides.length) setActiveIdx(0)
  }, [slides.length, activeIdx])

  // Keyboard
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight') setActiveIdx(i => (i + 1) % Math.max(1, slides.length))
      else if (e.key === 'ArrowLeft') setActiveIdx(i => (i - 1 + slides.length) % Math.max(1, slides.length))
      else if (e.key === ' ') { e.preventDefault(); setPaused(p => !p) }
      else if (e.key === 'q' || e.key === 'Q') setQrHidden(h => !h)
      else if (/^[1-9]$/.test(e.key)) {
        const n = parseInt(e.key, 10) - 1
        if (n < slides.length) setActiveIdx(n)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [slides.length])

  if (error) {
    return (
      <div className="fixed inset-0 bg-bg flex items-center justify-center">
        <div className="text-center">
          <div className="text-3xl text-loss font-bold mb-2">Błąd ładowania</div>
          <div className="text-sm text-slate-400 font-mono">{error}</div>
        </div>
      </div>
    )
  }
  if (!data) {
    return (
      <div className="fixed inset-0 bg-bg flex items-center justify-center">
        <div className="text-2xl text-slate-500">Ładowanie pokoju…</div>
      </div>
    )
  }

  const slide = slides[activeIdx] || slides[0]
  const session = data.session

  return (
    <div className="fixed inset-0 bg-bg text-white flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-8 py-5 border-b border-white/5">
        <div className="flex items-center gap-4">
          <div className="text-5xl">{session.emoji}</div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">{session.room_name}</h1>
            <div className="flex items-center gap-3 mt-0.5">
              <div className="text-xs font-mono tracking-[0.2em] text-amber-brand uppercase">
                {session.join_code}
              </div>
              <span className="text-xs text-slate-500">·</span>
              <div className="text-xs font-mono text-slate-500">
                {(data.players || []).length} graczy
              </div>
              {session.status !== 'open' && (
                <>
                  <span className="text-xs text-slate-500">·</span>
                  <div className="text-xs font-mono text-loss uppercase">{session.status}</div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {paused && (
            <div className="text-[10px] font-mono uppercase tracking-widest text-warn px-3 py-1.5 rounded border border-warn/40 bg-warn/10">
              ❚❚ Pauza
            </div>
          )}
          <div className="text-4xl font-extrabold tracking-tight">
            betzy<span className="text-amber-brand">.</span>
          </div>
        </div>
      </div>

      {/* Slide viewport */}
      <div className="flex-1 min-h-0 relative overflow-hidden">
        {slide?.key === 'ranking' && <RankingSlide data={data} />}
        {slide?.key === 'active' && <ActiveBetsSlide data={data} tick={tick} />}
        {slide?.key === 'results' && <ResultsSlide data={data} />}
        {slide?.key === 'qr' && <QrSlide session={session} />}
      </div>

      {/* Bottom progress dots */}
      {slides.length > 1 && (
        <div className="flex items-center justify-center gap-2 py-3 border-t border-white/5 shrink-0">
          {slides.map((s, i) => (
            <span
              key={s.key}
              className={`h-1.5 rounded-full transition-all ${
                i === activeIdx ? 'w-10 bg-amber-brand' : 'w-1.5 bg-white/15'
              }`}
            />
          ))}
        </div>
      )}

      {/* Keyboard help — corner */}
      <div className="absolute bottom-2 right-3 text-[10px] font-mono text-slate-700 tracking-wider">
        ← → · SPACE pause · Q toggle QR
      </div>
    </div>
  )
}

// ──────── Ranking ────────
function RankingSlide({ data }) {
  const players = [...(data.players || [])].sort((a, b) => b.balance - a.balance)
  const top3 = players.slice(0, 3)
  const rest = players.slice(3)

  return (
    <div className="absolute inset-0 flex flex-col px-12 py-8">
      <div className="text-[14px] font-mono tracking-[0.3em] text-slate-500 uppercase mb-6">
        Ranking
      </div>

      {/* Top 3 podium-ish */}
      {top3.length > 0 && (
        <div className="grid grid-cols-3 gap-6 mb-8">
          {[1, 0, 2].map((order, idx) => {
            const p = top3[order]
            if (!p) return <div key={idx} />
            const medal = order === 0 ? '🥇' : order === 1 ? '🥈' : '🥉'
            const heightClass = order === 0 ? 'pt-2' : order === 1 ? 'pt-8' : 'pt-12'
            const fontSize = order === 0 ? 'text-7xl' : 'text-5xl'
            return (
              <div key={p.id} className={`flex flex-col items-center ${heightClass}`}>
                <div className="text-6xl mb-2">{medal}</div>
                <div className="text-3xl mb-1">{p.emoji}</div>
                <div className="text-2xl font-bold text-white text-center truncate w-full" style={{ color: p.color }}>
                  {p.nick}
                </div>
                <div className={`${fontSize} font-extrabold text-amber-brand font-mono mt-2 tracking-tight`}>
                  {p.balance.toLocaleString('pl-PL')}
                </div>
                <div className="text-xs font-mono text-slate-500 tracking-wider uppercase">pts</div>
              </div>
            )
          })}
        </div>
      )}

      {/* Rest */}
      {rest.length > 0 && (
        <div className="flex-1 min-h-0 overflow-hidden">
          <div className="grid grid-cols-2 gap-x-12 gap-y-2 text-2xl">
            {rest.slice(0, 12).map((p, i) => (
              <div key={p.id} className="flex items-center justify-between border-b border-white/5 py-2">
                <div className="flex items-center gap-3">
                  <span className="text-slate-500 font-mono w-8">{i + 4}.</span>
                  <span className="text-2xl">{p.emoji}</span>
                  <span className="font-semibold" style={{ color: p.color }}>{p.nick}</span>
                </div>
                <span className="font-mono font-bold text-amber-brand">
                  {p.balance.toLocaleString('pl-PL')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ──────── Active Bets ────────
function ActiveBetsSlide({ data, tick }) {
  const active = (data.questions || []).filter(q => q.status === 'open' || q.status === 'closed')
  const seed = data.session.virtual_seed || 0

  if (active.length === 0) {
    return (
      <div className="absolute inset-0 flex items-center justify-center text-3xl text-slate-500">
        Brak aktywnych zakładów
      </div>
    )
  }

  return (
    <div className="absolute inset-0 flex flex-col px-12 py-8 overflow-hidden">
      <div className="text-[14px] font-mono tracking-[0.3em] text-slate-500 uppercase mb-6">
        Aktywne zakłady
      </div>
      <div className="flex-1 min-h-0 grid gap-6" style={{
        gridTemplateColumns: active.length === 1 ? '1fr' : active.length === 2 ? '1fr 1fr' : 'repeat(auto-fit, minmax(420px, 1fr))',
      }}>
        {active.slice(0, 4).map(q => (
          <ActiveBetCard key={q.id} q={q} data={data} seed={seed} tick={tick} />
        ))}
      </div>
    </div>
  )
}

function ActiveBetCard({ q, data, seed, tick }) {
  const opts = (data.options || []).filter(o => o.question_id === q.id)
  const qBets = (data.bets || []).filter(b => b.question_id === q.id)
  const totalPool = qBets.reduce((s, b) => s + b.amount, 0)
  const optCount = opts.length || 1
  const seedPerOption = seed / optCount

  const expired = q.expires_at && new Date(q.expires_at).getTime() < Date.now()
  const isOpen = q.status === 'open' && !expired

  let timerText = null
  if (isOpen && q.expires_at) {
    const diff = Math.max(0, new Date(q.expires_at).getTime() - Date.now())
    const totalSec = Math.floor(diff / 1000)
    const m = Math.floor(totalSec / 60)
    const s = totalSec % 60
    timerText = `${m}:${String(s).padStart(2, '0')}`
  }

  return (
    <div className={`rounded-2xl border p-6 flex flex-col gap-4 ${
      isOpen ? 'border-amber-brand/30 bg-amber-brand/5' : 'border-slate-600/40 bg-white/[0.02]'
    }`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className={`inline-flex items-center gap-2 text-[10px] font-mono font-semibold tracking-widest px-2 py-1 rounded-full border ${
            isOpen ? 'bg-amber-brand/15 text-amber-brand border-amber-brand/30' : 'bg-slate-500/15 text-slate-300 border-slate-500/30'
          }`}>
            {isOpen && <span className="w-1.5 h-1.5 rounded-full bg-amber-brand animate-pulse" />}
            {isOpen ? 'LIVE' : 'CZEKA NA WYNIK'}
          </div>
          <h3 className="text-3xl font-bold text-white mt-3 leading-tight">{q.title}</h3>
        </div>
        {timerText && (
          <div className="text-5xl font-mono font-bold tracking-wider text-amber-brand shrink-0 tabular-nums">
            {timerText}
          </div>
        )}
      </div>

      <div className="text-base font-mono text-slate-400">
        Pula: <span className="text-white font-bold">{(totalPool + seed).toLocaleString('pl-PL')}</span> pts
      </div>

      <div className="flex-1 min-h-0 space-y-2">
        {opts.map(opt => {
          const optSum = qBets.filter(b => b.option_id === opt.id).reduce((s, b) => s + b.amount, 0)
          const mult = optSum + seedPerOption > 0 ? (totalPool + seed) / (optSum + seedPerOption) : (optCount + 1)
          const pct = totalPool > 0 ? (optSum / totalPool) * 100 : 0
          const showMult = totalPool > 0
          const bettors = new Set(qBets.filter(b => b.option_id === opt.id).map(b => b.player_id)).size

          return (
            <div key={opt.id} className="relative rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
              <div className="absolute inset-y-0 left-0 bg-white/5" style={{ width: `${pct}%` }} />
              <div className="relative flex items-center gap-3 p-4">
                <div className="flex-1 min-w-0">
                  <div className="text-xl font-semibold truncate">{opt.text}</div>
                  <div className="text-sm font-mono text-slate-500 mt-0.5">
                    {optSum.toLocaleString('pl-PL')} pts
                    {bettors > 0 && <span> · {bettors} {bettors === 1 ? 'osoba' : 'osób'}</span>}
                  </div>
                </div>
                <div className="font-mono font-bold text-3xl text-amber-brand shrink-0 tabular-nums">
                  {showMult ? `×${mult.toFixed(2)}` : '—'}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ──────── Recent Results ────────
function ResultsSlide({ data }) {
  const resolved = (data.questions || [])
    .filter(q => q.status === 'resolved')
    .slice(0, 3)

  return (
    <div className="absolute inset-0 flex flex-col px-12 py-8">
      <div className="text-[14px] font-mono tracking-[0.3em] text-slate-500 uppercase mb-6">
        Ostatnie wyniki
      </div>

      <div className="flex-1 min-h-0 grid gap-6" style={{
        gridTemplateColumns: resolved.length === 1 ? '1fr' : resolved.length === 2 ? '1fr 1fr' : '1fr 1fr 1fr',
      }}>
        {resolved.map(q => {
          const winOpt = (data.options || []).find(o => o.id === q.winning_option_id)
          const qBets = (data.bets || []).filter(b => b.question_id === q.id)
          const winnersSet = new Map()
          qBets.filter(b => b.option_id === q.winning_option_id).forEach(b => {
            const p = (data.players || []).find(p => p.id === b.player_id)
            if (!p) return
            const cur = winnersSet.get(p.id) || { player: p, payout: 0, stake: 0 }
            cur.payout += (b.payout_amount || 0)
            cur.stake += b.amount
            winnersSet.set(p.id, cur)
          })
          const winners = Array.from(winnersSet.values()).sort((a, b) => b.payout - a.payout)

          return (
            <div key={q.id} className="rounded-2xl border border-win/30 bg-win/5 p-6 flex flex-col gap-3">
              <div className="text-[10px] font-mono tracking-widest text-win uppercase">Rozstrzygnięty</div>
              <h3 className="text-2xl font-bold leading-tight">{q.title}</h3>
              <div>
                <div className="text-xs text-slate-500 font-mono tracking-wider uppercase mb-1">Wygrała</div>
                <div className="text-3xl font-bold text-win">{winOpt?.text || '?'}</div>
              </div>
              {winners.length > 0 ? (
                <div className="flex-1 min-h-0 space-y-1.5 mt-2">
                  {winners.slice(0, 4).map(w => {
                    const profit = w.payout - w.stake
                    return (
                      <div key={w.player.id} className="flex items-center justify-between text-lg">
                        <div className="flex items-center gap-2 min-w-0">
                          <span>{w.player.emoji}</span>
                          <span className="truncate font-semibold" style={{ color: w.player.color }}>{w.player.nick}</span>
                        </div>
                        <span className={`font-mono font-bold tabular-nums ${profit > 0 ? 'text-win' : 'text-slate-400'}`}>
                          {profit > 0 ? '+' : ''}{profit.toLocaleString('pl-PL')}
                        </span>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-slate-500 italic text-sm mt-2">Nikt nie wytypował</div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ──────── QR ────────
function QrSlide({ session }) {
  const url = `${window.location.origin}/join?code=${encodeURIComponent(session.join_code)}`
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 px-12">
      <div className="text-[14px] font-mono tracking-[0.3em] text-slate-500 uppercase">
        Dołącz do gry
      </div>
      <div className="bg-white p-6 rounded-3xl">
        <QRCodeSVG value={url} size={320} level="M" includeMargin={false} />
      </div>
      <div className="text-center">
        <div className="text-xs font-mono text-slate-500 tracking-wider uppercase mb-1">Kod pokoju</div>
        <div className="text-6xl font-extrabold tracking-[0.15em] text-amber-brand font-mono">
          {session.join_code}
        </div>
      </div>
      <div className="text-base text-slate-400 text-center max-w-md">
        Zeskanuj QR albo wpisz kod ręcznie na <span className="text-white font-semibold">{window.location.host}</span>
      </div>
    </div>
  )
}
