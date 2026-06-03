'use client'

import { useState } from 'react'
import { X, Download, Image as ImageIcon } from 'lucide-react'
import type { Slide } from '@/types'
import { SLIDE_THEMES } from '@/lib/themes'

interface Props {
  open: boolean
  onClose: () => void
  slides: Slide[]
  activeSlideIndex: number
  onExportSlide: (slideIndex: number) => void
  onExportAll: () => void
}

const RESOLUTIONS = [
  { key: '1x' as const, label: '1x', desc: '960 x 540' },
  { key: '2x' as const, label: '2x', desc: '1920 x 1080' },
  { key: '4x' as const, label: '4x', desc: '3840 x 2160' },
] as const

export default function SingleSlideExport({
  open,
  onClose,
  slides,
  activeSlideIndex,
  onExportSlide,
  onExportAll,
}: Props) {
  const [selectedIndex, setSelectedIndex] = useState(activeSlideIndex)
  const [resolution, setResolution] = useState<'1x' | '2x' | '4x'>('2x')

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="w-[560px] max-h-[80vh] rounded-lg border border-slate-700 bg-slate-900 p-6 shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between flex-shrink-0">
          <h2 className="text-lg font-semibold text-slate-100">スライド画像エクスポート</h2>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200">
            <X size={18} />
          </button>
        </div>

        {/* Slide thumbnails grid */}
        <div className="mb-4 overflow-y-auto flex-1 min-h-0">
          <div className="grid grid-cols-4 gap-2">
            {slides.map((slide, index) => {
              const theme = slide.customTheme
                ? { ...SLIDE_THEMES[slide.themeKey], ...slide.customTheme }
                : SLIDE_THEMES[slide.themeKey]
              const isSelected = selectedIndex === index
              const isActive = activeSlideIndex === index

              return (
                <button
                  key={slide.id}
                  onClick={() => setSelectedIndex(index)}
                  className={`relative rounded-lg border-2 p-1 transition ${
                    isSelected
                      ? 'border-blue-500 bg-blue-500/10'
                      : isActive
                        ? 'border-amber-500/50 bg-slate-800'
                        : 'border-slate-700 hover:border-slate-600 bg-slate-800'
                  }`}
                >
                  <div
                    className="aspect-video rounded"
                    style={{ background: theme.background }}
                  >
                    <div className="flex h-full items-center justify-center">
                      <span className="text-[10px] font-medium" style={{ color: theme.titleColor }}>
                        {index + 1}
                      </span>
                    </div>
                  </div>
                  {isActive && (
                    <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-amber-500 border border-slate-900" />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Resolution selector */}
        <div className="mb-4 flex-shrink-0">
          <label className="mb-2 block text-xs font-medium text-slate-400">解像度</label>
          <div className="flex gap-2">
            {RESOLUTIONS.map((res) => (
              <button
                key={res.key}
                onClick={() => setResolution(res.key)}
                className={`flex-1 rounded-lg border px-3 py-2 text-center transition ${
                  resolution === res.key
                    ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                    : 'border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-300'
                }`}
              >
                <div className="text-sm font-medium">{res.label}</div>
                <div className="text-[10px] text-slate-500">{res.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Format info */}
        <div className="mb-4 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-center flex-shrink-0">
          <span className="text-xs text-slate-500">フォーマット: PNG</span>
          <span className="mx-2 text-slate-600">|</span>
          <span className="text-xs text-slate-500">選択中: スライド {selectedIndex + 1}</span>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 flex-shrink-0">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
          >
            キャンセル
          </button>
          <button
            onClick={() => {
              onExportAll()
              onClose()
            }}
            className="flex items-center gap-1.5 rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
          >
            <ImageIcon size={14} />
            全スライドを一括エクスポート
          </button>
          <button
            onClick={() => {
              onExportSlide(selectedIndex)
              onClose()
            }}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-500"
          >
            <Download size={14} />
            選択スライドをエクスポート
          </button>
        </div>
      </div>
    </div>
  )
}
