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
  dispatch: React.Dispatch<any>
  onClose: () => void
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
  dispatch,
  onClose,
}: CellContextMenuProps) {
  const { row, col } = selectedCell
  const sheetId = activeSheet.id

  const rangeSpansMultiple =
    normalizedRange != null &&
    (normalizedRange.endRow > normalizedRange.startRow || normalizedRange.endCol > normalizedRange.startCol)

  const isMergedCell = activeSheet.mergedCells?.some((mc) => mc.startRow === row && mc.startCol === col)

  const handleCopy = () => {
    if (!normalizedRange) {
      onClose()
      return
    }
    const data: Record<string, Cell> = {}
    for (let r = normalizedRange.startRow; r <= normalizedRange.endRow; r++) {
      for (let c = normalizedRange.startCol; c <= normalizedRange.endCol; c++) {
        const key = `${r}-${c}`
        if (activeSheet.cells[key]) {
          data[`${r - normalizedRange.startRow}-${c - normalizedRange.startCol}`] = { ...activeSheet.cells[key] }
        }
      }
    }
    clipboardRef.current = {
      data,
      width: normalizedRange.endCol - normalizedRange.startCol + 1,
      height: normalizedRange.endRow - normalizedRange.startRow + 1,
    }
    onClose()
  }

  const handlePaste = () => {
    if (clipboardRef.current) {
      dispatch({ type: 'PASTE_CELLS', sheetId, startRow: row, startCol: col, data: clipboardRef.current.data })
    }
    onClose()
  }

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="fixed z-50 bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-1 w-48 text-sm"
        style={{ left: x, top: y }}
      >
        <MenuItem label="コピー" onClick={handleCopy} />
        <MenuItem label="貼り付け" onClick={handlePaste} />
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
