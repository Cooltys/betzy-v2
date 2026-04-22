/**
 * Timer picker with presets from seconds to hours + custom h/min inputs.
 * Controlled: value = seconds, onChange(seconds)
 */
const PRESETS = [
  { label: '30s', sec: 30 },
  { label: '1 min', sec: 60 },
  { label: '3 min', sec: 180 },
  { label: '5 min', sec: 300 },
  { label: '10 min', sec: 600 },
  { label: '30 min', sec: 1800 },
  { label: '1 h', sec: 3600 },
  { label: '3 h', sec: 3 * 3600 },
  { label: '6 h', sec: 6 * 3600 },
  { label: '12 h', sec: 12 * 3600 },
  { label: '24 h', sec: 24 * 3600 },
]

export default function TimerPicker({ value, onChange, label = 'Czas na obstawianie' }) {
  const hours = Math.floor(value / 3600)
  const minutes = Math.floor((value % 3600) / 60)
  const isPreset = PRESETS.some(p => p.sec === value)

  const setH = (h) => {
    const nh = Math.max(0, Math.min(48, parseInt(h) || 0))
    onChange(nh * 3600 + minutes * 60)
  }
  const setM = (m) => {
    const nm = Math.max(0, Math.min(59, parseInt(m) || 0))
    onChange(hours * 3600 + nm * 60)
  }

  return (
    <div>
      <label className="k-label block mb-2">{label}</label>
      <div className="grid grid-cols-4 gap-2">
        {PRESETS.map(p => (
          <button
            key={p.sec}
            type="button"
            onClick={() => onChange(p.sec)}
            className={`py-2.5 rounded-lg text-xs font-bold transition-all ${
              value === p.sec
                ? 'bg-amber-brand/[0.15] border border-amber-brand/50 text-amber-brand'
                : 'bg-white/[0.03] border border-white/10 text-slate-300'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className={`mt-3 p-2.5 rounded-lg border flex items-center gap-3 ${
        !isPreset
          ? 'bg-amber-brand/[0.08] border-amber-brand/30'
          : 'bg-white/[0.02] border-white/10'
      }`}>
        <label className="text-[11px] text-slate-500 font-mono uppercase tracking-wider shrink-0">Własny:</label>
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            min="0"
            max="48"
            value={hours}
            onChange={e => setH(e.target.value)}
            className="w-14 px-2 py-1 rounded-md bg-bg text-center text-sm font-mono font-bold outline-none border border-white/[0.14] focus:border-amber-brand/50"
          />
          <span className="text-xs text-slate-400">h</span>
        </div>
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            min="0"
            max="59"
            value={minutes}
            onChange={e => setM(e.target.value)}
            className="w-14 px-2 py-1 rounded-md bg-bg text-center text-sm font-mono font-bold outline-none border border-white/[0.14] focus:border-amber-brand/50"
          />
          <span className="text-xs text-slate-400">min</span>
        </div>
      </div>
    </div>
  )
}
