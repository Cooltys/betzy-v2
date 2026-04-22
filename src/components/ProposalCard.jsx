/**
 * Proposal card — shown for questions with is_approved=false.
 * Host sees "Zaakceptuj" / "Odrzuć" buttons.
 * Proposing player sees "Czeka na akceptację" status.
 */
export default function ProposalCard({ question, options, players = [], isHost, me, onApprove, onReject }) {
  const q = question
  const qOpts = options.filter(o => o.question_id === q.id).sort((a, b) => a.position - b.position)
  const author = players.find(p => p.id === q.created_by_player_id)
  const isMine = q.created_by_player_id === me?.id

  return (
    <div className="rounded-2xl border border-purple-brand/30 bg-purple-brand/[0.04] p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="inline-flex items-center gap-1.5 text-[9px] font-mono font-semibold tracking-wider px-2 py-0.5 rounded-full border bg-purple-brand/15 text-purple-brand border-purple-brand/30">
            💡 PROPOZYCJA
          </div>
          <h3 className="text-[17px] font-bold text-white mt-2 leading-tight">{q.title}</h3>
          {q.description && (
            <p className="text-xs text-slate-400 mt-1 leading-snug">{q.description}</p>
          )}
          {author && (
            <div className="flex items-center gap-2 mt-2">
              <span
                className="w-5 h-5 rounded-md flex items-center justify-center text-[11px] shrink-0"
                style={{ background: author.color }}
              >
                {author.emoji}
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                od <span className="font-semibold text-slate-200">{author.nick}</span>
                {isMine && <span className="text-purple-brand/80 ml-1">(TY)</span>}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Options preview — read only */}
      <div className="space-y-1.5">
        {qOpts.map(opt => (
          <div
            key={opt.id}
            className="px-3 py-2 rounded-lg bg-white/[0.02] border border-white/10 text-sm text-slate-200"
          >
            {opt.text}
          </div>
        ))}
      </div>

      {/* Host action buttons */}
      {isHost && (
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={onReject}
            className="py-2.5 rounded-xl bg-loss/[0.08] border border-loss/25 text-loss text-xs font-semibold uppercase tracking-wider hover:bg-loss/15 transition"
          >
            ✕ Odrzuć
          </button>
          <button
            type="button"
            onClick={onApprove}
            className="py-2.5 rounded-xl bg-win/15 border border-win/40 text-win text-xs font-bold uppercase tracking-wider hover:bg-win/25 transition"
          >
            ✓ Zaakceptuj
          </button>
        </div>
      )}

      {!isHost && (
        <div className="text-[11px] text-slate-500 font-mono text-center">
          {isMine ? 'Czeka na akceptację hosta' : 'Host może to zaakceptować'}
        </div>
      )}
    </div>
  )
}
