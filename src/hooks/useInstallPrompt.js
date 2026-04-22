import { useEffect, useState } from 'react'

const DISMISSED_KEY = 'betzy_v2_install_dismissed'

export function useInstallPrompt() {
  const [deferred, setDeferred] = useState(null)
  const [dismissed, setDismissed] = useState(
    typeof window !== 'undefined' && localStorage.getItem(DISMISSED_KEY) === '1'
  )

  useEffect(() => {
    if (typeof window === 'undefined') return
    const onBefore = (e) => {
      e.preventDefault()
      setDeferred(e)
    }
    window.addEventListener('beforeinstallprompt', onBefore)
    return () => window.removeEventListener('beforeinstallprompt', onBefore)
  }, [])

  const prompt = async () => {
    if (!deferred) return null
    deferred.prompt()
    const { outcome } = await deferred.userChoice
    setDeferred(null)
    if (outcome === 'accepted') localStorage.setItem(DISMISSED_KEY, '1')
    return outcome
  }

  const dismiss = () => {
    setDismissed(true)
    localStorage.setItem(DISMISSED_KEY, '1')
  }

  // Detect iOS where beforeinstallprompt doesn't fire
  const isIOS = typeof navigator !== 'undefined' &&
    /iPad|iPhone|iPod/.test(navigator.userAgent) &&
    !window.navigator.standalone

  const canPrompt = !dismissed && (deferred || isIOS)

  return { canPrompt, isIOS, prompt, dismiss }
}
