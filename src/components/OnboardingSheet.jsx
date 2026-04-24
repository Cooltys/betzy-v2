import { useState } from 'react'

const SLIDES = [
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M3 17l6-6 4 4 8-8" />
        <path d="M17 7h4v4" />
      </svg>
    ),
    title: 'Mnożnik żyje',
    body: 'W Betzy mnożnik nie jest sztywny. Im więcej osób obstawi Twoją opcję — tym niższy mnożnik. Im mniej — tym wyższy.',
    bullets: [
      'Widzisz mnożnik bieżący do samego końca',
      'Końcowy mnożnik = finalna pula ÷ wpłaty na zwycięską opcję',
    ],
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 3" />
      </svg>
    ),
    title: 'Wygrana nie jest zablokowana',
    body: 'To system parimutuel (jak u bukmacherów na wyścigach konnych). Inaczej niż w STS — Twoja wygrana liczy się ze stanu puli w momencie zamknięcia zakładu, a nie w momencie postawienia.',
    bullets: [
      'Widzisz projekcję — „≈ X pts jeśli teraz"',
      'Ostateczna kwota może być wyższa lub niższa',
    ],
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M12 2l2.5 6.5L21 9l-5 4.5 1.5 7L12 17l-5.5 3.5L8 13.5 3 9l6.5-.5z" />
      </svg>
    ),
    title: 'Co zostaje stałe',
    body: 'Tylko Twoja stawka jest zablokowana. Udział % w puli, mnożnik i wygrana — wszystko się rusza, bo inni dokładają po Tobie.',
    bullets: [
      'Stawka — nie zmienisz jej po zatwierdzeniu',
      'Wszystko inne — live do końca rundy',
    ],
  },
]

export default function OnboardingSheet({ onClose }) {
  const [step, setStep] = useState(0)
  const slide = SLIDES[step]
  const last = step === SLIDES.length - 1

  const next = () => {
    if (last) onClose?.()
    else setStep(s => s + 1)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="w-full max-w-sm bg-gradient-to-b from-slate-900 to-[#060a15] rounded-3xl border border-white/10 shadow-2xl p-6 space-y-5">
        <div className="w-14 h-14 rounded-2xl bg-amber-brand/15 border border-amber-brand/30 flex items-center justify-center text-amber-brand mx-auto">
          {slide.icon}
        </div>

        <div className="text-center space-y-2">
          <h3 className="text-xl font-bold text-white leading-tight">{slide.title}</h3>
          <p className="text-sm text-slate-400 leading-relaxed">{slide.body}</p>
        </div>

        <div className="space-y-2">
          {slide.bullets.map((b, i) => (
            <div key={i} className="flex items-start gap-2.5 text-[12px] text-slate-300 leading-snug">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-brand mt-1.5 shrink-0" />
              <span>{b}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-center gap-1.5 pt-2">
          {SLIDES.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === step ? 'w-6 bg-amber-brand' : 'w-1.5 bg-white/15'
              }`}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={next}
          className="w-full py-3.5 rounded-[14px] bg-amber-brand text-black font-bold text-sm uppercase tracking-wider transition-all active:scale-95 shadow-amber"
        >
          {last ? 'Rozumiem, zaczynamy' : 'Dalej'}
        </button>

        {!last && (
          <button
            type="button"
            onClick={onClose}
            className="w-full text-[11px] font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-300 transition-colors"
          >
            Pomiń
          </button>
        )}
      </div>
    </div>
  )
}
