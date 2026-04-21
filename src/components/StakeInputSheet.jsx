import { useState, useEffect, useMemo } from 'react'
import BottomSheet from './BottomSheet'
import { supabase } from '../lib/supabase'
import { errorMessage } from '../lib/tokens'

/**
 * Stake input — bottom sheet for placing a bet.
 * Props:
 *   open, onClose,
 *   question, option, options (all for this question),
 *   bets (all for this question),
 *   seed, me (player record with balance),
 *   onPlaced(result), onError(message)
 */
export default function StakeInputSheet({
  open, onClose,
  question, option, options, bets,
  seed, me,
  onPlaced, onError,
}) {
  const [amount, setAmount] = useState(100)
  const [submitting, setSubmitting] = useState(false)

  const optCount = options.length || 1
  const balance = me?.balance ?? 0
  const maxStake = balance
  const seedPerOption = seed / optCount

  useEffect(() => {
    if (open) {
      const suggested = Math.min(Math.floor(balance * 0.1), balance)
      setAmount(Math.max(10, suggested || 10))
    }
  }, [open, balance])

  const { currentMult, projectedMult, projectedPayout, projectedProfit } = useMemo(() => {
    if (!option || !question) return { currentMult: 0, projectedMult: 0, projectedPayout: 0, projectedProfit: 0 }

    const qBets = bets.filter(b => b.question_id === question.id)
    const totalPool = qBets.reduce((s, b) => s + b.amount, 0)
    const optSum = qBets.filter(b => b.option_id === option.id).reduce((s, b) => s + b.amount, 0)

    const curr = optSum + seedPerOption > 0
      ? ((totalPool + seed) / (optSum + seedPerOption))
      : (optCount + 1)

    const newTotal = totalPool + amount
    const newOpt = optSum + amount
    const proj = newOpt + seedPerOption > 0
      ? ((newTotal + seed) / (newOpt + seedPerOption))
      : (optCount + 1)

    const payout = Math.round(amount * proj)
    return {
      currentMult: curr,
      projectedMult: proj,
      projectedPayout: payout,
      projectedProfit: payout - amount,
    }
  }, [option, question, bets, seed, seedPerOption, optCount, amount])

  const canSubmit = amount > 0 && amount <= balance && !submitting

  const submit = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    const { data, error } = await supabase.rpc('b2_place_bet', {
      p_question_id: question.id,
      p_option_id: option.id,
      p_amount: amount,
    })
    setSubmitting(false)
    if (error) {
      onError?.(errorMessage(error))
      return
    }
    onPlaced?.(data)
  }

  const quickButtons = [
    { label: '10%', val: Math.max(10, Math.floor(balance * 0.1)) },
    { label: '25%', val: Math.floor(balance * 0.25) },
    { label: '50%', val: Math.floor(balance * 0.5) },
    { label: 'All-in', val: balance },
  ].map(q => ({ ...q, val: Math.min(q.val, balance) }))

  if (!option || !question) return null

  return (
    <BottomSheet open={open} onClose={onClose} title={option.text}>
      <div className="p-5 space-y-5">
        {/* Question title */}
        <div className="text-center">
          <div className="k-label mb-1">Stawiasz na</div>
          <div className="text-lg font-bold text-white">{option.text}</div>
          <div className="text-xs text-slate-400 mt-1">{question.title}</div>
        </div>

        {/* Multipliers */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/[0.03] border border-white/10 rounded-xl p-3 text-center">
            <div className="k-label mb-1">Aktualnie</div>
            <div className="text-2xl font-mono font-bold text-slate-300">×{currentMult.toFixed(2)}</div>
          </div>
          <div className="bg-amber-brand/[0.08] border border-amber-brand/30 rounded-xl p-3 text-center">
            <div className="k-label mb-1 text-amber-brand/80">Po Twoim</div>
            <div className="text-2xl font-mono font-bold text-amber-brand">×{projectedMult.toFixed(2)}</div>
          </div>
        </div>

        {/* Amount display */}
        <div className="text-center">
          <div className="k-label mb-1">Stawka</div>
          <div className="text-5xl font-mono font-bold text-amber-brand">
            {amount.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            z balansu {balance.toLocaleString()} pts
          </div>
        </div>

        {/* Slider */}
        <input
          type="range"
          min={10}
          max={maxStake}
          step={10}
          value={amount}
          onChange={e => setAmount(Number(e.target.value))}
          className="w-full accent-amber-brand"
        />

        {/* Quick buttons */}
        <div className="grid grid-cols-4 gap-2">
          {quickButtons.map(q => (
            <button
              key={q.label}
              type="button"
              onClick={() => setAmount(q.val)}
              disabled={q.val === 0}
              className="py-2.5 rounded-lg text-xs font-bold bg-white/[0.03] border border-white/10 text-slate-200 hover:bg-white/[0.06] transition-all disabled:opacity-30"
            >
              {q.label}
            </button>
          ))}
        </div>

        {/* Payout preview */}
        <div className="bg-win/[0.08] border border-win/25 rounded-xl p-4 text-center">
          <div className="k-label mb-1 text-win/80">Jeśli wygrasz</div>
          <div className="text-3xl font-mono font-bold text-win">
            +{projectedProfit.toLocaleString()} pts
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Dostaniesz {projectedPayout.toLocaleString()} pts (stawka + zysk)
          </div>
        </div>
      </div>

      <div className="p-5 pt-3 border-t border-white/10 safe-bottom">
        <button
          onClick={submit}
          disabled={!canSubmit}
          className="w-full py-4 rounded-[14px] bg-amber-brand text-black font-bold text-sm uppercase tracking-wider transition-all active:scale-95 shadow-amber disabled:opacity-40"
        >
          {submitting ? 'Stawianie…' : `Postaw ${amount.toLocaleString()} pts`}
        </button>
      </div>
    </BottomSheet>
  )
}
