import { Routes, Route, Navigate } from 'react-router-dom'
import MobileFrame from './components/MobileFrame'
import { useAuth } from './hooks/useAuth'
import { useProfile } from './hooks/useProfile'
import SplashScreen from './screens/SplashScreen'
import RoomsScreen from './screens/RoomsScreen'
import JoinScreen from './screens/JoinScreen'
import CreateRoomScreen from './screens/CreateRoomScreen'
import RoomScreen from './screens/RoomScreen'

export default function App() {
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
        <Route path="/" element={<SplashScreen />} />
        <Route
          path="/rooms"
          element={hasProfile ? <RoomsScreen /> : <Navigate to="/" replace />}
        />
        <Route
          path="/join"
          element={hasProfile ? <JoinScreen /> : <Navigate to="/" replace />}
        />
        <Route
          path="/create"
          element={hasProfile ? <CreateRoomScreen /> : <Navigate to="/" replace />}
        />
        <Route
          path="/room/:sessionId"
          element={hasProfile ? <RoomScreen /> : <Navigate to="/" replace />}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </MobileFrame>
  )
}
