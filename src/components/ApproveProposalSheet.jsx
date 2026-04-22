import { useState, useEffect } from 'react'
import BottomSheet from './BottomSheet'
import TimerPicker from './TimerPicker'

export default function ApproveProposalSheet({ open, onClose, question, onConfirm }) {
  const [expiresInSec, setExpiresInSec] = useState(60)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setExpiresInSec(60)
      setSubmitting(false)
    }
  }, [open])

  if (!question) return null

  const submit = async () => {
    setSubmitting(true)
    await onConfirm?.(expiresInSec)
    setSubmitting(false)
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Zaakceptuj propozycję">
      <div className="p-5 space-y-5">
        <div className="text-center">
          <div className="k-label mb-1">Pytanie</div>
          <div className="text-lg font-bold text-white">{question.title}</div>
          {question.description && (
            <p className="text-xs text-slate-400 mt-1">{question.description}</p>
          )}
        </div>

        <TimerPicker value={expiresInSec} onChange={setExpiresInSec} label="Ile czasu na obstawianie?" />
      </div>

      <div className="p-5 pt-3 border-t border-white/10 safe-bottom">
        <button
          onClick={submit}
          disabled={submitting}
          className="w-full py-4 rounded-[14px] bg-win text-black font-bold text-sm uppercase tracking-wider transition-all active:scale-95 disabled:opacity-40"
        >
          {submitting ? 'Uruchamianie…' : '✓ Uruchom zakład'}
        </button>
      </div>
    </BottomSheet>
  )
}
