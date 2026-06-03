'use client'

import { useState, useMemo, useEffect } from 'react'
import { X, Heading, Image, Table2, Bookmark } from 'lucide-react'
import type { Block } from '@/types'

interface BookmarkEntry {
  id: string
  name: string
  blockId: string
}

interface Props {
  blocks: Block[]
  bookmarks: BookmarkEntry[]
  onInsert: (html: string) => void
  onClose: () => void
}

type RefCategory = 'headings' | 'figures' | 'tables' | 'bookmarks'

interface RefItem {
  category: RefCategory
  label: string
  blockId: string
}

export default function CrossReferenceModal({ blocks, bookmarks, onInsert, onClose }: Props) {
  const [category, setCategory] = useState<RefCategory>('headings')
  const [query, setQuery] = useState('')

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  const items = useMemo(() => {
    const result: RefItem[] = []
    let figCount = 0
    let tableCount = 0

    blocks.forEach((b) => {
      if (b.type === 'h1' || b.type === 'h2' || b.type === 'h3' || b.type === 'h4' || b.type === 'h5' || b.type === 'h6') {
        const text = b.content.replace(/<[^>]*>/g, '').trim()
        result.push({
          category: 'headings',
          label: `${b.type.toUpperCase()}: ${text || '(空の見出し)'}`,
          blockId: b.id,
        })
      }

      if (b.type === 'image') {
        figCount++
        const altMatch = b.content.match(/alt="([^"]*)"/)
        const caption = b.data?.caption || (altMatch ? altMatch[1] : '') || ''
        result.push({
          category: 'figures',
          label: `図 ${figCount}${caption ? ': ' + caption : ''}`,
          blockId: b.id,
        })
      }

      if (b.type === 'table') {
        tableCount++
        const caption = b.data?.caption || ''
        result.push({
          category: 'tables',
          label: `表 ${tableCount}${caption ? ': ' + caption : ''}`,
          blockId: b.id,
        })
      }
    })

    bookmarks.forEach((bm) => {
      result.push({
        category: 'bookmarks',
        label: bm.name,
        blockId: bm.blockId,
      })
    })

    return result
  }, [blocks, bookmarks])

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    return items
      .filter((item) => item.category === category)
      .filter((item) => !q || item.label.toLowerCase().includes(q))
  }, [items, category, query])

  function handleInsertRef(item: RefItem) {
    let displayText: string
    if (item.category === 'headings') {
      displayText = item.label
    } else if (item.category === 'figures') {
      displayText = `[${item.label}]`
    } else if (item.category === 'tables') {
      displayText = `[${item.label}]`
    } else {
      displayText = `[${item.label}]`
    }

    const html = `<a href="#block-${item.blockId}" data-ref-block="${item.blockId}">${displayText}</a>`
    onInsert(html)
  }

  const categoryTabs: { key: RefCategory; label: string; icon: typeof Heading }[] = [
    { key: 'headings', label: '見出し', icon: Heading },
    { key: 'figures', label: '図', icon: Image },
    { key: 'tables', label: '表', icon: Table2 },
    { key: 'bookmarks', label: 'ブックマーク', icon: Bookmark },
  ]

  return (
    <div className="fixed inset-0 bg-black/60 flex items-start justify-center pt-[12vh] z-50" onClick={onClose}>
      <div
        className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-[500px] max-h-[65vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
          <h2 className="text-sm font-semibold text-white">相互参照の挿入</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={16} />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-2 border-b border-slate-800">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="検索..."
            className="w-full bg-slate-800 text-white text-sm rounded px-3 py-1.5 border border-slate-700 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        {/* Category tabs */}
        <div className="flex border-b border-slate-800">
          {categoryTabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setCategory(key)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs transition-colors ${
                category === key ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Icon size={12} /> {label}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-500">該当する項目がありません</div>
          ) : (
            <div className="py-1">
              {filtered.map((item, idx) => (
                <button
                  key={`${item.blockId}-${idx}`}
                  onClick={() => handleInsertRef(item)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-800 text-left transition-colors"
                >
                  <span className="text-sm text-slate-300 truncate">{item.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end px-4 py-3 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 transition-colors"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  )
}
