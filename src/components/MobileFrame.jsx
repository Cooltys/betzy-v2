import { useEffect, useState } from 'react'

/**
 * Mobile-first wrapper. Centers content in a 420px column on desktop
 * with subtle ambient background, full-bleed on phones.
 */
export default function MobileFrame({ children }) {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 500 : false
  )

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 500)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  if (isMobile) {
    return <div className="h-[100dvh] flex flex-col bg-bg overflow-hidden">{children}</div>
  }

  return (
    <div
      className="min-h-[100dvh] flex items-center justify-center p-6"
      style={{ background: 'radial-gradient(ellipse at top, #1a1a1a 0%, #050505 70%)' }}
    >
      <div
        className="w-[390px] h-[844px] rounded-[48px] bg-black p-[10px] relative overflow-hidden"
        style={{ boxShadow: '0 40px 100px -20px rgba(0,0,0,.8), 0 0 0 2px rgba(255,255,255,.08)' }}
      >
        {/* notch */}
        <div
          className="absolute top-[18px] left-1/2 -translate-x-1/2 w-[120px] h-[30px] rounded-full bg-black z-10"
          aria-hidden
        />
        <div className="w-full h-full rounded-[40px] overflow-hidden relative bg-bg flex flex-col">
          {children}
        </div>
      </div>
    </div>
  )
}
