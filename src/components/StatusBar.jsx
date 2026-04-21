import { useEffect, useState } from 'react'

export default function StatusBar() {
  const [time, setTime] = useState(() => formatTime(new Date()))

  useEffect(() => {
    const t = setInterval(() => setTime(formatTime(new Date())), 30000)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="h-11 flex items-center justify-between px-[22px] text-[14px] font-semibold text-white shrink-0 safe-top">
      <span>{time}</span>
      <div className="flex items-center gap-1.5 text-xs">
        <span className="opacity-80">•••</span>
        <svg width="17" height="12" viewBox="0 0 17 12" fill="currentColor" className="opacity-80">
          <path d="M0 10V2a1 1 0 011-1h15v10H1a1 1 0 01-1-1z M14 3H2v6h12V3z M15 4.5v3a1 1 0 001-1v-1a1 1 0 00-1-1z" />
        </svg>
      </div>
    </div>
  )
}

function formatTime(d) {
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
}
