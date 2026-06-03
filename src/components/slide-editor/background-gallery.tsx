'use client'

import { useState, useRef } from 'react'
import { X, Upload, Check } from 'lucide-react'

interface BackgroundGalleryProps {
  onApply: (background: string) => void
  onApplyImage: (url: string, fit: 'cover' | 'contain' | 'stretch') => void
  onClose: () => void
}

type Tab = 'solid' | 'gradient' | 'pattern'

const SOLID_COLORS = [
  '#0f172a', '#1e293b', '#334155', '#1e1b4b', '#312e81', '#4c1d95',
  '#064e3b', '#065f46', '#14532d', '#78350f', '#92400e', '#9a3412',
  '#7f1d1d', '#881337', '#831843', '#ffffff', '#f8fafc', '#e2e8f0',
  '#0ea5e9', '#06b6d4', '#14b8a6', '#22c55e', '#eab308', '#f97316',
]

const GRADIENTS = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
  'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)',
  'linear-gradient(135deg, #1e1b4b 0%, #4c1d95 100%)',
  'linear-gradient(135deg, #064e3b 0%, #065f46 100%)',
  'linear-gradient(135deg, #0c0c0c 0%, #1a1a2e 100%)',
  'linear-gradient(135deg, #ff9a9e 0%, #fad0c4 100%)',
  'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
]

const PATTERNS: { label: string; css: string }[] = [
  {
    label: 'ドット',
    css: 'radial-gradient(circle, #ffffff10 1px, transparent 1px)',
  },
  {
    label: 'ライン',
    css: 'repeating-linear-gradient(0deg, transparent, transparent 19px, #ffffff10 19px, #ffffff10 20px)',
  },
  {
    label: 'グリッド',
    css: 'repeating-linear-gradient(0deg, transparent, transparent 19px, #ffffff10 19px, #ffffff10 20px), repeating-linear-gradient(90deg, transparent, transparent 19px, #ffffff10 19px, #ffffff10 20px)',
  },
  {
    label: '斜線',
    css: 'repeating-linear-gradient(45deg, transparent, transparent 9px, #ffffff10 9px, #ffffff10 10px)',
  },
  {
    label: 'チェッカー',
    css: 'repeating-conic-gradient(#ffffff08 0% 25%, transparent 0% 50%) 0 0 / 20px 20px',
  },
  {
    label: 'ウェーブ',
    css: 'repeating-linear-gradient(135deg, transparent, transparent 14px, #ffffff08 14px, #ffffff08 16px)',
  },
]

export default function BackgroundGallery({ onApply, onApplyImage, onClose }: BackgroundGalleryProps) {
  const [tab, setTab] = useState<Tab>('solid')
  const [customColor, setCustomColor] = useState('#1e293b')
  const [imageFit, setImageFit] = useState<'cover' | 'contain' | 'stretch'>('cover')
  const [selected, setSelected] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const tabs: { key: Tab; label: string }[] = [
    { key: 'solid', label: 'ソリッド' },
    { key: 'gradient', label: 'グラデーション' },
    { key: 'pattern', label: 'パターン' },
  ]

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    onApplyImage(url, imageFit)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="w-[560px] max-h-[80vh] flex flex-col rounded-lg border border-slate-700 bg-slate-900 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-700 px-5 py-3">
          <h2 className="text-lg font-semibold text-slate-100">背景ギャラリー</h2>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200">
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-700">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 py-2 text-sm transition ${
                tab === t.key
                  ? 'border-b-2 border-blue-500 text-blue-400'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {tab === 'solid' && (
            <div className="grid grid-cols-8 gap-2">
              {SOLID_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => { setSelected(c); onApply(c) }}
                  className={`relative h-10 w-full rounded border transition hover:scale-105 ${
                    selected === c ? 'border-blue-500 ring-2 ring-blue-500/40' : 'border-slate-700'
                  }`}
                  style={{ background: c }}
                >
                  {selected === c && (
                    <Check size={14} className="absolute inset-0 m-auto text-white drop-shadow" />
                  )}
                </button>
              ))}
            </div>
          )}

          {tab === 'gradient' && (
            <div className="grid grid-cols-4 gap-3">
              {GRADIENTS.map(g => (
                <button
                  key={g}
                  onClick={() => { setSelected(g); onApply(g) }}
                  className={`relative h-16 w-full rounded-lg border transition hover:scale-105 ${
                    selected === g ? 'border-blue-500 ring-2 ring-blue-500/40' : 'border-slate-700'
                  }`}
                  style={{ background: g }}
                >
                  {selected === g && (
                    <Check size={14} className="absolute inset-0 m-auto text-white drop-shadow" />
                  )}
                </button>
              ))}
            </div>
          )}

          {tab === 'pattern' && (
            <div className="grid grid-cols-3 gap-3">
              {PATTERNS.map(p => (
                <button
                  key={p.label}
                  onClick={() => { setSelected(p.css); onApply(`#1e293b`); onApply(p.css) }}
                  className={`relative flex h-20 flex-col items-center justify-end rounded-lg border pb-1 transition hover:scale-105 ${
                    selected === p.css ? 'border-blue-500 ring-2 ring-blue-500/40' : 'border-slate-700'
                  }`}
                  style={{ background: `${p.css}, #1e293b` }}
                >
                  <span className="rounded bg-black/50 px-1.5 text-[10px] text-slate-300">{p.label}</span>
                </button>
              ))}
            </div>
          )}

          {/* Custom color & Image upload */}
          <div className="mt-4 flex items-center gap-3 border-t border-slate-700 pt-4">
            <label className="flex items-center gap-2 text-sm text-slate-400">
              カスタム
              <input
                type="color"
                value={customColor}
                onChange={e => setCustomColor(e.target.value)}
                className="h-8 w-8 cursor-pointer rounded border border-slate-700 bg-transparent"
              />
              <button
                onClick={() => onApply(customColor)}
                className="rounded border border-slate-600 px-2 py-1 text-xs text-slate-300 hover:bg-slate-800"
              >
                適用
              </button>
            </label>

            <div className="ml-auto flex items-center gap-2">
              <select
                value={imageFit}
                onChange={e => setImageFit(e.target.value as 'cover' | 'contain' | 'stretch')}
                className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-300"
              >
                <option value="cover">Cover</option>
                <option value="contain">Contain</option>
                <option value="stretch">Stretch</option>
              </select>
              <button
                onClick={() => fileRef.current?.click()}
                className="flex items-center gap-1 rounded border border-slate-600 px-3 py-1 text-xs text-slate-300 hover:bg-slate-800"
              >
                <Upload size={14} />
                画像
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
