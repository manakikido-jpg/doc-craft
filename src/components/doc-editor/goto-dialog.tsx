'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { X, Search, Bookmark, FileText, Heading } from 'lucide-react'
import type { Block, Bookmark as BookmarkType } from '@/types'

interface Props {
  blocks: Block[]
  bookmarks: BookmarkType[]
  onClose: () => void
}

type TabType = 'headings' | 'blocks' | 'bookmarks'

export default function GotoDialog({ blocks, bookmarks, onClose }: Props) {
  const [tab, setTab] = useState<TabType>('headings')
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  const headings = useMemo(() => blocks.filter((b) => b.type === 'h1' || b.type === 'h2' || b.type === 'h3'), [blocks])

  const filteredItems = useMemo(() => {
    const q = query.toLowerCase()
    if (tab === 'headings') {
      return headings.filter(
        (h) =>
          !q ||
          h.content
            .replace(/<[^>]*>/g, '')
            .toLowerCase()
            .includes(q),
      )
    }
    if (tab === 'bookmarks') {
      return bookmarks.filter((b) => !q || b.name.toLowerCase().includes(q))
    }
    // blocks tab - show all types
    return blocks
      .filter(
        (b) =>
          !q ||
          b.content
            .replace(/<[^>]*>/g, '')
            .toLowerCase()
            .includes(q) ||
          b.type.includes(q),
      )
      .slice(0, 30)
  }, [tab, query, blocks, headings, bookmarks])

  function jumpTo(blockId: string) {
    const el = document.querySelector(`[data-block-id="${blockId}"]`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.classList.add('ring-2', 'ring-indigo-500/50')
      setTimeout(() => el.classList.remove('ring-2', 'ring-indigo-500/50'), 1500)
    }
    onClose()
  }

  function getBlockLabel(b: Block): string {
    const text = b.content.replace(/<[^>]*>/g, '').trim()
    return text.length > 50 ? text.slice(0, 50) + '...' : text || `[${b.type}]`
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-start justify-center pt-[15vh] z-50" onClick={onClose}>
      <div
        className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-[460px] max-h-[60vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-800">
          <Search size={14} className="text-slate-500" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-white text-sm placeholder-slate-500 focus:outline-none"
            placeholder="移動先を検索..."
          />
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800">
          {[
            { key: 'headings' as const, label: '見出し', icon: Heading },
            { key: 'bookmarks' as const, label: 'ブックマーク', icon: Bookmark },
            { key: 'blocks' as const, label: '全ブロック', icon: FileText },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs transition-colors ${
                tab === key ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Icon size={12} /> {label}
            </button>
          ))}
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto">
          {filteredItems.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-500">該当する項目がありません</div>
          ) : (
            <div className="py-1">
              {tab === 'bookmarks'
                ? (filteredItems as BookmarkType[]).map((bm) => (
                    <button
                      key={bm.id}
                      onClick={() => jumpTo(bm.blockId)}
                      className="w-full flex items-center gap-3 px-4 py-2 hover:bg-slate-800 text-left transition-colors"
                    >
                      <Bookmark size={12} className="text-indigo-400 flex-shrink-0" />
                      <div>
                        <div className="text-sm text-white">{bm.name}</div>
                      </div>
                    </button>
                  ))
                : (filteredItems as Block[]).map((b) => (
                    <button
                      key={b.id}
                      onClick={() => jumpTo(b.id)}
                      className="w-full flex items-center gap-3 px-4 py-2 hover:bg-slate-800 text-left transition-colors"
                    >
                      <span className="text-[10px] text-slate-500 font-mono bg-slate-800 px-1.5 py-0.5 rounded flex-shrink-0">
                        {b.type}
                      </span>
                      <span className="text-sm text-slate-300 truncate">{getBlockLabel(b)}</span>
                    </button>
                  ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
