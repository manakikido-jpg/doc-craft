'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import type { Slide, SlideElement, SlideTextElement } from '@/types'
import { X, ChevronDown, ChevronUp, Replace, ReplaceAll } from 'lucide-react'

interface SlideFindReplaceProps {
  slides: Slide[]
  slideId: string
  dispatch: React.Dispatch<any>
  onNavigateToSlide: (slideId: string) => void
  onClose: () => void
}

interface MatchResult {
  slideId: string
  slideIndex: number
  elementId: string
  elementType: string
  content: string
  matchStart: number
  matchEnd: number
}

function isTextElement(el: SlideElement): el is SlideTextElement {
  return el.type === 'title' || el.type === 'subtitle' || el.type === 'body' || el.type === 'label'
}

export default function SlideFindReplace({
  slides,
  slideId,
  dispatch,
  onNavigateToSlide,
  onClose,
}: SlideFindReplaceProps) {
  const [findText, setFindText] = useState('')
  const [replaceText, setReplaceText] = useState('')
  const [caseSensitive, setCaseSensitive] = useState(false)
  const [wholeWord, setWholeWord] = useState(false)
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0)

  const matches = useMemo<MatchResult[]>(() => {
    if (!findText) return []
    const results: MatchResult[] = []
    const flags = caseSensitive ? 'g' : 'gi'
    const escaped = findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const pattern = wholeWord ? `\\b${escaped}\\b` : escaped
    let regex: RegExp
    try {
      regex = new RegExp(pattern, flags)
    } catch {
      return []
    }

    slides.forEach((slide, slideIndex) => {
      slide.elements.forEach((el) => {
        if (!isTextElement(el)) return
        let match: RegExpExecArray | null
        regex.lastIndex = 0
        while ((match = regex.exec(el.content)) !== null) {
          results.push({
            slideId: slide.id,
            slideIndex,
            elementId: el.id,
            elementType: el.type,
            content: el.content,
            matchStart: match.index,
            matchEnd: match.index + match[0].length,
          })
        }
      })
    })
    return results
  }, [findText, caseSensitive, wholeWord, slides])

  useEffect(() => {
    setCurrentMatchIndex(0)
  }, [findText, caseSensitive, wholeWord])

  const navigateToMatch = useCallback(
    (index: number) => {
      if (matches.length === 0) return
      const m = matches[index]
      if (m) onNavigateToSlide(m.slideId)
    },
    [matches, onNavigateToSlide],
  )

  const findNext = useCallback(() => {
    if (matches.length === 0) return
    const next = (currentMatchIndex + 1) % matches.length
    setCurrentMatchIndex(next)
    navigateToMatch(next)
  }, [currentMatchIndex, matches.length, navigateToMatch])

  const findPrev = useCallback(() => {
    if (matches.length === 0) return
    const prev = (currentMatchIndex - 1 + matches.length) % matches.length
    setCurrentMatchIndex(prev)
    navigateToMatch(prev)
  }, [currentMatchIndex, matches.length, navigateToMatch])

  const replaceCurrent = useCallback(() => {
    if (matches.length === 0) return
    const m = matches[currentMatchIndex]
    if (!m) return
    const newContent = m.content.substring(0, m.matchStart) + replaceText + m.content.substring(m.matchEnd)
    dispatch({
      type: 'UPDATE_ELEMENT',
      slideId: m.slideId,
      elementId: m.elementId,
      content: newContent,
    })
  }, [matches, currentMatchIndex, replaceText, dispatch])

  const replaceAll = useCallback(() => {
    if (matches.length === 0 || !findText) return
    const flags = caseSensitive ? 'g' : 'gi'
    const escaped = findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const pattern = wholeWord ? `\\b${escaped}\\b` : escaped
    let regex: RegExp
    try {
      regex = new RegExp(pattern, flags)
    } catch {
      return
    }

    // Group by slide + element to avoid repeated dispatches
    const updates = new Map<string, { slideId: string; elementId: string; content: string }>()
    slides.forEach((slide) => {
      slide.elements.forEach((el) => {
        if (!isTextElement(el)) return
        regex.lastIndex = 0
        if (regex.test(el.content)) {
          regex.lastIndex = 0
          const newContent = el.content.replace(regex, replaceText)
          updates.set(`${slide.id}:${el.id}`, {
            slideId: slide.id,
            elementId: el.id,
            content: newContent,
          })
        }
      })
    })

    updates.forEach((u) => {
      dispatch({
        type: 'UPDATE_ELEMENT',
        slideId: u.slideId,
        elementId: u.elementId,
        content: u.content,
      })
    })
  }, [findText, replaceText, caseSensitive, wholeWord, slides, dispatch, matches.length])

  function contextPreview(m: MatchResult) {
    const start = Math.max(0, m.matchStart - 15)
    const end = Math.min(m.content.length, m.matchEnd + 15)
    const prefix = start > 0 ? '…' : ''
    const suffix = end < m.content.length ? '…' : ''
    return prefix + m.content.substring(start, end) + suffix
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      onClose()
    } else if (e.key === 'Enter' && e.ctrlKey) {
      replaceCurrent()
    } else if (e.key === 'Enter') {
      findNext()
    }
  }

  return (
    <div
      className="fixed top-12 right-4 w-80 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl z-50 flex flex-col max-h-[70vh]"
      onKeyDown={handleKeyDown}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700">
        <span className="text-white text-sm font-medium">検索と置換</span>
        <button onClick={onClose} className="text-slate-400 hover:text-white">
          <X size={16} />
        </button>
      </div>

      {/* Inputs */}
      <div className="p-3 space-y-2">
        <input
          type="text"
          value={findText}
          onChange={(e) => setFindText(e.target.value)}
          placeholder="検索..."
          className="w-full px-2 py-1.5 rounded bg-slate-800 border border-slate-700 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          autoFocus
        />
        <input
          type="text"
          value={replaceText}
          onChange={(e) => setReplaceText(e.target.value)}
          placeholder="置換..."
          className="w-full px-2 py-1.5 rounded bg-slate-800 border border-slate-700 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-indigo-500"
        />

        {/* Options */}
        <div className="flex items-center gap-3 text-xs">
          <label className="flex items-center gap-1 text-slate-400 cursor-pointer">
            <input
              type="checkbox"
              checked={caseSensitive}
              onChange={(e) => setCaseSensitive(e.target.checked)}
              className="accent-indigo-500"
            />
            大文字/小文字
          </label>
          <label className="flex items-center gap-1 text-slate-400 cursor-pointer">
            <input
              type="checkbox"
              checked={wholeWord}
              onChange={(e) => setWholeWord(e.target.checked)}
              className="accent-indigo-500"
            />
            単語単位
          </label>
        </div>

        {/* Match count + nav */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">
            {matches.length > 0
              ? `${currentMatchIndex + 1}/${matches.length} 件`
              : findText
                ? '0 件'
                : ''}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={findPrev}
              disabled={matches.length === 0}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
              title="前へ"
            >
              <ChevronUp size={14} />
            </button>
            <button
              onClick={findNext}
              disabled={matches.length === 0}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
              title="次へ"
            >
              <ChevronDown size={14} />
            </button>
          </div>
        </div>

        {/* Replace buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={replaceCurrent}
            disabled={matches.length === 0}
            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded bg-indigo-600 text-white text-xs hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <Replace size={12} />
            置換
          </button>
          <button
            onClick={replaceAll}
            disabled={matches.length === 0}
            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded bg-slate-700 text-white text-xs hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ReplaceAll size={12} />
            すべて置換
          </button>
        </div>
      </div>

      {/* Results list */}
      {matches.length > 0 && (
        <div className="border-t border-slate-700 overflow-y-auto max-h-48 px-1 py-1">
          {matches.map((m, idx) => (
            <button
              key={`${m.slideId}-${m.elementId}-${m.matchStart}`}
              onClick={() => {
                setCurrentMatchIndex(idx)
                onNavigateToSlide(m.slideId)
              }}
              className={`w-full text-left px-2 py-1.5 rounded text-xs transition-colors ${
                idx === currentMatchIndex
                  ? 'bg-indigo-600/30 text-white'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span className="text-slate-500 mr-1">#{m.slideIndex + 1}</span>
              <span className="text-slate-500 mr-1">[{m.elementType}]</span>
              <span className="break-all">{contextPreview(m)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
