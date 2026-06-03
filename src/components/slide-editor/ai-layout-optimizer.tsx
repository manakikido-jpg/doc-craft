'use client'

import { useState, useMemo, useCallback } from 'react'
import { X, LayoutGrid, AlertTriangle, Ruler, AlignCenter, Type, ImageIcon, Zap, Check, RotateCcw } from 'lucide-react'
import type { Slide, SlideElement, SlideTextElement } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  slide: Slide
  onApplyLayout: (elements: SlideElement[]) => void
}

interface LayoutIssue {
  id: string
  icon: 'overlap' | 'align' | 'spacing' | 'text' | 'margin'
  severity: 'warning' | 'info' | 'improvement'
  title: string
  description: string
  affectedElementIds: string[]
}

function isTextElement(el: SlideElement): el is SlideTextElement {
  return el.type === 'title' || el.type === 'subtitle' || el.type === 'body' || el.type === 'label'
}

function hasPosition(el: SlideElement): el is SlideElement & { x: number; y: number; w: number; h: number } {
  return 'x' in el && 'y' in el && 'w' in el && 'h' in el
}

function computeOverlapPercent(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
): number {
  const overlapX = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x))
  const overlapY = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y))
  const overlapArea = overlapX * overlapY
  const minArea = Math.min(a.w * a.h, b.w * b.h)
  if (minArea === 0) return 0
  return (overlapArea / minArea) * 100
}

function analyzeSlide(slide: Slide): LayoutIssue[] {
  const issues: LayoutIssue[] = []
  const elements = slide.elements.filter(hasPosition)

  // 1. Overlapping elements
  for (let i = 0; i < elements.length; i++) {
    for (let j = i + 1; j < elements.length; j++) {
      const a = elements[i]
      const b = elements[j]
      // Skip connectors
      if (a.type === 'connector' || b.type === 'connector') continue
      const overlap = computeOverlapPercent(a, b)
      if (overlap > 10) {
        issues.push({
          id: `overlap-${a.id}-${b.id}`,
          icon: 'overlap',
          severity: 'warning',
          title: '要素の重なり検出',
          description: `要素が${Math.round(overlap)}%重なっています。自動修正で再配置できます。`,
          affectedElementIds: [a.id, b.id],
        })
      }
    }
  }

  // 2. Alignment check - find elements that are nearly aligned (within 2%)
  const xPositions = elements.map(el => el.x)
  const centerXPositions = elements.map(el => el.x + el.w / 2)
  for (let i = 0; i < elements.length; i++) {
    for (let j = i + 1; j < elements.length; j++) {
      const a = elements[i]
      const b = elements[j]
      if (a.type === 'connector' || b.type === 'connector') continue
      // Check left edge alignment
      const xDiff = Math.abs(a.x - b.x)
      if (xDiff > 0.1 && xDiff < 2) {
        issues.push({
          id: `align-x-${a.id}-${b.id}`,
          icon: 'align',
          severity: 'info',
          title: '左端が未整列',
          description: `要素の左端が${xDiff.toFixed(1)}%ずれています。スナップで整列できます。`,
          affectedElementIds: [a.id, b.id],
        })
      }
      // Check center alignment
      const cxDiff = Math.abs((a.x + a.w / 2) - (b.x + b.w / 2))
      if (cxDiff > 0.1 && cxDiff < 2) {
        issues.push({
          id: `align-cx-${a.id}-${b.id}`,
          icon: 'align',
          severity: 'info',
          title: '中央が未整列',
          description: `要素の中央が${cxDiff.toFixed(1)}%ずれています。`,
          affectedElementIds: [a.id, b.id],
        })
      }
    }
  }

  // 3. Spacing consistency - check gaps between vertically stacked elements
  const sortedByY = [...elements].filter(el => el.type !== 'connector').sort((a, b) => a.y - b.y)
  if (sortedByY.length >= 3) {
    const gaps: number[] = []
    for (let i = 0; i < sortedByY.length - 1; i++) {
      const gap = sortedByY[i + 1].y - (sortedByY[i].y + sortedByY[i].h)
      if (gap > 0) gaps.push(gap)
    }
    if (gaps.length >= 2) {
      const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length
      const maxDeviation = Math.max(...gaps.map(g => Math.abs(g - avgGap)))
      if (maxDeviation > 2) {
        issues.push({
          id: 'spacing-inconsistent',
          icon: 'spacing',
          severity: 'improvement',
          title: '間隔が不揃い',
          description: `要素間の間隔にばらつきがあります（最大${maxDeviation.toFixed(1)}%差）。均等配置で改善できます。`,
          affectedElementIds: sortedByY.map(el => el.id),
        })
      }
    }
  }

  // 4. Small text check
  for (const el of elements) {
    if (isTextElement(el) && el.fontSize < 14) {
      issues.push({
        id: `small-text-${el.id}`,
        icon: 'text',
        severity: 'warning',
        title: 'テキストが小さすぎ',
        description: `フォントサイズ${el.fontSize}pxは読みにくい可能性があります。14px以上を推奨します。`,
        affectedElementIds: [el.id],
      })
    }
  }

  // 5. Margin check - elements too close to edges
  for (const el of elements) {
    if (el.type === 'connector') continue
    const tooCloseEdges: string[] = []
    if (el.x < 3) tooCloseEdges.push('左端')
    if (el.y < 3) tooCloseEdges.push('上端')
    if (el.x + el.w > 97) tooCloseEdges.push('右端')
    if (el.y + el.h > 97) tooCloseEdges.push('下端')
    if (tooCloseEdges.length > 0) {
      issues.push({
        id: `margin-${el.id}`,
        icon: 'margin',
        severity: 'warning',
        title: '余白が不足',
        description: `${tooCloseEdges.join('・')}に近すぎます。最低3%の余白を推奨します。`,
        affectedElementIds: [el.id],
      })
    }
  }

  return issues
}

