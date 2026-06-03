'use client'
import { useState, useEffect } from 'react'

interface LaserPointerProps {
  active: boolean
}

export default function LaserPointer({ active }: LaserPointerProps) {
  const [pos, setPos] = useState({ x: 0, y: 0 })

  useEffect(() => {
    if (!active) return
    const handler = (e: MouseEvent) => setPos({ x: e.clientX, y: e.clientY })
    window.addEventListener('mousemove', handler)
    return () => window.removeEventListener('mousemove', handler)
  }, [active])

  if (!active) return null
  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none">
      {/* Main dot */}
      <div
        className="absolute w-3 h-3 rounded-full bg-red-500 shadow-[0_0_8px_4px_rgba(239,68,68,0.6)] -translate-x-1/2 -translate-y-1/2 transition-all duration-75"
        style={{ left: pos.x, top: pos.y }}
      />
      {/* Glow ring */}
      <div
        className="absolute w-6 h-6 rounded-full border border-red-400/30 -translate-x-1/2 -translate-y-1/2 animate-ping"
        style={{ left: pos.x, top: pos.y }}
      />
    </div>
  )
}
