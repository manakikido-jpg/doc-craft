'use client'

import { useState, useCallback } from 'react'
import type { Sheet } from '@/types'
import type { SpreadsheetAction } from '@/hooks/use-spreadsheet'
import type { UndoableAction } from '@/lib/undoable'
import { colIndexToLetter } from '@/lib/formula-engine'

interface Props {
  open: boolean
  sheet: Sheet
  selectionRange: { startRow: number; startCol: number; endRow: number; endCol: number } | null
  dispatch: (action: UndoableAction<SpreadsheetAction>) => void
  onClose: () => void
}

export default function TableFeature({ open, sheet, selectionRange, dispatch, onClose }: Props) {
  const defaultRange = selectionRange || { startRow: 0, startCol: 0, endRow: 9, endCol: 4 }

  const [startRow, setStartRow] = useState(defaultRange.startRow)
  const [startCol, setStartCol] = useState(defaultRange.startCol)
  const [endRow, setEndRow] = useState(defaultRange.endRow)
  const [endCol, setEndCol] = useState(defaultRange.endCol)
  const [hasHeaders, setHasHeaders] = useState(true)
  const [addTotalRow, setAddTotalRow] = useState(false)

  const handleApply = useCallback(() => {
    // Apply alternating row colors (zebra stripes)
    const dataStartRow = hasHeaders ? startRow + 1 : startRow
    const evenColor = '#1e293b' // slate-800
    const oddColor = '#0f172a'  // slate-950

    // Bold header row
    if (hasHeaders) {
      dispatch({
        type: 'SET_RANGE_FORMAT',
        sheetId: sheet.id,
        startRow,
        startCol,
        endRow: startRow,
        endCol,
        format: { bold: true, bgColor: '#334155', textColor: '#f8fafc' },
      })
      // Add bottom border to header
      dispatch({
        type: 'SET_RANGE_FORMAT',
        sheetId: sheet.id,
        startRow,
        startCol,
        endRow: startRow,
        endCol,
        format: { borderBottom: '2px solid #6366f1' },
      })
    }

    // Zebra stripes for data rows
    let stripeIndex = 0
    for (let r = dataStartRow; r <= endRow; r++) {
      const color = stripeIndex % 2 === 0 ? evenColor : oddColor
      dispatch({
        type: 'SET_RANGE_FORMAT',
        sheetId: sheet.id,
        startRow: r,
        startCol,
        endRow: r,
        endCol,
        format: { bgColor: color },
      })
      stripeIndex++
    }

    // Add auto-filter indicator text to header cells (using comment as indicator)
    if (hasHeaders) {
      for (let c = startCol; c <= endCol; c++) {
        const key = `${startRow}-${c}`
        const existing = sheet.cells[key]
        if (existing) {
          dispatch({
            type: 'SET_CELL_COMMENT',
            sheetId: sheet.id,
            row: startRow,
            col: c,
            comment: '[AutoFilter]',
          })
        }
      }
      // Set filter state for auto-filter
      for (let c = startCol; c <= endCol; c++) {
        dispatch({
          type: 'SET_FILTER',
          sheetId: sheet.id,
          col: c,
          values: [],
        })
      }
    }

    // Add total row with SUM formulas
    if (addTotalRow) {
      const totalRow = endRow + 1
      // Insert a row if needed
      dispatch({
        type: 'INSERT_ROW',
        sheetId: sheet.id,
        atRow: totalRow,
      })

      // Label
      dispatch({
        type: 'SET_CELL_VALUE',
        sheetId: sheet.id,
        row: totalRow,
        col: startCol,
        value: '合計',
      })
      dispatch({
        type: 'SET_CELL_FORMAT',
        sheetId: sheet.id,
        row: totalRow,
        col: startCol,
        format: { bold: true },
      })

      // SUM formulas for remaining columns
      for (let c = startCol + 1; c <= endCol; c++) {
        const colLetter = colIndexToLetter(c)
        const formula = `=SUM(${colLetter}${dataStartRow + 1}:${colLetter}${endRow + 1})`
        dispatch({
          type: 'SET_CELL_VALUE',
          sheetId: sheet.id,
          row: totalRow,
          col: c,
          value: formula,
        })
        dispatch({
          type: 'SET_CELL_FORMAT',
          sheetId: sheet.id,
          row: totalRow,
          col: c,
          format: { bold: true },
        })
      }

      // Style total row
      dispatch({
        type: 'SET_RANGE_FORMAT',
        sheetId: sheet.id,
        startRow: totalRow,
        startCol,
        endRow: totalRow,
        endCol,
        format: { bgColor: '#334155', borderTop: '2px solid #6366f1' },
      })
    }

    onClose()
  }, [sheet, startRow, startCol, endRow, endCol, hasHeaders, addTotalRow, dispatch, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-[400px] shadow-2xl">
        <div className="px-5 py-3 border-b border-slate-700 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">テーブルの作成</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-lg">&times;</button>
        </div>

        <div className="p-5 space-y-4">
          {/* Range inputs */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 block mb-1">開始行</label>
              <input
                type="number"
                min={0}
                value={startRow}
                onChange={(e) => setStartRow(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-1.5 text-sm text-white"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">開始列</label>
              <input
                type="number"
                min={0}
                value={startCol}
                onChange={(e) => setStartCol(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-1.5 text-sm text-white"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">終了行</label>
              <input
                type="number"
                min={startRow}
                value={endRow}
                onChange={(e) => setEndRow(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-1.5 text-sm text-white"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">終了列</label>
              <input
                type="number"
                min={startCol}
                value={endCol}
                onChange={(e) => setEndCol(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-1.5 text-sm text-white"
              />
            </div>
          </div>

          <div className="text-xs text-slate-500">
            範囲: {colIndexToLetter(startCol)}{startRow + 1}:{colIndexToLetter(endCol)}{endRow + 1}
          </div>

          {/* Options */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={hasHeaders}
                onChange={(e) => setHasHeaders(e.target.checked)}
                className="accent-indigo-500"
              />
              先頭行をヘッダーとして使用
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={addTotalRow}
                onChange={(e) => setAddTotalRow(e.target.checked)}
                className="accent-indigo-500"
              />
              合計行を追加
            </label>
          </div>
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
            作成
          </button>
        </div>
      </div>
    </div>
  )
}
