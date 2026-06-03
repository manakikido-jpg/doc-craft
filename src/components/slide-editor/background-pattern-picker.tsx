'use client'

import { X } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
  onApply: (pattern: string) => void
}

interface PatternDef {
  label: string
  css: string
}

const PATTERNS: PatternDef[] = [
  {
    label: 'ドット',
    css: 'radial-gradient(circle, #334155 1px, transparent 1px)',
  },
  {
    label: 'グリッド',
    css: 'linear-gradient(#334155 1px, transparent 1px), linear-gradient(90deg, #334155 1px, transparent 1px)',
  },
  {
    label: '斜めストライプ',
    css: 'repeating-linear-gradient(45deg, transparent, transparent 10px, #33415520 10px, #33415520 20px)',
  },
  {
    label: '横ストライプ',
    css: 'repeating-linear-gradient(0deg, transparent, transparent 10px, #33415520 10px, #33415520 12px)',
  },
  {
    label: 'チェッカー',
    css: 'repeating-conic-gradient(#33415515 0% 25%, transparent 0% 50%) 0 0 / 20px 20px',
  },
  {
    label: 'ダイヤモンド',
    css: 'linear-gradient(45deg, #33415515 25%, transparent 25%), linear-gradient(-45deg, #33415515 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #33415515 75%), linear-gradient(-45deg, transparent 75%, #33415515 75%)',
  },
  {
    label: 'ウェーブ',
    css: 'radial-gradient(ellipse at 50% 0%, #33415520 0%, transparent 60%), radial-gradient(ellipse at 50% 100%, #33415520 0%, transparent 60%)',
  },
  {
    label: '集中線',
    css: 'conic-gradient(from 0deg at 50% 50%, #33415510 0deg, transparent 30deg, #33415510 60deg, transparent 90deg, #33415510 120deg, transparent 150deg, #33415510 180deg, transparent 210deg, #33415510 240deg, transparent 270deg, #33415510 300deg, transparent 330deg)',
  },
]

function getBackgroundSize(label: string): string {
  switch (label) {
    case 'ドット': return '20px 20px'
    case 'グリッド': return '20px 20px'
    case 'ダイヤモンド': return '20px 20px'
    default: return 'auto'
  }
}

export default function BackgroundPatternPicker({ open, onClose, onApply }: Props) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="w-[480px] rounded-lg border border-slate-700 bg-slate-900 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-700 px-5 py-3">
          <h2 className="text-base font-semibold text-slate-100">背景パターン</h2>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200">
            <X size={18} />
          </button>
        </div>

        <div className="p-4">
          <div className="grid grid-cols-4 gap-3">
            {PATTERNS.map((p, i) => (
              <button
                key={i}
                onClick={() => { onApply(p.css); onClose() }}
                className="flex flex-col items-center gap-2 rounded-lg p-2 hover:bg-slate-800 transition group"
              >
                <div
                  className="w-full h-16 rounded-lg border border-slate-700 transition-transform group-hover:scale-105"
                  style={{
                    background: p.css,
                    backgroundSize: getBackgroundSize(p.label),
                    backgroundColor: '#0f172a',
                  }}
                />
                <span className="text-[10px] text-slate-500 group-hover:text-slate-300">{p.label}</span>
              </button>
            ))}
          </div>

          <button
            onClick={() => { onApply('none'); onClose() }}
            className="w-full mt-3 py-2 rounded-lg border border-slate-700 text-xs text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition"
          >
            パターンなし（クリア）
          </button>
        </div>
      </div>
    </div>
  )
}
