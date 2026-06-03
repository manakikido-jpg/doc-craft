'use client'

import { useState } from 'react'
import { X, RotateCcw } from 'lucide-react'
import type { SlideTheme } from '@/types'

interface ThemeColorEditorProps {
  theme: Partial<SlideTheme>
  onUpdate: (theme: Partial<SlideTheme>) => void
  onClose: () => void
}

const DEFAULT_THEME: Partial<SlideTheme> = {
  background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)',
  titleColor: '#ffffff',
  bodyColor: '#94a3b8',
  accentColor: '#3b82f6',
}

interface ColorFieldDef {
  key: keyof Pick<SlideTheme, 'background' | 'titleColor' | 'bodyColor' | 'accentColor'>
  label: string
}

const COLOR_FIELDS: ColorFieldDef[] = [
  { key: 'background', label: '背景色' },
  { key: 'titleColor', label: 'タイトル色' },
  { key: 'bodyColor', label: '本文色' },
  { key: 'accentColor', label: 'アクセント色' },
]

export default function ThemeColorEditor({ theme, onUpdate, onClose }: ThemeColorEditorProps) {
  const [draft, setDraft] = useState<Partial<SlideTheme>>({ ...DEFAULT_THEME, ...theme })
  const [applyAll, setApplyAll] = useState(false)

  const updateField = (key: string, value: string) => {
    setDraft(prev => ({ ...prev, [key]: value }))
  }

  const handleReset = () => {
    setDraft({ ...DEFAULT_THEME })
  }

  const handleApply = () => {
    const result = applyAll ? { ...draft, _applyAll: true } : draft
    onUpdate(result as Partial<SlideTheme>)
  }

  // Extract a simple color from a gradient for the color input
  const toInputColor = (val: string | undefined): string => {
    if (!val) return '#000000'
    if (val.startsWith('#') && val.length <= 9) return val
    const match = val.match(/#[0-9a-fA-F]{3,8}/)
    return match ? match[0] : '#000000'
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="w-[420px] rounded-lg border border-slate-700 bg-slate-900 p-6 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-100">テーマカラー編集</h2>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200">
            <X size={18} />
          </button>
        </div>

        {/* Color fields */}
        <div className="mb-5 space-y-3">
          {COLOR_FIELDS.map(f => (
            <div key={f.key} className="flex items-center justify-between">
              <span className="text-sm text-slate-400">{f.label}</span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={toInputColor(draft[f.key])}
                  onChange={e => updateField(f.key, e.target.value)}
                  className="h-8 w-8 cursor-pointer rounded border border-slate-700 bg-transparent"
                />
                <input
                  type="text"
                  value={draft[f.key] ?? ''}
                  onChange={e => updateField(f.key, e.target.value)}
                  className="w-44 rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-300"
                />
              </div>
            </div>
          ))}
        </div>

        {/* Live preview */}
        <div
          className="mb-5 rounded-lg border border-slate-700 p-4"
          style={{ background: draft.background ?? '#0f172a' }}
        >
          <p className="text-lg font-bold" style={{ color: draft.titleColor ?? '#fff' }}>
            タイトルプレビュー
          </p>
          <p className="mt-1 text-sm" style={{ color: draft.bodyColor ?? '#94a3b8' }}>
            本文テキストのプレビューです。
          </p>
          <div
            className="mt-2 h-1.5 w-16 rounded-full"
            style={{ backgroundColor: draft.accentColor ?? '#3b82f6' }}
          />
        </div>

        {/* Options */}
        <label className="mb-4 flex items-center gap-2 text-sm text-slate-400">
          <input
            type="checkbox"
            checked={applyAll}
            onChange={e => setApplyAll(e.target.checked)}
            className="rounded border-slate-600"
          />
          すべてのスライドに適用
        </label>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <button
            onClick={handleReset}
            className="flex items-center gap-1 rounded px-3 py-1.5 text-sm text-slate-400 hover:bg-slate-800 hover:text-slate-300"
          >
            <RotateCcw size={14} />
            リセット
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
            >
              キャンセル
            </button>
            <button
              onClick={handleApply}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-500"
            >
              適用
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
