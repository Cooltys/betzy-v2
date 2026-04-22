import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import StatusBar from '../components/StatusBar'
import { EMOJI_LIST } from '../lib/tokens'
import { useProfile } from '../hooks/useProfile'

const COLORS = ['#eab308', '#f97316', '#ec4899', '#a855f7', '#3b82f6', '#14b8a6', '#84cc16', '#f5f5f4']

export default function SplashScreen() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { profile, setProfile } = useProfile()
  const [nick, setNick] = useState(profile.nick || '')
  const [emoji, setEmoji] = useState(profile.emoji || '🎯')
  const [color, setColor] = useState(profile.color || '#eab308')

  const incomingCode = searchParams.get('code')

  // If visitor arrives with ?code=... and already has a profile,
  // send them straight to join. Otherwise, after they set profile, go to join.
  useEffect(() => {
    if (incomingCode && profile.nick && profile.nick.length >= 2) {
      navigate(`/join?code=${incomingCode}`, { replace: true })
    }
  }, [incomingCode, profile.nick, navigate])

  const canContinue = nick.trim().length >= 2

  const go = () => {
    if (!canContinue) return
    setProfile({ nick: nick.trim(), emoji, color })
    if (incomingCode) {
      navigate(`/join?code=${incomingCode}`)
    } else {
      navigate('/rooms')
    }
  }

  return (
    <div className="flex-1 flex flex-col bg-bg text-white min-h-0">
      <StatusBar />

      <div className="flex-1 overflow-y-auto min-h-0 px-5 pt-5 pb-6">
        {/* Logo + tagline */}
        <div className="text-center py-8 pb-6">
          <div
            className="font-extrabold text-white"
            style={{ fontSize: 40, letterSpacing: '-0.04em' }}
          >
            betzy<span className="text-amber-brand">.</span>
          </div>
          <div className="k-label mt-1.5">prywatne pokoje zakładów</div>
        </div>

        {/* Avatar preview */}
        <div className="text-center mb-6">
          <div
            className="w-[110px] h-[110px] rounded-[32px] mx-auto mb-3.5 flex items-center justify-center text-[54px] transition-colors"
            style={{ background: color, boxShadow: `0 16px 40px -14px ${color}90` }}
          >
            {emoji}
          </div>
          <div className="text-[22px] font-bold text-white">
            {nick || 'Twój nick'}
          </div>
        </div>

        {/* Nick */}
        <div className="mb-[18px]">
          <label className="k-label block mb-2">Jak się nazywasz?</label>
          <input
            type="text"
            value={nick}
            maxLength={16}
            onChange={(e) => setNick(e.target.value)}
            placeholder="np. Wojtek"
            className="w-full px-4 py-[14px] rounded-xl bg-bg text-white text-base outline-none border border-white/[0.14] focus:border-amber-brand/50 transition-colors"
          />
        </div>

        {/* Emoji */}
        <div className="mb-[18px]">
          <label className="k-label block mb-2">Emoji</label>
          <div className="grid grid-cols-9 gap-1.5 p-2.5 bg-white/[0.03] border border-white/[0.08] rounded-xl">
            {EMOJI_LIST.map(e => (
              <button
                key={e}
                type="button"
                onClick={() => setEmoji(e)}
                className={`aspect-square rounded-lg text-lg transition-all ${
                  emoji === e
                    ? 'bg-amber-brand/[0.12] border border-amber-brand/35'
                    : 'border border-transparent hover:bg-white/[0.05]'
                }`}
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        {/* Color */}
        <div className="mb-[18px]">
          <label className="k-label block mb-2">Kolor</label>
          <div className="flex gap-2.5 px-0.5 py-1">
            {COLORS.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className="w-9 h-9 rounded-[10px] transition-all"
                style={{
                  background: c,
                  border: color === c ? '3px solid #fff' : '3px solid transparent',
                }}
                aria-label={`Kolor ${c}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="shrink-0 px-5 pt-3.5 pb-6 safe-bottom bg-bg border-t border-white/5">
        <button
          onClick={go}
          disabled={!canContinue}
          className="w-full py-4 rounded-[14px] bg-amber-brand text-black font-bold text-sm uppercase tracking-wider transition-all active:scale-95 shadow-amber disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
        >
          Wejdź do pokoju
        </button>
      </div>
    </div>
  )
}
