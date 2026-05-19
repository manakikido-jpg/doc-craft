'use client'

import { useState } from 'react'
import type { SlideThemeKey } from '@/types'
import { SLIDE_THEMES, THEME_KEYS } from '@/lib/themes'

interface Props {
  currentTheme: SlideThemeKey
  onSelect: (key: SlideThemeKey) => void
  onSelectAll: (key: SlideThemeKey) => void
}

export default function ThemePicker({ currentTheme, onSelect, onSelectAll }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 hover:border-slate-500 bg-slate-800 text-white text-sm transition-colors"
      >
        <div className="w-4 h-4 rounded-sm" style={{ background: SLIDE_THEMES[currentTheme].background }} />
        テーマ
        <span className="text-slate-400 text-xs">▾</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-10 right-0 z-20 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-3 w-60">
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
