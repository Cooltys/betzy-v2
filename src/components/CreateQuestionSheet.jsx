import { useState } from 'react'
import BottomSheet from './BottomSheet'
import TimerPicker from './TimerPicker'
import { supabase } from '../lib/supabase'
import { errorMessage } from '../lib/tokens'

export default function CreateQuestionSheet({ open, onClose, sessionId, isHost = true, onCreated, onError }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [options, setOptions] = useState(['', ''])
  const [expiresInSec, setExpiresInSec] = useState(60)
  const [submitting, setSubmitting] = useState(false)

  const canSubmit = title.trim().length >= 3 &&
    options.filter(o => o.trim().length > 0).length >= 2

  const reset = () => {
    setTitle('')
    setDescription('')
    setOptions(['', ''])
    setExpiresInSec(60)
  }

  const updateOption = (idx, val) => {
    setOptions(prev => {
      const next = [...prev]
      next[idx] = val
      // Auto-grow: if last is non-empty, append an empty field
      const lastNonEmpty = next.findLastIndex(o => o.trim().length > 0)
      if (lastNonEmpty === next.length - 1) next.push('')
      // Shrink trailing empties beyond 1 (but keep at least 2 fields)
      while (next.length > 2) {
        const len = next.length
        if (!next[len - 1].trim() && !next[len - 2].trim()) next.pop()
        else break
      }
      return next
    })
  }

  const submit = async () => {
    if (!canSubmit || submitting) return
    setSubmitting(true)
    const cleanOptions = options.map(o => o.trim()).filter(o => o.length > 0)
    const { data, error } = await supabase.rpc('b2_create_question', {
      p_session_id: sessionId,
      p_title: title.trim(),
      p_description: description.trim() || null,
      p_options: cleanOptions,
      p_expires_in_sec: expiresInSec,
    })
    setSubmitting(false)
    if (error) {
      onError?.(errorMessage(error))
      return
    }
    reset()
    onCreated?.(data)
  }

  return (
    <BottomSheet open={open} onClose={onClose} title={isHost ? 'Nowe pytanie' : 'Zaproponuj pytanie'}>
      <div className="p-5 space-y-4">
        {/* Title */}
        <div>
          <label className="k-label block mb-2">Pytanie</label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            maxLength={80}
            placeholder="np. Kto pierwszy opróżni kufel?"
            className="w-full px-4 py-3 rounded-xl bg-bg text-white text-base outline-none border border-white/[0.14] focus:border-amber-brand/50"
          />
        </div>

        {/* Description */}
        <div>
          <label className="k-label block mb-2">Opis (opcjonalny)</label>
          <input
            value={description}
            onChange={e => setDescription(e.target.value)}
            maxLength={120}
            placeholder="Dodatkowy kontekst…"
            className="w-full px-4 py-3 rounded-xl bg-bg text-white text-sm outline-none border border-white/[0.14] focus:border-amber-brand/50"
          />
        </div>

        {/* Options */}
        <div>
          <label className="k-label block mb-2">Opcje (min. 2)</label>
          <div className="space-y-2">
            {options.map((opt, i) => (
              <input
                key={i}
                value={opt}
                onChange={e => updateOption(i, e.target.value)}
                maxLength={40}
                placeholder={`Opcja ${i + 1}`}
                className="w-full px-4 py-2.5 rounded-xl bg-bg text-white text-sm outline-none border border-white/[0.14] focus:border-amber-brand/50"
              />
            ))}
          </div>
        </div>

        {/* Timer — only for host. Player proposals get timer set by host at approval. */}
        {isHost ? (
          <TimerPicker value={expiresInSec} onChange={setExpiresInSec} />
        ) : (
          <div className="p-3 rounded-xl bg-amber-brand/[0.06] border border-amber-brand/20 text-[11px] text-amber-brand/80 leading-relaxed">
            💡 Twoja propozycja pójdzie do hosta. Jeśli ją zaakceptuje, ustawi czas i uruchomi pytanie dla wszystkich.
          </div>
        )}
      </div>

      <div className="p-5 pt-3 border-t border-white/10 safe-bottom">
        <button
          onClick={submit}
          disabled={!canSubmit || submitting}
          className="w-full py-4 rounded-[14px] bg-amber-brand text-black font-bold text-sm uppercase tracking-wider transition-all active:scale-95 shadow-amber disabled:opacity-40"
        >
          {submitting ? (isHost ? 'Tworzenie…' : 'Wysyłanie…') : (isHost ? 'Uruchom pytanie' : 'Zaproponuj hostowi')}
        </button>
      </div>
    </BottomSheet>
  )
}
