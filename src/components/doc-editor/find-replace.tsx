'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, Replace, X, ChevronDown, ChevronUp } from 'lucide-react'
import type { Block } from '@/types'

interface Props {
  blocks: Block[]
  onReplace: (blockId: string, search: string, replacement: string, all?: boolean) => void
  onClose: () => void
}

interface Match {
  blockId: string
  index: number
}

const BLOCK_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'すべて' },
  { value: 'h1', label: 'H1' },
  { value: 'h2', label: 'H2' },
  { value: 'h3', label: 'H3' },
  { value: 'paragraph', label: '段落' },
  { value: 'bullet', label: '箇条書き' },
  { value: 'numbered', label: '番号付き' },
  { value: 'quote', label: '引用' },
  { value: 'code', label: 'コード' },
  { value: 'bold', label: '太字のみ' },
]

export default function FindReplace({ blocks, onReplace, onClose }: Props) {
  const [search, setSearch] = useState('')
  const [replacement, setReplacement] = useState('')
  const [showReplace, setShowReplace] = useState(false)
  const [matches, setMatches] = useState<Match[]>([])
  const [currentMatch, setCurrentMatch] = useState(0)
  const [useRegex, setUseRegex] = useState(false)
  const [regexError, setRegexError] = useState('')
  const [blockTypeFilter, setBlockTypeFilter] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    if (!search) {
      setMatches([])
      setRegexError('')
      return
    }

    const found: Match[] = []

    // Filter blocks by type if a block type filter is set
    const filteredBlocks = blocks.filter((b) => {
      if (b.type === 'divider' || b.type === 'image') return false
      if (!blockTypeFilter) return true
      if (blockTypeFilter === 'bold') {
        // Match only blocks containing <strong> or <b> tags
        return /<(strong|b)>/i.test(b.content)
      }
      return b.type === blockTypeFilter
    })

    if (useRegex) {
      try {
        const regex = new RegExp(search, 'gi')
        setRegexError('')
        filteredBlocks.forEach((b) => {
          const text = b.content
          let m: RegExpExecArray | null
          // Reset lastIndex for safety
          regex.lastIndex = 0
          m = regex.exec(text)
          while (m !== null) {
            found.push({ blockId: b.id, index: m.index })
            // Prevent infinite loop on zero-length matches
            if (m.index === regex.lastIndex) {
              regex.lastIndex++
            }
            m = regex.exec(text)
          }
        })
      } catch (e) {
        setRegexError((e as Error).message)
        setMatches([])
        return
      }
    } else {
      filteredBlocks.forEach((b) => {
        let searchText: string
        if (blockTypeFilter === 'bold') {
          // Extract only bold text content
          const boldMatches = b.content.match(/<(strong|b)>(.*?)<\/(strong|b)>/gi)
          searchText = boldMatches ? boldMatches.map((m) => m.replace(/<[^>]*>/g, '')).join(' ') : ''
        } else {
          searchText = b.content
        }
        const text = searchText.toLowerCase()
        const term = search.toLowerCase()
        let idx = text.indexOf(term)
        while (idx !== -1) {
          found.push({ blockId: b.id, index: idx })
          idx = text.indexOf(term, idx + 1)
        }
      })
    }

    setMatches(found)
    setCurrentMatch(0)
  }, [search, blocks, useRegex, blockTypeFilter])

  useEffect(() => {
    if (matches.length === 0 || !search) return
    const match = matches[currentMatch]
    if (!match) return
    const el = document.querySelector(`[data-block-id="${match.blockId}"]`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [currentMatch, matches])

  function handleReplace() {
    if (matches.length === 0 || !search) return
    const match = matches[currentMatch]
    onReplace(match.blockId, search, replacement)
  }

  function handleReplaceAll() {
    if (!search) return
    const blockIds = new Set(matches.map((m) => m.blockId))
    blockIds.forEach((id) => onReplace(id, search, replacement, true))
  }

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        setCurrentMatch((prev) => (prev + 1) % Math.max(1, matches.length))
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose, matches])

  return (
    <div className="fixed top-14 right-4 z-50 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl p-3 w-96 animate-slide-up">
      <div className="flex items-center gap-2 mb-2">
        <Search size={14} className="text-slate-500 flex-shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="検索..."
          className="flex-1 bg-slate-800 text-white text-sm rounded px-2 py-1.5 border border-slate-700 focus:border-indigo-500 focus:outline-none"
        />
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button
            onClick={() => setCurrentMatch((p) => (p - 1 + matches.length) % Math.max(1, matches.length))}
            className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <ChevronUp size={14} />
          </button>
          <button
            onClick={() => setCurrentMatch((p) => (p + 1) % Math.max(1, matches.length))}
            className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <ChevronDown size={14} />
          </button>
        </div>
        <span className="text-xs text-slate-500 w-12 text-right flex-shrink-0">
          {matches.length > 0 ? `${currentMatch + 1}/${matches.length}` : '0'}
        </span>
        <button
          onClick={() => setShowReplace(!showReplace)}
          className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-white hover:bg-slate-800"
          title="置換"
        >
          <Replace size={14} />
        </button>
        <button
          onClick={onClose}
          className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-white hover:bg-slate-800"
        >
          <X size={14} />
        </button>
      </div>

      {/* Regex toggle + Block type filter */}
      <div className="flex items-center gap-2 mb-2">
        <button
          onClick={() => setUseRegex(!useRegex)}
          className={`px-2 py-1 text-xs rounded border transition-colors ${
            useRegex
              ? 'text-indigo-300 border-indigo-500 bg-indigo-500/20'
              : 'text-slate-400 border-slate-700 bg-slate-800 hover:text-white hover:bg-slate-700'
          }`}
          title="正規表現"
        >
          正規表現
        </button>
        <select
          value={blockTypeFilter}
          onChange={(e) => setBlockTypeFilter(e.target.value)}
          className="flex-1 bg-slate-800 text-slate-300 text-xs rounded px-2 py-1 border border-slate-700 focus:border-indigo-500 focus:outline-none"
          title="書式で検索"
        >
          {BLOCK_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {regexError && (
        <div className="mb-2 text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded px-2 py-1">
          {regexError}
        </div>
      )}

      {showReplace && (
        <div className="flex items-center gap-2">
          <Replace size={14} className="text-slate-500 flex-shrink-0" />
          <input
            type="text"
            value={replacement}
            onChange={(e) => setReplacement(e.target.value)}
            placeholder="置換..."
            className="flex-1 bg-slate-800 text-white text-sm rounded px-2 py-1.5 border border-slate-700 focus:border-indigo-500 focus:outline-none"
          />
          <button
            onClick={handleReplace}
            className="px-2 py-1 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded border border-slate-700"
          >
            置換
          </button>
          <button
            onClick={handleReplaceAll}
            className="px-2 py-1 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded border border-slate-700"
          >
            全置換
          </button>
        </div>
      )}
    </div>
  )
}
