'use client'

import { X, Printer } from 'lucide-react'
import type { Slide } from '@/types'
import { SLIDE_THEMES } from '@/lib/themes'

interface SlideNotesPrintProps {
  slides: Slide[]
  onClose: () => void
}

function getSlideTitle(slide: Slide): string {
  const titleEl = slide.elements.find(
    (el) => el.type === 'title' || el.type === 'subtitle',
  )
  if (titleEl && 'content' in titleEl && titleEl.content) {
    return titleEl.content
  }
  return '(無題)'
}

function getSlideBody(slide: Slide): string {
  const bodyEl = slide.elements.find((el) => el.type === 'body')
  if (bodyEl && 'content' in bodyEl && bodyEl.content) {
    return bodyEl.content
  }
  return ''
}

function MiniSlide({ slide, index }: { slide: Slide; index: number }) {
  const theme = SLIDE_THEMES[slide.themeKey] ?? SLIDE_THEMES['dark-blue']

  return (
    <div
      className="flex aspect-video w-full flex-col justify-center overflow-hidden rounded border border-slate-300 px-4 py-3 print:border-gray-400"
      style={{ background: slide.customTheme?.background ?? theme.background }}
    >
      <p
        className="truncate text-xs font-bold leading-tight"
        style={{ color: slide.customTheme?.titleColor ?? theme.titleColor }}
      >
        {getSlideTitle(slide)}
      </p>
      {getSlideBody(slide) && (
        <p
          className="mt-1 line-clamp-3 text-[9px] leading-tight"
          style={{ color: slide.customTheme?.bodyColor ?? theme.bodyColor }}
        >
          {getSlideBody(slide)}
        </p>
      )}
    </div>
  )
}

export default function SlideNotesPrint({ slides, onClose }: SlideNotesPrintProps) {
  function handlePrint() {
    window.print()
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/95 print:static print:bg-white">
      {/* Toolbar - hidden in print */}
      <div className="flex items-center justify-between border-b border-slate-700 bg-slate-900 px-5 py-3 print:hidden">
        <h2 className="text-sm font-semibold text-white">ノート付き印刷プレビュー</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
          >
            <Printer size={14} />
            印刷
          </button>
          <button
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-700 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 print:overflow-visible print:p-0">
        <div className="mx-auto max-w-3xl space-y-8 print:max-w-none print:space-y-0">
          {slides.map((slide, i) => (
            <div
              key={slide.id}
              className="rounded-lg bg-slate-800 p-5 print:rounded-none print:border-b print:border-gray-300 print:bg-white print:p-6"
              style={{ pageBreakAfter: 'always' }}
            >
              {/* Slide number */}
              <p className="mb-2 text-xs font-medium text-slate-500 print:text-gray-500">
                スライド {i + 1}
              </p>

              {/* Thumbnail */}
              <div className="w-full max-w-sm">
                <MiniSlide slide={slide} index={i} />
              </div>

              {/* Notes */}
              <div className="mt-4 border-t border-slate-700 pt-3 print:border-gray-300">
                <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-slate-500 print:text-gray-500">
                  ノート
                </p>
                {slide.notes ? (
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-300 print:text-black">
                    {slide.notes}
                  </p>
                ) : (
                  <p className="text-sm italic text-slate-600 print:text-gray-400">
                    ノートなし
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Print-only styles */}
      <style>{`
        @media print {
          body > *:not(.fixed) { display: none !important; }
          .fixed { position: static !important; }
        }
      `}</style>
    </div>
  )
}
