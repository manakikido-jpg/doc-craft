'use client'

import { useState, useMemo } from 'react'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import type { Slide, SlideElement } from '@/types'
import { SLIDE_THEMES } from '@/lib/themes'

interface Props {
  open: boolean
  onClose: () => void
  slidesA: Slide[]
  slidesB: Slide[]
  labelA?: string
  labelB?: string
}

type DiffStatus = 'added' | 'removed' | 'modified' | 'unchanged'

interface ElementDiff {
  element: SlideElement
  status: DiffStatus
}

function diffSlideElements(
  elemsA: SlideElement[],
  elemsB: SlideElement[]
): { diffsA: ElementDiff[]; diffsB: ElementDiff[] } {
  const aIds = new Set(elemsA.map((e) => e.id))
  const bIds = new Set(elemsB.map((e) => e.id))

  const diffsA: ElementDiff[] = elemsA.map((el) => {
    if (!bIds.has(el.id)) {
      return { element: el, status: 'removed' as DiffStatus }
    }
    const bEl = elemsB.find((b) => b.id === el.id)
    if (!bEl) return { element: el, status: 'removed' as DiffStatus }

    // Compare key properties
    const changed = hasElementChanged(el, bEl)
    return { element: el, status: changed ? 'modified' : 'unchanged' }
  })

  const diffsB: ElementDiff[] = elemsB.map((el) => {
    if (!aIds.has(el.id)) {
      return { element: el, status: 'added' as DiffStatus }
    }
    const aEl = elemsA.find((a) => a.id === el.id)
    if (!aEl) return { element: el, status: 'added' as DiffStatus }

    const changed = hasElementChanged(aEl, el)
    return { element: el, status: changed ? 'modified' : 'unchanged' }
  })

  return { diffsA, diffsB }
}

function hasElementChanged(a: SlideElement, b: SlideElement): boolean {
  if (a.type !== b.type) return true
  if (a.type === 'connector' || b.type === 'connector') {
    return JSON.stringify(a) !== JSON.stringify(b)
  }
  if (a.x !== b.x || a.y !== b.y || a.w !== b.w || a.h !== b.h) return true
  if ('content' in a && 'content' in b && a.content !== b.content) return true
  if ('src' in a && 'src' in b && a.src !== b.src) return true
  if ('fill' in a && 'fill' in b && a.fill !== b.fill) return true
  if (a.rotation !== b.rotation) return true
  if (a.opacity !== b.opacity) return true
  return false
}

function getDiffBorderColor(status: DiffStatus): string {
  switch (status) {
    case 'added':
      return '#22c55e'
    case 'removed':
      return '#ef4444'
    case 'modified':
      return '#eab308'
    default:
      return 'transparent'
  }
}

function getDiffLabel(status: DiffStatus): string {
  switch (status) {
    case 'added':
      return 'Added'
    case 'removed':
      return 'Removed'
    case 'modified':
      return 'Modified'
    default:
      return ''
  }
}

function getSlideTitle(slide: Slide): string {
  const titleEl = slide.elements.find(
    (el) => el.type === 'title' || el.type === 'subtitle'
  )
  if (titleEl && 'content' in titleEl && titleEl.content) {
    return titleEl.content.replace(/<[^>]*>/g, '')
  }
  return '(Untitled)'
}