function autoFixElements(slide: Slide): SlideElement[] {
  const elements = slide.elements.map(el => ({ ...el }))
  const positioned = elements.filter(hasPosition)

  // Fix 1: Increase small text to minimum 14px
  for (const el of elements) {
    if (isTextElement(el) && el.fontSize < 14) {
      ;(el as SlideTextElement).fontSize = 14
    }
  }

  // Fix 2: Add minimum margins
  for (const el of positioned) {
    if (el.type === 'connector') continue
    const mutable = el as { x: number; y: number; w: number; h: number }
    if (mutable.x < 3) mutable.x = 3
    if (mutable.y < 3) mutable.y = 3
    if (mutable.x + mutable.w > 97) mutable.x = 97 - mutable.w
    if (mutable.y + mutable.h > 97) mutable.y = 97 - mutable.h
    // Ensure still positive
    if (mutable.x < 0) mutable.x = 1
    if (mutable.y < 0) mutable.y = 1
  }

  // Fix 3: Snap nearly-aligned elements
  const nonConnectors = positioned.filter(el => el.type !== 'connector')
  for (let i = 0; i < nonConnectors.length; i++) {
    for (let j = i + 1; j < nonConnectors.length; j++) {
      const a = nonConnectors[i] as { x: number; y: number; w: number; h: number; id: string }
      const b = nonConnectors[j] as { x: number; y: number; w: number; h: number; id: string }
      // Snap left edges
      const xDiff = Math.abs(a.x - b.x)
      if (xDiff > 0 && xDiff < 2) {
        b.x = a.x
      }
      // Snap top edges
      const yDiff = Math.abs(a.y - b.y)
      if (yDiff > 0 && yDiff < 2) {
        b.y = a.y
      }
    }
  }

  // Fix 4: Redistribute overlapping elements vertically
  const sortedByY = [...nonConnectors].sort((a, b) => a.y - b.y)
  for (let i = 0; i < sortedByY.length - 1; i++) {
    const current = sortedByY[i] as { x: number; y: number; w: number; h: number }
    const next = sortedByY[i + 1] as { x: number; y: number; w: number; h: number }
    const overlap = computeOverlapPercent(current, next)
    if (overlap > 10) {
      // Push the next element below the current one with 2% gap
      next.y = current.y + current.h + 2
      // Ensure it stays within bounds
      if (next.y + next.h > 97) {
        next.y = 97 - next.h
      }
    }
  }

  return elements
}

