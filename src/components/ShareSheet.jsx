import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import BottomSheet from './BottomSheet'

export default function ShareSheet({ open, onClose, joinCode, roomName, emoji }) {
  const [copied, setCopied] = useState(null) // 'code' | 'link'

  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const link = `${origin}/join?code=${joinCode}`

  const copy = async (what, text) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(what)
      setTimeout(() => setCopied(null), 1500)
    } catch {}
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Zaproś graczy">
      <div className="p-5 space-y-5">
        {/* Room header */}
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-brand/10 flex items-center justify-center text-3xl mx-auto mb-2">
            {emoji || '🎯'}
          </div>
          <div className="text-lg font-bold">{roomName}</div>
        </div>

        {/* QR code */}
        <div className="flex justify-center">
          <div className="p-4 bg-white rounded-2xl">
            <QRCodeSVG value={link} size={200} bgColor="#ffffff" fgColor="#0b1120" level="M" />
          </div>
        </div>

        {/* Code */}
        <div>
          <label className="k-label block mb-2">Kod pokoju</label>
          <button
            type="button"
            onClick={() => copy('code', joinCode)}
            className="w-full flex items-center gap-3 p-4 rounded-xl bg-amber-brand/[0.08] border border-amber-brand/30 hover:bg-amber-brand/[0.12] transition-all"
          >
            <div className="flex-1 text-center font-mono font-bold text-2xl tracking-[0.15em] text-amber-brand">
              {joinCode}
            </div>
            <div className="text-xs text-amber-brand/70 font-semibold uppercase tracking-wider shrink-0">
              {copied === 'code' ? 'Skopiowano!' : 'Kopiuj'}
            </div>
          </button>
        </div>

        {/* Link */}
        <div>
          <label className="k-label block mb-2">Link</label>
          <button
            type="button"
            onClick={() => copy('link', link)}
            className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/10 hover:bg-white/[0.06] transition-all"
          >
            <div className="flex-1 text-left text-xs text-slate-300 font-mono truncate">
              {link}
            </div>
            <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider shrink-0">
              {copied === 'link' ? '✓' : 'Kopiuj'}
            </div>
          </button>
        </div>

        <p className="text-[11px] text-slate-500 text-center leading-relaxed">
          Gracze skanują QR albo wchodzą na link. Wystarczy że wpiszą swój nick i dołączą.
        </p>
      </div>
    </BottomSheet>
  )
}
