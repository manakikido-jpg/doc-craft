'use client'

import { useState, useMemo, useEffect } from 'react'
import { X, Image, Table2 } from 'lucide-react'
import type { Block } from '@/types'

interface Props {
  blocks: Block[]
  onInsertToc: (content: string) => void
  onClose: () => void
}

interface FigureEntry {
  type: 'figure' | 'table'
  number: number
  caption: string
  blockId: string
}

export default function FigureTocModal({ blocks, onInsertToc, onClose }: Props) {
  const [filter, setFilter] = useState<'all' | 'figure' | 'table'>('all')

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  const entries = useMemo(() => {
    const result: FigureEntry[] = []
    let figCount = 0
    let tableCount = 0

    blocks.forEach((b) => {
      // Detect images with captions (alt text or data-caption)
      if (b.type === 'image') {
        figCount++
        const altMatch = b.content.match(/alt="([^"]*)"/)
        const caption = b.data?.caption || (altMatch ? altMatch[1] : '') || ''
        result.push({
          type: 'figure',
          number: figCount,
          caption,
          blockId: b.id,
        })
      }

      // Detect tables (table blocks or blocks containing <table>)
      if (b.type === 'table') {
        tableCount++
        const caption = b.data?.caption || ''
        result.push({
          type: 'table',
          number: tableCount,
          caption,
          blockId: b.id,
        })
      }
    })

    return result
  }, [blocks])

  const filtered = useMemo(() => {
    if (filter === 'all') return entries
    return entries.filter((e) => e.type === filter)
  }, [entries, filter])

  function scrollToBlock(blockId: string) {
    const el = document.querySelector(`[data-block-id="${blockId}"]`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.classList.add('ring-2', 'ring-indigo-500/50')
      setTimeout(() => el.classList.remove('ring-2', 'ring-indigo-500/50'), 1500)
    }
  }

  function handleInsertToc() {
    const lines: string[] = []

    const figures = entries.filter((e) => e.type === 'figure')
    const tables = entries.filter((e) => e.type === 'table')

    if (figures.length > 0) {
      lines.push('<strong>図目次</strong>')
      figures.forEach((f) => {
        lines.push(`図 ${f.number}: ${f.caption || '(キャプションなし)'}`)
      })
    }

    if (tables.length > 0) {
      if (lines.length > 0) lines.push('')
      lines.push('<strong>表目次</strong>')
      tables.forEach((t) => {
        lines.push(`表 ${t.number}: ${t.caption || '(キャプションなし)'}`)
      })
    }

    if (lines.length === 0) {
      lines.push('図・表が見つかりませんでした。')
    }

    onInsertToc(lines.join('<br/>'))
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-start justify-center pt-[12vh] z-50" onClick={onClose}>
      <div
        className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-[500px] max-h-[65vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
          <h2 className="text-sm font-semibold text-white">図表目次</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={16} />
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex border-b border-slate-800">
          {[
            { key: 'all' as const, label: 'すべて' },
            { key: 'figure' as const, label: '図', icon: Image },
            { key: 'table' as const, label: '表', icon: Table2 },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs transition-colors ${
                filter === key ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {Icon && <Icon size={12} />} {label}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-500">図表が見つかりませんでした</div>
          ) : (
            <div className="py-1">
              {filtered.map((entry) => (
                <button
                  key={`${entry.type}-${entry.number}`}
                  onClick={() => scrollToBlock(entry.blockId)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-800 text-left transition-colors"
                >
                  {entry.type === 'figure' ? (
                    <Image size={14} className="text-emerald-400 flex-shrink-0" />
                  ) : (
                    <Table2 size={14} className="text-blue-400 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-white">
                      {entry.type === 'figure' ? `図 ${entry.number}` : `表 ${entry.number}`}
                      {entry.caption ? `: ${entry.caption}` : ''}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end px-4 py-3 border-t border-slate-800">
          <button
            onClick={handleInsertToc}
            className="px-4 py-2 text-sm text-white bg-indigo-600 hover:bg-indigo-500 rounded transition-colors"
          >
            挿入
          </button>
        </div>
      </div>
    </div>
  )
}
