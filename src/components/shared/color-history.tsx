'use client'

import { useState, useCallback, useEffect } from 'react'

const STORAGE_KEY = 'doccraft-recent-colors'
const MAX_COLORS = 12

export function useColorHistory(): {
  recentColors: string[]
  addColor: (color: string) => void
} {
  const [recentColors, setRecentColors] = useState<string[]>([])

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) {
          setRecentColors(parsed.slice(0, MAX_COLORS))
        }
      }
    } catch {
      // ignore parse errors
    }
  }, [])

  const addColor = useCallback((color: string) => {
    setRecentColors((prev) => {
      const filtered = prev.filter((c) => c.toLowerCase() !== color.toLowerCase())
      const next = [color, ...filtered].slice(0, MAX_COLORS)
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {
        // ignore storage errors
      }
      return next
    })
  }, [])

  return { recentColors, addColor }
}

interface Props {
  onSelectColor: (color: string) => void
}

export default function ColorHistory({ onSelectColor }: Props) {
  const { recentColors } = useColorHistory()

  if (recentColors.length === 0) return null

  return (
    <div>
      <p className="text-xs text-slate-400 mb-1.5">最近使用した色</p>
      <div className="flex gap-1">
        {recentColors.map((color, i) => (
          <button
            key={`${color}-${i}`}
            onClick={() => onSelectColor(color)}
            className="shrink-0 rounded-full border border-slate-600 hover:border-indigo-400 hover:scale-110 transition-all cursor-pointer"
            style={{ backgroundColor: color, width: 20, height: 20 }}
            title={color}
          />
        ))}
      </div>
    </div>
  )
}
