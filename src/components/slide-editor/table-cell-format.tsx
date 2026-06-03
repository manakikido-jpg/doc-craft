'use client'

import { useState } from 'react'
import { X, Bold, Italic, AlignLeft, AlignCenter, AlignRight } from 'lucide-react'

interface CellStyle {
  bgColor?: string
  textColor?: string
  bold?: boolean
  italic?: boolean
  align?: 'left' | 'center' | 'right'
}

interface Props {
  open: boolean
  onClose: () => void
  selectedCells: { row: number; col: number }[]
  currentStyles: Record<string, CellStyle>
  onUpdateStyle: (cellKey: string, style: CellStyle) => void
  onMergeCells?: () => void
  onUnmergeCells?: () => void
  canMerge?: boolean
  canUnmerge?: boolean
}

const CELL_COLORS = [
  '#1e293b', '#334155', '#475569', '#0f172a',
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
  '#f59e0b', '#22c55e', '#06b6d4', '#3b82f6',
  'transparent',
]

export default function TableCellFormat({ open, onClose, selectedCells, currentStyles, onUpdateStyle, onMergeCells, onUnmergeCells, canMerge, canUnmerge }: Props) {
  if (!open || selectedCells.length === 0) return null

  const firstKey = `${selectedCells[0].row}-${selectedCells[0].col}`
  const style = currentStyles[firstKey] || {}

  function updateAll(updates: Partial<CellStyle>) {
    selectedCells.forEach(cell => {
      const key = `${cell.row}-${cell.col}`
      const existing = currentStyles[key] || {}
      onUpdateStyle(key, { ...existing, ...updates })
    })
  }

  return (
    <div className="fixed right-4 top-32 z-50 w-52 rounded-lg border border-slate-700 bg-slate-900 shadow-2xl">
      <div className="flex items-center justify-between border-b border-slate-700 px-3 py-2">
        <h3 className="text-xs font-semibold text-slate-200">セル書式</h3>
        <button onClick={onClose} className="rounded p-0.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200">
          <X size={14} />
        </button>
      </div>

      <div className="p-3 space-y-3">
        {/* Text formatting */}
        <div>
          <label className="text-[10px] text-slate-500 mb-1 block">テキスト</label>
          <div className="flex items-center gap-1">
            <button
              onClick={() => updateAll({ bold: !style.bold })}
              className={`p-1.5 rounded transition ${style.bold ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
            >
              <Bold size={13} />
            </button>
            <button
              onClick={() => updateAll({ italic: !style.italic })}
              className={`p-1.5 rounded transition ${style.italic ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
            >
              <Italic size={13} />
            </button>
            <div className="w-px h-5 bg-slate-700 mx-1" />
            {(['left', 'center', 'right'] as const).map(a => (
              <button
                key={a}
                onClick={() => updateAll({ align: a })}
                className={`p-1.5 rounded transition ${style.align === a ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
              >
                {a === 'left' && <AlignLeft size={13} />}
                {a === 'center' && <AlignCenter size={13} />}
                {a === 'right' && <AlignRight size={13} />}
              </button>
            ))}
          </div>
        </div>

        {/* Text color */}
        <div>
          <label className="text-[10px] text-slate-500 mb-1 block">文字色</label>
          <div className="flex items-center gap-1.5">
            <input
              type="color"
              value={style.textColor || '#e2e8f0'}
              onChange={e => updateAll({ textColor: e.target.value })}
              className="h-6 w-6 rounded border border-slate-700 bg-transparent cursor-pointer"
            />
            <span className="text-[10px] text-slate-500 font-mono">{style.textColor || '#e2e8f0'}</span>
          </div>
        </div>

        {/* Background color */}
        <div>
          <label className="text-[10px] text-slate-500 mb-1 block">背景色</label>
          <div className="grid grid-cols-5 gap-1">
            {CELL_COLORS.map(c => (
              <button
                key={c}
                onClick={() => updateAll({ bgColor: c })}
                className={`w-7 h-5 rounded border transition hover:scale-110 ${
                  style.bgColor === c ? 'border-indigo-400 ring-1 ring-indigo-400' : 'border-slate-700'
                }`}
                style={{ background: c === 'transparent' ? 'repeating-conic-gradient(#374151 0% 25%, #1e293b 0% 50%) 50%/8px 8px' : c }}
              />
            ))}
          </div>
        </div>

        {/* Merge/Unmerge */}
        {(canMerge || canUnmerge) && (
          <div className="pt-2 border-t border-slate-800">
            <div className="flex gap-2">
              {canMerge && (
                <button
                  onClick={onMergeCells}
                  className="flex-1 px-2 py-1.5 rounded text-xs bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition"
                >
                  セル結合
                </button>
              )}
              {canUnmerge && (
                <button
                  onClick={onUnmergeCells}
                  className="flex-1 px-2 py-1.5 rounded text-xs bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition"
                >
                  結合解除
                </button>
              )}
            </div>
          </div>
        )}

        {/* Selected info */}
        <div className="text-[10px] text-slate-600 text-center">
          {selectedCells.length}セル選択中
        </div>
      </div>
    </div>
  )
}
