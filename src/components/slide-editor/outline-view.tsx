'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { X, ChevronDown, ChevronRight } from 'lucide-react'
import type { Slide, SlideElement } from '@/types'

interface OutlineSection {
  id: string
  name: string
  color?: string
  startSlideIndex: number
}

interface OutlineViewProps {
  slides: Slide[]
  activeSlideId: string
  sections?: OutlineSection[]
  onSelectSlide: (id: string) => void
  onClose: () => void
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim()
}

/** Priority for text element ordering: title > subtitle > body > label */
function textPriority(type: SlideElement['type']): number {
  switch (type) {
    case 'title':
      return 0
    case 'subtitle':
      return 1
    case 'body':
      return 2
    case 'label':
      return 3
    default:
      return 99
  }
}

function isTextElement(
  el: SlideElement,
): el is Extract<SlideElement, { type: 'title' | 'subtitle' | 'body' | 'label' }> {
  return el.type === 'title' || el.type === 'subtitle' || el.type === 'body' || el.type === 'label'
}

interface SlideTextInfo {
  id: string
  type: 'title' | 'subtitle' | 'body' | 'label'
  text: string
}

function getSlideTexts(slide: Slide): SlideTextInfo[] {
  return slide.elements
    .filter(isTextElement)
    .sort((a, b) => textPriority(a.type) - textPriority(b.type))
    .map((el) => ({
      id: el.id,
      type: el.type,
      text: stripHtml(el.content),
    }))
    .filter((t) => t.text.length > 0)
}

function textStyle(type: SlideTextInfo['type']): string {
  switch (type) {
    case 'title':
      return 'text-sm font-bold text-gray-100'
    case 'subtitle':
      return 'text-xs font-semibold text-gray-300'
    case 'body':
      return 'text-xs text-gray-400'
    case 'label':
      return 'text-xs text-gray-500 italic'
  }
}

export default function OutlineView({
  slides,
  activeSlideId,
  sections,
  onSelectSlide,
  onClose,
}: OutlineViewProps) {
  const [collapsedSlides, setCollapsedSlides] = useState<Set<string>>(new Set())
  const activeRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to active slide on open
  useEffect(() => {
    const timer = setTimeout(() => {
      activeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 100)
    return () => clearTimeout(timer)
  }, [])

  const toggleCollapse = useCallback((slideId: string) => {
    setCollapsedSlides((prev) => {
      const next = new Set(prev)
      if (next.has(slideId)) {
        next.delete(slideId)
      } else {
        next.add(slideId)
      }
      return next
    })
  }, [])

  // Build section map: slideIndex -> section
  const sectionMap = useMemo(() => {
    if (!sections || sections.length === 0) return new Map<number, OutlineSection>()
    const m = new Map<number, OutlineSection>()
    for (const s of sections) {
      m.set(s.startSlideIndex, s)
    }
    return m
  }, [sections])

  return (
    <div className="flex h-full w-72 flex-col border-l border-gray-700 bg-gray-900 text-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-700 px-3 py-2">
        <span className="text-sm font-semibold">アウトライン</span>
        <button onClick={onClose} className="rounded p-0.5 hover:bg-gray-700" aria-label="閉じる">
          <X size={16} />
        </button>
      </div>

      {/* Slide list */}
      <div ref={containerRef} className="flex-1 overflow-y-auto">
        {slides.map((slide, idx) => {
          const isActive = slide.id === activeSlideId
          const isCollapsed = collapsedSlides.has(slide.id)
          const texts = getSlideTexts(slide)
          const section = sectionMap.get(idx)

          return (
            <div key={slide.id}>
              {/* Section header */}
              {section && (
                <div className="flex items-center gap-2 border-b border-gray-800 bg-gray-850 px-3 py-1.5">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: section.color || '#6366f1' }}
                  />
                  <span className="text-xs font-semibold text-gray-300">{section.name}</span>
                </div>
              )}

              {/* Slide row */}
              <div
                ref={isActive ? activeRef : undefined}
                className={`border-b border-gray-800 transition-colors ${
                  isActive ? 'border-l-2 border-l-indigo-500 bg-gray-800/60' : 'hover:bg-gray-800/40'
                }`}
              >
                {/* Slide header */}
                <div
                  className="flex cursor-pointer items-center gap-2 px-3 py-2"
                  onClick={() => onSelectSlide(slide.id)}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleCollapse(slide.id)
                    }}
                    className="rounded p-0.5 text-gray-500 hover:bg-gray-700 hover:text-gray-300"
                    aria-label={isCollapsed ? '展開' : '折りたたみ'}
                  >
                    {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                  </button>
                  <span className="text-xs font-medium text-gray-400">
                    {idx + 1}
                  </span>
                  {/* Show first title inline if collapsed */}
                  {isCollapsed && texts.length > 0 && (
                    <span className="min-w-0 flex-1 truncate text-xs text-gray-300">
                      {texts[0].text}
                    </span>
                  )}
                  {isCollapsed && texts.length === 0 && (
                    <span className="text-xs italic text-gray-600">（空のスライド）</span>
                  )}
                </div>

                {/* Text content */}
                {!isCollapsed && (
                  <div className="space-y-0.5 pb-2 pl-10 pr-3">
                    {texts.length === 0 ? (
                      <p className="text-xs italic text-gray-600">（空のスライド）</p>
                    ) : (
                      texts.map((t) => (
                        <p key={t.id} className={`truncate ${textStyle(t.type)}`}>
                          {t.text}
                        </p>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {slides.length === 0 && (
          <p className="px-3 py-4 text-center text-xs text-gray-500">スライドがありません</p>
        )}
      </div>
    </div>
  )
}
