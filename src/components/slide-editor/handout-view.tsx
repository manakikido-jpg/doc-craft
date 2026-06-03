'use client'

import { useState } from 'react'
import { X, Printer, LayoutGrid } from 'lucide-react'
import type { Slide, SlideTheme } from '@/types'
import { SLIDE_THEMES } from '@/lib/themes'

interface HandoutViewProps {
  slides: Slide[]
  layout: '1' | '2' | '4' | '6'
  onClose: () => void
  onPrint: () => void
}

const LAYOUT_OPTIONS: { value: '1' | '2' | '4' | '6'; label: string; cols: number }[] = [
  { value: '1', label: '1枚/ページ', cols: 1 },
  { value: '2', label: '2枚/ページ', cols: 1 },
  { value: '4', label: '4枚/ページ', cols: 2 },
  { value: '6', label: '6枚/ページ', cols: 2 },
]

function getTheme(slide: Slide): SlideTheme {
  return SLIDE_THEMES[slide.themeKey] ?? SLIDE_THEMES['dark-blue']
}

function MiniSlide({ slide }: { slide: Slide }) {
  const theme = getTheme(slide)
  const titleEl = slide.elements.find(
    el => el.type === 'title' || el.type === 'subtitle'
  )
  const bodyEl = slide.elements.find(el => el.type === 'body')

  return (
    <div
      className="flex aspect-video w-full flex-col justify-center overflow-hidden rounded border border-slate-600 px-3 py-2"
      style={{ background: slide.customTheme?.background ?? theme.background }}
    >
      {titleEl && 'content' in titleEl && (
        <p
          className="truncate text-[10px] font-bold leading-tight"
          style={{ color: slide.customTheme?.titleColor ?? theme.titleColor }}
        >
          {titleEl.content}
        </p>
      )}
      {bodyEl && 'content' in bodyEl && (
        <p
          className="mt-0.5 line-clamp-2 text-[7px] leading-tight"
          style={{ color: slide.customTheme?.bodyColor ?? theme.bodyColor }}
        >
          {bodyEl.content}
        </p>
      )}
    </div>
  )
}

export default function HandoutView({ slides, layout: initialLayout, onClose, onPrint }: HandoutViewProps) {
  const [layout, setLayout] = useState(initialLayout)
  const option = LAYOUT_OPTIONS.find(o => o.value === layout)!
  const perPage = Number(layout)
  const showNotes = layout === '2'

  // Split slides into pages
  const pages: Slide[][] = []
  for (let i = 0; i < slides.length; i += perPage) {
    pages.push(slides.slice(i, i + perPage))
  }

  const handlePrint = () => {
    onPrint()
    window.print()
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/95">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-slate-700 bg-slate-900 px-5 py-3 print:hidden">
        <div className="flex items-center gap-3">
          <LayoutGrid size={18} className="text-slate-400" />
          <h2 className="text-lg font-semibold text-slate-100">配布資料プレビュー</h2>
        </div>
        <div className="flex items-center gap-3">
          {/* Layout selector */}
          <div className="flex rounded-lg border border-slate-700 bg-slate-800">
            {LAYOUT_OPTIONS.map(o => (
              <button
                key={o.value}
                onClick={() => setLayout(o.value)}
                className={`px-3 py-1.5 text-xs transition ${
                  layout === o.value
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-500"
          >
            <Printer size={16} />
            印刷
          </button>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200">
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Preview area */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-3xl space-y-8">
          {pages.map((pageSlides, pageIdx) => (
            <div
              key={pageIdx}
              className="rounded-lg border border-slate-700 bg-white p-6 shadow-lg print:border-0 print:shadow-none"
            >
              <div
                className={`grid gap-4 ${
                  option.cols === 2 ? 'grid-cols-2' : 'grid-cols-1'
                }`}
              >
                {pageSlides.map((slide, sIdx) => (
                  <div key={slide.id} className="flex gap-3">
                    {/* Slide number */}
                    <span className="mt-1 shrink-0 text-xs font-medium text-slate-400">
                      {pageIdx * perPage + sIdx + 1}
                    </span>

                    {/* Slide thumbnail */}
                    <div className={showNotes ? 'w-1/2' : 'flex-1'}>
                      <MiniSlide slide={slide} />
                    </div>

                    {/* Notes lines */}
                    {showNotes && (
                      <div className="flex w-1/2 flex-col justify-start gap-2 pt-1">
                        {slide.notes ? (
                          <p className="text-[8px] leading-relaxed text-slate-600">{slide.notes}</p>
                        ) : (
                          Array.from({ length: 5 }, (_, i) => (
                            <div key={i} className="h-px w-full border-b border-dashed border-slate-300" />
                          ))
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Page number */}
              <p className="mt-4 text-center text-[10px] text-slate-400">
                {pageIdx + 1} / {pages.length}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
