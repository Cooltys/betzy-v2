import { Routes, Route, Navigate, useSearchParams } from 'react-router-dom'
import MobileFrame from './components/MobileFrame'
import { useAuth } from './hooks/useAuth'
import { useProfile } from './hooks/useProfile'
import SplashScreen from './screens/SplashScreen'
import RoomsScreen from './screens/RoomsScreen'
import JoinScreen from './screens/JoinScreen'
import CreateRoomScreen from './screens/CreateRoomScreen'
import RoomScreen from './screens/RoomScreen'
import TvScreen from './screens/TvScreen'

export default function App() {
  return (
    <Routes>
      {/* TV view — public, no auth, no MobileFrame, full viewport */}
      <Route path="/tv/:sessionId" element={<TvScreen />} />
      {/* Everything else routes through the mobile frame + auth gate */}
      <Route path="*" element={<MobileApp />} />
    </Routes>
  )
}

function MobileApp() {
  const { loading, error } = useAuth()
  const { profile, loaded: profileLoaded } = useProfile()

  if (loading || !profileLoaded) {
    return (
      <MobileFrame>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-4xl font-extrabold tracking-tight mb-2">
              betzy<span className="text-amber-brand">.</span>
            </div>
            <div className="text-[10px] font-mono text-slate-500 tracking-[0.25em] uppercase">
              {error ? 'Błąd połączenia' : 'Ładowanie…'}
            </div>
          </div>
        </div>
      </MobileFrame>
    )
  }

  const hasProfile = profile.nick && profile.nick.length >= 2

  return (
    <MobileFrame>
      <Routes>
        <Route path="/" element={<Navigate to="/splash" replace />} />
        <Route path="/splash" element={<SplashScreen />} />
        <Route path="/rooms" element={<RequireProfile hasProfile={hasProfile}><RoomsScreen /></RequireProfile>} />
        <Route path="/join" element={<RequireProfile hasProfile={hasProfile}><JoinScreen /></RequireProfile>} />
        <Route path="/create" element={<RequireProfile hasProfile={hasProfile}><CreateRoomScreen /></RequireProfile>} />
        <Route path="/room/:sessionId" element={<RequireProfile hasProfile={hasProfile}><RoomScreen /></RequireProfile>} />
        <Route path="*" element={<Navigate to="/splash" replace />} />
      </Routes>
    </MobileFrame>
  )
}

/**
 * Require the user to have a profile.
 * If not, send them to /splash — but preserve any `?code=...` query param
 * so that after they set a profile they land back where they intended.
 */
function RequireProfile({ hasProfile, children }) {
  const [searchParams] = useSearchParams()
  if (hasProfile) return children
  const code = searchParams.get('code')
  const target = code ? `/splash?code=${encodeURIComponent(code)}` : '/splash'
  return <Navigate to={target} replace />
}
