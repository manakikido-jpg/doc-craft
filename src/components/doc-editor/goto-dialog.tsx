'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { X, Search, Bookmark, FileText, Heading, Hash } from 'lucide-react'
import type { Block, Bookmark as BookmarkType } from '@/types'

interface Props {
  blocks: Block[]
  bookmarks: BookmarkType[]
  onClose: () => void
}

type TabType = 'headings' | 'blocks' | 'bookmarks' | 'page'

export default function GotoDialog({ blocks, bookmarks, onClose }: Props) {
  const [tab, setTab] = useState<TabType>('headings')
  const [query, setQuery] = useState('')
  const [pageNumber, setPageNumber] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const pageInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (tab === 'page') {
      pageInputRef.current?.focus()
    } else {
      inputRef.current?.focus()
    }
  }, [tab])

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

  const headings = useMemo(() => blocks.filter((b) => b.type === 'h1' || b.type === 'h2' || b.type === 'h3' || b.type === 'h4' || b.type === 'h5' || b.type === 'h6'), [blocks])

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

  function jumpToPage() {
    const page = parseInt(pageNumber, 10)
    if (isNaN(page) || page < 1) return

    // Approximate page height: A4 at 96dpi ~ 1123px, minus margins ~ 1000px usable
    const PAGE_HEIGHT_PX = 1000

    // Calculate cumulative block heights to find which block starts the target page
    const blockElements = document.querySelectorAll('[data-block-id]')
    let accumulatedHeight = 0
    let targetBlock: Element | null = null

    for (const el of blockElements) {
      const rect = el.getBoundingClientRect()
      const blockHeight = rect.height + 16 // include spacing
      if (accumulatedHeight + blockHeight >= (page - 1) * PAGE_HEIGHT_PX) {
        targetBlock = el
        break
      }
      accumulatedHeight += blockHeight
    }

    if (targetBlock) {
      targetBlock.scrollIntoView({ behavior: 'smooth', block: 'start' })
      targetBlock.classList.add('ring-2', 'ring-indigo-500/50')
      setTimeout(() => targetBlock!.classList.remove('ring-2', 'ring-indigo-500/50'), 1500)
    } else if (blockElements.length > 0) {
      // If page exceeds content, scroll to last block
      const lastBlock = blockElements[blockElements.length - 1]
      lastBlock.scrollIntoView({ behavior: 'smooth', block: 'start' })
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
            { key: 'page' as const, label: 'ページ番号', icon: Hash },
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
          {tab === 'page' ? (
            <div className="p-4">
              <label className="block text-xs text-slate-400 mb-2">ページ番号を入力して移動</label>
              <div className="flex items-center gap-2">
                <input
                  ref={pageInputRef}
                  type="number"
                  min={1}
                  value={pageNumber}
                  onChange={(e) => setPageNumber(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      jumpToPage()
                    }
                  }}
                  placeholder="1"
                  className="flex-1 bg-slate-800 text-white text-sm rounded px-3 py-2 border border-slate-700 focus:border-indigo-500 focus:outline-none"
                />
                <button
                  onClick={jumpToPage}
                  className="px-4 py-2 text-sm text-white bg-indigo-600 hover:bg-indigo-500 rounded transition-colors"
                >
                  移動
                </button>
              </div>
              <p className="mt-2 text-[10px] text-slate-500">
                ブロックの高さからページ位置を近似計算します
              </p>
            </div>
          ) : filteredItems.length === 0 ? (
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
