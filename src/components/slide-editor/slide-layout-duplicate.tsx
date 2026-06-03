'use client'

import { useState } from 'react'
import { X, Copy, LayoutGrid } from 'lucide-react'
import type { Slide, SlideThemeKey } from '@/types'

interface LayoutOption {
  id: string
  label: string
  icon: string
  description: string
}

const LAYOUTS: LayoutOption[] = [
  { id: 'title', label: 'タイトル', icon: '📝', description: 'タイトルとサブタイトル' },
  { id: 'content', label: 'コンテンツ', icon: '📄', description: 'タイトルと本文' },
  { id: 'two-column', label: '2列', icon: '📊', description: '2列レイアウト' },
  { id: 'blank', label: '白紙', icon: '⬜', description: '空白スライド' },
  { id: 'image-text', label: '画像+テキスト', icon: '🖼️', description: '左画像、右テキスト' },
  { id: 'section', label: 'セクション', icon: '📌', description: 'セクション区切り' },
]

interface Props {
  open: boolean
  onClose: () => void
  currentSlide: Slide
  onDuplicate: (layoutId: string) => void
}

export default function SlideLayoutDuplicate({ open, onClose, currentSlide, onDuplicate }: Props) {
  const [selectedLayout, setSelectedLayout] = useState<string | null>(null)

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="w-[480px] rounded-lg border border-slate-700 bg-slate-900 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-700 px-5 py-3">
          <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <Copy size={18} /> スライドの複製
          </h2>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200">
            <X size={18} />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <p className="text-sm text-slate-400">レイアウトを選んで複製:</p>

          <div className="grid grid-cols-3 gap-2">
            {LAYOUTS.map(layout => (
              <button
                key={layout.id}
                onClick={() => setSelectedLayout(layout.id)}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition hover:bg-slate-800 ${
                  selectedLayout === layout.id
                    ? 'border-indigo-500 bg-slate-800/50'
                    : 'border-slate-700'
                }`}
              >
                <span className="text-2xl">{layout.icon}</span>
                <span className="text-xs text-slate-300">{layout.label}</span>
                <span className="text-[10px] text-slate-500">{layout.description}</span>
              </button>
            ))}
          </div>

          <div className="flex justify-between pt-2">
            <button
              onClick={() => { onDuplicate('same'); onClose() }}
              className="text-sm text-slate-400 hover:text-slate-200 px-3 py-1.5 rounded hover:bg-slate-800"
            >
              同じレイアウトで複製
            </button>
            <button
              onClick={() => {
                if (selectedLayout) { onDuplicate(selectedLayout); onClose() }
              }}
              disabled={!selectedLayout}
              className={`rounded-lg px-4 py-1.5 text-sm text-white transition ${
                selectedLayout ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-slate-700 text-slate-500 cursor-not-allowed'
              }`}
            >
              複製
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
