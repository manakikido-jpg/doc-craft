'use client'

import { useState } from 'react'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import type { Slide } from '@/types'
import { SLIDE_THEMES } from '@/lib/themes'

interface SlideCompareViewProps {
  open: boolean
  onClose: () => void
  slidesA: Slide[]
  slidesB: Slide[]
  labelA?: string
  labelB?: string
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

function SlidePreview({ slide }: { slide: Slide | undefined }) {
  if (!slide) {
    return (
      <div className="flex aspect-video w-full items-center justify-center rounded-lg border border-dashed border-slate-600 bg-slate-900">
        <p className="text-sm text-slate-500">スライドなし</p>
      </div>
    )
  }

  const theme = SLIDE_THEMES[slide.themeKey] ?? SLIDE_THEMES['dark-blue']

  return (
    <div
      className="flex aspect-video w-full flex-col justify-center overflow-hidden rounded-lg border border-slate-600 px-8 py-6"
      style={{ background: slide.customTheme?.background ?? theme.background }}
    >
      <p
        className="truncate text-lg font-bold leading-tight"
        style={{ color: slide.customTheme?.titleColor ?? theme.titleColor }}
      >
        {getSlideTitle(slide)}
      </p>
      {getSlideBody(slide) && (
        <p
          className="mt-2 line-clamp-4 text-sm leading-relaxed"
          style={{ color: slide.customTheme?.bodyColor ?? theme.bodyColor }}
        >
          {getSlideBody(slide)}
        </p>
      )}
    </div>
  )
}

export default function SlideCompareView({
  open,
  onClose,
  slidesA,
  slidesB,
  labelA = '現在',
  labelB = 'バージョン1',
}: SlideCompareViewProps) {
  const [index, setIndex] = useState(0)

  if (!open) return null

  const maxLen = Math.max(slidesA.length, slidesB.length)
  const slideA = slidesA[index]
  const slideB = slidesB[index]

  function goPrev() {
    setIndex((i) => Math.max(0, i - 1))
  }

  function goNext() {
    setIndex((i) => Math.min(maxLen - 1, i + 1))
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/95">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-700 bg-slate-900 px-6 py-3">
        <h2 className="text-sm font-semibold text-white">スライド比較</h2>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-400">
            {index + 1} / {maxLen}
          </span>
          <button
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-700 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Side-by-side */}
      <div className="flex flex-1 items-center gap-6 overflow-hidden px-8 py-6">
        {/* Left side */}
        <div className="flex flex-1 flex-col gap-3">
          <p className="text-center text-sm font-medium text-indigo-400">
            {labelA}
          </p>
          <SlidePreview slide={slideA} />
          {slideA?.notes && (
            <p className="line-clamp-2 text-xs text-slate-500">
              ノート: {slideA.notes}
            </p>
          )}
        </div>

        {/* Divider */}
        <div className="h-3/4 w-px bg-slate-700" />

        {/* Right side */}
        <div className="flex flex-1 flex-col gap-3">
          <p className="text-center text-sm font-medium text-amber-400">
            {labelB}
          </p>
          <SlidePreview slide={slideB} />
          {slideB?.notes && (
            <p className="line-clamp-2 text-xs text-slate-500">
              ノート: {slideB.notes}
            </p>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-center gap-4 border-t border-slate-700 bg-slate-900 px-6 py-4">
        <button
          onClick={goPrev}
          disabled={index === 0}
          className="flex items-center gap-1 rounded-lg bg-slate-700 px-4 py-2 text-sm text-white transition-colors hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft size={16} />
          前へ
        </button>

        {/* Dot indicators */}
        <div className="flex items-center gap-1.5">
          {Array.from({ length: maxLen }, (_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              className={`h-2 w-2 rounded-full transition-colors ${
                i === index ? 'bg-indigo-500' : 'bg-slate-600 hover:bg-slate-500'
              }`}
            />
          ))}
        </div>

        <button
          onClick={goNext}
          disabled={index >= maxLen - 1}
          className="flex items-center gap-1 rounded-lg bg-slate-700 px-4 py-2 text-sm text-white transition-colors hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          次へ
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}
