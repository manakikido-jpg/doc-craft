'use client'

import { useState, useCallback, useRef } from 'react'
import type { Cell } from '@/types'
import type { SelectionRange } from './use-spreadsheet-selection'
import type { PasteMode } from '@/components/spreadsheet-editor/paste-special-dialog'

interface UseSpreadsheetClipboardParams {
  activeSheet: {
    id: string
    cells: Record<string, Cell>
  } | undefined
  normalizedRange: SelectionRange | null
  selectedCell: { row: number; col: number } | null
  computedValues: Record<string, unknown>
  dispatch: (action: unknown) => void
}

export function useSpreadsheetClipboard({
  activeSheet,
  normalizedRange,
  selectedCell,
  computedValues,
  dispatch,
}: UseSpreadsheetClipboardParams) {
  const clipboardRef = useRef<{ data: Record<string, Cell>; width: number; height: number } | null>(null)
  const [cutRange, setCutRange] = useState<{ sheetId: string; range: SelectionRange } | null>(null)
  const [pasteSpecialOpen, setPasteSpecialOpen] = useState(false)

  const handleCopy = useCallback(() => {
    if (!activeSheet || !normalizedRange) return
    const data: Record<string, Cell> = {}
    const tsvRows: string[] = []
    for (let r = normalizedRange.startRow; r <= normalizedRange.endRow; r++) {
      const rowVals: string[] = []
      for (let c = normalizedRange.startCol; c <= normalizedRange.endCol; c++) {
        const key = `${r}-${c}`
        if (activeSheet.cells[key]) {
          data[`${r - normalizedRange.startRow}-${c - normalizedRange.startCol}`] = { ...activeSheet.cells[key] }
        }
        const cv = computedValues[key]
        rowVals.push(cv != null ? String(cv) : activeSheet.cells[key]?.value || '')
      }
      tsvRows.push(rowVals.join('\t'))
    }
    clipboardRef.current = {
      data,
      width: normalizedRange.endCol - normalizedRange.startCol + 1,
      height: normalizedRange.endRow - normalizedRange.startRow + 1,
    }
    setCutRange(null)
    try { navigator.clipboard.writeText(tsvRows.join('\n')) } catch (e) { console.warn('Clipboard write failed:', e) }
  }, [activeSheet, normalizedRange, computedValues])

  const handleCut = useCallback(() => {
    if (!activeSheet || !normalizedRange) return
    const data: Record<string, Cell> = {}
    const tsvRows: string[] = []
    for (let r = normalizedRange.startRow; r <= normalizedRange.endRow; r++) {
      const rowVals: string[] = []
      for (let c = normalizedRange.startCol; c <= normalizedRange.endCol; c++) {
        const key = `${r}-${c}`
        if (activeSheet.cells[key]) {
          data[`${r - normalizedRange.startRow}-${c - normalizedRange.startCol}`] = { ...activeSheet.cells[key] }
        }
        const cv = computedValues[key]
        rowVals.push(cv != null ? String(cv) : activeSheet.cells[key]?.value || '')
      }
      tsvRows.push(rowVals.join('\t'))
    }
    clipboardRef.current = {
      data,
      width: normalizedRange.endCol - normalizedRange.startCol + 1,
      height: normalizedRange.endRow - normalizedRange.startRow + 1,
    }
    setCutRange({ sheetId: activeSheet.id, range: { ...normalizedRange } })
    try { navigator.clipboard.writeText(tsvRows.join('\n')) } catch (e) { console.warn('Clipboard write failed:', e) }
  }, [activeSheet, normalizedRange, computedValues])

  const handlePaste = useCallback(() => {
    if (!activeSheet || !selectedCell) return
    navigator.clipboard.readText().then((text) => {
      if (text && text.includes('\t')) {
        const rows = text.split(/\r?\n/).filter((r) => r.length > 0)
        const extData: Record<string, Cell> = {}
        rows.forEach((row, ri) => {
          row.split('\t').forEach((val, ci) => {
            if (val) extData[`${ri}-${ci}`] = { value: val }
          })
        })
        dispatch({
          type: 'PASTE_CELLS',
          sheetId: activeSheet.id,
          startRow: selectedCell.row,
          startCol: selectedCell.col,
          data: extData,
        })
        if (cutRange && cutRange.sheetId) {
          dispatch({ type: 'CLEAR_CELLS', sheetId: cutRange.sheetId, startRow: cutRange.range.startRow, startCol: cutRange.range.startCol, endRow: cutRange.range.endRow, endCol: cutRange.range.endCol })
          setCutRange(null)
        }
      } else if (clipboardRef.current) {
        dispatch({
          type: 'PASTE_CELLS',
          sheetId: activeSheet.id,
          startRow: selectedCell.row,
          startCol: selectedCell.col,
          data: clipboardRef.current.data,
        })
        if (cutRange && cutRange.sheetId) {
          dispatch({ type: 'CLEAR_CELLS', sheetId: cutRange.sheetId, startRow: cutRange.range.startRow, startCol: cutRange.range.startCol, endRow: cutRange.range.endRow, endCol: cutRange.range.endCol })
          setCutRange(null)
        }
      } else if (text) {
        dispatch({
          type: 'SET_CELL_VALUE',
          sheetId: activeSheet.id,
          row: selectedCell.row,
          col: selectedCell.col,
          value: text.trim(),
        })
      }
    }).catch(() => {
      if (clipboardRef.current) {
        dispatch({
          type: 'PASTE_CELLS',
          sheetId: activeSheet.id,
          startRow: selectedCell.row,
          startCol: selectedCell.col,
          data: clipboardRef.current.data,
        })
        if (cutRange) {
          dispatch({ type: 'CLEAR_CELLS', sheetId: cutRange.sheetId, startRow: cutRange.range.startRow, startCol: cutRange.range.startCol, endRow: cutRange.range.endRow, endCol: cutRange.range.endCol })
          setCutRange(null)
        }
      }
    })
  }, [activeSheet, selectedCell, dispatch, cutRange])

  const handlePasteSpecial = useCallback(
    (mode: PasteMode) => {
      if (!activeSheet || !selectedCell || !clipboardRef.current) {
        setPasteSpecialOpen(false)
        return
      }
      const cbData = clipboardRef.current
      const startRow = selectedCell.row
      const startCol = selectedCell.col

      if (mode === 'all') {
        dispatch({ type: 'PASTE_CELLS', sheetId: activeSheet.id, startRow, startCol, data: cbData.data })
      } else if (mode === 'values') {
        const valuesData: Record<string, Cell> = {}
        for (const [key, cell] of Object.entries(cbData.data)) {
          const [rOff, cOff] = key.split('-').map(Number)
          const val = cell.value.startsWith('=')
            ? (computedValues[`${startRow + rOff}-${startCol + cOff}`] ?? cell.value)
            : cell.value
          valuesData[key] = { value: String(val), format: cell.format }
        }
        dispatch({ type: 'PASTE_CELLS', sheetId: activeSheet.id, startRow, startCol, data: valuesData })
      } else if (mode === 'formats') {
        for (const [key, cell] of Object.entries(cbData.data)) {
          if (cell.format) {
            const [rOff, cOff] = key.split('-').map(Number)
            dispatch({
              type: 'SET_CELL_FORMAT',
              sheetId: activeSheet.id,
              row: startRow + rOff,
              col: startCol + cOff,
              format: cell.format,
            })
          }
        }
      } else if (mode === 'formulas') {
        const formulasData: Record<string, Cell> = {}
        for (const [key, cell] of Object.entries(cbData.data)) {
          formulasData[key] = { value: cell.value }
        }
        dispatch({ type: 'PASTE_CELLS', sheetId: activeSheet.id, startRow, startCol, data: formulasData })
      } else if (mode === 'transpose') {
        const transposedData: Record<string, Cell> = {}
        for (const [key, cell] of Object.entries(cbData.data)) {
          const [rOff, cOff] = key.split('-').map(Number)
          transposedData[`${cOff}-${rOff}`] = { ...cell }
        }
        dispatch({ type: 'PASTE_CELLS', sheetId: activeSheet.id, startRow, startCol, data: transposedData })
      }

      if (cutRange && cutRange.sheetId) {
        dispatch({
          type: 'CLEAR_CELLS',
          sheetId: cutRange.sheetId,
          startRow: cutRange.range.startRow,
          startCol: cutRange.range.startCol,
          endRow: cutRange.range.endRow,
          endCol: cutRange.range.endCol,
        })
        setCutRange(null)
      }

      setPasteSpecialOpen(false)
    },
    [activeSheet, selectedCell, computedValues, dispatch, cutRange],
  )

  return {
    clipboardRef,
    cutRange,
    setCutRange,
    pasteSpecialOpen,
    setPasteSpecialOpen,
    handleCopy,
    handleCut,
    handlePaste,
    handlePasteSpecial,
  }
}
