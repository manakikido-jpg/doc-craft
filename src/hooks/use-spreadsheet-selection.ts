'use client'

import { useState, useCallback, useMemo } from 'react'
import type { CellFormat } from '@/types'
import { colIndexToLetter } from '@/lib/formula-engine'

export interface SelectionRange {
  startRow: number
  startCol: number
  endRow: number
  endCol: number
}

interface UseSpreadsheetSelectionParams {
  activeSheet: {
    id: string
    rowCount: number
    colCount: number
    cells: Record<string, { value: string; format?: CellFormat }>
  } | undefined
  computedValues: Record<string, unknown>
  editingCell: { row: number; col: number } | null
  editValue: string
  isFormulaMode: boolean
  formulaRefCell: { row: number; col: number } | null
  formulaInsertBase: string
  formatPainterFormat: CellFormat | null
  dispatch: (action: unknown) => void
  commitEdit: () => void
  setEditValue: (v: string) => void
  setFormulaRefCell: (v: { row: number; col: number } | null) => void
  setFormulaInsertBase: (v: string) => void
  setFormatPainterFormat: (v: CellFormat | null) => void
}

export function useSpreadsheetSelection({
  activeSheet,
  computedValues,
  editingCell,
  editValue,
  isFormulaMode,
  formulaRefCell,
  formulaInsertBase,
  formatPainterFormat,
  dispatch,
  commitEdit,
  setEditValue,
  setFormulaRefCell,
  setFormulaInsertBase,
  setFormatPainterFormat,
}: UseSpreadsheetSelectionParams) {
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>({ row: 0, col: 0 })
  const [selectionRange, setSelectionRange] = useState<SelectionRange | null>(null)

  const normalizedRange = useMemo((): SelectionRange | null => {
    if (!selectionRange) {
      if (!selectedCell) return null
      return {
        startRow: selectedCell.row,
        startCol: selectedCell.col,
        endRow: selectedCell.row,
        endCol: selectedCell.col,
      }
    }
    return {
      startRow: Math.min(selectionRange.startRow, selectionRange.endRow),
      startCol: Math.min(selectionRange.startCol, selectionRange.endCol),
      endRow: Math.max(selectionRange.startRow, selectionRange.endRow),
      endCol: Math.max(selectionRange.startCol, selectionRange.endCol),
    }
  }, [selectionRange, selectedCell])

  // Helper: find edge cell for Ctrl+Arrow navigation (Excel-like behavior)
  const findEdgeCell = useCallback(
    (row: number, col: number, direction: 'up' | 'down' | 'left' | 'right', sheet: typeof activeSheet, cv: typeof computedValues): { row: number; col: number } => {
      if (!sheet) return { row, col }
      const maxRow = sheet.rowCount - 1
      const maxCol = sheet.colCount - 1
      const getCellValue = (r: number, c: number) => {
        const key = `${r}-${c}`
        const val = cv[key]
        return val !== undefined && val !== ''
      }
      const currentHasData = getCellValue(row, col)

      let dr = 0, dc = 0
      if (direction === 'up') dr = -1
      else if (direction === 'down') dr = 1
      else if (direction === 'left') dc = -1
      else if (direction === 'right') dc = 1

      const nextR = row + dr
      const nextC = col + dc
      const nextInBounds = nextR >= 0 && nextR <= maxRow && nextC >= 0 && nextC <= maxCol
      const nextHasData = nextInBounds && getCellValue(nextR, nextC)

      if (currentHasData && nextHasData) {
        let r = nextR, c = nextC
        while (true) {
          const nr = r + dr, nc = c + dc
          if (nr < 0 || nr > maxRow || nc < 0 || nc > maxCol) break
          if (!getCellValue(nr, nc)) break
          r = nr
          c = nc
        }
        return { row: r, col: c }
      } else {
        let r = nextInBounds ? nextR : row, c = nextInBounds ? nextC : col
        while (r >= 0 && r <= maxRow && c >= 0 && c <= maxCol) {
          if (getCellValue(r, c)) return { row: r, col: c }
          r += dr
          c += dc
        }
        if (direction === 'up') return { row: 0, col }
        if (direction === 'down') return { row: maxRow, col }
        if (direction === 'left') return { row, col: 0 }
        return { row, col: maxCol }
      }
    },
    [],
  )

  // Helper: get last cell with data
  const getLastDataCell = useCallback(() => {
    if (!activeSheet) return { row: 0, col: 0 }
    let maxRow = 0
    let maxCol = 0
    for (const key of Object.keys(activeSheet.cells)) {
      const [r, c] = key.split('-').map(Number)
      if (r > maxRow) maxRow = r
      if (c > maxCol) maxCol = c
    }
    return { row: maxRow, col: maxCol }
  }, [activeSheet])

  // Cell selection handler
  const handleSelectCell = useCallback(
    (row: number, col: number, shiftKey?: boolean) => {
      // Format Painter: apply stored format to the clicked cell, then clear
      if (formatPainterFormat && activeSheet) {
        dispatch({
          type: 'SET_CELL_FORMAT',
          sheetId: activeSheet.id,
          row,
          col,
          format: formatPainterFormat,
        })
        setFormatPainterFormat(null)
        setSelectedCell({ row, col })
        setSelectionRange(null)
        return
      }
      // Formula mode: insert cell reference instead of committing
      if (editingCell && editValue.startsWith('=')) {
        const ref = colIndexToLetter(col) + (row + 1)

        if (shiftKey && formulaRefCell) {
          const startRef = colIndexToLetter(formulaRefCell.col) + (formulaRefCell.row + 1)
          const rangeRef = startRef + ':' + ref
          setEditValue(formulaInsertBase + rangeRef)
        } else {
          const lastChar = editValue[editValue.length - 1]
          const needsNothing = !lastChar || /[=(,+\-*/&<>]/.test(lastChar)
          let base: string
          if (needsNothing) {
            base = editValue
          } else {
            const partialMatch = editValue.match(/([A-Z]+\d*(?::[A-Z]+\d*)?)$/i)
            if (partialMatch) {
              base = editValue.substring(0, editValue.length - partialMatch[1].length)
            } else {
              base = editValue
            }
          }
          setFormulaInsertBase(base)
          setEditValue(base + ref)
          setFormulaRefCell({ row, col })
        }
        return
      }
      if (editingCell) commitEdit()
      if (shiftKey && selectedCell) {
        setSelectionRange({
          startRow: selectedCell.row,
          startCol: selectedCell.col,
          endRow: row,
          endCol: col,
        })
      } else {
        setSelectedCell({ row, col })
        setSelectionRange(null)
      }
    },
    [editingCell, selectedCell, commitEdit, editValue, formulaRefCell, formulaInsertBase, formatPainterFormat, activeSheet, dispatch, setEditValue, setFormulaRefCell, setFormulaInsertBase, setFormatPainterFormat],
  )

  const handleExtendSelection = useCallback(
    (row: number, col: number) => {
      // Formula mode: drag to build range reference
      if (editingCell && isFormulaMode && formulaRefCell) {
        const startRef = colIndexToLetter(formulaRefCell.col) + (formulaRefCell.row + 1)
        const endRef = colIndexToLetter(col) + (row + 1)
        if (startRef === endRef) {
          setEditValue(formulaInsertBase + startRef)
        } else {
          setEditValue(formulaInsertBase + startRef + ':' + endRef)
        }
        return
      }
      if (!selectedCell) return
      setSelectionRange({
        startRow: selectedCell.row,
        startCol: selectedCell.col,
        endRow: row,
        endCol: col,
      })
    },
    [selectedCell, editingCell, isFormulaMode, formulaRefCell, formulaInsertBase, setEditValue],
  )

  return {
    selectedCell,
    setSelectedCell,
    selectionRange,
    setSelectionRange,
    normalizedRange,
    handleSelectCell,
    handleExtendSelection,
    findEdgeCell,
    getLastDataCell,
  }
}