function SlideWithDiff({
  slide,
  diffs,
  label,
  labelColor,
}: {
  slide: Slide | undefined
  diffs: ElementDiff[]
  label: string
  labelColor: string
}) {
  if (!slide) {
    return (
      <div className="flex aspect-video w-full items-center justify-center rounded-lg border border-dashed border-slate-600 bg-slate-900">
        <p className="text-sm text-slate-500">No slide</p>
      </div>
    )
  }

  const themeData = SLIDE_THEMES[slide.themeKey] ?? SLIDE_THEMES['dark-blue']
  const theme = slide.customTheme ? { ...themeData, ...slide.customTheme } : themeData

  const changedCount = diffs.filter((d) => d.status !== 'unchanged').length

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium" style={{ color: labelColor }}>
          {label}
        </p>
        {changedCount > 0 && (
          <span className="text-xs text-slate-400">
            {changedCount} change{changedCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>
      <div
        className="relative aspect-video w-full overflow-hidden rounded-lg border border-slate-600"
        style={{ background: theme.background }}
      >
        {diffs.map((diff) => {
          const el = diff.element
          if (el.type === 'connector') return null
          const borderColor = getDiffBorderColor(diff.status)
          const showBorder = diff.status !== 'unchanged'

          return (
            <div
              key={el.id}
              className="absolute"
              style={{
                left: `${el.x}%`,
                top: `${el.y}%`,
                width: `${el.w}%`,
                height: `${el.h}%`,
                border: showBorder ? `2px solid ${borderColor}` : 'none',
                borderRadius: '2px',
                backgroundColor: showBorder
                  ? `${borderColor}15`
                  : 'transparent',
              }}
            >
              {/* Element content preview */}
              {'content' in el && (
                <div
                  className="w-full h-full overflow-hidden p-1"
                  style={{
                    fontSize: 'clamp(6px, 1vw, 12px)',
                    color: theme.bodyColor,
                  }}
                >
                  <span
                    dangerouslySetInnerHTML={{
                      __html: (el as any).content || '',
                    }}
                  />
                </div>
              )}
              {el.type === 'image' && (
                <img
                  src={el.src}
                  alt=""
                  className="w-full h-full object-contain"
                />
              )}
              {el.type === 'shape' && (
                <div
                  className="w-full h-full rounded"
                  style={{ backgroundColor: el.fill }}
                />
              )}
              {/* Diff label */}
              {showBorder && (
                <div
                  className="absolute -top-4 left-0 px-1 py-0.5 text-[8px] font-bold rounded text-white"
                  style={{ backgroundColor: borderColor }}
                >
                  {getDiffLabel(diff.status)}
                </div>
              )}
            </div>
          )
        })}
      </div>
      <p
        className="truncate text-xs text-slate-400"
        title={getSlideTitle(slide)}
      >
        {getSlideTitle(slide)}
      </p>
    </div>
  )
}

export default function SlideVersionCompare({
  open,
  onClose,
  slidesA,
  slidesB,
  labelA = 'Current',
  labelB = 'Previous',
}: Props) {
  const [index, setIndex] = useState(0)

  const maxLen = Math.max(slidesA.length, slidesB.length)
  const slideA = slidesA[index]
  const slideB = slidesB[index]

  const { diffsA, diffsB } = useMemo(() => {
    if (!slideA && !slideB) return { diffsA: [], diffsB: [] }
    const elemsA = slideA?.elements || []
    const elemsB = slideB?.elements || []
    return diffSlideElements(elemsA, elemsB)
  }, [slideA, slideB])

  // Summary stats
  const totalAdded = diffsB.filter((d) => d.status === 'added').length
  const totalRemoved = diffsA.filter((d) => d.status === 'removed').length
  const totalModified = diffsA.filter((d) => d.status === 'modified').length

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/95">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-700 bg-slate-900 px-6 py-3">
        <h2 className="text-sm font-semibold text-white">
          Version Compare
        </h2>
        <div className="flex items-center gap-4">
          {/* Legend */}
          <div className="flex items-center gap-3 text-[10px]">
            {totalAdded > 0 && (
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-green-400">Added ({totalAdded})</span>
              </span>
            )}
            {totalRemoved > 0 && (
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-red-400">Removed ({totalRemoved})</span>
              </span>
            )}
            {totalModified > 0 && (
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-yellow-500" />
                <span className="text-yellow-400">
                  Modified ({totalModified})
                </span>
              </span>
            )}
          </div>
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

      {/* Side-by-side with diffs */}
      <div className="flex flex-1 items-center gap-6 overflow-hidden px-8 py-6">
        <div className="flex-1">
          <SlideWithDiff
            slide={slideA}
            diffs={diffsA}
            label={labelA}
            labelColor="#818cf8"
          />
        </div>
        <div className="h-3/4 w-px bg-slate-700" />
        <div className="flex-1">
          <SlideWithDiff
            slide={slideB}
            diffs={diffsB}
            label={labelB}
            labelColor="#f59e0b"
          />
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-center gap-4 border-t border-slate-700 bg-slate-900 px-6 py-4">
        <button
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={index === 0}
          className="flex items-center gap-1 rounded-lg bg-slate-700 px-4 py-2 text-sm text-white transition-colors hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft size={16} />
          Prev
        </button>
        <div className="flex items-center gap-1.5">
          {Array.from({ length: maxLen }, (_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              className={`h-2 w-2 rounded-full transition-colors ${
                i === index
                  ? 'bg-indigo-500'
                  : 'bg-slate-600 hover:bg-slate-500'
              }`}
            />
          ))}
        </div>
        <button
          onClick={() => setIndex((i) => Math.min(maxLen - 1, i + 1))}
          disabled={index >= maxLen - 1}
          className="flex items-center gap-1 rounded-lg bg-slate-700 px-4 py-2 text-sm text-white transition-colors hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}
