'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X, ChevronRight } from 'lucide-react'

// ── Types ──

export interface TourStep {
  /** CSS selector for the target element to highlight */
  target: string
  /** Description text shown in the tooltip */
  description: string
  /** Optional title for this step */
  title?: string
  /** Position of the tooltip relative to the target */
  position?: 'top' | 'bottom' | 'left' | 'right'
}

export interface TourDefinition {
  /** Unique ID for this tour (used in localStorage) */
  id: string
  /** Steps of the tour */
  steps: TourStep[]
}

// ── Predefined tours ──

export const TOURS: Record<string, TourDefinition> = {
  dashboard: {
    id: 'tour-dashboard',
    steps: [
      {
        target: '[data-tour="create-doc"]',
        title: '新しいドキュメントを作成',
        description: 'ここからスライド、ドキュメント、スプレッドシートを作成できます。',
        position: 'bottom',
      },
      {
        target: '[data-tour="doc-list"]',
        title: 'ドキュメント一覧',
        description: '作成したドキュメントがここに表示されます。クリックして編集を開始しましょう。',
        position: 'top',
      },
      {
        target: '[data-tour="settings"]',
        title: '設定',
        description: 'テーマや言語などの設定を変更できます。',
        position: 'left',
      },
    ],
  },
  'slide-editor': {
    id: 'tour-slide-editor',
    steps: [
      {
        target: '[data-tour="slide-toolbar"]',
        title: 'ツールバー',
        description: 'テキスト、画像、図形などの要素を追加できます。',
        position: 'bottom',
      },
      {
        target: '[data-tour="slide-canvas"]',
        title: 'キャンバス',
        description: 'スライドの編集エリアです。要素をドラッグ&ドロップで配置できます。',
        position: 'right',
      },
      {
        target: '[data-tour="slide-panel"]',
        title: 'スライドパネル',
        description: 'スライドの一覧と並び替えができます。',
        position: 'right',
      },
      {
        target: '[data-tour="slide-theme"]',
        title: 'テーマ設定',
        description: 'スライドのテーマやデザインを変更できます。',
        position: 'left',
      },
      {
        target: '[data-tour="slide-present"]',
        title: 'プレゼンテーション',
        description: 'プレゼンテーションモードでスライドを表示できます。',
        position: 'bottom',
      },
    ],
  },
  'doc-editor': {
    id: 'tour-doc-editor',
    steps: [
      {
        target: '[data-tour="doc-toolbar"]',
        title: '書式ツールバー',
        description: 'テキストの書式設定やブロックタイプの変更ができます。',
        position: 'bottom',
      },
      {
        target: '[data-tour="doc-content"]',
        title: '編集エリア',
        description: 'ドキュメントの本文を編集できます。「/」で新しいブロックを追加できます。',
        position: 'right',
      },
      {
        target: '[data-tour="doc-outline"]',
        title: 'アウトライン',
        description: 'ドキュメントの構造をツリー表示で確認できます。',
        position: 'left',
      },
      {
        target: '[data-tour="doc-export"]',
        title: 'エクスポート',
        description: 'PDF、DOCX、Markdownなどの形式でエクスポートできます。',
        position: 'bottom',
      },
    ],
  },
  spreadsheet: {
    id: 'tour-spreadsheet',
    steps: [
      {
        target: '[data-tour="sheet-toolbar"]',
        title: 'ツールバー',
        description: 'セルの書式設定や数式の入力ができます。',
        position: 'bottom',
      },
      {
        target: '[data-tour="sheet-grid"]',
        title: 'セルグリッド',
        description: 'セルをクリックしてデータを入力できます。',
        position: 'top',
      },
      {
        target: '[data-tour="sheet-formula"]',
        title: '数式バー',
        description: 'SUM、AVERAGEなどの関数を使って計算できます。',
        position: 'bottom',
      },
      {
        target: '[data-tour="sheet-tabs"]',
        title: 'シートタブ',
        description: 'シートの追加や切り替えができます。',
        position: 'top',
      },
    ],
  },
}

// ── localStorage helpers ──

const TOUR_STORAGE_PREFIX = 'doccraft:tour-completed:'

function isTourCompleted(tourId: string): boolean {
  if (typeof window === 'undefined') return true
  return localStorage.getItem(TOUR_STORAGE_PREFIX + tourId) === 'true'
}

function markTourCompleted(tourId: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(TOUR_STORAGE_PREFIX + tourId, 'true')
}

/** Reset a tour so it shows again */
export function resetTour(tourId: string): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(TOUR_STORAGE_PREFIX + tourId)
}

// ── Spotlight overlay + tooltip ──

interface SpotlightProps {
  targetRect: DOMRect
  step: TourStep
  currentStep: number
  totalSteps: number
  onNext: () => void
  onSkip: () => void
}

