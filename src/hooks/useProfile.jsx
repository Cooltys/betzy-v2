import { createContext, useContext, useEffect, useState } from 'react'

const KEY = 'betzy_v2_profile'

const DEFAULT = {
  nick: '',
  emoji: '🎯',
  color: '#eab308',
}

const ProfileContext = createContext(null)

export function ProfileProvider({ children }) {
  const [profile, setProfileState] = useState(DEFAULT)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY)
      if (raw) setProfileState({ ...DEFAULT, ...JSON.parse(raw) })
    } catch {}
    setLoaded(true)
  }, [])

  const setProfile = (updater) => {
    setProfileState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater }
      try { localStorage.setItem(KEY, JSON.stringify(next)) } catch {}
      return next
    })
  }

  return (
    <ProfileContext.Provider value={{ profile, setProfile, loaded }}>
      {children}
    </ProfileContext.Provider>
  )
}

export function useProfile() {
  const ctx = useContext(ProfileContext)
  if (!ctx) throw new Error('useProfile must be used inside <ProfileProvider>')
  return ctx
}
