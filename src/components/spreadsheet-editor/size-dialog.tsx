'use client'

import { useState, useCallback } from 'react'
import type { SpreadsheetAction } from '@/hooks/use-spreadsheet'
import type { UndoableAction } from '@/lib/undoable'

interface Props {
  open: boolean
  mode: 'column-width' | 'row-height'
  sheetId: string
  index: number // column or row index
  currentSize: number
  dispatch: (action: UndoableAction<SpreadsheetAction>) => void
  onClose: () => void
}

export default function SizeDialog({ open, mode, sheetId, index, currentSize, dispatch, onClose }: Props) {
  const [size, setSize] = useState(currentSize)

  const handleApply = useCallback(() => {
    if (mode === 'column-width') {
      dispatch({
        type: 'SET_COL_WIDTH',
        sheetId,
        col: index,
        width: Math.max(20, Math.min(500, size)),
      })
    } else {
      dispatch({
        type: 'SET_ROW_HEIGHT',
        sheetId,
        row: index,
        height: Math.max(14, Math.min(400, size)),
      })
    }
    onClose()
  }, [mode, sheetId, index, size, dispatch, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-[320px] shadow-2xl">
        <div className="px-5 py-3 border-b border-slate-700 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">
            {mode === 'column-width' ? '列幅の設定' : '行の高さの設定'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-lg">&times;</button>
        </div>

        <div className="p-5">
          <label className="text-xs text-slate-400 block mb-2">
            {mode === 'column-width' ? '列幅 (px)' : '行の高さ (px)'}
          </label>
          <input
            type="number"
            min={mode === 'column-width' ? 20 : 14}
            max={mode === 'column-width' ? 500 : 400}
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleApply()
            }}
            className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
            autoFocus
          />
          <p className="text-[10px] text-slate-500 mt-1">
            {mode === 'column-width' ? '範囲: 20 - 500px' : '範囲: 14 - 400px'}
          </p>
        </div>

        <div className="px-5 py-3 border-t border-slate-700 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs text-slate-400 hover:text-white rounded border border-slate-600 hover:bg-slate-700"
          >
            キャンセル
          </button>
          <button
            onClick={handleApply}
            className="px-4 py-1.5 text-xs text-white bg-indigo-600 hover:bg-indigo-500 rounded"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  )
}
