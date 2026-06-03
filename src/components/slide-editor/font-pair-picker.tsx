'use client'

import { X, Check } from 'lucide-react'
import { useState } from 'react'

interface Props {
  open: boolean
  onClose: () => void
  onApply: (titleFont: string, bodyFont: string) => void
}

interface FontPair {
  label: string
  description: string
  titleFont: string
  bodyFont: string
}

const FONT_PAIRS: FontPair[] = [
  {
    label: 'モダン',
    description: 'すっきりとした現代的な印象',
    titleFont: 'Noto Sans JP',
    bodyFont: 'Inter',
  },
  {
    label: 'クラシック',
    description: '格式ある上品なデザイン',
    titleFont: 'Noto Serif JP',
    bodyFont: 'Noto Sans JP',
  },
  {
    label: 'ミニマル',
    description: '統一感のあるシンプルさ',
    titleFont: 'Inter',
    bodyFont: 'Inter',
  },
  {
    label: 'プレゼン',
    description: 'インパクトのある発表向け',
    titleFont: 'Montserrat',
    bodyFont: 'Open Sans',
  },
  {
    label: '和風',
    description: '日本語の美しさを引き立てる',
    titleFont: 'Noto Serif JP',
    bodyFont: 'Noto Sans JP',
  },
  {
    label: 'テック',
    description: '技術・エンジニア向け',
    titleFont: 'JetBrains Mono',
    bodyFont: 'Inter',
  },
]

export default function FontPairPicker({ open, onClose, onApply }: Props) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="w-[520px] max-h-[80vh] flex flex-col rounded-lg border border-slate-700 bg-slate-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-700 px-5 py-3">
          <h2 className="text-lg font-semibold text-slate-100">フォントペア</h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          >
            <X size={18} />
          </button>
        </div>

        {/* Font pair list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {FONT_PAIRS.map((pair, index) => {
            const isSelected = selectedIndex === index
            return (
              <button
                key={pair.label + pair.titleFont}
                onClick={() => {
                  setSelectedIndex(index)
                  onApply(pair.titleFont, pair.bodyFont)
                }}
                className={`w-full flex items-start gap-4 rounded-lg border-2 p-4 text-left transition hover:bg-slate-800/50 ${
                  isSelected
                    ? 'border-indigo-500 bg-slate-800/30'
                    : 'border-slate-700 hover:border-slate-600'
                }`}
              >
                {/* Preview */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-indigo-400">{pair.label}</span>
                    <span className="text-[10px] text-slate-500">{pair.description}</span>
                  </div>
                  <div
                    className="text-lg font-bold text-slate-100 truncate leading-tight"
                    style={{ fontFamily: `"${pair.titleFont}", sans-serif` }}
                  >
                    タイトルのサンプルテキスト
                  </div>
                  <div
                    className="text-sm text-slate-400 mt-1 truncate"
                    style={{ fontFamily: `"${pair.bodyFont}", sans-serif` }}
                  >
                    本文のサンプルテキストです。Body text sample here.
                  </div>
                  <div className="mt-2 flex gap-3 text-[10px] text-slate-600">
                    <span>見出し: {pair.titleFont}</span>
                    <span>本文: {pair.bodyFont}</span>
                  </div>
                </div>

                {/* Check */}
                {isSelected && (
                  <div className="flex-shrink-0 mt-1">
                    <Check size={18} className="text-indigo-400" />
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
