'use client'

import { useState, useRef, useEffect } from 'react'
import type { SlideThemeKey } from '@/types'
import { SLIDE_THEMES, THEME_KEYS } from '@/lib/themes'

interface Props {
  currentTheme: SlideThemeKey
  onSelect: (key: SlideThemeKey) => void
  onSelectAll: (key: SlideThemeKey) => void
}

export default function ThemePicker({ currentTheme, onSelect, onSelectAll }: Props) {
  const [open, setOpen] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  useEffect(() => {
    if (!open || !btnRef.current) return
    const rect = btnRef.current.getBoundingClientRect()
    let top = rect.bottom + 4
    let left = rect.right - 240 // w-60 = 240px, align right

    requestAnimationFrame(() => {
      if (!panelRef.current) return
      const dd = panelRef.current.getBoundingClientRect()
      if (top + dd.height > window.innerHeight - 8) {
        top = Math.max(8, rect.top - dd.height - 4)
      }
      if (left < 8) left = 8
      if (left + dd.width > window.innerWidth - 8) {
        left = window.innerWidth - dd.width - 8
      }
      setPos({ top, left })
    })

    setPos({ top, left })
  }, [open])

  return (
    <div className="relative">
      <button
        ref={btnRef}
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 hover:border-slate-500 bg-slate-800 text-white text-sm transition-colors"
      >
        <div className="w-4 h-4 rounded-sm" style={{ background: SLIDE_THEMES[currentTheme].background }} />
        テーマ
        <span className="text-slate-400 text-xs">▾</span>
      </button>

      {open && pos && (
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setOpen(false)} />
          <div
            ref={panelRef}
            className="fixed z-[9999] bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-3 w-60"
            style={{ top: pos.top, left: pos.left }}
          >
            <p className="text-slate-400 text-xs mb-2 px-1">テーマを選択</p>
            <div className="grid grid-cols-4 gap-2 mb-3">
              {THEME_KEYS.map((key) => {
                const theme = SLIDE_THEMES[key]
                return (
                  <button
                    key={key}
                    onClick={() => {
                      onSelect(key)
                      setOpen(false)
                    }}
                    title={theme.label}
                    className={`relative group flex flex-col items-center gap-1 ${currentTheme === key ? 'ring-2 ring-indigo-500 rounded-lg' : ''}`}
                  >
                    <div
                      className="w-10 h-7 rounded-md shadow transition-transform group-hover:scale-110"
                      style={{ background: theme.background }}
                    />
                    <span className="text-slate-400 text-xs leading-none">{theme.label.slice(0, 4)}</span>
                  </button>
                )
              })}
            </div>
            <div className="border-t border-slate-800 pt-2">
              <button
                onClick={() => {
                  onSelectAll(currentTheme)
                  setOpen(false)
                }}
                className="w-full text-left px-2 py-1.5 text-xs text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              >
                全スライドに適用
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
