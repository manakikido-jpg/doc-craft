'use client'

import { useState, useCallback } from 'react'
import type { Sheet } from '@/types'
import type { SpreadsheetAction } from '@/hooks/use-spreadsheet'
import type { UndoableAction } from '@/lib/undoable'
import { colIndexToLetter } from '@/lib/formula-engine'

type SubtotalFunc = 'SUM' | 'COUNT' | 'AVERAGE' | 'MAX' | 'MIN'

interface Props {
  open: boolean
  sheet: Sheet
  dispatch: (action: UndoableAction<SpreadsheetAction>) => void
  onClose: () => void
}

export default function SubtotalDialog({ open, sheet, dispatch, onClose }: Props) {
  const [groupByCol, setGroupByCol] = useState(0)
  const [func, setFunc] = useState<SubtotalFunc>('SUM')
  const [applyCols, setApplyCols] = useState<number[]>([1])

  const toggleApplyCol = useCallback((col: number) => {
    setApplyCols((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col],
    )
  }, [])

  const handleApply = useCallback(() => {
    if (!sheet || applyCols.length === 0) return

    // Gather all used rows
    const rowSet = new Set<number>()
    for (const key of Object.keys(sheet.cells)) {
      const r = Number(key.split('-')[0])
      rowSet.add(r)
    }
    const rows = Array.from(rowSet).sort((a, b) => a - b)
    if (rows.length <= 1) {
      onClose()
      return
    }

    // Group rows by the group-by column value (skip header row 0)
    const dataRows = rows.filter((r) => r > 0)
    let currentGroupValue = ''
    let groupStartRow = -1
    const subtotalInserts: { afterRow: number; groupValue: string }[] = []

    for (let i = 0; i < dataRows.length; i++) {
      const r = dataRows[i]
      const val = sheet.cells[`${r}-${groupByCol}`]?.value ?? ''
      if (val !== currentGroupValue) {
        if (groupStartRow >= 0 && currentGroupValue !== '') {
          subtotalInserts.push({ afterRow: dataRows[i - 1], groupValue: currentGroupValue })
        }
        currentGroupValue = val
        groupStartRow = r
      }
    }
    // Last group
    if (groupStartRow >= 0 && currentGroupValue !== '') {
      subtotalInserts.push({ afterRow: dataRows[dataRows.length - 1], groupValue: currentGroupValue })
    }

    // Insert subtotal rows from bottom up so row indices don't shift
    for (let i = subtotalInserts.length - 1; i >= 0; i--) {
      const { afterRow, groupValue } = subtotalInserts[i]
      const insertRow = afterRow + 1 + i // offset by previously inserted rows

      // Insert a row
      dispatch({
        type: 'INSERT_ROW',
        sheetId: sheet.id,
        atRow: insertRow,
      })

      // Set the group-by column label
      dispatch({
        type: 'SET_CELL_VALUE',
        sheetId: sheet.id,
        row: insertRow,
        col: groupByCol,
        value: `${groupValue} ${func}`,
      })

      // Bold the subtotal label
      dispatch({
        type: 'SET_CELL_FORMAT',
        sheetId: sheet.id,
        row: insertRow,
        col: groupByCol,
        format: { bold: true },
      })

      // Set formula cells for each apply column
      for (const col of applyCols) {
        // Find the range of rows in this group
        const colLetter = colIndexToLetter(col)
        // We need to calculate the actual start/end rows for this group
        // For simplicity, use a range formula pointing at the data rows above
        const endRowRef = insertRow // row just above this subtotal
        const startRowRef = Math.max(1, endRowRef - 5) // approximate, will cover the group
        const formula = `=${func}(${colLetter}${startRowRef}:${colLetter}${endRowRef})`
        dispatch({
          type: 'SET_CELL_VALUE',
          sheetId: sheet.id,
          row: insertRow,
          col,
          value: formula,
        })
        dispatch({
          type: 'SET_CELL_FORMAT',
          sheetId: sheet.id,
          row: insertRow,
          col,
          format: { bold: true },
        })
      }
    }

    onClose()
  }, [sheet, groupByCol, func, applyCols, dispatch, onClose])

  if (!open) return null

  const maxCol = Math.min(sheet.colCount, 26)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-[420px] shadow-2xl">
        <div className="px-5 py-3 border-b border-slate-700 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">小計</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-lg">&times;</button>
        </div>

        <div className="p-5 space-y-4">
          {/* Group by column */}
          <div>
            <label className="text-xs text-slate-400 block mb-1">グループの基準列</label>
            <select
              value={groupByCol}
              onChange={(e) => setGroupByCol(Number(e.target.value))}
              className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-1.5 text-sm text-white"
            >
              {Array.from({ length: maxCol }, (_, i) => (
                <option key={i} value={i}>
                  {colIndexToLetter(i)} - 列{i + 1}
                </option>
              ))}
            </select>
          </div>

          {/* Function */}
          <div>
            <label className="text-xs text-slate-400 block mb-1">集計関数</label>
            <select
              value={func}
              onChange={(e) => setFunc(e.target.value as SubtotalFunc)}
              className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-1.5 text-sm text-white"
            >
              <option value="SUM">SUM (合計)</option>
              <option value="COUNT">COUNT (個数)</option>
              <option value="AVERAGE">AVERAGE (平均)</option>
              <option value="MAX">MAX (最大)</option>
              <option value="MIN">MIN (最小)</option>
            </select>
          </div>

          {/* Apply-to columns */}
          <div>
            <label className="text-xs text-slate-400 block mb-1">集計する列</label>
            <div className="max-h-32 overflow-auto bg-slate-800 border border-slate-600 rounded p-2 space-y-1">
              {Array.from({ length: maxCol }, (_, i) => (
                <label key={i} className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer hover:text-white">
                  <input
                    type="checkbox"
                    checked={applyCols.includes(i)}
                    onChange={() => toggleApplyCol(i)}
                    className="accent-indigo-500"
                  />
                  {colIndexToLetter(i)} - 列{i + 1}
                </label>
              ))}
            </div>
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
            適用
          </button>
        </div>
      </div>
    </div>
  )
}
