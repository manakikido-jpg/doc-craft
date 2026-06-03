'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { usePresence } from '@/hooks/use-presence'

interface CursorPosition {
  userId: string
  name: string
  color: string
  x: number
  y: number
  lastUpdate: number
}

interface Props {
  documentId: string
  canvasRef: React.RefObject<HTMLDivElement | null>
}

export default function CollaborationCursors({ documentId, canvasRef }: Props) {
  const users = usePresence(documentId)
  const [cursors, setCursors] = useState<Map<string, CursorPosition>>(new Map())
  const broadcastTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const localCursorRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })

  // Track local cursor position relative to canvas
  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      if (!canvasRef.current) return
      const rect = canvasRef.current.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width) * 100
      const y = ((e.clientY - rect.top) / rect.height) * 100
      localCursorRef.current = { x, y }
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [canvasRef])

  // Simulate receiving other users' cursor positions from presence
  // In a real implementation, this would come from the Supabase presence channel
  useEffect(() => {
    if (users.length === 0) {
      setCursors(new Map())
      return
    }

    // Simulate cursor positions for connected users
    const interval = setInterval(() => {
      setCursors((prev) => {
        const next = new Map(prev)
        for (const user of users) {
          const existing = next.get(user.userId)
          // Simulate slight movement or keep existing position
          const baseX = existing?.x ?? 30 + Math.random() * 40
          const baseY = existing?.y ?? 20 + Math.random() * 60
          const jitterX = (Math.random() - 0.5) * 2
          const jitterY = (Math.random() - 0.5) * 2
          next.set(user.userId, {
            userId: user.userId,
            name: user.name,
            color: user.color,
            x: Math.max(0, Math.min(100, baseX + jitterX)),
            y: Math.max(0, Math.min(100, baseY + jitterY)),
            lastUpdate: Date.now(),
          })
        }
        return next
      })
    }, 2000)

    return () => clearInterval(interval)
  }, [users])

  // Remove stale cursors (no update for 10 seconds)
  useEffect(() => {
    const cleanup = setInterval(() => {
      setCursors((prev) => {
        const next = new Map(prev)
        const now = Date.now()
        for (const [key, cursor] of next) {
          if (now - cursor.lastUpdate > 10000) {
            next.delete(key)
          }
        }
        return next
      })
    }, 5000)
    return () => clearInterval(cleanup)
  }, [])

  if (cursors.size === 0) return null

  return (
    <div className="absolute inset-0 pointer-events-none z-[18]" aria-hidden="true">
      {Array.from(cursors.values()).map((cursor) => (
        <div
          key={cursor.userId}
          className="absolute transition-all duration-300 ease-out"
          style={{
            left: `${cursor.x}%`,
            top: `${cursor.y}%`,
            transform: 'translate(-2px, -2px)',
          }}
        >
          {/* Cursor dot */}
          <div
            className="w-3 h-3 rounded-full border-2 border-white shadow-lg"
            style={{ backgroundColor: cursor.color }}
          />
          {/* Username label */}
          <div
            className="absolute top-3.5 left-1 px-1.5 py-0.5 rounded text-[10px] font-medium text-white whitespace-nowrap shadow-md"
            style={{ backgroundColor: cursor.color }}
          >
            {cursor.name}
          </div>
        </div>
      ))}
    </div>
  )
}
