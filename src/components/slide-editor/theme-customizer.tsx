'use client'

import { useState } from 'react'
import type { SlideTheme, SlideThemeKey } from '@/types'
import { SLIDE_THEMES } from '@/lib/themes'
import { Palette, X } from 'lucide-react'

interface Props {
  currentTheme: SlideThemeKey
  onApplyCustom: (customTheme: Partial<SlideTheme>) => void
  onClose: () => void
}

export default function ThemeCustomizer({ currentTheme, onApplyCustom, onClose }: Props) {
  const base = SLIDE_THEMES[currentTheme]
  const [bgColor1, setBgColor1] = useState(extractColor(base.background, 0))
  const [bgColor2, setBgColor2] = useState(extractColor(base.background, 1))
  const [titleColor, setTitleColor] = useState(base.titleColor)
  const [bodyColor, setBodyColor] = useState(base.bodyColor)
  const [accentColor, setAccentColor] = useState(base.accentColor)
  const [useGradient, setUseGradient] = useState(base.background.includes('gradient'))

  function handleApply() {
    const bg = useGradient ? `linear-gradient(135deg, ${bgColor1} 0%, ${bgColor2} 100%)` : bgColor1
    onApplyCustom({
      background: bg,
      titleColor,
      bodyColor,
      accentColor,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm mx-4 shadow-2xl p-5 animate-scale-in">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-1.5">
            <Palette size={15} className="text-slate-400" /> テーマカスタマイズ
          </h3>
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="閉じる"
          >
            <X size={16} />
          </button>
        </div>

        {/* Preview */}
        <div
          className="w-full rounded-lg mb-4 relative overflow-hidden"
          style={{
            background: useGradient ? `linear-gradient(135deg, ${bgColor1}, ${bgColor2})` : bgColor1,
            aspectRatio: '16/9',
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: '10%',
              top: '25%',
              color: titleColor,
              fontSize: '14px',
              fontWeight: 700,
            }}
          >
            プレビュータイトル
          </div>
          <div style={{ position: 'absolute', left: '10%', top: '55%', color: bodyColor, fontSize: '10px' }}>
            本文テキストのプレビュー
          </div>
          <div
            style={{
              position: 'absolute',
              right: '10%',
              bottom: '10%',
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: accentColor,
            }}
          />
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-slate-400 mb-1 block">背景色</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={bgColor1}
                onChange={(e) => setBgColor1(e.target.value)}
                className="w-8 h-8 rounded cursor-pointer border-0"
              />
              {useGradient && (
                <>
                  <span className="text-slate-600 text-xs">→</span>
                  <input
                    type="color"
                    value={bgColor2}
                    onChange={(e) => setBgColor2(e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer border-0"
                  />
                </>
              )}
              <label className="flex items-center gap-1 text-xs text-slate-400 ml-auto cursor-pointer">
                <input
                  type="checkbox"
                  checked={useGradient}
                  onChange={(e) => setUseGradient(e.target.checked)}
                  className="rounded"
                />
                グラデーション
              </label>
            </div>
          </div>

          <ColorRow label="タイトル色" value={titleColor} onChange={setTitleColor} />
          <ColorRow label="本文色" value={bodyColor} onChange={setBodyColor} />
          <ColorRow label="アクセント色" value={accentColor} onChange={setAccentColor} />
        </div>

        <div className="flex gap-2 mt-4">
          <button
            onClick={onClose}
            className="flex-1 px-3 py-2 rounded-lg border border-slate-700 text-slate-400 text-sm hover:text-white transition-colors"
          >
            キャンセル
          </button>
          <button
            onClick={handleApply}
            className="flex-1 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
          >
            適用
          </button>
        </div>
      </div>
    </div>
  )
}

function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-8 h-8 rounded cursor-pointer border-0"
      />
      <span className="text-xs text-slate-400 flex-1">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-20 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-slate-300 font-mono focus:outline-none focus:border-indigo-500"
      />
    </div>
  )
}

function extractColor(bg: string, index: number): string {
  const match = bg.match(/#[0-9a-fA-F]{6}/g)
  if (match && match[index]) return match[index]
  if (match && match[0]) return match[0]
  return bg.startsWith('#') ? bg : '#0f172a'
}
