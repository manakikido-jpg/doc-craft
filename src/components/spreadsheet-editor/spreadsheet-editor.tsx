'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { SpreadsheetDocument, CellFormat, DataValidation } from '@/types'
import { useSpreadsheet } from '@/hooks/use-spreadsheet'
import { recalcAllCells, colIndexToLetter, colLetterToIndex } from '@/lib/formula-engine'
import SpreadsheetToolbar from './spreadsheet-toolbar'
import FormulaBar from './formula-bar'
import CellGrid from './cell-grid'
import SheetTabs from './sheet-tabs'
import { FindReplaceDialog } from './find-replace-dialog'
import { GoToDialog } from './goto-dialog'
import { CellContextMenu } from './cell-context-menu'
import { DataValidationDialog } from './data-validation-dialog'
import { PrintPreview } from './print-preview'
import ChartPanel, { type SpreadsheetChart, renderChartSVG } from './chart-panel'
import FormulaAutocomplete from './formula-autocomplete'
import ShortcutsHelp from '../shared/shortcuts-help'
import PdfAiPanel from '../shared/pdf-ai-panel'
import PivotTableDialog, { type PivotResult } from './pivot-table-dialog'
import { exportSpreadsheetToHTML, exportSpreadsheetToPDF, downloadFile } from '@/lib/export-utils'
import { generateId } from '@/lib/utils'
import { ArrowLeft, Undo2, Redo2, Download, Upload, Search, BarChart3, ChevronDown as ChevronDownIcon, X, ShieldCheck, Printer, FileDown } from 'lucide-react'

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
  const [cutRange, setCutRange] = useState<{ sheetId: string; range: SelectionRange } | null>(null)
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

  // Chart panel state
  const [chartPanelOpen, setChartPanelOpen] = useState(false)
  const [charts, setCharts] = useState<SpreadsheetChart[]>([])

  // Formula autocomplete state
  const [showFormulaAutocomplete, setShowFormulaAutocomplete] = useState(false)
  const [formulaAnchorRect, setFormulaAnchorRect] = useState<{ top: number; left: number } | null>(null)
  const [isSlashMode, setIsSlashMode] = useState(false)
  const editCellRef = useRef<HTMLElement | null>(null)

  // Export dropdown state
  const [showExportMenu, setShowExportMenu] = useState(false)

  // Data validation dialog state
  const [validationDialogOpen, setValidationDialogOpen] = useState(false)

  // Print preview state
  const [printPreviewOpen, setPrintPreviewOpen] = useState(false)

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

  // Validation error for the currently editing cell
  const validationError = useMemo(() => {
    if (!editingCell || !activeSheet) return null
    const key = `${editingCell.row}-${editingCell.col}`
    const dv = activeSheet.dataValidation?.[key]
    if (!dv || !editValue) return null
    switch (dv.type) {
      case 'number': {
        const n = Number(editValue)
        if (isNaN(n)) return dv.errorMessage || '数値を入力してください'
        if (dv.min !== undefined && n < dv.min) return dv.errorMessage || `${dv.min}以上の値を入力してください`
        if (dv.max !== undefined && n > dv.max) return dv.errorMessage || `${dv.max}以下の値を入力してください`
        break
      }
      case 'text': {
        if (dv.max !== undefined && editValue.length > dv.max) return dv.errorMessage || `${dv.max}文字以内で入力してください`
        break
      }
      case 'list': {
        if (dv.listValues && !dv.listValues.includes(editValue)) return dv.errorMessage || 'リストから選択してください'
        break
      }
      case 'date': {
        const dateNum = Number(editValue.replace(/\//g, ''))
        if (isNaN(dateNum)) return dv.errorMessage || '日付を入力してください'
        if (dv.min !== undefined && dateNum < dv.min) return dv.errorMessage || '範囲外の日付です'
        if (dv.max !== undefined && dateNum > dv.max) return dv.errorMessage || '範囲外の日付です'
        break
      }
    }
    return null
  }, [editingCell, editValue, activeSheet])

  // Handle list selection from cell dropdown
  const handleListSelect = useCallback(
    (row: number, col: number, value: string) => {
      if (!activeSheet) return
      dispatch({
        type: 'SET_CELL_VALUE',
        sheetId: activeSheet.id,
        row,
        col,
        value,
      })
    },
    [activeSheet, dispatch],
  )

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
  // Shortcuts help state
  const [shortcutsOpen, setShortcutsOpen] = useState(false)

  // Pivot table state
  const [pivotOpen, setPivotOpen] = useState(false)
  // PDF AI panel state
  const [pdfAiOpen, setPdfAiOpen] = useState(false)

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Shortcuts help
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault()
        setShortcutsOpen(true)
        return
      }

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

      // Copy (Ctrl+C)
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && !editingCell && activeSheet && normalizedRange) {
        e.preventDefault()
        const data: Record<string, import('@/types').Cell> = {}
        const tsvRows: string[] = []
        for (let r = normalizedRange.startRow; r <= normalizedRange.endRow; r++) {
          const rowVals: string[] = []
          for (let c = normalizedRange.startCol; c <= normalizedRange.endCol; c++) {
            const key = `${r}-${c}`
            if (activeSheet.cells[key]) {
              data[`${r - normalizedRange.startRow}-${c - normalizedRange.startCol}`] = { ...activeSheet.cells[key] }
            }
            // Use computed value for TSV (so formulas show results)
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
        // Write TSV to system clipboard for Excel/Sheets interop
        try { navigator.clipboard.writeText(tsvRows.join('\n')) } catch {}
        return
      }

      // Cut (Ctrl+X)
      if ((e.ctrlKey || e.metaKey) && e.key === 'x' && !editingCell && activeSheet && normalizedRange) {
        e.preventDefault()
        const data: Record<string, import('@/types').Cell> = {}
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
        try { navigator.clipboard.writeText(tsvRows.join('\n')) } catch {}
        return
      }

      // Paste (Ctrl+V)
      if ((e.ctrlKey || e.metaKey) && e.key === 'v' && !editingCell && activeSheet && selectedCell) {
        e.preventDefault()
        // Try system clipboard first for external data (Excel, Sheets, etc.)
        navigator.clipboard.readText().then((text) => {
          if (text && text.includes('\t')) {
            // Parse TSV from external source
            const rows = text.split(/\r?\n/).filter((r) => r.length > 0)
            const extData: Record<string, import('@/types').Cell> = {}
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
            // If this was a cut, clear source cells
            if (cutRange && cutRange.sheetId) {
              dispatch({ type: 'CLEAR_CELLS', sheetId: cutRange.sheetId, startRow: cutRange.range.startRow, startCol: cutRange.range.startCol, endRow: cutRange.range.endRow, endCol: cutRange.range.endCol })
              setCutRange(null)
            }
          } else if (clipboardRef.current) {
            // Fall back to internal clipboard
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
            // Single value from clipboard
            dispatch({
              type: 'SET_CELL_VALUE',
              sheetId: activeSheet.id,
              row: selectedCell.row,
              col: selectedCell.col,
              value: text.trim(),
            })
          }
        }).catch(() => {
          // Clipboard API not available, use internal clipboard
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

  const handleExportHTML = useCallback(() => {
    const doc: import('@/types').SpreadsheetDocument = {
      meta: state.meta,
      sheets: state.sheets,
      activeSheetId: state.activeSheetId,
    }
    const html = exportSpreadsheetToHTML(doc)
    downloadFile(html, (state.meta.title || 'spreadsheet') + '.html')
    setShowExportMenu(false)
  }, [state])

  const handleExportPDF = useCallback(() => {
    const doc: import('@/types').SpreadsheetDocument = {
      meta: state.meta,
      sheets: state.sheets,
      activeSheetId: state.activeSheetId,
    }
    exportSpreadsheetToPDF(doc)
    setShowExportMenu(false)
  }, [state])

  const handleAddChart = useCallback((chart: SpreadsheetChart) => {
    setCharts((prev) => [...prev, chart])
  }, [])

  const handleRemoveChart = useCallback((chartId: string) => {
    setCharts((prev) => prev.filter((c) => c.id !== chartId))
  }, [])

  const handleFormulaSelect = useCallback(
    (funcName: string) => {
      if (!editingCell) return
      if (isSlashMode) {
        // Slash mode: replace entire "/text" with "=FUNCTION("
        setEditValue('=' + funcName + '(')
        setShowFormulaAutocomplete(false)
        setIsSlashMode(false)
        return
      }
      // Replace the partial function name typed so far
      const currentVal = editValue
      const match = currentVal.match(/([A-Za-z]+)$/)
      if (match) {
        const newVal = currentVal.substring(0, currentVal.length - match[1].length) + funcName + '('
        setEditValue(newVal)
      } else {
        setEditValue(currentVal + funcName + '(')
      }
      setShowFormulaAutocomplete(false)
    },
    [editingCell, editValue, isSlashMode],
  )

  // Track formula autocomplete visibility
  useEffect(() => {
    if (!editingCell) {
      setShowFormulaAutocomplete(false)
      setIsSlashMode(false)
      return
    }

    // Slash mode: "/" triggers function browser
    if (editValue.startsWith('/')) {
      setShowFormulaAutocomplete(true)
      setIsSlashMode(true)
      const cellEl = document.querySelector(`[data-cell="${editingCell.row}-${editingCell.col}"]`)
      if (cellEl) {
        const rect = cellEl.getBoundingClientRect()
        setFormulaAnchorRect({ top: rect.bottom, left: rect.left })
      }
      return
    }

    // Equals mode: "=" triggers autocomplete
    if (editValue.startsWith('=') && editValue.length > 1) {
      const afterEq = editValue.substring(1)
      const match = afterEq.match(/([A-Za-z]+)$/)
      if (match && match[1].length >= 1) {
        setShowFormulaAutocomplete(true)
        setIsSlashMode(false)
        const cellEl = document.querySelector(`[data-cell="${editingCell.row}-${editingCell.col}"]`)
        if (cellEl) {
          const rect = cellEl.getBoundingClientRect()
          setFormulaAnchorRect({ top: rect.bottom, left: rect.left })
        }
        return
      }
    }

    setShowFormulaAutocomplete(false)
    setIsSlashMode(false)
  }, [editValue, editingCell])

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
          {/* Export dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu((v) => !v)}
              className="h-8 px-2 flex items-center gap-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="エクスポート"
            >
              <Download size={16} />
              <ChevronDownIcon size={12} />
            </button>
            {showExportMenu && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShowExportMenu(false)} />
                <div className="absolute top-full right-0 mt-1 z-40 bg-slate-800 border border-slate-700 rounded-lg py-1 shadow-xl w-36">
                  <button
                    onClick={() => { handleExportCSV(); setShowExportMenu(false) }}
                    className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700 hover:text-white"
                  >
                    CSV
                  </button>
                  <button
                    onClick={handleExportHTML}
                    className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700 hover:text-white"
                  >
                    HTML
                  </button>
                  <button
                    onClick={handleExportPDF}
                    className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700 hover:text-white"
                  >
                    PDF (印刷)
                  </button>
                </div>
              </>
            )}
          </div>
          {/* CSV Import */}
          <input ref={csvInputRef} type="file" accept=".csv,.tsv,.txt" onChange={handleCSVImport} className="hidden" />
          <button
            onClick={() => csvInputRef.current?.click()}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="CSVインポート"
          >
            <Upload size={16} />
          </button>
          {/* PDF Import */}
          <button
            onClick={() => setPdfAiOpen(true)}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
            title="PDF読み込み + AI処理"
          >
            <FileDown size={16} />
          </button>
          {/* Chart button */}
          <button
            onClick={() => setChartPanelOpen(true)}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="グラフ作成"
          >
            <BarChart3 size={16} />
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
          <button
            onClick={() => setValidationDialogOpen(true)}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="データ入力規則"
          >
            <ShieldCheck size={16} />
          </button>
          <button
            onClick={() => setPrintPreviewOpen(true)}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="印刷プレビュー"
          >
            <Printer size={16} />
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
        onOpenChartPanel={() => setChartPanelOpen(true)}
        onOpenPivot={() => setPivotOpen(true)}
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
      <div className="flex-1 overflow-hidden relative">
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
          validationError={validationError}
          onListSelect={handleListSelect}
          cutRange={cutRange && cutRange.sheetId === activeSheet?.id ? cutRange.range : null}
        />

        {/* Chart overlays */}
        {charts.map((chart) => {
          const chartData = (() => {
            const { startRow, startCol, endRow, endCol } = chart.range
            const labels: string[] = []
            const datasets: { label: string; values: number[] }[] = []
            const colCount = endCol - startCol + 1
            if (colCount >= 2) {
              const firstRowValues: string[] = []
              for (let c = startCol; c <= endCol; c++) {
                const val = computedValues[`${startRow}-${c}`]
                firstRowValues.push(val !== undefined ? String(val) : '')
              }
              const hasHeaders = firstRowValues.some(
                (v, i) => i > 0 && isNaN(Number(v)) && v !== '',
              )
              const dataStartRow = hasHeaders ? startRow + 1 : startRow
              for (let r = dataStartRow; r <= endRow; r++) {
                const val = computedValues[`${r}-${startCol}`]
                labels.push(val !== undefined ? String(val) : `行${r + 1}`)
              }
              for (let c = startCol + 1; c <= endCol; c++) {
                const seriesLabel = hasHeaders
                  ? firstRowValues[c - startCol]
                  : colIndexToLetter(c)
                const values: number[] = []
                for (let r = dataStartRow; r <= endRow; r++) {
                  const val = computedValues[`${r}-${c}`]
                  values.push(
                    typeof val === 'number' ? val : parseFloat(String(val)) || 0,
                  )
                }
                datasets.push({ label: seriesLabel, values })
              }
            } else {
              const values: number[] = []
              for (let r = startRow; r <= endRow; r++) {
                labels.push(`行${r + 1}`)
                const val = computedValues[`${r}-${startCol}`]
                values.push(
                  typeof val === 'number' ? val : parseFloat(String(val)) || 0,
                )
              }
              datasets.push({ label: colIndexToLetter(startCol), values })
            }
            return { labels, datasets }
          })()
          const svg = renderChartSVG(chart.chartType, chartData, chart.title)
          return (
            <div
              key={chart.id}
              className="absolute bg-slate-900/95 border border-slate-700 rounded-lg shadow-xl overflow-hidden"
              style={{ left: chart.x, top: chart.y, width: 360, height: 240 }}
            >
              <div className="flex items-center justify-between px-3 py-1.5 bg-slate-800/80 cursor-move">
                <span className="text-xs text-slate-300 font-medium truncate">
                  {chart.title}
                </span>
                <button
                  onClick={() => handleRemoveChart(chart.id)}
                  className="text-slate-500 hover:text-red-400 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
              <div
                className="p-2 h-[calc(100%-32px)]"
                dangerouslySetInnerHTML={{ __html: svg }}
              />
            </div>
          )
        })}
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
          computedValues={computedValues}
          dispatch={dispatch}
          onClose={() => setContextMenu(null)}
          onCut={(range) => setCutRange({ sheetId: activeSheet.id, range })}
        />
      )}

      {/* Data Validation dialog */}
      {validationDialogOpen && normalizedRange && (
        <DataValidationDialog
          existing={activeSheet.dataValidation?.[`${normalizedRange.startRow}-${normalizedRange.startCol}`]}
          onApply={(validation: DataValidation) => {
            dispatch({
              type: 'SET_DATA_VALIDATION',
              sheetId: activeSheet.id,
              startRow: normalizedRange.startRow,
              startCol: normalizedRange.startCol,
              endRow: normalizedRange.endRow,
              endCol: normalizedRange.endCol,
              validation,
            })
            setValidationDialogOpen(false)
          }}
          onRemove={() => {
            dispatch({
              type: 'REMOVE_DATA_VALIDATION',
              sheetId: activeSheet.id,
              startRow: normalizedRange.startRow,
              startCol: normalizedRange.startCol,
              endRow: normalizedRange.endRow,
              endCol: normalizedRange.endCol,
            })
            setValidationDialogOpen(false)
          }}
          onClose={() => setValidationDialogOpen(false)}
        />
      )}

      {/* Print Preview */}
      {printPreviewOpen && (
        <PrintPreview
          sheet={activeSheet}
          computedValues={computedValues}
          onClose={() => setPrintPreviewOpen(false)}
        />
      )}

      {/* Chart panel */}
      {chartPanelOpen && (
        <ChartPanel
          sheet={activeSheet}
          selectionRange={normalizedRange}
          onAddChart={handleAddChart}
          onClose={() => setChartPanelOpen(false)}
        />
      )}

      {/* Formula autocomplete */}
      <FormulaAutocomplete
        editValue={editValue}
        onSelect={handleFormulaSelect}
        visible={showFormulaAutocomplete && !!editingCell}
        anchorRect={formulaAnchorRect}
        slashMode={isSlashMode}
      />

      {/* Pivot table dialog */}
      {pivotOpen && activeSheet && (
        <PivotTableDialog
          sheet={activeSheet}
          selectionRange={normalizedRange}
          computedValues={computedValues}
          onInsertPivot={(result: PivotResult) => {
            // Create a new sheet with pivot data
            dispatch({ type: 'ADD_SHEET' })
            // The new sheet becomes active; populate it after a tick
            setTimeout(() => {
              // Find the newly added sheet (last one)
              const sheets = state.sheets
              const newSheet = sheets[sheets.length - 1]
              if (!newSheet) return
              // Rename it
              dispatch({ type: 'RENAME_SHEET', id: newSheet.id, name: 'ピボット' })
              // Write headers
              result.headers.forEach((h, ci) => {
                dispatch({
                  type: 'SET_CELL_VALUE',
                  sheetId: newSheet.id,
                  row: 0,
                  col: ci,
                  value: h,
                })
              })
              // Write rows
              result.rows.forEach((row, ri) => {
                row.forEach((val, ci) => {
                  dispatch({
                    type: 'SET_CELL_VALUE',
                    sheetId: newSheet.id,
                    row: ri + 1,
                    col: ci,
                    value: val,
                  })
                })
              })
              // Make bold headers
              result.headers.forEach((_h, ci) => {
                dispatch({
                  type: 'SET_CELL_FORMAT',
                  sheetId: newSheet.id,
                  row: 0,
                  col: ci,
                  format: { bold: true },
                })
              })
            }, 200)
          }}
          onClose={() => setPivotOpen(false)}
        />
      )}

      {/* Shortcuts help */}
      <ShortcutsHelp open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} context="spreadsheet" />

      {/* PDF AI panel */}
      <PdfAiPanel
        open={pdfAiOpen}
        onClose={() => setPdfAiOpen(false)}
        context="spreadsheet"
        onInsertSpreadsheet={(cells, rowCount, colCount, title) => {
          dispatch({ type: 'SET_TITLE', title })
          // Insert cells into the active sheet
          Object.entries(cells).forEach(([key, cell]) => {
            const [r, c] = key.split('-').map(Number)
            dispatch({
              type: 'SET_CELL_VALUE',
              sheetId: activeSheet.id,
              row: r,
              col: c,
              value: cell.value,
            })
            if (cell.format) {
              dispatch({
                type: 'SET_CELL_FORMAT',
                sheetId: activeSheet.id,
                row: r,
                col: c,
                format: cell.format,
              })
            }
          })
        }}
      />
    </div>
  )
}
