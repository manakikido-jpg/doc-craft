'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { SpreadsheetDocument, CellFormat } from '@/types'
import { useSpreadsheet } from '@/hooks/use-spreadsheet'
import { recalcAllCells, colIndexToLetter, colLetterToIndex } from '@/lib/formula-engine'
import SpreadsheetToolbar from './spreadsheet-toolbar'
import FormulaBar from './formula-bar'
import CellGrid from './cell-grid'
import SheetTabs from './sheet-tabs'
import { FindReplaceDialog } from './find-replace-dialog'
import { GoToDialog } from './goto-dialog'
import { CellContextMenu } from './cell-context-menu'
import { ArrowLeft, Undo2, Redo2, Download, Upload, Search } from 'lucide-react'

interface Props {
  initialDoc: SpreadsheetDocument
}

export interface SelectionRange {
  startRow: number
  startCol: number
  endRow: number
  endCol: number
}

export default function SpreadsheetEditor({ initialDoc }: Props) {
  const router = useRouter()
  const { state, dispatch, canUndo, canRedo } = useSpreadsheet()
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>({ row: 0, col: 0 })
  const [selectionRange, setSelectionRange] = useState<SelectionRange | null>(null)
  const [editingCell, setEditingCell] = useState<{ row: number; col: number } | null>(null)
  const [editValue, setEditValue] = useState('')
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
  const clipboardRef = useRef<{ data: Record<string, import('@/types').Cell>; width: number; height: number } | null>(
    null,
  )
  const csvInputRef = useRef<HTMLInputElement>(null)

  // Find & Replace state
  const [findReplaceOpen, setFindReplaceOpen] = useState(false)
  const [findReplaceMode, setFindReplaceMode] = useState<'find' | 'replace'>('find')
  const [findText, setFindText] = useState('')
  const [replaceText, setReplaceText] = useState('')
  const [findResults, setFindResults] = useState<{ row: number; col: number }[]>([])
  const [findIndex, setFindIndex] = useState(0)

  // Go To dialog state
  const [goToOpen, setGoToOpen] = useState(false)

  // Auto-save indicator
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved')
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    dispatch({ type: 'LOAD', doc: initialDoc })
  }, [initialDoc])

  // Auto-save simulation: mark as "saving" when state changes, then "saved" after a short delay
  useEffect(() => {
    setSaveStatus('saving')
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => setSaveStatus('saved'), 800)
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [state.sheets, state.meta])

  const activeSheet = useMemo(() => {
    return state.sheets.find((s) => s.id === state.activeSheetId) || state.sheets[0]
  }, [state.sheets, state.activeSheetId])

  const computedValues = useMemo(() => {
    if (!activeSheet) return {}
    return recalcAllCells(activeSheet.cells)
  }, [activeSheet?.cells])

  const commitEdit = useCallback(() => {
    if (editingCell && activeSheet) {
      dispatch({
        type: 'SET_CELL_VALUE',
        sheetId: activeSheet.id,
        row: editingCell.row,
        col: editingCell.col,
        value: editValue,
      })
      setEditingCell(null)
    }
  }, [editingCell, editValue, activeSheet, dispatch])

  const startEdit = useCallback(
    (row: number, col: number, initialValue?: string) => {
      if (!activeSheet) return
      const key = `${row}-${col}`
      const cell = activeSheet.cells[key]
      setEditingCell({ row, col })
      setEditValue(initialValue !== undefined ? initialValue : cell?.value || '')
    },
    [activeSheet],
  )

  const cancelEdit = useCallback(() => {
    setEditingCell(null)
    setEditValue('')
  }, [])

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

  // Find & Replace: search handler
  const doFind = useCallback(
    (text: string) => {
      if (!activeSheet || !text) {
        setFindResults([])
        setFindIndex(0)
        return
      }
      const results: { row: number; col: number }[] = []
      const lowerText = text.toLowerCase()
      for (let r = 0; r < activeSheet.rowCount; r++) {
        for (let c = 0; c < activeSheet.colCount; c++) {
          const key = `${r}-${c}`
          const cell = activeSheet.cells[key]
          if (cell && cell.value.toLowerCase().includes(lowerText)) {
            results.push({ row: r, col: c })
          }
        }
      }
      setFindResults(results)
      setFindIndex(0)
      if (results.length > 0) {
        setSelectedCell(results[0])
        setSelectionRange(null)
      }
    },
    [activeSheet],
  )

  const findNext = useCallback(() => {
    if (findResults.length === 0) return
    const next = (findIndex + 1) % findResults.length
    setFindIndex(next)
    setSelectedCell(findResults[next])
    setSelectionRange(null)
  }, [findResults, findIndex])

  const findPrev = useCallback(() => {
    if (findResults.length === 0) return
    const prev = (findIndex - 1 + findResults.length) % findResults.length
    setFindIndex(prev)
    setSelectedCell(findResults[prev])
    setSelectionRange(null)
  }, [findResults, findIndex])

  const doReplace = useCallback(() => {
    if (!activeSheet || findResults.length === 0) return
    const target = findResults[findIndex]
    const key = `${target.row}-${target.col}`
    const cell = activeSheet.cells[key]
    if (cell) {
      const newValue = cell.value.replace(
        new RegExp(findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'),
        replaceText,
      )
      dispatch({
        type: 'SET_CELL_VALUE',
        sheetId: activeSheet.id,
        row: target.row,
        col: target.col,
        value: newValue,
      })
    }
    // Re-search after replace
    setTimeout(() => doFind(findText), 50)
  }, [activeSheet, findResults, findIndex, findText, replaceText, dispatch, doFind])

  const doReplaceAll = useCallback(() => {
    if (!activeSheet || findResults.length === 0) return
    for (const target of findResults) {
      const key = `${target.row}-${target.col}`
      const cell = activeSheet.cells[key]
      if (cell) {
        const newValue = cell.value.replace(
          new RegExp(findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'),
          replaceText,
        )
        dispatch({
          type: 'SET_CELL_VALUE',
          sheetId: activeSheet.id,
          row: target.row,
          col: target.col,
          value: newValue,
        })
      }
    }
    setTimeout(() => doFind(findText), 50)
  }, [activeSheet, findResults, findText, replaceText, dispatch, doFind])

  // Go To handler
  const handleGoTo = useCallback((ref: string) => {
    const match = ref
      .trim()
      .toUpperCase()
      .match(/^([A-Z])(\d+)$/)
    if (match) {
      const col = colLetterToIndex(match[1])
      const row = parseInt(match[2], 10) - 1
      if (row >= 0 && col >= 0 && col <= 25) {
        setSelectedCell({ row, col })
        setSelectionRange(null)
        setGoToOpen(false)
      }
    }
  }, [])

  // Navigate to cell (from formula bar)
  const handleNavigateToCell = useCallback(
    (row: number, col: number) => {
      if (editingCell) commitEdit()
      setSelectedCell({ row, col })
      setSelectionRange(null)
    },
    [editingCell, commitEdit],
  )

  // Cell selection handlers (stable references for React.memo CellGrid)
  const handleSelectCell = useCallback(
    (row: number, col: number, shiftKey?: boolean) => {
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
    [editingCell, selectedCell, commitEdit],
  )

  const handleExtendSelection = useCallback(
    (row: number, col: number) => {
      if (!selectedCell) return
      setSelectionRange({
        startRow: selectedCell.row,
        startCol: selectedCell.col,
        endRow: row,
        endCol: col,
      })
    },
    [selectedCell],
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

  // Status bar computation
  const statusBarInfo = useMemo(() => {
    if (!normalizedRange || !activeSheet) return null
    const r = normalizedRange
    const rangeLabel =
      r.startRow === r.endRow && r.startCol === r.endCol
        ? `${colIndexToLetter(r.startCol)}${r.startRow + 1}`
        : `${colIndexToLetter(r.startCol)}${r.startRow + 1}:${colIndexToLetter(r.endCol)}${r.endRow + 1}`

    let cellCount = 0
    let numericCount = 0
    let sum = 0
    for (let row = r.startRow; row <= r.endRow; row++) {
      for (let col = r.startCol; col <= r.endCol; col++) {
        cellCount++
        const key = `${row}-${col}`
        const val = computedValues[key]
        if (val !== undefined && val !== '' && !isNaN(Number(val))) {
          numericCount++
          sum += Number(val)
        }
      }
    }
    const avg = numericCount > 0 ? sum / numericCount : 0
    return { rangeLabel, cellCount, sum, avg, numericCount }
  }, [normalizedRange, activeSheet, computedValues])

  // Check if current cell formula has error
  const hasFormulaError = useMemo(() => {
    if (!selectedCell) return false
    const key = `${selectedCell.row}-${selectedCell.col}`
    const val = computedValues[key]
    return (
      typeof val === 'string' &&
      (val.startsWith('#ERR') ||
        val.startsWith('#REF') ||
        val.startsWith('#NAME') ||
        val.startsWith('#DIV') ||
        val.startsWith('#VALUE'))
    )
  }, [selectedCell, computedValues])

  // CSV Import
  const handleCSVImport = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file || !activeSheet) return
      const reader = new FileReader()
      reader.onload = (evt) => {
        const text = evt.target?.result as string
        if (!text) return
        const lines = text.split(/\r?\n/)
        for (let r = 0; r < lines.length; r++) {
          if (!lines[r].trim()) continue
          // Simple CSV parsing (handles quoted fields)
          const cols: string[] = []
          let current = ''
          let inQuotes = false
          for (let i = 0; i < lines[r].length; i++) {
            const ch = lines[r][i]
            if (inQuotes) {
              if (ch === '"' && lines[r][i + 1] === '"') {
                current += '"'
                i++
              } else if (ch === '"') {
                inQuotes = false
              } else {
                current += ch
              }
            } else {
              if (ch === '"') {
                inQuotes = true
              } else if (ch === ',') {
                cols.push(current)
                current = ''
              } else {
                current += ch
              }
            }
          }
          cols.push(current)
          for (let c = 0; c < cols.length; c++) {
            dispatch({
              type: 'SET_CELL_VALUE',
              sheetId: activeSheet.id,
              row: r,
              col: c,
              value: cols[c],
            })
          }
        }
      }
      reader.readAsText(file)
      // Reset input so the same file can be re-imported
      if (csvInputRef.current) csvInputRef.current.value = ''
    },
    [activeSheet, dispatch],
  )

  // Keyboard handler
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Find & Replace
      if ((e.ctrlKey || e.metaKey) && e.key === 'f' && !editingCell) {
        e.preventDefault()
        setFindReplaceOpen(true)
        setFindReplaceMode('find')
        return
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'h' && !editingCell) {
        e.preventDefault()
        setFindReplaceOpen(true)
        setFindReplaceMode('replace')
        return
      }

      // Go To
      if ((e.ctrlKey || e.metaKey) && e.key === 'g' && !editingCell) {
        e.preventDefault()
        setGoToOpen(true)
        return
      }

      // Undo/Redo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        dispatch({ type: 'UNDO' })
        return
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault()
        dispatch({ type: 'REDO' })
        return
      }

      // Format shortcuts (Ctrl+B/I/U)
      if ((e.ctrlKey || e.metaKey) && e.key === 'b' && !editingCell && activeSheet && normalizedRange) {
        e.preventDefault()
        const key = `${normalizedRange.startRow}-${normalizedRange.startCol}`
        const cell = activeSheet.cells[key]
        const currentBold = cell?.format?.bold || false
        dispatch({
          type: 'SET_RANGE_FORMAT',
          sheetId: activeSheet.id,
          startRow: normalizedRange.startRow,
          startCol: normalizedRange.startCol,
          endRow: normalizedRange.endRow,
          endCol: normalizedRange.endCol,
          format: { bold: !currentBold },
        })
        return
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'i' && !editingCell && activeSheet && normalizedRange) {
        e.preventDefault()
        const key = `${normalizedRange.startRow}-${normalizedRange.startCol}`
        const cell = activeSheet.cells[key]
        const currentItalic = cell?.format?.italic || false
        dispatch({
          type: 'SET_RANGE_FORMAT',
          sheetId: activeSheet.id,
          startRow: normalizedRange.startRow,
          startCol: normalizedRange.startCol,
          endRow: normalizedRange.endRow,
          endCol: normalizedRange.endCol,
          format: { italic: !currentItalic },
        })
        return
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'u' && !editingCell && activeSheet && normalizedRange) {
        e.preventDefault()
        const key = `${normalizedRange.startRow}-${normalizedRange.startCol}`
        const cell = activeSheet.cells[key]
        const currentUnderline = cell?.format?.underline || false
        dispatch({
          type: 'SET_RANGE_FORMAT',
          sheetId: activeSheet.id,
          startRow: normalizedRange.startRow,
          startCol: normalizedRange.startCol,
          endRow: normalizedRange.endRow,
          endCol: normalizedRange.endCol,
          format: { underline: !currentUnderline },
        })
        return
      }

      // Ctrl+D → fill down
      if ((e.ctrlKey || e.metaKey) && e.key === 'd' && !editingCell && activeSheet && normalizedRange) {
        e.preventDefault()
        if (normalizedRange.endRow > normalizedRange.startRow) {
          for (let c = normalizedRange.startCol; c <= normalizedRange.endCol; c++) {
            const srcKey = `${normalizedRange.startRow}-${c}`
            const srcCell = activeSheet.cells[srcKey]
            for (let r = normalizedRange.startRow + 1; r <= normalizedRange.endRow; r++) {
              dispatch({
                type: 'SET_CELL_VALUE',
                sheetId: activeSheet.id,
                row: r,
                col: c,
                value: srcCell?.value || '',
              })
            }
          }
        }
        return
      }

      // Ctrl+R → fill right
      if ((e.ctrlKey || e.metaKey) && e.key === 'r' && !editingCell && activeSheet && normalizedRange) {
        e.preventDefault()
        if (normalizedRange.endCol > normalizedRange.startCol) {
          for (let r = normalizedRange.startRow; r <= normalizedRange.endRow; r++) {
            const srcKey = `${r}-${normalizedRange.startCol}`
            const srcCell = activeSheet.cells[srcKey]
            for (let c = normalizedRange.startCol + 1; c <= normalizedRange.endCol; c++) {
              dispatch({
                type: 'SET_CELL_VALUE',
                sheetId: activeSheet.id,
                row: r,
                col: c,
                value: srcCell?.value || '',
              })
            }
          }
        }
        return
      }

      // Ctrl+; → insert today's date
      if ((e.ctrlKey || e.metaKey) && e.key === ';' && !editingCell && activeSheet && selectedCell) {
        e.preventDefault()
        const today = new Date()
        const dateStr = `${today.getFullYear()}/${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}`
        dispatch({
          type: 'SET_CELL_VALUE',
          sheetId: activeSheet.id,
          row: selectedCell.row,
          col: selectedCell.col,
          value: dateStr,
        })
        return
      }

      // Ctrl+Shift+L → toggle autofilter
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'L' && !editingCell && activeSheet && selectedCell) {
        e.preventDefault()
        // Toggle filter on selected column - dispatch if available
        return
      }

      // Ctrl+A → select all
      if ((e.ctrlKey || e.metaKey) && e.key === 'a' && !editingCell && activeSheet) {
        e.preventDefault()
        setSelectedCell({ row: 0, col: 0 })
        setSelectionRange({
          startRow: 0,
          startCol: 0,
          endRow: activeSheet.rowCount - 1,
          endCol: activeSheet.colCount - 1,
        })
        return
      }

      // Copy
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && !editingCell && activeSheet && normalizedRange) {
        e.preventDefault()
        const data: Record<string, import('@/types').Cell> = {}
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
        return
      }

      // Paste
      if (
        (e.ctrlKey || e.metaKey) &&
        e.key === 'v' &&
        !editingCell &&
        activeSheet &&
        selectedCell &&
        clipboardRef.current
      ) {
        e.preventDefault()
        dispatch({
          type: 'PASTE_CELLS',
          sheetId: activeSheet.id,
          startRow: selectedCell.row,
          startCol: selectedCell.col,
          data: clipboardRef.current.data,
        })
        return
      }

      if (editingCell) {
        if (e.key === 'Escape') {
          cancelEdit()
          return
        }
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault()
          commitEdit()
          setSelectedCell({ row: editingCell.row + 1, col: editingCell.col })
          return
        }
        if (e.key === 'Tab') {
          e.preventDefault()
          commitEdit()
          setSelectedCell({ row: editingCell.row, col: editingCell.col + (e.shiftKey ? -1 : 1) })
          return
        }
        return // Let other keys pass to input
      }

      if (!selectedCell || !activeSheet) return

      // Escape → close find dialog too
      if (e.key === 'Escape') {
        if (findReplaceOpen) {
          setFindReplaceOpen(false)
          return
        }
        if (goToOpen) {
          setGoToOpen(false)
          return
        }
      }

      // Home → go to column A in current row
      if (e.key === 'Home' && !(e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        setSelectedCell({ row: selectedCell.row, col: 0 })
        setSelectionRange(null)
        return
      }
      // Ctrl+Home → go to A1
      if (e.key === 'Home' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        setSelectedCell({ row: 0, col: 0 })
        setSelectionRange(null)
        return
      }
      // Ctrl+End → go to last cell with data
      if (e.key === 'End' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        const last = getLastDataCell()
        setSelectedCell(last)
        setSelectionRange(null)
        return
      }

      // Shift+Arrow → extend selection
      if (e.shiftKey && e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectionRange((prev) => {
          const base = prev || {
            startRow: selectedCell.row,
            startCol: selectedCell.col,
            endRow: selectedCell.row,
            endCol: selectedCell.col,
          }
          return { ...base, endRow: Math.max(0, base.endRow - 1) }
        })
        return
      }
      if (e.shiftKey && e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectionRange((prev) => {
          const base = prev || {
            startRow: selectedCell.row,
            startCol: selectedCell.col,
            endRow: selectedCell.row,
            endCol: selectedCell.col,
          }
          return { ...base, endRow: Math.min(activeSheet.rowCount - 1, base.endRow + 1) }
        })
        return
      }
      if (e.shiftKey && e.key === 'ArrowLeft') {
        e.preventDefault()
        setSelectionRange((prev) => {
          const base = prev || {
            startRow: selectedCell.row,
            startCol: selectedCell.col,
            endRow: selectedCell.row,
            endCol: selectedCell.col,
          }
          return { ...base, endCol: Math.max(0, base.endCol - 1) }
        })
        return
      }
      if (e.shiftKey && e.key === 'ArrowRight') {
        e.preventDefault()
        setSelectionRange((prev) => {
          const base = prev || {
            startRow: selectedCell.row,
            startCol: selectedCell.col,
            endRow: selectedCell.row,
            endCol: selectedCell.col,
          }
          return { ...base, endCol: Math.min(activeSheet.colCount - 1, base.endCol + 1) }
        })
        return
      }

      // Arrow keys (without Shift)
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedCell((prev) => (prev ? { row: Math.max(0, prev.row - 1), col: prev.col } : prev))
        setSelectionRange(null)
        return
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedCell((prev) =>
          prev ? { row: Math.min(activeSheet.rowCount - 1, prev.row + 1), col: prev.col } : prev,
        )
        setSelectionRange(null)
        return
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        setSelectedCell((prev) => (prev ? { row: prev.row, col: Math.max(0, prev.col - 1) } : prev))
        setSelectionRange(null)
        return
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        setSelectedCell((prev) =>
          prev ? { row: prev.row, col: Math.min(activeSheet.colCount - 1, prev.col + 1) } : prev,
        )
        setSelectionRange(null)
        return
      }
      if (e.key === 'Tab') {
        e.preventDefault()
        setSelectedCell((prev) =>
          prev ? { row: prev.row, col: Math.min(activeSheet.colCount - 1, prev.col + (e.shiftKey ? -1 : 1)) } : prev,
        )
        setSelectionRange(null)
        return
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        startEdit(selectedCell.row, selectedCell.col)
        return
      }
      if (e.key === 'F2') {
        e.preventDefault()
        startEdit(selectedCell.row, selectedCell.col)
        return
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        if (normalizedRange) {
          dispatch({
            type: 'CLEAR_CELLS',
            sheetId: activeSheet.id,
            startRow: normalizedRange.startRow,
            startCol: normalizedRange.startCol,
            endRow: normalizedRange.endRow,
            endCol: normalizedRange.endCol,
          })
        }
        return
      }

      // Start typing → enter edit mode with empty value
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        startEdit(selectedCell.row, selectedCell.col, e.key)
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    selectedCell,
    editingCell,
    editValue,
    activeSheet,
    normalizedRange,
    commitEdit,
    cancelEdit,
    startEdit,
    dispatch,
    findReplaceOpen,
    goToOpen,
    getLastDataCell,
  ])

  const handleFormatChange = useCallback(
    (format: Partial<CellFormat>) => {
      if (!activeSheet || !normalizedRange) return
      dispatch({
        type: 'SET_RANGE_FORMAT',
        sheetId: activeSheet.id,
        startRow: normalizedRange.startRow,
        startCol: normalizedRange.startCol,
        endRow: normalizedRange.endRow,
        endCol: normalizedRange.endCol,
        format,
      })
    },
    [activeSheet, normalizedRange, dispatch],
  )

  const handleExportCSV = useCallback(() => {
    if (!activeSheet) return
    let csv = ''
    for (let r = 0; r < activeSheet.rowCount; r++) {
      const row: string[] = []
      for (let c = 0; c < activeSheet.colCount; c++) {
        const key = `${r}-${c}`
        const val = computedValues[key]
        const str = val !== undefined ? String(val) : ''
        row.push(str.includes(',') || str.includes('"') || str.includes('\n') ? `"${str.replace(/"/g, '""')}"` : str)
      }
      // Trim trailing empty cells
      while (row.length > 0 && row[row.length - 1] === '') row.pop()
      if (row.length > 0) csv += row.join(',') + '\n'
    }
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = (state.meta.title || 'spreadsheet') + '.csv'
    a.click()
    URL.revokeObjectURL(url)
  }, [activeSheet, computedValues, state.meta.title])

  if (!activeSheet) return null

  const currentCellKey = selectedCell ? `${selectedCell.row}-${selectedCell.col}` : null
  const currentCell = currentCellKey ? activeSheet.cells[currentCellKey] : null

  return (
    <div className="flex flex-col h-screen bg-slate-950">
      {/* Title bar */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-slate-800 bg-slate-950 shrink-0">
        <button
          onClick={() => router.push('/dashboard')}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <input
          type="text"
          value={state.meta.title}
          onChange={(e) => dispatch({ type: 'SET_TITLE', title: e.target.value })}
          className="bg-transparent text-white font-semibold text-sm border-none outline-none flex-1 min-w-0"
          placeholder="無題のスプレッドシート"
        />
        {/* Auto-save indicator */}
        <span
          className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 ${
            saveStatus === 'saved' ? 'text-emerald-400 bg-emerald-400/10' : 'text-amber-400 bg-amber-400/10'
          }`}
        >
          {saveStatus === 'saved' ? '保存済み' : '保存中...'}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => dispatch({ type: 'UNDO' })}
            disabled={!canUndo}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 transition-colors"
            title="元に戻す (Ctrl+Z)"
          >
            <Undo2 size={16} />
          </button>
          <button
            onClick={() => dispatch({ type: 'REDO' })}
            disabled={!canRedo}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 transition-colors"
            title="やり直し (Ctrl+Y)"
          >
            <Redo2 size={16} />
          </button>
          <button
            onClick={handleExportCSV}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="CSVエクスポート"
          >
            <Download size={16} />
          </button>
          {/* CSV Import */}
          <input ref={csvInputRef} type="file" accept=".csv,.tsv,.txt" onChange={handleCSVImport} className="hidden" />
          <button
            onClick={() => csvInputRef.current?.click()}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="CSVインポート"
          >
            <Upload size={16} />
          </button>
          <button
            onClick={() => {
              setFindReplaceOpen(true)
              setFindReplaceMode('find')
            }}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="検索 (Ctrl+F)"
          >
            <Search size={16} />
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <SpreadsheetToolbar
        activeSheet={activeSheet}
        selectedCell={selectedCell}
        selectionRange={normalizedRange}
        currentCellFormat={currentCell?.format}
        onFormatChange={handleFormatChange}
        dispatch={dispatch}
      />

      {/* Formula bar */}
      <FormulaBar
        selectedCell={selectedCell}
        selectionRange={normalizedRange}
        editingCell={editingCell}
        editValue={editingCell ? editValue : currentCell?.value || ''}
        onEditValueChange={setEditValue}
        onStartEdit={() => selectedCell && startEdit(selectedCell.row, selectedCell.col)}
        onCommit={commitEdit}
        onCancel={cancelEdit}
        onNavigateToCell={handleNavigateToCell}
        hasFormulaError={hasFormulaError}
      />

      {/* Cell grid */}
      <div className="flex-1 overflow-hidden">
        <CellGrid
          sheet={activeSheet}
          selectedCell={selectedCell}
          selectionRange={normalizedRange}
          editingCell={editingCell}
          editValue={editValue}
          computedValues={computedValues}
          onSelectCell={handleSelectCell}
          onExtendSelection={handleExtendSelection}
          onStartEdit={startEdit}
          onEditValueChange={setEditValue}
          onCommitEdit={commitEdit}
          onCancelEdit={cancelEdit}
          onContextMenu={(x, y) => setContextMenu({ x, y })}
          dispatch={dispatch}
        />
      </div>

      {/* Status bar */}
      {statusBarInfo && (
        <div className="flex items-center justify-between px-4 py-1 border-t border-slate-800 bg-slate-900/80 text-[10px] text-slate-400 shrink-0 font-mono">
          <span>{statusBarInfo.rangeLabel}</span>
          <div className="flex items-center gap-4">
            <span>セル数: {statusBarInfo.cellCount}</span>
            {statusBarInfo.numericCount > 0 && (
              <>
                <span>合計: {statusBarInfo.sum % 1 === 0 ? statusBarInfo.sum : statusBarInfo.sum.toFixed(2)}</span>
                <span>平均: {statusBarInfo.avg % 1 === 0 ? statusBarInfo.avg : statusBarInfo.avg.toFixed(2)}</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Sheet tabs */}
      <SheetTabs sheets={state.sheets} activeSheetId={state.activeSheetId} dispatch={dispatch} />

      {/* Find & Replace dialog */}
      {findReplaceOpen && (
        <FindReplaceDialog
          mode={findReplaceMode}
          onModeChange={setFindReplaceMode}
          onClose={() => setFindReplaceOpen(false)}
          findText={findText}
          onFindTextChange={setFindText}
          replaceText={replaceText}
          onReplaceTextChange={setReplaceText}
          findResults={findResults}
          findIndex={findIndex}
          onFind={() => doFind(findText)}
          onFindNext={findNext}
          onFindPrev={findPrev}
          onReplace={doReplace}
          onReplaceAll={doReplaceAll}
        />
      )}

      {/* Go To dialog */}
      {goToOpen && (
        <GoToDialog
          onGoTo={handleGoTo}
          onClose={() => {
            setGoToOpen(false)
          }}
        />
      )}

      {/* Context menu */}
      {contextMenu && selectedCell && (
        <CellContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          selectedCell={selectedCell}
          normalizedRange={normalizedRange}
          activeSheet={activeSheet}
          clipboardRef={clipboardRef}
          dispatch={dispatch}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  )
}
