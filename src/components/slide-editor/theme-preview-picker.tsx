'use client'

import { useState } from 'react'
import { X, Check } from 'lucide-react'

interface ThemeOption {
  key: string
  label: string
  background: string
  titleColor: string
  bodyColor: string
  accentColor: string
}

interface Props {
  themes: ThemeOption[]
  currentThemeKey: string
  onPreview: (key: string) => void
  onApply: (key: string) => void
  onClose: () => void
}

export default function ThemePreviewPicker({
  themes,
  currentThemeKey,
  onPreview,
  onApply,
  onClose,
}: Props) {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="w-[640px] max-h-[80vh] flex flex-col rounded-lg border border-slate-700 bg-slate-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-700 px-5 py-3">
          <h2 className="text-lg font-semibold text-slate-100">テーマプレビュー</h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          >
            <X size={18} />
          </button>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-3 gap-3">
            {themes.map((theme) => {
              const isSelected = theme.key === currentThemeKey
              return (
                <button
                  key={theme.key}
                  onClick={() => onApply(theme.key)}
                  onMouseEnter={() => {
                    setHoveredKey(theme.key)
                    onPreview(theme.key)
                  }}
                  onMouseLeave={() => {
                    setHoveredKey(null)
                    onPreview(currentThemeKey)
                  }}
                  className={`relative flex flex-col rounded-lg border-2 transition-all hover:scale-[1.03] ${
                    isSelected
                      ? 'border-indigo-500 ring-2 ring-indigo-500/30'
                      : hoveredKey === theme.key
                        ? 'border-slate-500'
                        : 'border-slate-700'
                  }`}
                >
                  {/* Mini slide preview */}
                  <div
                    className="flex flex-col items-start justify-center gap-1.5 rounded-t-md px-3 py-4"
                    style={{ background: theme.background, minHeight: 80 }}
                  >
                    <div
                      className="text-sm font-bold leading-tight truncate w-full text-left"
                      style={{ color: theme.titleColor }}
                    >
                      タイトルサンプル
                    </div>
                    <div
                      className="text-[10px] leading-tight truncate w-full text-left"
                      style={{ color: theme.bodyColor }}
                    >
                      本文テキストのプレビュー表示
                    </div>
                    {/* Accent bar */}
                    <div
                      className="mt-1 h-1 w-10 rounded-full"
                      style={{ background: theme.accentColor }}
                    />
                  </div>

                  {/* Label */}
                  <div className="flex items-center justify-between rounded-b-md bg-slate-800 px-3 py-2">
                    <span className="text-xs text-slate-300">{theme.label}</span>
                    {isSelected && <Check size={14} className="text-indigo-400" />}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
