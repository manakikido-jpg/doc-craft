'use client'

import { memo, useMemo, useState, useEffect } from 'react'
import type { Block } from '@/types'
import DocZoomControl from './doc-zoom-control'

interface Props {
  blocks: Block[]
  zoom?: number
  onZoomChange?: (zoom: number) => void
  focusedBlockIndex?: number
  sectionCount?: number
  pageInfo?: { current: number; total: number }
}

function WordCount({ blocks, zoom, onZoomChange, focusedBlockIndex, sectionCount, pageInfo }: Props) {
  const [selectionCount, setSelectionCount] = useState(0)
  const [goal, setGoal] = useState<number | null>(null)
  const [showGoalInput, setShowGoalInput] = useState(false)

  useEffect(() => {
    function handleSelectionChange() {
      const sel = window.getSelection()
      if (sel && !sel.isCollapsed) {
        setSelectionCount(sel.toString().length)
      } else {
        setSelectionCount(0)
      }
    }
    document.addEventListener('selectionchange', handleSelectionChange)
    return () => document.removeEventListener('selectionchange', handleSelectionChange)
  }, [])

  const stats = useMemo(() => {
    let chars = 0
    let words = 0
    let paragraphs = 0
    let images = 0
    let tables = 0

    blocks.forEach((b) => {
      if (b.type === 'image') {
        images++
        return
      }
      if (b.type === 'table') {
        tables++
        return
      }
      if (b.type === 'divider' || b.type === 'toc' || b.type === 'page-break') return
      const text = b.content.trim()
      if (!text) return
      paragraphs++
      chars += text.length

      const cjkCount = (text.match(/[　-鿿豈-﫿]/g) || []).length
      const latinWords = text
        .replace(/[　-鿿豈-﫿]/g, ' ')
        .split(/\s+/)
        .filter(Boolean).length
      words += cjkCount + latinWords
    })

    // Reading time: ~500 chars/min for Japanese, ~200 words/min for English
    const readingMinutes = Math.max(1, Math.ceil(chars / 500))
    // Rough page count: ~1500 chars per page
    const pages = Math.max(1, Math.ceil(chars / 1500))

    return { chars, words, paragraphs, images, tables, readingMinutes, pages }
  }, [blocks])

  // Compute section count from blocks if not provided
  const computedSectionCount = useMemo(() => {
    if (sectionCount != null) return sectionCount
    let sections = 1
    blocks.forEach((b) => {
      if (b.type === 'section-break' as string) sections++
    })
    return sections
  }, [blocks, sectionCount])

  // Compute line number from focused block index
  const lineNumber = focusedBlockIndex != null ? focusedBlockIndex + 1 : null

  // Page display
  const pageDisplay = pageInfo || { current: 1, total: stats.pages }

  return (
    <div className="flex items-center gap-4 px-4 py-1.5 bg-slate-900 border-t border-slate-800 text-xs text-slate-500 no-print">
      <span>ページ {pageDisplay.current}/{pageDisplay.total}</span>
      {computedSectionCount > 1 && (
        <span>セクション {computedSectionCount}</span>
      )}
      {lineNumber != null && (
        <span>行 {lineNumber}</span>
      )}
      <span>文字数: {stats.chars.toLocaleString()}</span>
      {selectionCount > 0 && (
        <span className="text-indigo-400 font-medium">選択: {selectionCount}文字</span>
      )}
      {stats.images > 0 && <span>{stats.images} 画像</span>}
      {stats.tables > 0 && <span>{stats.tables} テーブル</span>}
      {/* Word count goal */}
      <div className="relative">
        <button
          onClick={() => setShowGoalInput(!showGoalInput)}
          className="text-slate-500 hover:text-indigo-400 transition-colors"
          title="目標文字数を設定"
        >
          {goal ? (
            <span className="flex items-center gap-1">
              <span className={`text-xs ${stats.chars >= goal ? 'text-green-400' : 'text-indigo-400'}`}>
                {Math.min(100, Math.round((stats.chars / goal) * 100))}%
              </span>
              <div className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${stats.chars >= goal ? 'bg-green-500' : 'bg-indigo-500'}`}
                  style={{ width: `${Math.min(100, (stats.chars / goal) * 100)}%` }}
                />
              </div>
              <span className="text-[10px]">目標: {goal.toLocaleString()}</span>
            </span>
          ) : (
            <span className="text-[10px]">目標設定</span>
          )}
        </button>
        {showGoalInput && (
          <div className="absolute bottom-full mb-2 left-0 bg-slate-800 border border-slate-700 rounded-lg p-2 shadow-xl z-50">
            <div className="flex items-center gap-1">
              <input
                type="number"
                placeholder="目標文字数"
                defaultValue={goal || ''}
                className="w-24 px-2 py-1 text-xs bg-slate-900 border border-slate-600 rounded text-white focus:outline-none focus:border-indigo-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const val = parseInt((e.target as HTMLInputElement).value)
                    setGoal(val > 0 ? val : null)
                    setShowGoalInput(false)
                  }
                }}
                autoFocus
              />
              {goal && (
                <button
                  onClick={() => { setGoal(null); setShowGoalInput(false) }}
                  className="text-[10px] text-red-400 hover:text-red-300 px-1"
                >
                  解除
                </button>
              )}
            </div>
          </div>
        )}
      </div>
      <div className="ml-auto">
        {zoom != null && onZoomChange && <DocZoomControl zoom={zoom} onZoomChange={onZoomChange} />}
      </div>
    </div>
  )
}

export default memo(WordCount)
