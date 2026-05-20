'use client'

import type { Cell, Sheet } from '@/types'
import type { SelectionRange } from './spreadsheet-editor'

interface CellContextMenuProps {
  x: number
  y: number
  selectedCell: { row: number; col: number }
  normalizedRange: SelectionRange | null
  activeSheet: Sheet
  clipboardRef: React.MutableRefObject<{ data: Record<string, Cell>; width: number; height: number } | null>
  computedValues: Record<string, string | number>
  dispatch: React.Dispatch<any>
  onClose: () => void
  onCut?: (range: SelectionRange) => void
}

function MenuItem({ label, onClick, danger = false }: { label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-1.5 text-sm ${
        danger
          ? 'text-red-400 hover:bg-slate-700 hover:text-red-300'
          : 'text-slate-300 hover:bg-slate-700 hover:text-white'
      }`}
    >
      {label}
    </button>
  )
}

export function CellContextMenu({
  x,
  y,
  selectedCell,
  normalizedRange,
  activeSheet,
  clipboardRef,
  computedValues,
  dispatch,
  onClose,
  onCut,
}: CellContextMenuProps) {
  const { row, col } = selectedCell
  const sheetId = activeSheet.id

  const rangeSpansMultiple =
    normalizedRange != null &&
    (normalizedRange.endRow > normalizedRange.startRow || normalizedRange.endCol > normalizedRange.startCol)

  const isMergedCell = activeSheet.mergedCells?.some((mc) => mc.startRow === row && mc.startCol === col)

  const copyRange = (range: SelectionRange) => {
    const data: Record<string, Cell> = {}
    const tsvRows: string[] = []
    for (let r = range.startRow; r <= range.endRow; r++) {
      const rowVals: string[] = []
      for (let c = range.startCol; c <= range.endCol; c++) {
        const key = `${r}-${c}`
        if (activeSheet.cells[key]) {
          data[`${r - range.startRow}-${c - range.startCol}`] = { ...activeSheet.cells[key] }
        }
        const cv = computedValues[key]
        rowVals.push(cv != null ? String(cv) : activeSheet.cells[key]?.value || '')
      }
      tsvRows.push(rowVals.join('\t'))
    }
    clipboardRef.current = {
      data,
      width: range.endCol - range.startCol + 1,
      height: range.endRow - range.startRow + 1,
    }
    try { navigator.clipboard.writeText(tsvRows.join('\n')) } catch {}
  }

  const handleCopy = () => {
    if (!normalizedRange) { onClose(); return }
    copyRange(normalizedRange)
    onClose()
  }

  const handleCut = () => {
    if (!normalizedRange) { onClose(); return }
    copyRange(normalizedRange)
    onCut?.(normalizedRange)
    onClose()
  }

  const handlePaste = () => {
    // Try system clipboard first
    navigator.clipboard.readText().then((text) => {
      if (text && text.includes('\t')) {
        const rows = text.split(/\r?\n/).filter((r) => r.length > 0)
        const extData: Record<string, Cell> = {}
        rows.forEach((rowStr, ri) => {
          rowStr.split('\t').forEach((val, ci) => {
            if (val) extData[`${ri}-${ci}`] = { value: val }
          })
        })
        dispatch({ type: 'PASTE_CELLS', sheetId, startRow: row, startCol: col, data: extData })
      } else if (clipboardRef.current) {
        dispatch({ type: 'PASTE_CELLS', sheetId, startRow: row, startCol: col, data: clipboardRef.current.data })
      } else if (text) {
        dispatch({ type: 'SET_CELL_VALUE', sheetId, row, col, value: text.trim() })
      }
    }).catch(() => {
      if (clipboardRef.current) {
        dispatch({ type: 'PASTE_CELLS', sheetId, startRow: row, startCol: col, data: clipboardRef.current.data })
      }
    })
    onClose()
  }

  const handleClear = () => {
    if (!normalizedRange) { onClose(); return }
    dispatch({
      type: 'CLEAR_CELLS',
      sheetId,
      startRow: normalizedRange.startRow,
      startCol: normalizedRange.startCol,
      endRow: normalizedRange.endRow,
      endCol: normalizedRange.endCol,
    })
    onClose()
  }

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="fixed z-50 bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-1 w-48 text-sm"
        style={{ left: x, top: y }}
      >
        <MenuItem label="切り取り" onClick={handleCut} />
        <MenuItem label="コピー" onClick={handleCopy} />
        <MenuItem label="貼り付け" onClick={handlePaste} />
        <MenuItem label="内容をクリア" onClick={handleClear} />
        <div className="border-t border-slate-700 my-1" />
        <MenuItem
          label="上に行を挿入"
          onClick={() => {
            dispatch({ type: 'INSERT_ROW', sheetId, atRow: row })
            onClose()
          }}
        />
        <MenuItem
          label="下に行を挿入"
          onClick={() => {
            dispatch({ type: 'INSERT_ROW', sheetId, atRow: row + 1 })
            onClose()
          }}
        />
        <MenuItem
          label="左に列を挿入"
          onClick={() => {
            dispatch({ type: 'INSERT_COL', sheetId, atCol: col })
            onClose()
          }}
        />
        <MenuItem
          label="右に列を挿入"
          onClick={() => {
            dispatch({ type: 'INSERT_COL', sheetId, atCol: col + 1 })
            onClose()
          }}
        />
        <div className="border-t border-slate-700 my-1" />
        <MenuItem
          label="行を削除"
          onClick={() => {
            dispatch({ type: 'DELETE_ROW', sheetId, row })
            onClose()
          }}
          danger
        />
        <MenuItem
          label="列を削除"
          onClick={() => {
            dispatch({ type: 'DELETE_COL', sheetId, col })
            onClose()
          }}
          danger
        />
        {rangeSpansMultiple && (
          <>
            <div className="border-t border-slate-700 my-1" />
            <MenuItem
              label="セル結合"
              onClick={() => {
                dispatch({
                  type: 'MERGE_CELLS',
                  sheetId,
                  startRow: normalizedRange!.startRow,
                  startCol: normalizedRange!.startCol,
                  endRow: normalizedRange!.endRow,
                  endCol: normalizedRange!.endCol,
                })
                onClose()
              }}
            />
          </>
        )}
        {isMergedCell && (
          <MenuItem
            label="結合解除"
            onClick={() => {
              dispatch({ type: 'UNMERGE_CELLS', sheetId, startRow: row, startCol: col })
              onClose()
            }}
          />
        )}
      </div>
    </>
  )
}
