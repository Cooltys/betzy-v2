import { useEffect } from 'react'

/**
 * Bottom sheet modal. Slides up from bottom on mobile,
 * centers on desktop. Click outside or Esc to close.
 */
export default function BottomSheet({ open, onClose, title, children, maxHeight = '85vh' }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-[400px] bg-bg border-t sm:border border-white/10 sm:rounded-2xl rounded-t-3xl overflow-hidden flex flex-col"
        style={{ maxHeight, animation: 'slideUp .25s cubic-bezier(.2,.9,.3,1)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* drag handle (mobile visual only) */}
        <div className="flex justify-center pt-2 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {title && (
          <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
            <h3 className="text-base font-bold">{title}</h3>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:bg-white/10"
            >
              ✕
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
