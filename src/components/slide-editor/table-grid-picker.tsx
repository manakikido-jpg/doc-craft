'use client'

import { useState } from 'react'
import { X } from 'lucide-react'

interface TableGridPickerProps {
  onSelect: (rows: number, cols: number) => void
  onClose: () => void
}

const MAX_COLS = 8
const MAX_ROWS = 6

export default function TableGridPicker({ onSelect, onClose }: TableGridPickerProps) {
  const [hoverRow, setHoverRow] = useState(0)
  const [hoverCol, setHoverCol] = useState(0)

  return (
    <div className="w-auto bg-slate-800 border border-slate-700 rounded-xl shadow-xl p-3 space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-white text-sm font-medium">テーブルサイズ</span>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white p-0.5 rounded hover:bg-slate-700 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Grid */}
      <div
        className="inline-grid gap-0.5"
        style={{ gridTemplateColumns: `repeat(${MAX_COLS}, 16px)` }}
        onMouseLeave={() => { setHoverRow(0); setHoverCol(0) }}
      >
        {Array.from({ length: MAX_ROWS }, (_, r) =>
          Array.from({ length: MAX_COLS }, (_, c) => {
            const highlighted = r < hoverRow && c < hoverCol
            return (
              <button
                key={`${r}-${c}`}
                className={`w-4 h-4 border transition-colors ${
                  highlighted
                    ? 'bg-indigo-500 border-indigo-400'
                    : 'bg-slate-700/40 border-slate-600 hover:border-slate-500'
                }`}
                onMouseEnter={() => { setHoverRow(r + 1); setHoverCol(c + 1) }}
                onClick={() => { onSelect(r + 1, c + 1); onClose() }}
              />
            )
          })
        )}
      </div>

      {/* Size label */}
      <div className="text-center text-xs text-slate-400">
        {hoverRow > 0 && hoverCol > 0 ? `${hoverCol} x ${hoverRow}` : 'マウスオーバーで選択'}
      </div>
    </div>
  )
}
