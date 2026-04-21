import { useEffect } from 'react'

/**
 * Usage:
 *   const [toast, setToast] = useState(null)
 *   <Toast toast={toast} onClose={() => setToast(null)} />
 *   setToast({ kind: 'error', text: 'Nick zajęty' })
 */
export default function Toast({ toast, onClose, duration = 3000 }) {
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => onClose?.(), duration)
    return () => clearTimeout(t)
  }, [toast, duration, onClose])

  if (!toast) return null

  const palette = {
    error:   { bg: 'bg-red-500/15', border: 'border-red-500/40', text: 'text-red-200', icon: '⚠️' },
    success: { bg: 'bg-win/15',     border: 'border-win/40',     text: 'text-win',     icon: '✅' },
    info:    { bg: 'bg-white/5',    border: 'border-white/15',   text: 'text-slate-200', icon: 'ℹ️' },
  }[toast.kind || 'info']

  return (
    <div className="fixed left-1/2 -translate-x-1/2 bottom-6 z-[200] max-w-[90%] pointer-events-none">
      <div className={`pointer-events-auto flex items-center gap-3 px-5 py-3 rounded-full border backdrop-blur-xl ${palette.bg} ${palette.border} ${palette.text} shadow-2xl`}>
        <span className="text-lg">{palette.icon}</span>
        <span className="text-sm font-medium">{toast.text}</span>
      </div>
    </div>
  )
}
