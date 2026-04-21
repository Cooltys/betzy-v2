import { useNavigate, useParams } from 'react-router-dom'
import StatusBar from '../components/StatusBar'

export default function RoomScreen() {
  const { sessionId } = useParams()
  const navigate = useNavigate()

  return (
    <div className="flex-1 flex flex-col bg-bg text-white">
      <StatusBar />

      <div className="px-5 pt-2.5 pb-4 flex items-center gap-3 shrink-0">
        <button
          onClick={() => navigate('/rooms')}
          className="w-9 h-9 rounded-[10px] bg-white/[0.05] border border-white/10 flex items-center justify-center"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <div>
          <div className="text-[17px] font-bold">Pokój</div>
          <div className="text-[11px] font-mono text-slate-500 tracking-wider mt-0.5">
            {sessionId?.slice(0, 8)}
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div className="text-[64px] mb-4">🏗️</div>
        <h3 className="text-xl font-bold mb-2">Widok pokoju — WIP</h3>
        <p className="text-sm text-slate-400 max-w-[280px] leading-relaxed">
          Tutaj będzie lista zakładów, karta zakładu, stake input, leaderboard i host actions.
          Następny krok.
        </p>
      </div>
    </div>
  )
}
