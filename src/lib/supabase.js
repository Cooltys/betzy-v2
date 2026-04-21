import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !key) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env')
}

export const supabase = createClient(url, key, {
  auth: {
    persistSession: true,
    storageKey: 'betzy_v2_auth',
    autoRefreshToken: true,
  },
  realtime: {
    params: { eventsPerSecond: 10 }
  }
})

/** Ensure user is signed in (anonymous). Returns the user. */
export async function ensureAuth() {
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.user) return session.user

  const { data, error } = await supabase.auth.signInAnonymously()
  if (error) throw error
  return data.user
}
