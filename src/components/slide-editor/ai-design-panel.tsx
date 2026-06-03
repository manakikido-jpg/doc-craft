'use client'

import { useState, useMemo } from 'react'
import { Sparkles, X, Wand2, Layout, Type, Palette, ArrowRight, Check, RotateCcw } from 'lucide-react'
import type { Slide, SlideTextElement, SlideElement } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  currentSlide: Slide | null
  allSlides: Slide[]
  onUpdateElement: (slideId: string, elementId: string, updates: Partial<SlideElement>) => void
  onUpdateSlide: (slideId: string, updates: Partial<Slide>) => void
}

interface DesignSuggestion {
  id: string
  category: 'layout' | 'typography' | 'color' | 'consistency' | 'spacing'
  title: string
  description: string
  severity: 'info' | 'warning' | 'improvement'
  autoFix?: () => void
}

export default function AiDesignPanel({ open, onClose, currentSlide, allSlides, onUpdateElement, onUpdateSlide }: Props) {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set())

  const suggestions = useMemo(() => {
    if (!currentSlide || !open) return []

    const results: DesignSuggestion[] = []
    const elements = currentSlide.elements || []
    const textElements = elements.filter((e): e is SlideTextElement =>
      e.type === 'title' || e.type === 'subtitle' || e.type === 'body' || e.type === 'label'
    )

    // 1. Check for text elements that are too close to edges
    for (const el of textElements) {
      if (el.x < 3 || el.y < 3) {
        results.push({
          id: `margin-${el.id}`,
          category: 'spacing',
          title: '余白が不足',
          description: `「${(el.content || '').slice(0, 15)}...」が端に近すぎます。余白を追加すると見やすくなります。`,
          severity: 'warning',
          autoFix: () => {
            onUpdateElement(currentSlide.id, el.id, {
              x: Math.max(el.x, 5),
              y: Math.max(el.y, 5)
            })
          },
        })
      }
    }

    // 2. Check font size consistency
    const bodyElements = textElements.filter(e => e.type === 'body')
    const bodySizes = bodyElements.map(e => e.fontSize)
    const uniqueSizes = [...new Set(bodySizes)]
    if (uniqueSizes.length > 1) {
      const targetSize = Math.round(bodySizes.reduce((a, b) => a + b, 0) / bodySizes.length)
      results.push({
        id: 'font-consistency',
        category: 'typography',
        title: 'フォントサイズの統一',
        description: `本文のフォントサイズが${uniqueSizes.join('px, ')}pxと不揃いです。${targetSize}pxに統一しましょう。`,
        severity: 'improvement',
        autoFix: () => {
          bodyElements.forEach(el => {
            onUpdateElement(currentSlide.id, el.id, { fontSize: targetSize })
          })
        },
      })
    }

    // 3. Check title exists
    const titleEl = textElements.find(e => e.type === 'title')
    if (!titleEl) {
      results.push({
        id: 'missing-title',
        category: 'layout',
        title: 'タイトルがありません',
        description: 'スライドにタイトル要素を追加すると、内容が伝わりやすくなります。',
        severity: 'warning',
      })
    }

    // 4. Check title size is appropriate
    if (titleEl && titleEl.fontSize < 24) {
      results.push({
        id: 'title-size',
        category: 'typography',
        title: 'タイトルが小さい',
        description: `タイトルのフォントサイズ (${titleEl.fontSize}px) が小さめです。28px以上にすると目立ちます。`,
        severity: 'improvement',
        autoFix: () => {
          onUpdateElement(currentSlide.id, titleEl.id, { fontSize: 32 })
        },
      })
    }

    // 5. Check for too many elements
    if (elements.length > 8) {
      results.push({
        id: 'too-many-elements',
        category: 'layout',
        title: '要素が多すぎます',
        description: `${elements.length}個の要素があります。1スライド5-7個以下にすると見やすくなります。`,
        severity: 'warning',
      })
    }

    // 6. Check for very long text in body
    for (const el of textElements) {
      const text = el.content || ''
      if (text.length > 300 && el.type === 'body') {
        results.push({
          id: `long-text-${el.id}`,
          category: 'typography',
          title: 'テキストが長すぎます',
          description: `${text.length}文字あります。箇条書きに分割するか、複数スライドに分けましょう。`,
          severity: 'warning',
        })
      }
    }

    // 7. Check alignment consistency
    const aligns = textElements.map(e => e.align)
    const uniqueAligns = [...new Set(aligns)]
    if (uniqueAligns.length > 2) {
      results.push({
        id: 'alignment',
        category: 'consistency',
        title: 'テキスト配置を統一',
        description: '3種類以上の配置が混在しています。左揃えまたは中央揃えに統一すると整います。',
        severity: 'info',
        autoFix: () => {
          textElements.forEach(el => {
            if (el.type !== 'title') {
              onUpdateElement(currentSlide.id, el.id, { align: 'left' })
            }
          })
        },
      })
    }

    // 8. Check for overlapping elements (skip connectors which lack x/y/w/h)
    const positionedElements = elements.filter(e => e.type !== 'connector')
    for (let i = 0; i < positionedElements.length; i++) {
      for (let j = i + 1; j < positionedElements.length; j++) {
        const a = positionedElements[i] as Exclude<SlideElement, import('@/types').SlideConnectorElement>
        const b = positionedElements[j] as Exclude<SlideElement, import('@/types').SlideConnectorElement>
        if (a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y) {
          results.push({
            id: `overlap-${a.id}-${b.id}`,
            category: 'spacing',
            title: '要素が重なっています',
            description: '2つの要素が重なっています。位置を調整してください。',
            severity: 'warning',
          })
          break
        }
      }
    }

    // 9. Global consistency check across slides
    if (allSlides.length > 1) {
      const slideHasTitle = allSlides.filter(s =>
        (s.elements || []).some(e => e.type === 'title')
      ).length
      if (slideHasTitle > 0 && slideHasTitle < allSlides.length) {
        results.push({
          id: 'global-title',
          category: 'consistency',
          title: 'タイトルの一貫性',
          description: `${allSlides.length}枚中${slideHasTitle}枚にタイトルがあります。全スライドに統一しましょう。`,
          severity: 'info',
        })
      }
    }

    // 10. If no issues, add a positive message
    if (results.length === 0) {
      results.push({
        id: 'perfect',
        category: 'layout',
        title: '素晴らしいデザインです！',
        description: '改善すべき点は見つかりませんでした。',
        severity: 'info',
      })
    }

    return results
  }, [currentSlide, allSlides, open, onUpdateElement])

  function handleAutoFixAll() {
    setIsAnalyzing(true)
    setTimeout(() => {
      suggestions.forEach(s => {
        if (s.autoFix) {
          s.autoFix()
          setAppliedIds(prev => new Set([...prev, s.id]))
        }
      })
      setIsAnalyzing(false)
    }, 500)
  }

  if (!open) return null

  const categoryIcons: Record<string, React.ReactNode> = {
    layout: <Layout size={12} />,
    typography: <Type size={12} />,
    color: <Palette size={12} />,
    consistency: <Check size={12} />,
    spacing: <ArrowRight size={12} />,
  }
  const severityColors: Record<string, string> = {
    info: 'border-blue-500/30 bg-blue-500/5',
    warning: 'border-amber-500/30 bg-amber-500/5',
    improvement: 'border-green-500/30 bg-green-500/5',
  }

  const fixableCount = suggestions.filter(s => s.autoFix && !appliedIds.has(s.id)).length

  return (
    <div className="fixed right-0 top-0 bottom-0 w-80 bg-slate-900 border-l border-slate-700 shadow-2xl z-50 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <Wand2 size={16} className="text-indigo-400" />
          <span className="text-white font-semibold text-sm">AIデザイン改善</span>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={18} /></button>
      </div>

      {/* Auto-fix all button */}
      {fixableCount > 0 && (
        <div className="p-3 border-b border-slate-800">
          <button
            onClick={handleAutoFixAll}
            disabled={isAnalyzing}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-lg text-xs font-medium disabled:opacity-50"
          >
            <Sparkles size={14} />
            すべて自動修正 ({fixableCount}件)
          </button>
        </div>
      )}

      {/* Suggestions list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {isAnalyzing ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="flex gap-1 mb-3">
              <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <p className="text-xs text-slate-500">分析中...</p>
          </div>
        ) : (
          suggestions.map(s => (
            <div key={s.id} className={`rounded-lg border p-3 ${severityColors[s.severity] || ''}`}>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-slate-400">{categoryIcons[s.category]}</span>
                <span className="text-xs font-medium text-white">{s.title}</span>
              </div>
              <p className="text-[11px] text-slate-400 mb-2">{s.description}</p>
              {s.autoFix && (
                <button
                  onClick={() => {
                    s.autoFix!()
                    setAppliedIds(prev => new Set([...prev, s.id]))
                  }}
                  disabled={appliedIds.has(s.id)}
                  className={`text-[10px] px-2.5 py-1 rounded-md ${
                    appliedIds.has(s.id)
                      ? 'bg-green-600/20 text-green-400'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                  }`}
                >
                  {appliedIds.has(s.id) ? '✓ 適用済み' : '自動修正'}
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Reset button */}
      {appliedIds.size > 0 && (
        <div className="p-3 border-t border-slate-700">
          <button
            onClick={() => setAppliedIds(new Set())}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-white"
          >
            <RotateCcw size={12} /> 状態をリセット
          </button>
        </div>
      )}
    </div>
  )
}
