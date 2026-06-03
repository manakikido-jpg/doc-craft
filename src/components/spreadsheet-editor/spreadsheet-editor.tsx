'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { saveVersion, getVersionData } from '@/lib/version-history'
import VersionHistoryPanel from '../shared/version-history-panel'
import { useRouter } from 'next/navigation'
import type { SpreadsheetDocument, CellFormat, DataValidation } from '@/types'
import { useSpreadsheet } from '@/hooks/use-spreadsheet'
import { recalcAllCells, colIndexToLetter, colLetterToIndex } from '@/lib/formula-engine'
import SpreadsheetRibbonToolbar from './spreadsheet-ribbon-toolbar'
import SpreadsheetCommandPalette from './spreadsheet-command-palette'
import SpreadsheetWelcomeScreen from './spreadsheet-welcome-screen'
import FormulaBar from './formula-bar'
import CellGrid from './cell-grid'
import SheetTabs from './sheet-tabs'
import { FindReplaceDialog } from './find-replace-dialog'
import { GoToDialog } from './goto-dialog'
import { CellContextMenu } from './cell-context-menu'
import { DataValidationDialog } from './data-validation-dialog'
import { SortDialog } from './sort-dialog'
import { RemoveDuplicatesDialog } from './remove-duplicates-dialog'
import { PasteSpecialDialog, type PasteMode } from './paste-special-dialog'
import { PrintPreview } from './print-preview'
import ChartPanel, { type SpreadsheetChart, renderChartSVG } from './chart-panel'
import FormulaAutocomplete from './formula-autocomplete'
import ShortcutsHelp from '../shared/shortcuts-help'
import PdfAiPanel from '../shared/pdf-ai-panel'
import PivotTableDialog, { type PivotResult } from './pivot-table-dialog'
import { exportSpreadsheetToHTML, exportSpreadsheetToPDF, downloadFile } from '@/lib/export/export-utils'
import { generateId } from '@/lib/utils'
import AiFormulaPanel from './ai-formula-panel'
import ConditionalFormatPanel, { type ConditionalFormatRule } from './conditional-format-panel'
import NamedRangesManager, { type NamedRange } from './named-ranges'
import { useToast } from '@/components/shared/toast'
import { X } from 'lucide-react'
import GroupingOutline from './grouping-outline'
import SubtotalDialog from './subtotal-dialog'
import TableFeature from './table-feature'
import CellStyleGallery from './cell-style-gallery'
import SizeDialog from './size-dialog'
import { SplitViewControls, SplitContainer, useSplitView } from './split-view'
import PivotChart from './pivot-chart'
import DataConnectionDialog from './data-connection'
import PrintRangeDialog, { type PrintRange } from './print-range-dialog'

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
  const { addToast } = useToast()
  const { state, dispatch, canUndo, canRedo, undoDepth, redoDepth } = useSpreadsheet()
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>({ row: 0, col: 0 })
  const [selectionRange, setSelectionRange] = useState<SelectionRange | null>(null)
  const [editingCell, setEditingCell] = useState<{ row: number; col: number } | null>(null)
  const [formatPainterFormat, setFormatPainterFormat] = useState<CellFormat | null>(null)
  const [editValue, setEditValue] = useState('')
  const [isFormulaMode, setIsFormulaMode] = useState(false)
  const [formulaRefCell, setFormulaRefCell] = useState<{ row: number; col: number } | null>(null)
  const [formulaInsertBase, setFormulaInsertBase] = useState('')  // editValue before ref insertion (for drag range updates)
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

  // Chart panel state. Charts themselves live on the document (state.charts) so
  // they persist across reloads and undo/redo.
  const [chartPanelOpen, setChartPanelOpen] = useState(false)
  const charts = state.charts ?? []

  // Formula autocomplete state
  const [showFormulaAutocomplete, setShowFormulaAutocomplete] = useState(false)
  const [formulaAnchorRect, setFormulaAnchorRect] = useState<{ top: number; left: number } | null>(null)
  const [isSlashMode, setIsSlashMode] = useState(false)
  const editCellRef = useRef<HTMLElement | null>(null)
  const editInputRef = useRef<HTMLTextAreaElement | null>(null)

  // Export dropdown state
  const [showExportMenu, setShowExportMenu] = useState(false)

  // Data validation dialog state
  const [validationDialogOpen, setValidationDialogOpen] = useState(false)

  // Sort dialog state
  const [sortDialogOpen, setSortDialogOpen] = useState(false)

  // Remove duplicates dialog state
  const [removeDuplicatesOpen, setRemoveDuplicatesOpen] = useState(false)

  // Validation rejection toast
  const [rejectionToast, setRejectionToast] = useState<string | null>(null)

  // Paste special state
  const [pasteSpecialOpen, setPasteSpecialOpen] = useState(false)

  // Print preview state
  const [printPreviewOpen, setPrintPreviewOpen] = useState(false)

  // AI formula panel state
  const [aiFormulaPanelOpen, setAiFormulaPanelOpen] = useState(false)

  // Formula display mode
  const [showFormulas, setShowFormulas] = useState(false)

  // Version history panel state
  const [versionHistoryOpen, setVersionHistoryOpen] = useState(false)

  // Zoom state
  const [zoom, setZoom] = useState(100)

  // Conditional format panel state
  const [conditionalFormatOpen, setConditionalFormatOpen] = useState(false)

  // Named ranges state
  const [namedRangesOpen, setNamedRangesOpen] = useState(false)
  const [namedRanges, setNamedRanges] = useState<NamedRange[]>([])

  // Subtotal dialog state
  const [subtotalOpen, setSubtotalOpen] = useState(false)

  // Table feature state
  const [tableFeatureOpen, setTableFeatureOpen] = useState(false)

  // Cell style gallery state
  const [cellStyleGalleryOpen, setCellStyleGalleryOpen] = useState(false)

  // Size dialog state
  const [sizeDialogOpen, setSizeDialogOpen] = useState(false)
  const [sizeDialogMode, setSizeDialogMode] = useState<'column-width' | 'row-height'>('column-width')

  // Split view state
  const { splitMode, setSplitMode } = useSplitView()

  // Split view controls visibility
  const [showSplitControls, setShowSplitControls] = useState(false)

  // Pivot chart state
  const [pivotChartResult, setPivotChartResult] = useState<import('./pivot-table-dialog').PivotResult | null>(null)

  // Data connection dialog state
  const [dataConnectionOpen, setDataConnectionOpen] = useState(false)

  // Print range state
  const [printRangeDialogOpen, setPrintRangeDialogOpen] = useState(false)
  const [printRange, setPrintRange] = useState<PrintRange | null>(null)

  // Format popup anchor (viewport coordinates of selected cell)
  const [formatPopupAnchor, setFormatPopupAnchor] = useState<{ x: number; y: number } | null>(null)

  // Formula calculation indicator
  const [calculating, setCalculating] = useState(false)

  // Auto-save indicator
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved')
  const [showWelcome, setShowWelcome] = useState(true)
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

  // Auto-save version snapshots to localStorage every 5 minutes
  const lastVersionSave = useRef(Date.now())
  useEffect(() => {
    if (!state.meta.id || state.sheets.length === 0) return
    if (Date.now() - lastVersionSave.current > 300000) {
      saveVersion(state.meta.id, state.meta.title || '無題', JSON.stringify({ meta: state.meta, sheets: state.sheets, activeSheetId: state.activeSheetId }))
      lastVersionSave.current = Date.now()
    }
  }, [state.sheets, state.meta, state.activeSheetId])

  const handleRestoreVersion = useCallback((versionId: string) => {
    const data = getVersionData(versionId)
    if (!data) return
    try {
      const parsed = JSON.parse(data)
      if (parsed.sheets) {
        dispatch({ type: 'LOAD', doc: { ...state, sheets: parsed.sheets, activeSheetId: parsed.activeSheetId || state.activeSheetId } })
      }
    } catch { /* ignore parse errors */ }
    setVersionHistoryOpen(false)
  }, [dispatch, state])

  // Update format popup anchor when selected cell changes
  useEffect(() => {
    if (!selectedCell) {
      setFormatPopupAnchor(null)
      return
    }
    const cellEl = document.querySelector(`[data-cell="${selectedCell.row}-${selectedCell.col}"]`)
    if (cellEl) {
      const rect = cellEl.getBoundingClientRect()
      setFormatPopupAnchor({ x: rect.left, y: rect.top })
    }
  }, [selectedCell])

  const activeSheet = useMemo(() => {
    return state.sheets.find((s) => s.id === state.activeSheetId) || state.sheets[0]
  }, [state.sheets, state.activeSheetId])

  const computedValues = useMemo(() => {
    if (!activeSheet) return {}
    return recalcAllCells(activeSheet.cells, state.sheets, state.activeSheetId)
  }, [activeSheet?.cells, state.sheets, state.activeSheetId])

  // Show calculating indicator briefly when cells recalculate on large datasets
  useEffect(() => {
    if (!activeSheet) return
    const cellCount = Object.keys(activeSheet.cells).length
    if (cellCount > 100) {
      setCalculating(true)
      const timer = setTimeout(() => setCalculating(false), 0)
      return () => clearTimeout(timer)
    }
  }, [activeSheet?.cells, state.sheets, state.activeSheetId])

  // Chart data binding: update chart data when cells change
  useEffect(() => {
    if (charts.length === 0 || !activeSheet) return
    // Charts auto-update because chartData is computed inline in the render from computedValues.
    // This effect ensures chart re-render is triggered when computedValues change.
    // The chart rendering already reads from computedValues reactively in the JSX.
  }, [charts, activeSheet, computedValues])

  const commitEdit = useCallback(() => {
    if (editingCell && activeSheet) {
      // Check cell protection: if sheet is protected and cell is locked, reject edit
      if (activeSheet.protected) {
        const cellKey = `${editingCell.row}-${editingCell.col}`
        const cellData = activeSheet.cells[cellKey]
        if (cellData?.format?.locked) {
          setRejectionToast('このセルは保護されています')
          setTimeout(() => setRejectionToast(null), 3000)
          setEditingCell(null)
          setIsFormulaMode(false)
          setFormulaRefCell(null)
          setFormulaInsertBase('')
          return
        }
      }

      // Check data validation with rejectInput
      const cellKey = `${editingCell.row}-${editingCell.col}`
      const dv = activeSheet.dataValidation?.[cellKey]
      if (dv?.rejectInput && editValue) {
        let isInvalid = false
        switch (dv.type) {
          case 'number': {
            const n = Number(editValue)
            if (isNaN(n)) isInvalid = true
            else if (dv.min !== undefined && n < dv.min) isInvalid = true
            else if (dv.max !== undefined && n > dv.max) isInvalid = true
            break
          }
          case 'text': {
            if (dv.max !== undefined && editValue.length > dv.max) isInvalid = true
            break
          }
          case 'list': {
            if (dv.listValues && !dv.listValues.includes(editValue)) isInvalid = true
            break
          }
          case 'date': {
            const dateNum = Number(editValue.replace(/\//g, ''))
            if (isNaN(dateNum)) isInvalid = true
            else if (dv.min !== undefined && dateNum < dv.min) isInvalid = true
            else if (dv.max !== undefined && dateNum > dv.max) isInvalid = true
            break
          }
        }
        if (isInvalid) {
          // Reject the input: revert and show toast
          setRejectionToast(dv.errorMessage || '入力値が無効なため拒否されました')
          setTimeout(() => setRejectionToast(null), 3000)
          setEditingCell(null)
          setIsFormulaMode(false)
          setFormulaRefCell(null)
          setFormulaInsertBase('')
          return
        }
      }

      dispatch({
        type: 'SET_CELL_VALUE',
        sheetId: activeSheet.id,
        row: editingCell.row,
        col: editingCell.col,
        value: editValue,
      })
      // Auto-detect URLs and set hyperlink
      if (/^https?:\/\/\S+$/i.test(editValue.trim())) {
        dispatch({
          type: 'SET_CELL_HYPERLINK',
          sheetId: activeSheet.id,
          row: editingCell.row,
          col: editingCell.col,
          url: editValue.trim(),
        })
      }
      setEditingCell(null)
      setIsFormulaMode(false)
      setFormulaRefCell(null)
      setFormulaInsertBase('')
    }
  }, [editingCell, editValue, activeSheet, dispatch])

  const startEdit = useCallback(
    (row: number, col: number, initialValue?: string) => {
      if (!activeSheet) return
      const key = `${row}-${col}`
      const cell = activeSheet.cells[key]
      const val = initialValue !== undefined ? initialValue : cell?.value || ''
      setEditingCell({ row, col })
      setEditValue(val)
      setIsFormulaMode(val.startsWith('='))
      setFormulaRefCell(null)
      setFormulaInsertBase('')
    },
    [activeSheet],
  )

  const cancelEdit = useCallback(() => {
    setEditingCell(null)
    setEditValue('')
    setIsFormulaMode(false)
    setFormulaRefCell(null)
    setFormulaInsertBase('')
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
      .match(/^([A-Z]+)(\d+)$/)
    if (match) {
      const col = colLetterToIndex(match[1])
      const row = parseInt(match[2], 10) - 1
      if (row >= 0 && col >= 0) {
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
          // Shift+click: extend to range from formulaRefCell
          const startRef = colIndexToLetter(formulaRefCell.col) + (formulaRefCell.row + 1)
          const rangeRef = startRef + ':' + ref
          setEditValue(formulaInsertBase + rangeRef)
        } else {
          // Normal click: compute the base text (everything before the new reference)
          const lastChar = editValue[editValue.length - 1]
          const needsNothing = !lastChar || /[=(,+\-*/&<>]/.test(lastChar)
          let base: string
          if (needsNothing) {
            base = editValue
          } else {
            // Replace trailing partial cell reference if present
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
    [editingCell, selectedCell, commitEdit, editValue, formulaRefCell, formulaInsertBase, formatPainterFormat, activeSheet, dispatch],
  )

  const handleExtendSelection = useCallback(
    (row: number, col: number) => {
      // Formula mode: drag to build range reference (e.g. A1:C5)
      if (editingCell && isFormulaMode && formulaRefCell) {
        const startRef = colIndexToLetter(formulaRefCell.col) + (formulaRefCell.row + 1)
        const endRef = colIndexToLetter(col) + (row + 1)
        if (startRef === endRef) {
          // Same cell, just single reference
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
    [selectedCell, editingCell, isFormulaMode, formulaRefCell, formulaInsertBase],
  )

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
        // Jump to the last consecutive non-empty cell in that direction
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
        // Jump to the next non-empty cell in that direction (skip empties)
        let r = nextInBounds ? nextR : row, c = nextInBounds ? nextC : col
        while (r >= 0 && r <= maxRow && c >= 0 && c <= maxCol) {
          if (getCellValue(r, c)) return { row: r, col: c }
          r += dr
          c += dc
        }
        // No non-empty cell found, jump to edge
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

  // Status bar computation (Excel-like) - show stats only for multi-cell selection
  const statusBarStats = useMemo(() => {
    if (!normalizedRange || !activeSheet) return null
    const r = normalizedRange
    // Only show aggregate stats when more than 1 cell is selected
    const isMultiCell = r.startRow !== r.endRow || r.startCol !== r.endCol
    if (!isMultiCell) return null

    let nonEmptyCount = 0
    let numericCount = 0
    let sum = 0
    let min = Infinity
    let max = -Infinity
    for (let row = r.startRow; row <= r.endRow; row++) {
      for (let col = r.startCol; col <= r.endCol; col++) {
        const key = `${row}-${col}`
        const val = computedValues[key]
        if (val !== undefined && val !== '') {
          nonEmptyCount++
          const num = Number(val)
          if (!isNaN(num)) {
            numericCount++
            sum += num
            if (num < min) min = num
            if (num > max) max = num
          }
        }
      }
    }
    const avg = numericCount > 0 ? sum / numericCount : 0
    return { nonEmptyCount, numericCount, sum, avg, min: numericCount > 0 ? min : 0, max: numericCount > 0 ? max : 0 }
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

  // Navigate to a cross-sheet reference
  const handleNavigateToSheet = useCallback(
    (sheetName: string, cellRef: string) => {
      const targetSheet = state.sheets.find((s) => s.name === sheetName)
      if (!targetSheet) return
      if (editingCell) commitEdit()
      dispatch({ type: 'SET_ACTIVE', id: targetSheet.id })
      const match = cellRef.match(/^([A-Z]+)(\d+)$/i)
      if (match) {
        const col = colLetterToIndex(match[1])
        const row = parseInt(match[2], 10) - 1
        if (row >= 0 && col >= 0) {
          setSelectedCell({ row, col })
          setSelectionRange(null)
        }
      }
    },
    [state.sheets, editingCell, commitEdit, dispatch],
  )

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
        const csvData: Record<string, import('@/types').Cell> = {}
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
            if (cols[c]) {
              csvData[`${r}-${c}`] = { value: cols[c] }
            }
          }
        }
        // Batch import as a single PASTE_CELLS action (one undo step)
        dispatch({
          type: 'PASTE_CELLS',
          sheetId: activeSheet.id,
          startRow: 0,
          startCol: 0,
          data: csvData,
        })
      }
      reader.readAsText(file)
      // Reset input so the same file can be re-imported
      if (csvInputRef.current) csvInputRef.current.value = ''
    },
    [activeSheet, dispatch],
  )

  // Handle data connection import
  const handleDataConnectionImport = useCallback(
    (data: Record<string, { value: string }>, _rowCount: number, _colCount: number) => {
      if (!activeSheet) return
      dispatch({
        type: 'PASTE_CELLS',
        sheetId: activeSheet.id,
        startRow: 0,
        startCol: 0,
        data,
      })
    },
    [activeSheet, dispatch],
  )

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

  // Format Painter: copy format from selected cell
  const handleFormatPainterStart = useCallback(() => {
    if (!activeSheet || !selectedCell) return
    const key = `${selectedCell.row}-${selectedCell.col}`
    const cell = activeSheet.cells[key]
    setFormatPainterFormat(cell?.format ? { ...cell.format } : {})
  }, [activeSheet, selectedCell])

  // Keyboard handler
  // Shortcuts help state
  const [shortcutsOpen, setShortcutsOpen] = useState(false)

  // Command palette state
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)

  // Pivot table state
  const [pivotOpen, setPivotOpen] = useState(false)
  // PDF AI panel state
  const [pdfAiOpen, setPdfAiOpen] = useState(false)

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Command palette
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setCommandPaletteOpen(true)
        return
      }

      // Shortcuts help
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault()
        setShortcutsOpen(true)
        return
      }

      // Formula display toggle (Ctrl+`)
      if ((e.ctrlKey || e.metaKey) && e.key === '`') {
        e.preventDefault()
        setShowFormulas((v) => !v)
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
        if (activeSheet.filterState && activeSheet.filterState.length > 0) {
          dispatch({ type: 'CLEAR_FILTERS', sheetId: activeSheet.id })
        } else {
          for (let c = 0; c < activeSheet.colCount; c++) {
            dispatch({ type: 'SET_FILTER', sheetId: activeSheet.id, col: c, values: [] })
          }
        }
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
        try { navigator.clipboard.writeText(tsvRows.join('\n')) } catch (e) { console.warn('Clipboard write failed:', e) }
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
        try { navigator.clipboard.writeText(tsvRows.join('\n')) } catch (e) { console.warn('Clipboard write failed:', e) }
        return
      }

      // Paste Special (Ctrl+Shift+V)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'V' && !editingCell && activeSheet && selectedCell) {
        e.preventDefault()
        setPasteSpecialOpen(true)
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
        // F4 → cycle absolute/relative reference ($A$1 → A$1 → $A1 → A1)
        if (e.key === 'F4') {
          e.preventDefault()
          const input = editInputRef.current
          if (!input) return
          const pos = input.selectionStart || 0
          const text = editValue
          // Find cell reference pattern around cursor position
          const before = text.substring(0, pos)
          const after = text.substring(pos)
          const refMatchBefore = before.match(/(\$?[A-Z]+\$?\d+)$/i)
          const refMatchAfter = after.match(/^(\$?[A-Z]*\$?\d*)/i)
          if (refMatchBefore) {
            const fullRef = refMatchBefore[1] + (refMatchAfter ? refMatchAfter[1] : '')
            const startIdx = pos - refMatchBefore[1].length
            const endIdx = pos + (refMatchAfter ? refMatchAfter[1].length : 0)
            // Parse the reference to get clean col and row
            const cleanRef = fullRef.replace(/\$/g, '')
            const parsed = cleanRef.match(/^([A-Z]+)(\d+)$/i)
            if (parsed) {
              const col = parsed[1].toUpperCase()
              const row = parsed[2]
              // Determine current mode and cycle
              const hasColDollar = fullRef.match(/^\$[A-Z]/i) !== null
              const hasRowDollar = fullRef.match(/\$\d/) !== null
              let newRef: string
              if (!hasColDollar && !hasRowDollar) {
                // A1 → $A$1
                newRef = `$${col}$${row}`
              } else if (hasColDollar && hasRowDollar) {
                // $A$1 → A$1
                newRef = `${col}$${row}`
              } else if (!hasColDollar && hasRowDollar) {
                // A$1 → $A1
                newRef = `$${col}${row}`
              } else {
                // $A1 → A1
                newRef = `${col}${row}`
              }
              const newText = text.substring(0, startIdx) + newRef + text.substring(endIdx)
              setEditValue(newText)
              // Restore cursor position after the new reference
              const newCursorPos = startIdx + newRef.length
              requestAnimationFrame(() => {
                if (editInputRef.current) {
                  editInputRef.current.selectionStart = newCursorPos
                  editInputRef.current.selectionEnd = newCursorPos
                }
              })
            }
          }
          return
        }
        // Alt+Enter → insert line break in cell
        if (e.altKey && e.key === 'Enter') {
          e.preventDefault()
          const textarea = editInputRef.current
          if (textarea) {
            const start = textarea.selectionStart ?? editValue.length
            const end = textarea.selectionEnd ?? editValue.length
            const newVal = editValue.substring(0, start) + '\n' + editValue.substring(end)
            setEditValue(newVal)
            // Restore cursor position after state update
            requestAnimationFrame(() => {
              if (editInputRef.current) {
                editInputRef.current.selectionStart = start + 1
                editInputRef.current.selectionEnd = start + 1
              }
            })
          } else {
            setEditValue(editValue + '\n')
          }
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
      // End → go to last non-empty column in current row
      if (e.key === 'End' && !(e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        let lastCol = 0
        for (let c = activeSheet.colCount - 1; c >= 0; c--) {
          const key = `${selectedCell.row}-${c}`
          if (activeSheet.cells[key] && activeSheet.cells[key].value) {
            lastCol = c
            break
          }
        }
        setSelectedCell({ row: selectedCell.row, col: lastCol })
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

      // Ctrl+PageDown → next sheet tab
      if ((e.ctrlKey || e.metaKey) && e.key === 'PageDown') {
        e.preventDefault()
        const idx = state.sheets.findIndex((s) => s.id === state.activeSheetId)
        if (idx < state.sheets.length - 1) {
          dispatch({ type: 'SET_ACTIVE', id: state.sheets[idx + 1].id })
        }
        return
      }
      // Ctrl+PageUp → previous sheet tab
      if ((e.ctrlKey || e.metaKey) && e.key === 'PageUp') {
        e.preventDefault()
        const idx = state.sheets.findIndex((s) => s.id === state.activeSheetId)
        if (idx > 0) {
          dispatch({ type: 'SET_ACTIVE', id: state.sheets[idx - 1].id })
        }
        return
      }

      // PageDown → move selection 20 rows down
      if (e.key === 'PageDown' && !(e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        const jump = 20
        setSelectedCell((prev) =>
          prev ? { row: Math.min(activeSheet.rowCount - 1, prev.row + jump), col: prev.col } : prev,
        )
        setSelectionRange(null)
        return
      }
      // PageUp → move selection 20 rows up
      if (e.key === 'PageUp' && !(e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        const jump = 20
        setSelectedCell((prev) =>
          prev ? { row: Math.max(0, prev.row - jump), col: prev.col } : prev,
        )
        setSelectionRange(null)
        return
      }

      // Ctrl+Space → select entire column
      if ((e.ctrlKey || e.metaKey) && e.key === ' ' && !e.shiftKey) {
        e.preventDefault()
        setSelectionRange({
          startRow: 0,
          startCol: selectedCell.col,
          endRow: activeSheet.rowCount - 1,
          endCol: selectedCell.col,
        })
        return
      }
      // Shift+Space → select entire row
      if (e.shiftKey && e.key === ' ' && !(e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        setSelectionRange({
          startRow: selectedCell.row,
          startCol: 0,
          endRow: selectedCell.row,
          endCol: activeSheet.colCount - 1,
        })
        return
      }

      // Ctrl+Shift+! → number format
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === '!') {
        e.preventDefault()
        handleFormatChange({ numberFormat: 'number' })
        return
      }
      // Ctrl+Shift+% → percent format
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === '%') {
        e.preventDefault()
        handleFormatChange({ numberFormat: 'percent' })
        return
      }
      // Ctrl+Shift+$ → currency format
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === '$') {
        e.preventDefault()
        handleFormatChange({ numberFormat: 'currency' })
        return
      }

      // Ctrl+Shift+Arrow → jump to data edge and extend selection
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        e.preventDefault()
        const dir = e.key === 'ArrowUp' ? 'up' : e.key === 'ArrowDown' ? 'down' : e.key === 'ArrowLeft' ? 'left' : 'right'
        const base = selectionRange || {
          startRow: selectedCell.row,
          startCol: selectedCell.col,
          endRow: selectedCell.row,
          endCol: selectedCell.col,
        }
        const target = findEdgeCell(base.endRow, base.endCol, dir, activeSheet, computedValues)
        setSelectionRange({ ...base, endRow: target.row, endCol: target.col })
        return
      }

      // Ctrl+Arrow → jump to data edge
      if ((e.ctrlKey || e.metaKey) && (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        e.preventDefault()
        const dir = e.key === 'ArrowUp' ? 'up' : e.key === 'ArrowDown' ? 'down' : e.key === 'ArrowLeft' ? 'left' : 'right'
        const target = findEdgeCell(selectedCell.row, selectedCell.col, dir, activeSheet, computedValues)
        setSelectedCell(target)
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

      // Start typing → enter edit mode with the typed character
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
    computedValues,
    state.sheets,
    state.activeSheetId,
    selectionRange,
    findEdgeCell,
    handleFormatChange,
  ])

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

  const handleExportPDF = useCallback(async () => {
    const doc: import('@/types').SpreadsheetDocument = {
      meta: state.meta,
      sheets: state.sheets,
      activeSheetId: state.activeSheetId,
    }
    addToast('PDF生成中...', 'info', 3000)
    try {
      await exportSpreadsheetToPDF(doc)
      addToast('PDFをダウンロードしました', 'success')
    } catch {
      addToast('PDF生成に失敗しました', 'error')
    }
    setShowExportMenu(false)
  }, [state, addToast])

  const handleAiInsertFormula = useCallback((formula: string) => {
    if (!selectedCell || !activeSheet) return
    startEdit(selectedCell.row, selectedCell.col, formula)
  }, [selectedCell, activeSheet, startEdit])

  const handleAddChart = useCallback((chart: SpreadsheetChart) => {
    dispatch({ type: 'ADD_CHART', chart })
  }, [dispatch])

  const handleRemoveChart = useCallback((chartId: string) => {
    dispatch({ type: 'DELETE_CHART', id: chartId })
  }, [dispatch])

  // Conditional format apply handler
  const handleApplyConditionalFormat = useCallback((rule: ConditionalFormatRule) => {
    if (!activeSheet || !normalizedRange) return
    dispatch({
      type: 'ADD_CONDITIONAL_FORMAT',
      sheetId: activeSheet.id,
      format: {
        id: rule.id,
        range: {
          startRow: normalizedRange.startRow,
          startCol: normalizedRange.startCol,
          endRow: normalizedRange.endRow,
          endCol: normalizedRange.endCol,
        },
        rule: rule.type as 'greaterThan' | 'lessThan' | 'equalTo' | 'between' | 'textContains' | 'isEmpty' | 'isNotEmpty',
        values: rule.values,
        style: rule.style,
      },
    })
  }, [activeSheet, normalizedRange, dispatch])

  // Named ranges handlers
  const handleAddNamedRange = useCallback((name: string, range: string) => {
    setNamedRanges((prev) => [...prev, { name, range, sheetId: activeSheet?.id || '' }])
  }, [activeSheet])

  const handleDeleteNamedRange = useCallback((name: string) => {
    setNamedRanges((prev) => prev.filter((nr) => nr.name !== name))
  }, [])

  const handleNavigateNamedRange = useCallback((range: string) => {
    // Parse range like "A1:B10" or "Sheet1!A1:B10"
    const cleanRange = range.replace(/^[^!]+!/, '') // remove sheet prefix
    const parts = cleanRange.split(':')
    const match = parts[0].match(/^([A-Z]+)(\d+)$/i)
    if (match) {
      const col = colLetterToIndex(match[1])
      const row = parseInt(match[2], 10) - 1
      if (row >= 0 && col >= 0) {
        if (editingCell) commitEdit()
        setSelectedCell({ row, col })
        setSelectionRange(null)
      }
    }
    setNamedRangesOpen(false)
  }, [editingCell, commitEdit])

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

  // Track formula mode when editValue changes
  useEffect(() => {
    if (editingCell) {
      setIsFormulaMode(editValue.startsWith('='))
    }
  }, [editValue, editingCell])

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

  // Parse cell references from formula for visual highlighting (color-coded per reference)
  const { formulaReferencedCells, formulaRefColorMap } = useMemo(() => {
    if (!isFormulaMode || !editingCell) return { formulaReferencedCells: new Set<string>(), formulaRefColorMap: new Map<string, number>() }
    const refs = new Set<string>()
    const colorMap = new Map<string, number>()
    // Match cell references like A1, B5, AA10 and ranges like A1:B5
    const refPattern = /([A-Z]+)(\d+)(?::([A-Z]+)(\d+))?/gi
    let match: RegExpExecArray | null
    let colorIdx = 0
    const formulaText = editValue.substring(1) // skip '='
    while ((match = refPattern.exec(formulaText)) !== null) {
      const currentColorIdx = colorIdx++
      if (match[3] && match[4]) {
        // Range reference
        const startCol = colLetterToIndex(match[1].toUpperCase())
        const startRow = parseInt(match[2], 10) - 1
        const endCol = colLetterToIndex(match[3].toUpperCase())
        const endRow = parseInt(match[4], 10) - 1
        for (let r = Math.min(startRow, endRow); r <= Math.max(startRow, endRow); r++) {
          for (let c = Math.min(startCol, endCol); c <= Math.max(startCol, endCol); c++) {
            const key = `${r}-${c}`
            refs.add(key)
            colorMap.set(key, currentColorIdx)
          }
        }
      } else {
        // Single cell reference
        const col = colLetterToIndex(match[1].toUpperCase())
        const row = parseInt(match[2], 10) - 1
        const key = `${row}-${col}`
        refs.add(key)
        colorMap.set(key, currentColorIdx)
      }
    }
    return { formulaReferencedCells: refs, formulaRefColorMap: colorMap }
  }, [isFormulaMode, editingCell, editValue])

  // Handle function insertion from toolbar function picker
  const handleInsertFunction = useCallback(
    (funcName: string, template?: string) => {
      if (!selectedCell) return
      if (!editingCell) {
        // Start editing with the template (or fallback to =FUNCNAME()
        startEdit(selectedCell.row, selectedCell.col, template || '=' + funcName + '(')
      } else {
        // Already editing, append FUNCNAME( at the end
        setEditValue(editValue + funcName + '(')
      }
    },
    [selectedCell, editingCell, startEdit, editValue],
  )

  // Paste special handler
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
        // Paste everything (same as normal paste)
        dispatch({ type: 'PASTE_CELLS', sheetId: activeSheet.id, startRow, startCol, data: cbData.data })
      } else if (mode === 'values') {
        // Paste only computed values (no formulas)
        const valuesData: Record<string, import('@/types').Cell> = {}
        for (const [key, cell] of Object.entries(cbData.data)) {
          const [rOff, cOff] = key.split('-').map(Number)
          // Compute the value from the source
          const val = cell.value.startsWith('=')
            ? (computedValues[`${startRow + rOff}-${startCol + cOff}`] ?? cell.value)
            : cell.value
          valuesData[key] = { value: String(val), format: cell.format }
        }
        dispatch({ type: 'PASTE_CELLS', sheetId: activeSheet.id, startRow, startCol, data: valuesData })
      } else if (mode === 'formats') {
        // Paste only cell formats
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
        // Paste raw values/formulas without formats
        const formulasData: Record<string, import('@/types').Cell> = {}
        for (const [key, cell] of Object.entries(cbData.data)) {
          formulasData[key] = { value: cell.value }
        }
        dispatch({ type: 'PASTE_CELLS', sheetId: activeSheet.id, startRow, startCol, data: formulasData })
      } else if (mode === 'transpose') {
        // Swap rows and columns
        const transposedData: Record<string, import('@/types').Cell> = {}
        for (const [key, cell] of Object.entries(cbData.data)) {
          const [rOff, cOff] = key.split('-').map(Number)
          transposedData[`${cOff}-${rOff}`] = { ...cell }
        }
        dispatch({ type: 'PASTE_CELLS', sheetId: activeSheet.id, startRow, startCol, data: transposedData })
      }

      // If this was a cut operation, clear source
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
    [activeSheet, selectedCell, clipboardRef, computedValues, dispatch, cutRange],
  )

  if (!activeSheet) return null

  const currentCellKey = selectedCell ? `${selectedCell.row}-${selectedCell.col}` : null
  const currentCell = currentCellKey ? activeSheet.cells[currentCellKey] : null

  return (
    <div data-editor-shell className="flex flex-col h-screen bg-slate-950">
      {/* Hidden CSV input */}
      <input ref={csvInputRef} type="file" accept=".csv,.tsv,.txt" onChange={handleCSVImport} className="hidden" />

      {/* Ribbon Toolbar (includes title bar, tabs, and all formatting controls) */}
      <div className="no-print">
      <SpreadsheetRibbonToolbar
        coreState={{
          activeSheet,
          selectedCell,
          selectionRange: normalizedRange,
          currentCellFormat: currentCell?.format,
          formatPainterActive: !!formatPainterFormat,
          formatPopupAnchor,
        }}
        fileOps={{
          title: state.meta.title,
          onTitleChange: (t) => dispatch({ type: 'SET_TITLE', title: t }),
          saveStatus,
          docId: state.meta.id,
          canUndo,
          canRedo,
          onUndo: () => dispatch({ type: 'UNDO' }),
          onRedo: () => dispatch({ type: 'REDO' }),
          onExportCSV: handleExportCSV,
          onExportHTML: handleExportHTML,
          onExportPDF: handleExportPDF,
          onImportCSV: () => csvInputRef.current?.click(),
          onVersionHistory: () => setVersionHistoryOpen(true),
        }}
        viewOps={{
          showFormulas,
          onToggleFormulas: () => setShowFormulas((v) => !v),
          zoom,
          onZoomIn: () => setZoom((z) => Math.min(200, z + 10)),
          onZoomOut: () => setZoom((z) => Math.max(50, z - 10)),
        }}
        formatActions={{
          onFormatChange: handleFormatChange,
          dispatch,
          onFormatPainterStart: handleFormatPainterStart,
        }}
        insertOps={{
          onOpenChartPanel: () => setChartPanelOpen(true),
          onOpenPivot: () => setPivotOpen(true),
          onInsertFunction: handleInsertFunction,
        }}
        dialogs={{
          onFindReplace: () => { setFindReplaceOpen(true); setFindReplaceMode('find') },
          onGoToCell: () => setGoToOpen(true),
          onDataValidation: () => setValidationDialogOpen(true),
          onSort: () => setSortDialogOpen(true),
          onRemoveDuplicates: () => setRemoveDuplicatesOpen(true),
          onPrintPreview: () => setPrintPreviewOpen(true),
          onShortcuts: () => setShortcutsOpen(true),
          onAiFormula: () => setAiFormulaPanelOpen(true),
          onPdfImport: () => setPdfAiOpen(true),
          onOpenCondFormat: () => setConditionalFormatOpen(true),
          onOpenNamedRanges: () => setNamedRangesOpen(true),
          onDataConnection: () => setDataConnectionOpen(true),
          onPrintRange: () => setPrintRangeDialogOpen(true),
        }}
        cellOps={{
          onNavigateToCell: handleNavigateToCell,
        }}
      />
      </div>

      {/* Formula bar */}
      <div className="no-print">
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
      </div>

      {/* Cell grid */}
      <div className="flex-1 overflow-hidden relative print-content">
        {/* Row grouping outline */}
        {activeSheet.rowGroups && activeSheet.rowGroups.length > 0 && (
          <GroupingOutline sheet={activeSheet} dispatch={dispatch} orientation="row" />
        )}
        {/* Column grouping outline */}
        {activeSheet.colGroups && activeSheet.colGroups.length > 0 && (
          <GroupingOutline sheet={activeSheet} dispatch={dispatch} orientation="col" />
        )}
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
          formulaReferencedCells={formulaReferencedCells}
          formulaRefColorMap={formulaRefColorMap}
          cutRange={cutRange && cutRange.sheetId === activeSheet?.id ? cutRange.range : null}
          editInputRef={editInputRef}
          zoom={zoom}
          formatPainterActive={!!formatPainterFormat}
          onNavigateToSheet={handleNavigateToSheet}
          printRange={printRange}
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

      {/* Status bar (Excel-like) - always visible */}
      <div className="bg-slate-900 border-t border-slate-700 px-3 py-1 text-xs text-slate-400 flex items-center gap-6 shrink-0 no-print">
        {/* Left section: status or stats */}
        <div className="flex items-center gap-6 flex-1 min-w-0">
          {statusBarStats ? (
            <>
              <span className="cursor-pointer hover:bg-slate-800 rounded px-1 -mx-1 transition-colors" title="クリックでコピー" onClick={() => { navigator.clipboard.writeText(String(statusBarStats.nonEmptyCount)).catch(() => {}); addToast('コピーしました', 'success', 1500) }}><span className="text-slate-500">個数:</span> <span className="text-white font-mono">{statusBarStats.nonEmptyCount.toLocaleString()}</span></span>
              <span className="cursor-pointer hover:bg-slate-800 rounded px-1 -mx-1 transition-colors" title="クリックでコピー" onClick={() => { navigator.clipboard.writeText(String(statusBarStats.numericCount)).catch(() => {}); addToast('コピーしました', 'success', 1500) }}><span className="text-slate-500">数値の個数:</span> <span className="text-white font-mono">{statusBarStats.numericCount.toLocaleString()}</span></span>
              {statusBarStats.numericCount > 0 && (
                <>
                  <span className="cursor-pointer hover:bg-slate-800 rounded px-1 -mx-1 transition-colors" title="クリックでコピー" onClick={() => { navigator.clipboard.writeText(String(statusBarStats.sum)).catch(() => {}); addToast('コピーしました', 'success', 1500) }}><span className="text-slate-500">合計:</span> <span className="text-white font-mono">{statusBarStats.sum % 1 === 0 ? statusBarStats.sum.toLocaleString() : statusBarStats.sum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></span>
                  <span className="cursor-pointer hover:bg-slate-800 rounded px-1 -mx-1 transition-colors" title="クリックでコピー" onClick={() => { navigator.clipboard.writeText(String(statusBarStats.avg)).catch(() => {}); addToast('コピーしました', 'success', 1500) }}><span className="text-slate-500">平均:</span> <span className="text-white font-mono">{statusBarStats.avg % 1 === 0 ? statusBarStats.avg.toLocaleString() : statusBarStats.avg.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></span>
                  <span className="cursor-pointer hover:bg-slate-800 rounded px-1 -mx-1 transition-colors" title="クリックでコピー" onClick={() => { navigator.clipboard.writeText(String(statusBarStats.min)).catch(() => {}); addToast('コピーしました', 'success', 1500) }}><span className="text-slate-500">最小:</span> <span className="text-white font-mono">{statusBarStats.min % 1 === 0 ? statusBarStats.min.toLocaleString() : statusBarStats.min.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></span>
                  <span className="cursor-pointer hover:bg-slate-800 rounded px-1 -mx-1 transition-colors" title="クリックでコピー" onClick={() => { navigator.clipboard.writeText(String(statusBarStats.max)).catch(() => {}); addToast('コピーしました', 'success', 1500) }}><span className="text-slate-500">最大:</span> <span className="text-white font-mono">{statusBarStats.max % 1 === 0 ? statusBarStats.max.toLocaleString() : statusBarStats.max.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></span>
                </>
              )}
            </>
          ) : (
            <span className="text-slate-500">
              {editingCell ? (
                <span className="text-indigo-400">編集中</span>
              ) : selectedCell && currentCell?.format?.numberFormat && currentCell.format.numberFormat !== 'plain' ? (
                <span>{currentCell.format.numberFormat === 'number' ? '数値' : currentCell.format.numberFormat === 'percent' ? 'パーセント' : currentCell.format.numberFormat === 'currency' ? '通貨' : currentCell.format.numberFormat === 'date' ? '日付' : '準備完了'}</span>
              ) : (
                '準備完了'
              )}
            </span>
          )}
        </div>

        {/* Right section: protection, split, cell mode */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Calculating indicator */}
          {calculating && (
            <span className="text-amber-400 text-[10px] animate-pulse">計算中...</span>
          )}
          {/* Undo/Redo depth */}
          <span className="text-[10px] text-slate-500" title={`元に戻す: ${undoDepth}回 / やり直し: ${redoDepth}回`}>
            ↩ {undoDepth} / ↪ {redoDepth}
          </span>
          {/* Protect Sheet toggle */}
          <button
            onClick={() => dispatch({ type: 'TOGGLE_SHEET_PROTECTION', sheetId: activeSheet.id })}
            className={`px-2 py-0.5 rounded text-[10px] transition-colors ${
              activeSheet.protected
                ? 'bg-amber-600/20 text-amber-400 hover:bg-amber-600/30'
                : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
            }`}
            title={activeSheet.protected ? 'シート保護を解除' : 'シートを保護'}
          >
            {activeSheet.protected ? '保護中' : '保護'}
          </button>
          {/* Split view toggle */}
          <button
            onClick={() => setShowSplitControls((v) => !v)}
            className={`px-2 py-0.5 rounded text-[10px] transition-colors ${
              splitMode !== 'none'
                ? 'bg-indigo-600/20 text-indigo-400'
                : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
            }`}
            title="分割表示"
          >
            分割
          </button>
          <span className={`px-2 py-0.5 rounded text-[10px] ${editingCell ? 'bg-indigo-600/20 text-indigo-400' : 'text-slate-500'}`}>
            {editingCell ? '編集' : '準備完了'}
          </span>
        </div>
      </div>

      {/* Sheet tabs + sheet navigation + zoom */}
      <div className="flex items-center no-print">
        {/* Sheet navigation arrows */}
        <div className="flex items-center gap-0.5 px-1 py-1 bg-slate-900 border-t border-slate-700 shrink-0">
          <button
            onClick={() => {
              const idx = state.sheets.findIndex((s) => s.id === state.activeSheetId)
              if (idx > 0) dispatch({ type: 'SET_ACTIVE', id: state.sheets[idx - 1].id })
            }}
            className="w-6 h-6 flex items-center justify-center rounded text-slate-500 hover:text-white hover:bg-slate-700 transition-colors"
            title="前のシート"
            disabled={state.sheets.findIndex((s) => s.id === state.activeSheetId) === 0}
          >
            ◀
          </button>
          <button
            onClick={() => {
              const idx = state.sheets.findIndex((s) => s.id === state.activeSheetId)
              if (idx < state.sheets.length - 1) dispatch({ type: 'SET_ACTIVE', id: state.sheets[idx + 1].id })
            }}
            className="w-6 h-6 flex items-center justify-center rounded text-slate-500 hover:text-white hover:bg-slate-700 transition-colors"
            title="次のシート"
            disabled={state.sheets.findIndex((s) => s.id === state.activeSheetId) === state.sheets.length - 1}
          >
            ▶
          </button>
        </div>

        <div className="flex-1 min-w-0">
          <SheetTabs sheets={state.sheets} activeSheetId={state.activeSheetId} dispatch={dispatch} />
        </div>

        {/* Zoom controls with slider */}
        <div className="flex items-center gap-1 px-3 py-1 bg-slate-900 border-t border-slate-700 text-xs text-slate-400 shrink-0">
          <button
            onClick={() => setZoom((z) => Math.max(50, z - 25))}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-slate-700 hover:text-white"
            title="ズームアウト"
          >
            −
          </button>
          <input
            type="range"
            min={50}
            max={200}
            step={5}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-20 h-1 accent-indigo-500 cursor-pointer"
            title={`${zoom}%`}
          />
          <button
            onClick={() => setZoom((z) => Math.min(200, z + 25))}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-slate-700 hover:text-white"
            title="ズームイン"
          >
            +
          </button>
          <button
            onClick={() => setZoom(100)}
            className="px-2 py-0.5 rounded hover:bg-slate-700 hover:text-white min-w-[3rem] text-center"
            title="ズームリセット"
          >
            {zoom}%
          </button>
        </div>
      </div>

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
          onPasteSpecial={() => setPasteSpecialOpen(true)}
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

      {/* Sort dialog */}
      <SortDialog
        open={sortDialogOpen}
        colCount={activeSheet.colCount}
        onClose={() => setSortDialogOpen(false)}
        onSort={(keys) => {
          dispatch({
            type: 'MULTI_SORT_SHEET',
            sheetId: activeSheet.id,
            keys,
          })
        }}
      />

      {/* Remove Duplicates dialog */}
      <RemoveDuplicatesDialog
        open={removeDuplicatesOpen}
        colCount={activeSheet.colCount}
        rowCount={activeSheet.rowCount}
        onClose={() => setRemoveDuplicatesOpen(false)}
        onRemove={(cols, startRow, endRow) => {
          // Count duplicates before dispatching
          const seen = new Set<string>()
          let count = 0
          for (let r = startRow; r <= endRow; r++) {
            const key = cols.map((c) => activeSheet.cells[`${r}-${c}`]?.value ?? '').join('\0')
            if (seen.has(key)) {
              count++
            } else {
              seen.add(key)
            }
          }
          if (count > 0) {
            dispatch({
              type: 'REMOVE_DUPLICATES',
              sheetId: activeSheet.id,
              cols,
              startRow,
              endRow,
            })
          }
          return count
        }}
      />

      {/* Validation rejection toast */}
      {rejectionToast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-red-600 text-white text-xs px-4 py-2 rounded-lg shadow-xl animate-pulse">
          {rejectionToast}
        </div>
      )}

      {/* Print Preview */}
      {printPreviewOpen && (
        <PrintPreview
          sheet={activeSheet}
          computedValues={computedValues}
          onClose={() => setPrintPreviewOpen(false)}
        />
      )}

      {/* Paste Special dialog */}
      {pasteSpecialOpen && (
        <PasteSpecialDialog
          onPaste={handlePasteSpecial}
          onClose={() => setPasteSpecialOpen(false)}
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

      {/* Conditional format panel */}
      <ConditionalFormatPanel
        open={conditionalFormatOpen}
        onClose={() => setConditionalFormatOpen(false)}
        onApply={handleApplyConditionalFormat}
        existingRules={activeSheet.conditionalFormats
          ?.filter((cf) => cf.rule !== 'colorScale' && cf.rule !== 'dataBar')
          .map((cf) => ({
            id: cf.id,
            type: cf.rule as ConditionalFormatRule['type'],
            values: cf.values,
            style: cf.style,
          }))}
      />

      {/* Named ranges manager */}
      <NamedRangesManager
        open={namedRangesOpen}
        onClose={() => setNamedRangesOpen(false)}
        namedRanges={namedRanges}
        onAdd={handleAddNamedRange}
        onDelete={handleDeleteNamedRange}
        onNavigate={handleNavigateNamedRange}
      />

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
            // Save result for pivot chart
            setPivotChartResult(result)
            // Build pre-populated cells for the pivot sheet
            const pivotCells: Record<string, import('@/types').Cell> = {}
            // Write headers with bold formatting
            result.headers.forEach((h, ci) => {
              pivotCells[`0-${ci}`] = {
                value: h,
                format: { bold: true, bgColor: '#334155', textColor: '#f8fafc' },
              }
            })
            // Write data rows with number formatting for numeric values
            result.rows.forEach((row, ri) => {
              row.forEach((val, ci) => {
                const isNumeric = val !== '' && !isNaN(Number(val))
                pivotCells[`${ri + 1}-${ci}`] = {
                  value: val,
                  format: isNumeric ? { numberFormat: 'number' } : undefined,
                }
              })
            })
            // Create a new sheet with pivot data
            const pivotSheet: import('@/types').Sheet = {
              id: generateId(),
              name: 'ピボット',
              cells: pivotCells,
              colWidths: {},
              rowHeights: {},
              mergedCells: [],
              rowCount: Math.max(50, result.rows.length + 10),
              colCount: Math.max(52, result.headers.length + 5),
            }
            dispatch({
              type: 'INSERT_SHEET_AT',
              sheet: pivotSheet,
              atIndex: state.sheets.length,
            })
          }}
          onClose={() => setPivotOpen(false)}
        />
      )}

      {/* Pivot chart overlay */}
      {pivotChartResult && pivotChartResult.rows.length > 1 && (
        <div className="absolute right-4 top-32 z-30">
          <PivotChart
            pivotResult={pivotChartResult}
            onClose={() => setPivotChartResult(null)}
          />
        </div>
      )}

      {/* Data connection dialog */}
      <DataConnectionDialog
        open={dataConnectionOpen}
        onClose={() => setDataConnectionOpen(false)}
        onImportData={handleDataConnectionImport}
      />

      {/* Print range dialog */}
      <PrintRangeDialog
        open={printRangeDialogOpen}
        currentRange={printRange}
        onApply={(range) => setPrintRange(range)}
        onClose={() => setPrintRangeDialogOpen(false)}
      />

      {/* Shortcuts help */}
      <ShortcutsHelp open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} context="spreadsheet" />

      {/* Version History panel */}
      <VersionHistoryPanel
        open={versionHistoryOpen}
        onClose={() => setVersionHistoryOpen(false)}
        docId={state.meta.id}
        onRestore={handleRestoreVersion}
      />

      {/* AI Formula panel */}
      <AiFormulaPanel
        open={aiFormulaPanelOpen}
        onClose={() => setAiFormulaPanelOpen(false)}
        activeSheet={activeSheet}
        selectedCell={selectedCell}
        selectionRange={normalizedRange}
        computedValues={computedValues}
        onInsertFormula={handleAiInsertFormula}
      />

      {/* PDF AI panel */}
      <PdfAiPanel
        open={pdfAiOpen}
        onClose={() => setPdfAiOpen(false)}
        context="spreadsheet"
        onInsertSpreadsheet={(cells, rowCount, colCount, title) => {
          dispatch({ type: 'SET_TITLE', title })
          // Batch insert all cells using PASTE_CELLS
          dispatch({
            type: 'PASTE_CELLS',
            sheetId: activeSheet.id,
            startRow: 0,
            startCol: 0,
            data: cells,
          })
        }}
      />

      {/* Command palette */}
      <SpreadsheetCommandPalette
        open={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onUndo={() => dispatch({ type: 'UNDO' })}
        onRedo={() => dispatch({ type: 'REDO' })}
        onExportCSV={handleExportCSV}
        onExportHTML={handleExportHTML}
        onExportPDF={handleExportPDF}
        onImportCSV={() => csvInputRef.current?.click()}
        onVersionHistory={() => setVersionHistoryOpen(true)}
        onFindReplace={() => { setFindReplaceOpen(true); setFindReplaceMode('find') }}
        onGoToCell={() => setGoToOpen(true)}
        onSort={() => setSortDialogOpen(true)}
        onSortAsc={selectedCell ? () => dispatch({ type: 'SORT_SHEET', sheetId: activeSheet.id, col: selectedCell.col, direction: 'asc' }) : undefined}
        onSortDesc={selectedCell ? () => dispatch({ type: 'SORT_SHEET', sheetId: activeSheet.id, col: selectedCell.col, direction: 'desc' }) : undefined}
        onFilter={selectedCell ? () => {
          if (activeSheet.filterState && activeSheet.filterState.length > 0) {
            dispatch({ type: 'CLEAR_FILTERS', sheetId: activeSheet.id })
          } else {
            dispatch({ type: 'SET_FILTER', sheetId: activeSheet.id, col: selectedCell.col, values: [] })
          }
        } : undefined}
        onDataValidation={() => setValidationDialogOpen(true)}
        onRemoveDuplicates={() => setRemoveDuplicatesOpen(true)}
        onOpenChartPanel={() => setChartPanelOpen(true)}
        onOpenPivot={() => setPivotOpen(true)}
        onAiFormula={() => setAiFormulaPanelOpen(true)}
        onPdfImport={() => setPdfAiOpen(true)}
        onShortcuts={() => setShortcutsOpen(true)}
        onPrintPreview={() => setPrintPreviewOpen(true)}
        onToggleFormulas={() => setShowFormulas((v) => !v)}
        onFreeze={() => {
          if (activeSheet.frozenRows || activeSheet.frozenCols) {
            dispatch({ type: 'SET_FREEZE', sheetId: activeSheet.id, frozenRows: 0, frozenCols: 0 })
          } else if (selectedCell) {
            dispatch({ type: 'SET_FREEZE', sheetId: activeSheet.id, frozenRows: selectedCell.row, frozenCols: selectedCell.col })
          }
        }}
        onZoomIn={() => setZoom((z) => Math.min(200, z + 10))}
        onZoomOut={() => setZoom((z) => Math.max(50, z - 10))}
        onInsertRow={selectedCell ? () => dispatch({ type: 'INSERT_ROW', sheetId: activeSheet.id, atRow: selectedCell.row + 1 }) : undefined}
        onInsertCol={selectedCell ? () => dispatch({ type: 'INSERT_COL', sheetId: activeSheet.id, atCol: selectedCell.col + 1 }) : undefined}
        onDeleteRow={selectedCell ? () => dispatch({ type: 'DELETE_ROW', sheetId: activeSheet.id, row: selectedCell.row }) : undefined}
        onDeleteCol={selectedCell ? () => dispatch({ type: 'DELETE_COL', sheetId: activeSheet.id, col: selectedCell.col }) : undefined}
        onBold={() => handleFormatChange({ bold: !(currentCell?.format?.bold) })}
        onItalic={() => handleFormatChange({ italic: !(currentCell?.format?.italic) })}
        onUnderline={() => handleFormatChange({ underline: !(currentCell?.format?.underline) })}
        onAlignLeft={() => handleFormatChange({ align: 'left' })}
        onAlignCenter={() => handleFormatChange({ align: 'center' })}
        onAlignRight={() => handleFormatChange({ align: 'right' })}
        onWrap={() => handleFormatChange({ wrap: !(currentCell?.format?.wrap) })}
        onClearFormat={normalizedRange ? () => {
          dispatch({
            type: 'CLEAR_FORMAT',
            sheetId: activeSheet.id,
            startRow: normalizedRange.startRow,
            startCol: normalizedRange.startCol,
            endRow: normalizedRange.endRow,
            endCol: normalizedRange.endCol,
          })
        } : undefined}
        onFormatPainter={handleFormatPainterStart}
      />

      {/* Subtotal dialog */}
      <SubtotalDialog
        open={subtotalOpen}
        sheet={activeSheet}
        dispatch={dispatch}
        onClose={() => setSubtotalOpen(false)}
      />

      {/* Table feature dialog */}
      <TableFeature
        open={tableFeatureOpen}
        sheet={activeSheet}
        selectionRange={normalizedRange}
        dispatch={dispatch}
        onClose={() => setTableFeatureOpen(false)}
      />

      {/* Cell style gallery */}
      <CellStyleGallery
        open={cellStyleGalleryOpen}
        onApply={handleFormatChange}
        onClose={() => setCellStyleGalleryOpen(false)}
      />

      {/* Size dialog */}
      {sizeDialogOpen && selectedCell && (
        <SizeDialog
          open={sizeDialogOpen}
          mode={sizeDialogMode}
          sheetId={activeSheet.id}
          index={sizeDialogMode === 'column-width' ? selectedCell.col : selectedCell.row}
          currentSize={
            sizeDialogMode === 'column-width'
              ? (activeSheet.colWidths[selectedCell.col] ?? 80)
              : (activeSheet.rowHeights[selectedCell.row] ?? 28)
          }
          dispatch={dispatch}
          onClose={() => setSizeDialogOpen(false)}
        />
      )}

      {/* Split view controls */}
      {showSplitControls && (
        <SplitViewControls splitMode={splitMode} onChangeSplitMode={(mode) => { setSplitMode(mode); setShowSplitControls(false) }} />
      )}

      {/* Welcome screen for empty sheets */}
      {showWelcome && Object.keys(activeSheet.cells).length === 0 && (
        <SpreadsheetWelcomeScreen
          onSelectTemplate={(cells) => {
            setShowWelcome(false)
            if (Object.keys(cells).length > 0) {
              dispatch({
                type: 'PASTE_CELLS',
                sheetId: activeSheet.id,
                startRow: 0,
                startCol: 0,
                data: cells,
              })
              // Bold the header row
              const headerKeys = Object.keys(cells).filter((k) => k.startsWith('0-'))
              headerKeys.forEach((key) => {
                const [, col] = key.split('-').map(Number)
                dispatch({
                  type: 'SET_CELL_FORMAT',
                  sheetId: activeSheet.id,
                  row: 0,
                  col,
                  format: { bold: true, bgColor: '#1e293b' },
                })
              })
            }
          }}
        />
      )}
    </div>
  )
}