function Spotlight({ targetRect, step, currentStep, totalSteps, onNext, onSkip }: SpotlightProps) {
  const padding = 8
  const spotlightStyle: React.CSSProperties = {
    position: 'fixed',
    top: targetRect.top - padding,
    left: targetRect.left - padding,
    width: targetRect.width + padding * 2,
    height: targetRect.height + padding * 2,
    borderRadius: 8,
    boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.7)',
    zIndex: 99998,
    pointerEvents: 'none',
    transition: 'all 0.3s ease',
  }

  // Calculate tooltip position
  const pos = step.position ?? 'bottom'
  const tooltipStyle: React.CSSProperties = {
    position: 'fixed',
    zIndex: 99999,
  }

  const tooltipMargin = 16
  switch (pos) {
    case 'top':
      tooltipStyle.bottom = window.innerHeight - targetRect.top + tooltipMargin
      tooltipStyle.left = targetRect.left + targetRect.width / 2
      tooltipStyle.transform = 'translateX(-50%)'
      break
    case 'bottom':
      tooltipStyle.top = targetRect.bottom + tooltipMargin
      tooltipStyle.left = targetRect.left + targetRect.width / 2
      tooltipStyle.transform = 'translateX(-50%)'
      break
    case 'left':
      tooltipStyle.right = window.innerWidth - targetRect.left + tooltipMargin
      tooltipStyle.top = targetRect.top + targetRect.height / 2
      tooltipStyle.transform = 'translateY(-50%)'
      break
    case 'right':
      tooltipStyle.left = targetRect.right + tooltipMargin
      tooltipStyle.top = targetRect.top + targetRect.height / 2
      tooltipStyle.transform = 'translateY(-50%)'
      break
  }

  const isLast = currentStep === totalSteps - 1

  return (
    <>
      {/* Dark overlay with hole */}
      <div style={spotlightStyle} />

      {/* Clickable overlay to prevent interaction outside spotlight */}
      <div
        className="fixed inset-0"
        style={{ zIndex: 99997 }}
        onClick={onSkip}
      />

      {/* Tooltip */}
      <div style={tooltipStyle} className="animate-slide-up">
        <div className="bg-slate-800 border border-slate-600 rounded-xl shadow-2xl p-4 max-w-xs">
          {step.title && (
            <h4 className="text-sm font-semibold text-white mb-1">{step.title}</h4>
          )}
          <p className="text-xs text-slate-300 leading-relaxed mb-3">{step.description}</p>
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">
              {currentStep + 1} / {totalSteps}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={onSkip}
                className="px-2 py-1 text-xs text-slate-400 hover:text-white transition-colors"
              >
                スキップ
              </button>
              <button
                onClick={onNext}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors"
              >
                {isLast ? '完了' : '次へ'}
                {!isLast && <ChevronRight size={12} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// ── OnboardingTour component ──

interface OnboardingTourProps {
  /** Which tour to run (key into TOURS) */
  tourKey: string
  /** If true, show the tour even if already completed */
  force?: boolean
  /** Called when the tour finishes or is skipped */
  onComplete?: () => void
}

export default function OnboardingTour({ tourKey, force = false, onComplete }: OnboardingTourProps) {
  const tour = TOURS[tourKey]
  const [currentStep, setCurrentStep] = useState(0)
  const [active, setActive] = useState(false)
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)
  const [mounted, setMounted] = useState(false)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Auto-start on first visit
  useEffect(() => {
    if (!tour || !mounted) return
    if (!force && isTourCompleted(tour.id)) return

    // Small delay to let the page render
    const timer = setTimeout(() => {
      setActive(true)
      setCurrentStep(0)
    }, 1000)

    return () => clearTimeout(timer)
  }, [tour, force, mounted])

  // Track target element position
  useEffect(() => {
    if (!active || !tour) return

    const step = tour.steps[currentStep]
    if (!step) return

    function updateRect() {
      const el = document.querySelector(step.target)
      if (el) {
        setTargetRect(el.getBoundingClientRect())
      } else {
        setTargetRect(null)
      }
      rafRef.current = requestAnimationFrame(updateRect)
    }

    updateRect()
    return () => cancelAnimationFrame(rafRef.current)
  }, [active, tour, currentStep])

  const handleNext = useCallback(() => {
    if (!tour) return
    if (currentStep < tour.steps.length - 1) {
      setCurrentStep((s) => s + 1)
    } else {
      // Tour complete
      markTourCompleted(tour.id)
      setActive(false)
      onComplete?.()
    }
  }, [tour, currentStep, onComplete])

  const handleSkip = useCallback(() => {
    if (!tour) return
    markTourCompleted(tour.id)
    setActive(false)
    onComplete?.()
  }, [tour, onComplete])

  if (!mounted || !active || !tour || !targetRect) return null

  return createPortal(
    <Spotlight
      targetRect={targetRect}
      step={tour.steps[currentStep]}
      currentStep={currentStep}
      totalSteps={tour.steps.length}
      onNext={handleNext}
      onSkip={handleSkip}
    />,
    document.body,
  )
}
