import { useEffect } from 'react'

/**
 * Usage:
 *   setToast({ kind: 'success', text: 'Win!' })                 // auto-closes
 *   setToast({ kind: 'success', text: 'Bonus!', persistent: true })  // manual close only
 */
export default function Toast({ toast, onClose, duration = 3000 }) {
  const persistent = !!toast?.persistent

  useEffect(() => {
    if (!toast || persistent) return
    const t = setTimeout(() => onClose?.(), duration)
    return () => clearTimeout(t)
  }, [toast, duration, onClose, persistent])

  if (!toast) return null

  const palette = {
    error:   { bg: 'bg-red-500/15', border: 'border-red-500/40', text: 'text-red-200', icon: '⚠️' },
    success: { bg: 'bg-win/15',     border: 'border-win/40',     text: 'text-win',     icon: '✅' },
    info:    { bg: 'bg-white/5',    border: 'border-white/15',   text: 'text-slate-200', icon: 'ℹ️' },
  }[toast.kind || 'info']

  if (persistent) {
    // Modal-like: full-screen backdrop, click-outside to close, X button
    return (
      <div
        className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      >
        <div
          className={`w-full max-w-sm flex items-center gap-3 px-5 py-4 rounded-2xl border ${palette.bg} ${palette.border} ${palette.text} shadow-2xl`}
          onClick={(e) => e.stopPropagation()}
        >
          <span className="text-2xl shrink-0">{toast.icon || palette.icon}</span>
          <span className="flex-1 text-sm font-medium leading-snug">{toast.text}</span>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-xs font-bold transition"
            aria-label="Zamknij"
          >
            ✕
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed left-1/2 -translate-x-1/2 bottom-6 z-[200] max-w-[90%] pointer-events-none">
      <div className={`pointer-events-auto flex items-center gap-3 px-5 py-3 rounded-full border backdrop-blur-xl ${palette.bg} ${palette.border} ${palette.text} shadow-2xl`}>
        <span className="text-lg">{palette.icon}</span>
        <span className="text-sm font-medium">{toast.text}</span>
      </div>
    </div>
  )
}
