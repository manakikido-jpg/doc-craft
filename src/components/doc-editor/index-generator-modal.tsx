'use client'

import { useState, useMemo, useEffect } from 'react'
import { X, Plus, Trash2, ListOrdered } from 'lucide-react'
import type { Block } from '@/types'

interface Props {
  blocks: Block[]
  onInsertIndex: (content: string) => void
  onClose: () => void
}

interface IndexEntry {
  id: string
  term: string
}

function generateId() {
  return `idx-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

export default function IndexGeneratorModal({ blocks, onInsertIndex, onClose }: Props) {
  const [entries, setEntries] = useState<IndexEntry[]>([])
  const [newTerm, setNewTerm] = useState('')

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  function addEntry() {
    const term = newTerm.trim()
    if (!term) return
    if (entries.some((e) => e.term.toLowerCase() === term.toLowerCase())) return
    setEntries((prev) => [...prev, { id: generateId(), term }])
    setNewTerm('')
  }

  function removeEntry(id: string) {
    setEntries((prev) => prev.filter((e) => e.id !== id))
  }

  // Find occurrences of each term in the blocks and compute simulated page numbers
  const indexData = useMemo(() => {
    const PAGE_HEIGHT_PX = 1000
    const AVG_BLOCK_HEIGHT = 40

    const result: { term: string; pages: number[] }[] = []

    const sortedEntries = [...entries].sort((a, b) => a.term.localeCompare(b.term, 'ja'))

    sortedEntries.forEach((entry) => {
      const pages = new Set<number>()
      let accHeight = 0

      blocks.forEach((b) => {
        const text = b.content.replace(/<[^>]*>/g, '').toLowerCase()
        if (text.includes(entry.term.toLowerCase())) {
          const page = Math.floor(accHeight / PAGE_HEIGHT_PX) + 1
          pages.add(page)
        }
        accHeight += AVG_BLOCK_HEIGHT
      })

      if (pages.size > 0) {
        result.push({ term: entry.term, pages: Array.from(pages).sort((a, b) => a - b) })
      }
    })

    return result
  }, [entries, blocks])

  function handleGenerateIndex() {
    if (indexData.length === 0 && entries.length === 0) return

    const lines: string[] = ['<strong>索引</strong>', '']

    if (indexData.length === 0) {
      lines.push('(該当する用語が文書内に見つかりませんでした)')
    } else {
      let currentLetter = ''
      indexData.forEach(({ term, pages }) => {
        const firstChar = term.charAt(0).toUpperCase()
        if (firstChar !== currentLetter) {
          currentLetter = firstChar
          if (lines.length > 2) lines.push('')
          lines.push(`<strong>${currentLetter}</strong>`)
        }
        lines.push(`${term} ... ${pages.join(', ')}`)
      })
    }

    onInsertIndex(lines.join('<br/>'))
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-start justify-center pt-[12vh] z-50" onClick={onClose}>
      <div
        className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-[480px] max-h-[70vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <ListOrdered size={14} className="text-indigo-400" />
            <h2 className="text-sm font-semibold text-white">索引生成</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={16} />
          </button>
        </div>

        {/* Add term */}
        <div className="px-4 py-3 border-b border-slate-800">
          <label className="block text-xs text-slate-400 mb-1.5">索引に追加する用語</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={newTerm}
              onChange={(e) => setNewTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addEntry()
                }
              }}
              placeholder="用語を入力..."
              className="flex-1 bg-slate-800 text-white text-sm rounded px-3 py-1.5 border border-slate-700 focus:border-indigo-500 focus:outline-none"
            />
            <button
              onClick={addEntry}
              className="px-3 py-1.5 text-xs text-white bg-indigo-600 hover:bg-indigo-500 rounded flex items-center gap-1 transition-colors"
            >
              <Plus size={12} /> 追加
            </button>
          </div>
        </div>

        {/* Entry list */}
        <div className="flex-1 overflow-y-auto">
          {entries.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-500">
              索引に含める用語を追加してください
            </div>
          ) : (
            <div className="py-1">
              {entries.map((entry) => {
                const data = indexData.find((d) => d.term === entry.term)
                return (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between px-4 py-2 hover:bg-slate-800/50 group"
                  >
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-white">{entry.term}</span>
                      {data ? (
                        <span className="ml-2 text-xs text-slate-500">
                          (p. {data.pages.join(', ')})
                        </span>
                      ) : (
                        <span className="ml-2 text-xs text-slate-600">(見つかりません)</span>
                      )}
                    </div>
                    <button
                      onClick={() => removeEntry(entry.id)}
                      className="p-1 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center px-4 py-3 border-t border-slate-800">
          <span className="text-xs text-slate-500">{entries.length} 件の用語</span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-3 py-2 text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 transition-colors"
            >
              閉じる
            </button>
            <button
              onClick={handleGenerateIndex}
              disabled={entries.length === 0}
              className="px-4 py-2 text-xs text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed rounded transition-colors"
            >
              索引を生成
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
