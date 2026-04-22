// Tiny haptic + confetti helpers
import confetti from 'canvas-confetti'

export function haptic(pattern = 30) {
  if (typeof navigator === 'undefined' || !navigator.vibrate) return
  try { navigator.vibrate(pattern) } catch {}
}

export const HAPTIC = {
  tap: 20,
  bet: [30, 40, 30],
  win: [80, 60, 80, 60, 120],
  loss: [150],
  success: [40, 30, 40],
}

export function winConfetti(burstCount = 2) {
  const defaults = {
    spread: 70,
    startVelocity: 35,
    ticks: 200,
    gravity: 0.9,
    colors: ['#eab308', '#f97316', '#22c55e', '#a855f7', '#ec4899'],
  }
  for (let i = 0; i < burstCount; i++) {
    setTimeout(() => {
      confetti({
        ...defaults,
        particleCount: 80,
        origin: { y: 0.7, x: 0.3 + i * 0.4 },
      })
    }, i * 200)
  }
}

export function bigWinConfetti() {
  const duration = 1800
  const end = Date.now() + duration
  const colors = ['#eab308', '#f97316', '#22c55e', '#a855f7', '#ec4899']
  ;(function frame() {
    confetti({
      particleCount: 3,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors,
    })
    confetti({
      particleCount: 3,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors,
    })
    if (Date.now() < end) requestAnimationFrame(frame)
  })()
}
