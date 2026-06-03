'use client'

import { useState } from 'react'
import type { SlideTableElement } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  table: SlideTableElement
  onSort: (colIndex: number, direction: 'asc' | 'desc') => void
}

export default function TableSortPanel({ open, onClose, table, onSort }: Props) {
  const colCount = table.rows[0]?.length || 0
  const [selectedCol, setSelectedCol] = useState(0)
  const [direction, setDirection] = useState<'asc' | 'desc'>('asc')
  const [excludeHeader, setExcludeHeader] = useState(table.headerRow ?? true)

  if (!open) return null

  const columnOptions = Array.from({ length: colCount }, (_, i) => {
    const headerLabel = table.headerRow && table.rows[0]?.[i]
      ? table.rows[0][i]
      : `列 ${i + 1}`
    return { index: i, label: headerLabel }
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-5 w-80"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white">テーブルソート</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors text-lg leading-none"
          >
            &times;
          </button>
        </div>

        {/* Column selector */}
        <div className="mb-3">
          <label className="block text-xs text-slate-400 mb-1">ソート列</label>
          <select
            value={selectedCol}
            onChange={(e) => setSelectedCol(Number(e.target.value))}
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
          >
            {columnOptions.map((opt) => (
              <option key={opt.index} value={opt.index}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Direction toggle */}
        <div className="mb-3">
          <label className="block text-xs text-slate-400 mb-1">並び順</label>
          <div className="flex gap-2">
            <button
              onClick={() => setDirection('asc')}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                direction === 'asc'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              昇順 (A→Z)
            </button>
            <button
              onClick={() => setDirection('desc')}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                direction === 'desc'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              降順 (Z→A)
            </button>
          </div>
        </div>

        {/* Exclude header checkbox */}
        <div className="mb-4">
          <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={excludeHeader}
              onChange={(e) => setExcludeHeader(e.target.checked)}
              className="rounded border-slate-500 bg-slate-700 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-0"
            />
            ヘッダー行をソート対象から除外
          </label>
        </div>

        {/* Action buttons */}
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-slate-300 bg-slate-700 hover:bg-slate-600 transition-colors"
          >
            キャンセル
          </button>
          <button
            onClick={() => {
              onSort(selectedCol, direction)
              onClose()
            }}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 transition-colors"
          >
            ソート実行
          </button>
        </div>
      </div>
    </div>
  )
}