const ICON_MAP = {
  overlap: AlertTriangle,
  align: AlignCenter,
  spacing: Ruler,
  text: Type,
  margin: ImageIcon,
} as const

const SEVERITY_COLORS = {
  warning: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  info: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  improvement: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
} as const

export default function AiLayoutOptimizer({ open, onClose, slide, onApplyLayout }: Props) {
  const [analyzed, setAnalyzed] = useState(false)
  const [applied, setApplied] = useState(false)
  const [issues, setIssues] = useState<LayoutIssue[]>([])

  const handleAnalyze = useCallback(() => {
    setAnalyzed(false)
    setApplied(false)
    // Simulate brief analysis delay
    setTimeout(() => {
      const result = analyzeSlide(slide)
      setIssues(result)
      setAnalyzed(true)
    }, 500)
  }, [slide])

  const handleAutoFix = useCallback(() => {
    const fixed = autoFixElements(slide)
    onApplyLayout(fixed)
    setApplied(true)
    // Re-analyze after fix
    setTimeout(() => {
      const newSlide = { ...slide, elements: fixed }
      const result = analyzeSlide(newSlide)
      setIssues(result)
    }, 300)
  }, [slide, onApplyLayout])

  if (!open) return null

  const warningCount = issues.filter(i => i.severity === 'warning').length
  const infoCount = issues.filter(i => i.severity === 'info').length
  const improvementCount = issues.filter(i => i.severity === 'improvement').length

  return (
    <div className="w-80 bg-slate-900 border-l border-slate-700 flex flex-col h-full overflow-hidden shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <LayoutGrid className="w-4 h-4 text-purple-400" />
          <h2 className="text-sm font-semibold text-white">レイアウト最適化</h2>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Analyze button */}
      <div className="px-4 py-3 border-b border-slate-700/50">
        <button
          onClick={handleAnalyze}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Zap className="w-4 h-4" />
          分析
        </button>

        {analyzed && (
          <div className="mt-2 flex items-center gap-3 text-xs">
            {warningCount > 0 && (
              <span className="text-amber-400">{warningCount} 警告</span>
            )}
            {infoCount > 0 && (
              <span className="text-blue-400">{infoCount} 情報</span>
            )}
            {improvementCount > 0 && (
              <span className="text-emerald-400">{improvementCount} 改善</span>
            )}
            {issues.length === 0 && (
              <span className="text-emerald-400 flex items-center gap-1">
                <Check className="w-3 h-3" />
                問題なし
              </span>
            )}
          </div>
        )}
      </div>

      {/* Issues list */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        {!analyzed && (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 text-sm">
            <LayoutGrid className="w-8 h-8 mb-2 opacity-40" />
            <p>「分析」をクリックして</p>
            <p>レイアウトを検査します</p>
          </div>
        )}

        {analyzed && issues.length === 0 && (
          <div className="flex flex-col items-center justify-center h-32 text-emerald-400/80 text-sm">
            <Check className="w-8 h-8 mb-2" />
            <p>レイアウトに問題はありません</p>
          </div>
        )}

        {analyzed && issues.map((issue) => {
          const IconComp = ICON_MAP[issue.icon]
          const colorClass = SEVERITY_COLORS[issue.severity]
          return (
            <div
              key={issue.id}
              className={`mb-2 p-3 rounded-lg border ${colorClass} transition-colors`}
            >
              <div className="flex items-start gap-2">
                <IconComp className="w-4 h-4 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-medium">{issue.title}</div>
                  <div className="text-xs opacity-80 mt-0.5 leading-relaxed">{issue.description}</div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Auto-fix footer */}
      {analyzed && issues.length > 0 && (
        <div className="px-4 py-3 border-t border-slate-700/50 space-y-2">
          <button
            onClick={handleAutoFix}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {applied ? (
              <>
                <Check className="w-4 h-4" />
                修正済み
              </>
            ) : (
              <>
                <RotateCcw className="w-4 h-4" />
                自動修正
              </>
            )}
          </button>
          {applied && (
            <p className="text-xs text-center text-slate-400">
              再度「分析」で結果を確認できます
            </p>
          )}
        </div>
      )}
    </div>
  )
}
