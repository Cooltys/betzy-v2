import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import StatusBar from '../components/StatusBar'
import Toast from '../components/Toast'
import BetCard from '../components/BetCard'
import ProposalCard from '../components/ProposalCard'
import CreateQuestionSheet from '../components/CreateQuestionSheet'
import ApproveProposalSheet from '../components/ApproveProposalSheet'
import ReopenQuestionSheet from '../components/ReopenQuestionSheet'
import StakeInputSheet from '../components/StakeInputSheet'
import BonusSheet from '../components/BonusSheet'
import ShareSheet from '../components/ShareSheet'
import HostMenuSheet from '../components/HostMenuSheet'
import BettorsSheet from '../components/BettorsSheet'
import PodiumView from './PodiumView'
import { useAuth } from '../hooks/useAuth'
import { useRoom } from '../hooks/useRoom'
import { supabase } from '../lib/supabase'
import { errorMessage } from '../lib/tokens'
import { haptic, HAPTIC, winConfetti, bigWinConfetti } from '../lib/haptic'

export default function RoomScreen() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const room = useRoom(sessionId, user?.id)
  const [toast, setToast] = useState(null)
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [stakeTarget, setStakeTarget] = useState(null) // { questionId, optionId }
  const [showMenu, setShowMenu] = useState(false)
  const [showBonus, setShowBonus] = useState(false)
  const [showShare, setShowShare] = useState(false)
  const [bettorsForQuestion, setBettorsForQuestion] = useState(null)
  const [approveTarget, setApproveTarget] = useState(null)
  const [reopenTarget, setReopenTarget] = useState(null)

  // Celebration: trigger confetti + haptic for newly-resolved bets where I won
  const seenResolvedRef = useRef(new Set())
  const initialSeenRef = useRef(false)
  const seenBonusRef = useRef(new Set())
  const initialBonusRef = useRef(false)

  // Derived
  const { session, players, questions, options, bets, me, isHost, loading, error } = room

  // Celebrate new resolutions
  useEffect(() => {
    if (loading || !me) return
    const resolvedQs = questions.filter(q => q.status === 'resolved')

    if (!initialSeenRef.current) {
      // First load: mark all current resolved as already seen
      resolvedQs.forEach(q => seenResolvedRef.current.add(q.id))
      initialSeenRef.current = true
      return
    }

    for (const q of resolvedQs) {
      if (seenResolvedRef.current.has(q.id)) continue
      seenResolvedRef.current.add(q.id)

      const myBets = bets.filter(b => b.question_id === q.id && b.player_id === me.id)
      const myStake = myBets.reduce((s, b) => s + b.amount, 0)
      const myPayout = myBets
        .filter(b => b.option_id === q.winning_option_id)
        .reduce((s, b) => s + (b.payout_amount || 0), 0)
      const profit = myPayout - myStake

      if (profit > 0) {
        haptic(HAPTIC.win)
        // Big confetti if profit >= 2x stake, else normal
        if (myStake > 0 && profit >= myStake * 2) bigWinConfetti()
        else winConfetti()
        setToast({ kind: 'success', text: `Wygrałeś +${profit.toLocaleString()} pts!` })
      } else if (myStake > 0 && profit < 0) {
        haptic(HAPTIC.loss)
      }
    }
  }, [questions, bets, me, loading])

  // Notify player about bonuses awarded to them
  useEffect(() => {
    if (loading || !me) return
    const myBonuses = room.events.filter(e => e.kind === 'bonus_awarded' && e.player_id === me.id)

    if (!initialBonusRef.current) {
      myBonuses.forEach(e => seenBonusRef.current.add(e.id))
      initialBonusRef.current = true
      return
    }

    for (const e of myBonuses) {
      if (seenBonusRef.current.has(e.id)) continue
      seenBonusRef.current.add(e.id)

      const amount = e.payload?.amount ?? 0
      const reason = e.payload?.reason
      const sign = amount > 0 ? '+' : ''
      const icon = amount > 0 ? '🎁' : '💸'
      const reasonText = reason ? ` — ${reason}` : ''

      haptic(amount > 0 ? HAPTIC.success : HAPTIC.loss)
      setToast({
        kind: amount > 0 ? 'success' : 'error',
        icon,
        text: `Dostałeś ${sign}${amount.toLocaleString()} pts${reasonText}`,
        persistent: true,
      })
    }
  }, [room.events, me, loading])

  const proposalQs = useMemo(
    () => questions.filter(q => !q.is_approved),
    [questions]
  )

  const activeQs = useMemo(() => questions.filter(q => {
    if (!q.is_approved) return false
    return q.status === 'open' || q.status === 'closed'
  }), [questions])

  const historyQs = useMemo(
    () => questions.filter(q => q.is_approved && (q.status === 'resolved' || q.status === 'cancelled')),
    [questions]
  )

  const myRank = useMemo(() => {
    if (!me) return null
    const sorted = [...players].sort((a, b) => b.balance - a.balance)
    return sorted.findIndex(p => p.id === me.id) + 1
  }, [players, me])

  // Pool stats: how much I've staked on still-active bets,
  // and what I could win if all my active bets hit
  const { myStaked, myPotential } = useMemo(() => {
    if (!me || !session) return { myStaked: 0, myPotential: 0 }
    const seed = session.virtual_seed || 0
    const activeIds = new Set(activeQs.map(q => q.id))
    const myActive = bets.filter(b => b.player_id === me.id && activeIds.has(b.question_id))
    let staked = 0
    let potential = 0
    for (const q of activeQs) {
      const qOpts = options.filter(o => o.question_id === q.id)
      const qBets = bets.filter(b => b.question_id === q.id)
      const totalPool = qBets.reduce((s, b) => s + b.amount, 0)
      const optCount = qOpts.length || 1
      const seedPerOption = seed / optCount
      const myQBets = qBets.filter(b => b.player_id === me.id)
      if (myQBets.length === 0) continue
      for (const mb of myQBets) {
        staked += mb.amount
        const optSum = qBets.filter(bb => bb.option_id === mb.option_id).reduce((s, bb) => s + bb.amount, 0)
        const mult = optSum + seedPerOption > 0
          ? ((totalPool + seed) / (optSum + seedPerOption))
          : 1
        potential += Math.round(mb.amount * mult)
      }
    }
    return { myStaked: staked, myPotential: potential }
  }, [activeQs, bets, options, session, me])

  const onlinePlayers = players.length

  const handleClose = async (qid) => {
    const { error } = await supabase.rpc('b2_close_question', { p_question_id: qid })
    if (error) setToast({ kind: 'error', text: errorMessage(error) })
  }

  const handleCancel = async (qid) => {
    if (!confirm('Anulować zakład? Stawki zostaną zwrócone.')) return
    const { error } = await supabase.rpc('b2_cancel_question', { p_question_id: qid })
    if (error) setToast({ kind: 'error', text: errorMessage(error) })
  }

  const handleResolve = async (qid, optionId) => {
    if (!confirm('Potwierdź: to jest wygrana opcja?')) return
    const { error } = await supabase.rpc('b2_resolve_question', {
      p_question_id: qid,
      p_winning_option_id: optionId,
    })
    if (error) setToast({ kind: 'error', text: errorMessage(error) })
  }

  const handleApprove = (qid) => {
    const q = questions.find(x => x.id === qid)
    if (q) setApproveTarget(q)
  }

  const handleApproveConfirm = async (expiresInSec) => {
    if (!approveTarget) return
    const { error } = await supabase.rpc('b2_approve_question', {
      p_question_id: approveTarget.id,
      p_expires_in_sec: expiresInSec,
    })
    setApproveTarget(null)
    if (error) setToast({ kind: 'error', text: errorMessage(error) })
    else setToast({ kind: 'success', text: 'Propozycja zaakceptowana — zakład uruchomiony!' })
  }

  const handleReject = async (qid) => {
    if (!confirm('Odrzucić propozycję?')) return
    const { error } = await supabase.rpc('b2_reject_question', { p_question_id: qid })
    if (error) setToast({ kind: 'error', text: errorMessage(error) })
  }

  const handleReopen = (qid) => {
    const q = questions.find(x => x.id === qid)
    if (q) setReopenTarget(q)
  }

  const handleReopenConfirm = async (expiresInSec) => {
    if (!reopenTarget) return
    const { error } = await supabase.rpc('b2_reopen_question', {
      p_question_id: reopenTarget.id,
      p_expires_in_sec: expiresInSec,
    })
    setReopenTarget(null)
    if (error) setToast({ kind: 'error', text: errorMessage(error) })
    else setToast({ kind: 'success', text: 'Zakład wznowiony!' })
  }

  const handleRevert = async (qid) => {
    if (!confirm('Cofnąć wynik? Punkty wrócą do puli, zakład zostanie przeniesiony do "Czeka na wynik".')) return
    const { error } = await supabase.rpc('b2_revert_resolution', { p_question_id: qid })
    if (error) setToast({ kind: 'error', text: errorMessage(error) })
    else setToast({ kind: 'info', text: 'Wynik cofnięty — możesz wybrać ponownie' })
  }

  const handleOpenStake = (qid, optionId) => {
    setStakeTarget({ questionId: qid, optionId })
  }

  const stakeQuestion = stakeTarget ? questions.find(q => q.id === stakeTarget.questionId) : null
  const stakeOption = stakeTarget ? options.find(o => o.id === stakeTarget.optionId) : null
  const stakeOptionsForQ = stakeQuestion ? options.filter(o => o.question_id === stakeQuestion.id) : []

  if (loading) {
    return (
      <div className="flex-1 flex flex-col bg-bg text-white">
        <StatusBar />
        <div className="flex-1 flex items-center justify-center text-slate-500">Ładowanie pokoju…</div>
      </div>
    )
  }

  if (error || !session) {
    return (
      <div className="flex-1 flex flex-col bg-bg text-white">
        <StatusBar />
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-3">
          <div className="text-4xl">⚠️</div>
          <div className="text-sm text-slate-400">{errorMessage(error) || 'Nie można załadować pokoju'}</div>
          <button onClick={() => navigate('/rooms')} className="mt-4 px-5 py-2 rounded-full bg-white/10 text-sm">
            Wróć
          </button>
        </div>
      </div>
    )
  }

  if (session.status === 'closed') {
    return (
      <PodiumView
        session={session}
        players={players}
        startingBalance={session.starting_balance}
        me={me}
      />
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-bg text-white min-h-0">
      <StatusBar />

      {/* Header */}
      <div className="px-4 pt-2 pb-3 flex items-center gap-3 shrink-0 border-b border-white/5">
        <button
          onClick={() => navigate('/rooms')}
          className="w-9 h-9 rounded-[10px] bg-white/[0.05] border border-white/10 flex items-center justify-center shrink-0"
          aria-label="Wróć do listy pokoi"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>

        <div className="flex-1 min-w-0 flex items-center gap-2">
          <div className="w-9 h-9 rounded-[10px] bg-amber-brand/10 flex items-center justify-center text-xl shrink-0">
            {session.emoji || '🎯'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <div className="text-[15px] font-bold text-white truncate">{session.room_name}</div>
              {isHost && (
                <span className="text-[9px] font-mono font-semibold tracking-wider px-1.5 py-0.5 rounded bg-amber-brand/15 text-amber-brand uppercase shrink-0">
                  Host
                </span>
              )}
            </div>
            <div className="text-[11px] font-mono text-slate-500 tracking-wider flex items-center gap-2">
              <span>{session.join_code}</span>
              <span>·</span>
              <span className="inline-flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-win animate-pulse" />
                {onlinePlayers} {onlinePlayers === 1 ? 'gracz' : 'graczy'}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowLeaderboard(true)}
          className="w-9 h-9 rounded-[10px] bg-white/[0.05] border border-white/10 flex items-center justify-center shrink-0"
          aria-label="Ranking"
        >
          🏆
        </button>

        {isHost && (
          <button
            onClick={() => setShowMenu(true)}
            className="w-9 h-9 rounded-[10px] bg-white/[0.05] border border-white/10 flex items-center justify-center shrink-0"
            aria-label="Menu hosta"
          >
            ⋯
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Proposals from players — shown above active bets */}
        {proposalQs.length > 0 && (
          <section className="space-y-3">
            <h2 className="k-label px-1">
              Propozycje ({proposalQs.length})
            </h2>
            {proposalQs.map(q => (
              <ProposalCard
                key={q.id}
                question={q}
                options={options}
                players={players}
                isHost={isHost}
                me={me}
                onApprove={() => handleApprove(q.id)}
                onReject={() => handleReject(q.id)}
              />
            ))}
          </section>
        )}

        {/* Active bets */}
        {activeQs.length > 0 && (
          <section className="space-y-3">
            <h2 className="k-label px-1">Aktywne zakłady</h2>
            {activeQs.map(q => (
              <BetCard
                key={q.id}
                question={q}
                options={options}
                bets={bets}
                players={players}
                seed={session.virtual_seed}
                isHost={isHost}
                me={me}
                onOpenStake={(optionId) => handleOpenStake(q.id, optionId)}
                onResolve={(optionId) => handleResolve(q.id, optionId)}
                onClose={() => handleClose(q.id)}
                onCancel={() => handleCancel(q.id)}
                onReopen={() => handleReopen(q.id)}
                onShowBettors={() => setBettorsForQuestion(q)}
              />
            ))}
          </section>
        )}

        {/* Empty */}
        {activeQs.length === 0 && (
          <div className="text-center py-14 px-6">
            <div className="text-5xl mb-3">🎯</div>
            <h3 className="text-lg font-bold text-white mb-1">Brak aktywnych zakładów</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              {isHost
                ? 'Stwórz pierwszy zakład — przycisk poniżej.'
                : 'Host zaraz coś wystawi. Czekaj!'}
            </p>
          </div>
        )}

        {/* History */}
        {historyQs.length > 0 && (
          <section className="space-y-3 pt-4">
            <h2 className="k-label px-1">Historia ({historyQs.length})</h2>
            {historyQs.map(q => (
              <BetCard
                key={q.id}
                question={q}
                options={options}
                bets={bets}
                players={players}
                seed={session.virtual_seed}
                isHost={isHost}
                me={me}
                onRevert={() => handleRevert(q.id)}
              />
            ))}
          </section>
        )}
      </div>

      {/* Footer: balance + rank + create (host) */}
      <div className="shrink-0 border-t border-white/5 bg-bg safe-bottom">
        {/* Pool stats strip — only when I have active stakes */}
        {myStaked > 0 && (
          <div className="px-4 py-2 border-b border-white/5 flex items-center justify-between gap-3 text-[11px] font-mono">
            <span className="text-slate-400">
              💰 W grze: <span className="text-warn font-bold">{myStaked.toLocaleString()}</span>
            </span>
            <span className="text-slate-400">
              🎯 Do zgarnięcia: <span className="text-win font-bold">+{(myPotential - myStaked).toLocaleString()}</span>
            </span>
          </div>
        )}

        <div className="px-4 py-3 flex items-center gap-4">
          <div className="min-w-0">
            <div className="text-[10px] font-mono tracking-wider text-slate-500 uppercase">Balans</div>
            <div className="text-xl font-bold text-amber-brand leading-tight">
              {me ? me.balance.toLocaleString() : '—'}
            </div>
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-mono tracking-wider text-slate-500 uppercase">Miejsce</div>
            <div className="text-xl font-bold text-white leading-tight">
              {myRank ? `#${myRank}` : '—'}
            </div>
          </div>
          <div className="flex-1" />
          <button
            onClick={() => setShowCreate(true)}
            className={`shrink-0 px-5 py-3 rounded-full text-sm font-bold uppercase tracking-wider active:scale-95 transition ${
              isHost
                ? 'bg-amber-brand text-black shadow-amber'
                : 'bg-purple-brand/15 text-purple-brand border border-purple-brand/40 hover:bg-purple-brand/25'
            }`}
          >
            {isHost ? '+ Zakład' : '💡 Zaproponuj'}
          </button>
        </div>
      </div>

      {/* Leaderboard modal */}
      {showLeaderboard && (
        <LeaderboardModal
          players={players}
          startingBalance={session.starting_balance}
          me={me}
          onClose={() => setShowLeaderboard(false)}
        />
      )}

      {/* Create question (host) */}
      <CreateQuestionSheet
        open={showCreate}
        onClose={() => setShowCreate(false)}
        sessionId={sessionId}
        isHost={isHost}
        onCreated={() => {
          setShowCreate(false)
          haptic(HAPTIC.success)
          setToast({
            kind: 'success',
            text: isHost ? 'Zakład uruchomiony!' : 'Propozycja wysłana — czekamy na hosta',
          })
        }}
        onError={(msg) => setToast({ kind: 'error', text: msg })}
      />

      {/* Stake input (all players) */}
      <StakeInputSheet
        open={!!stakeTarget}
        onClose={() => setStakeTarget(null)}
        question={stakeQuestion}
        option={stakeOption}
        options={stakeOptionsForQ}
        bets={bets}
        seed={session.virtual_seed}
        me={me}
        onPlaced={(result) => {
          setStakeTarget(null)
          haptic(HAPTIC.bet)
          setToast({ kind: 'success', text: `Postawiono! Mnożnik ×${result.multiplier?.toFixed(2) || '?'}` })
        }}
        onError={(msg) => setToast({ kind: 'error', text: msg })}
      />

      {/* Host menu */}
      <HostMenuSheet
        open={showMenu}
        onClose={() => setShowMenu(false)}
        sessionId={sessionId}
        players={players}
        myPlayerId={me?.id}
        onShare={() => setShowShare(true)}
        onBonus={() => setShowBonus(true)}
        onError={(msg) => setToast({ kind: 'error', text: msg })}
        onEnded={() => setToast({ kind: 'success', text: 'Pokój zakończony' })}
      />

      {/* Share */}
      <ShareSheet
        open={showShare}
        onClose={() => setShowShare(false)}
        joinCode={session.join_code}
        roomName={session.room_name}
        emoji={session.emoji}
      />

      {/* Bonus */}
      <BonusSheet
        open={showBonus}
        onClose={() => setShowBonus(false)}
        sessionId={sessionId}
        players={players}
        onGranted={({ count, amount }) => {
          setShowBonus(false)
          setToast({
            kind: 'success',
            text: `Przyznano ${amount > 0 ? '+' : ''}${amount} pts ${count === 1 ? '1 osobie' : `${count} osobom`}`,
          })
        }}
        onError={(msg) => setToast({ kind: 'error', text: msg })}
      />

      <BettorsSheet
        open={!!bettorsForQuestion}
        onClose={() => setBettorsForQuestion(null)}
        question={bettorsForQuestion}
        options={options}
        bets={bets}
        players={players}
        me={me}
      />

      <ApproveProposalSheet
        open={!!approveTarget}
        onClose={() => setApproveTarget(null)}
        question={approveTarget}
        onConfirm={handleApproveConfirm}
      />

      <ReopenQuestionSheet
        open={!!reopenTarget}
        onClose={() => setReopenTarget(null)}
        question={reopenTarget}
        onConfirm={handleReopenConfirm}
      />

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  )
}

function LeaderboardModal({ players, startingBalance, me, onClose }) {
  const sorted = [...players].sort((a, b) => b.balance - a.balance)

  return (
    <div
      className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[400px] bg-bg border border-white/10 rounded-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h3 className="text-base font-bold">🏆 Ranking</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-slate-400">✕</button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto divide-y divide-white/5">
          {sorted.map((p, i) => {
            const profit = p.balance - startingBalance
            const isMe = me?.id === p.id
            return (
              <div
                key={p.id}
                className={`flex items-center gap-3 px-4 py-3 ${isMe ? 'bg-amber-brand/5' : ''}`}
              >
                <div className="w-6 text-center text-slate-500 font-mono text-sm">#{i + 1}</div>
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-lg shrink-0"
                  style={{ background: p.color }}
                >
                  {p.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-semibold truncate ${isMe ? 'text-amber-brand' : 'text-white'}`}>
                    {p.nick} {isMe && <span className="text-[10px] font-mono">(TY)</span>}
                  </div>
                  <div className={`text-[11px] font-mono ${profit > 0 ? 'text-win' : profit < 0 ? 'text-loss' : 'text-slate-500'}`}>
                    {profit > 0 ? '+' : ''}{profit.toLocaleString()}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-amber-brand">{p.balance.toLocaleString()}</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
