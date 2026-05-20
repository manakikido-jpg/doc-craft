'use client'

import { useReducer, useEffect, useRef, useCallback } from 'react'
import type { SpreadsheetDocument, Sheet, Cell, CellFormat, MergedCellRange, ConditionalFormat, DataValidation } from '@/types'
import { generateId } from '@/lib/utils'
import { saveSpreadsheetDoc } from '@/lib/cloud-store'
import { createUndoableReducer, initUndoable, type UndoableAction } from '@/lib/undoable'

type SpreadsheetAction =
  | { type: 'LOAD'; doc: SpreadsheetDocument }
  | { type: 'SET_TITLE'; title: string }
  | { type: 'SET_ACTIVE'; id: string }
  // Sheet management
  | { type: 'ADD_SHEET' }
  | { type: 'DELETE_SHEET'; id: string }
  | { type: 'RENAME_SHEET'; id: string; name: string }
  | { type: 'DUPLICATE_SHEET'; id: string }
  // Cell editing
  | { type: 'SET_CELL_VALUE'; sheetId: string; row: number; col: number; value: string }
  | { type: 'SET_CELL_FORMAT'; sheetId: string; row: number; col: number; format: Partial<CellFormat> }
  | {
      type: 'SET_RANGE_FORMAT'
      sheetId: string
      startRow: number
      startCol: number
      endRow: number
      endCol: number
      format: Partial<CellFormat>
    }
  | { type: 'CLEAR_CELLS'; sheetId: string; startRow: number; startCol: number; endRow: number; endCol: number }
  // Row/Col operations
  | { type: 'INSERT_ROW'; sheetId: string; atRow: number }
  | { type: 'DELETE_ROW'; sheetId: string; row: number }
  | { type: 'INSERT_COL'; sheetId: string; atCol: number }
  | { type: 'DELETE_COL'; sheetId: string; col: number }
  | { type: 'SET_COL_WIDTH'; sheetId: string; col: number; width: number }
  | { type: 'SET_ROW_HEIGHT'; sheetId: string; row: number; height: number }
  // Merge
  | { type: 'MERGE_CELLS'; sheetId: string; startRow: number; startCol: number; endRow: number; endCol: number }
  | { type: 'UNMERGE_CELLS'; sheetId: string; startRow: number; startCol: number }
  // Clipboard
  | { type: 'PASTE_CELLS'; sheetId: string; startRow: number; startCol: number; data: Record<string, Cell> }
  // Sorting & Filtering
  | { type: 'SORT_SHEET'; sheetId: string; col: number; direction: 'asc' | 'desc' }
  | { type: 'SET_FILTER'; sheetId: string; col: number; values: string[] }
  | { type: 'CLEAR_FILTERS'; sheetId: string }
  // Freeze Panes
  | { type: 'SET_FREEZE'; sheetId: string; frozenRows: number; frozenCols: number }
  // Conditional Formatting
  | { type: 'ADD_CONDITIONAL_FORMAT'; sheetId: string; format: ConditionalFormat }
  | { type: 'DELETE_CONDITIONAL_FORMAT'; sheetId: string; formatId: string }
  // Fill Operations
  | { type: 'FILL_DOWN'; sheetId: string; startRow: number; startCol: number; endRow: number; endCol: number }
  | { type: 'FILL_RIGHT'; sheetId: string; startRow: number; startCol: number; endRow: number; endCol: number }
  // Clear Formatting
  | { type: 'CLEAR_FORMAT'; sheetId: string; startRow: number; startCol: number; endRow: number; endCol: number }
  // Data Validation
  | { type: 'SET_DATA_VALIDATION'; sheetId: string; startRow: number; startCol: number; endRow: number; endCol: number; validation: DataValidation }
  | { type: 'REMOVE_DATA_VALIDATION'; sheetId: string; startRow: number; startCol: number; endRow: number; endCol: number }

export type { SpreadsheetAction }

function updateSheet(state: SpreadsheetDocument, sheetId: string, fn: (s: Sheet) => Sheet): SpreadsheetDocument {
  return { ...state, sheets: state.sheets.map((s) => (s.id === sheetId ? fn(s) : s)) }
}

function rekeyRowInsert(cells: Record<string, Cell>, atRow: number): Record<string, Cell> {
  const newCells: Record<string, Cell> = {}
  for (const [key, cell] of Object.entries(cells)) {
    const [r, c] = key.split('-').map(Number)
    if (r >= atRow) {
      newCells[`${r + 1}-${c}`] = cell
    } else {
      newCells[key] = cell
    }
  }
  return newCells
}

function rekeyRowDelete(cells: Record<string, Cell>, row: number): Record<string, Cell> {
  const newCells: Record<string, Cell> = {}
  for (const [key, cell] of Object.entries(cells)) {
    const [r, c] = key.split('-').map(Number)
    if (r === row) continue
    if (r > row) {
      newCells[`${r - 1}-${c}`] = cell
    } else {
      newCells[key] = cell
    }
  }
  return newCells
}

function rekeyColInsert(cells: Record<string, Cell>, atCol: number): Record<string, Cell> {
  const newCells: Record<string, Cell> = {}
  for (const [key, cell] of Object.entries(cells)) {
    const [r, c] = key.split('-').map(Number)
    if (c >= atCol) {
      newCells[`${r}-${c + 1}`] = cell
    } else {
      newCells[key] = cell
    }
  }
  return newCells
}

function rekeyColDelete(cells: Record<string, Cell>, col: number): Record<string, Cell> {
  const newCells: Record<string, Cell> = {}
  for (const [key, cell] of Object.entries(cells)) {
    const [r, c] = key.split('-').map(Number)
    if (c === col) continue
    if (c > col) {
      newCells[`${r}-${c - 1}`] = cell
    } else {
      newCells[key] = cell
    }
  }
  return newCells
}

function spreadsheetReducer(state: SpreadsheetDocument, action: SpreadsheetAction): SpreadsheetDocument {
  switch (action.type) {
    case 'LOAD':
      return action.doc

    case 'SET_TITLE':
      return { ...state, meta: { ...state.meta, title: action.title } }

    case 'SET_ACTIVE':
      return { ...state, activeSheetId: action.id }

    // ── Sheet management ──

    case 'ADD_SHEET': {
      const num = state.sheets.length + 1
      const newSheet: Sheet = {
        id: generateId(),
        name: `Sheet${num}`,
        cells: {},
        colWidths: {},
        rowHeights: {},
        mergedCells: [],
        rowCount: 50,
        colCount: 26,
      }
      return { ...state, sheets: [...state.sheets, newSheet], activeSheetId: newSheet.id }
    }

    case 'DELETE_SHEET': {
      if (state.sheets.length <= 1) return state
      const filtered = state.sheets.filter((s) => s.id !== action.id)
      const newActive = state.activeSheetId === action.id ? filtered[0].id : state.activeSheetId
      return { ...state, sheets: filtered, activeSheetId: newActive }
    }

    case 'RENAME_SHEET':
      return updateSheet(state, action.id, (s) => ({ ...s, name: action.name }))

    case 'DUPLICATE_SHEET': {
      const source = state.sheets.find((s) => s.id === action.id)
      if (!source) return state
      const newId = generateId()
      // Deep clone cells to avoid shared references between source and copy
      const deepCells: Record<string, Cell> = {}
      for (const [key, cell] of Object.entries(source.cells)) {
        deepCells[key] = { value: cell.value, ...(cell.format ? { format: { ...cell.format } } : {}) }
      }
      const copy: Sheet = {
        ...source,
        id: newId,
        name: source.name + ' (コピー)',
        cells: deepCells,
        mergedCells: source.mergedCells.map((m) => ({ ...m })),
        colWidths: { ...source.colWidths },
        rowHeights: { ...source.rowHeights },
        conditionalFormats: source.conditionalFormats?.map((cf) => ({ ...cf })),
      }
      const idx = state.sheets.findIndex((s) => s.id === action.id)
      const sheets = [...state.sheets]
      sheets.splice(idx + 1, 0, copy)
      return { ...state, sheets, activeSheetId: newId }
    }

    // ── Cell editing ──

    case 'SET_CELL_VALUE': {
      return updateSheet(state, action.sheetId, (s) => {
        const key = `${action.row}-${action.col}`
        const existing = s.cells[key]
        if (!action.value && !existing?.format) {
          // Remove empty cell
          const newCells = { ...s.cells }
          delete newCells[key]
          return { ...s, cells: newCells }
        }
        return {
          ...s,
          cells: {
            ...s.cells,
            [key]: { ...existing, value: action.value },
          },
        }
      })
    }

    case 'SET_CELL_FORMAT': {
      return updateSheet(state, action.sheetId, (s) => {
        const key = `${action.row}-${action.col}`
        const existing = s.cells[key] || { value: '' }
        return {
          ...s,
          cells: {
            ...s.cells,
            [key]: { ...existing, format: { ...existing.format, ...action.format } },
          },
        }
      })
    }

    case 'SET_RANGE_FORMAT': {
      return updateSheet(state, action.sheetId, (s) => {
        const newCells = { ...s.cells }
        for (let r = action.startRow; r <= action.endRow; r++) {
          for (let c = action.startCol; c <= action.endCol; c++) {
            const key = `${r}-${c}`
            const existing = newCells[key] || { value: '' }
            newCells[key] = { ...existing, format: { ...existing.format, ...action.format } }
          }
        }
        return { ...s, cells: newCells }
      })
    }

    case 'CLEAR_CELLS': {
      return updateSheet(state, action.sheetId, (s) => {
        const newCells = { ...s.cells }
        for (let r = action.startRow; r <= action.endRow; r++) {
          for (let c = action.startCol; c <= action.endCol; c++) {
            delete newCells[`${r}-${c}`]
          }
        }
        return { ...s, cells: newCells }
      })
    }

    // ── Row/Col operations ──

    case 'INSERT_ROW':
      return updateSheet(state, action.sheetId, (s) => ({
        ...s,
        cells: rekeyRowInsert(s.cells, action.atRow),
        rowCount: s.rowCount + 1,
      }))

    case 'DELETE_ROW':
      return updateSheet(state, action.sheetId, (s) => ({
        ...s,
        cells: rekeyRowDelete(s.cells, action.row),
        rowCount: Math.max(1, s.rowCount - 1),
      }))

    case 'INSERT_COL':
      return updateSheet(state, action.sheetId, (s) => ({
        ...s,
        cells: rekeyColInsert(s.cells, action.atCol),
        colCount: Math.min(s.colCount + 1, 26),
      }))

    case 'DELETE_COL':
      return updateSheet(state, action.sheetId, (s) => ({
        ...s,
        cells: rekeyColDelete(s.cells, action.col),
        colCount: Math.max(1, s.colCount - 1),
      }))

    case 'SET_COL_WIDTH':
      return updateSheet(state, action.sheetId, (s) => ({
        ...s,
        colWidths: { ...s.colWidths, [action.col]: action.width },
      }))

    case 'SET_ROW_HEIGHT':
      return updateSheet(state, action.sheetId, (s) => ({
        ...s,
        rowHeights: { ...s.rowHeights, [action.row]: action.height },
      }))

    // ── Merge ──

    case 'MERGE_CELLS': {
      const rowSpan = action.endRow - action.startRow + 1
      const colSpan = action.endCol - action.startCol + 1
      if (rowSpan <= 1 && colSpan <= 1) return state
      const merge: MergedCellRange = {
        startRow: action.startRow,
        startCol: action.startCol,
        rowSpan,
        colSpan,
      }
      return updateSheet(state, action.sheetId, (s) => ({
        ...s,
        mergedCells: [...s.mergedCells, merge],
      }))
    }

    case 'UNMERGE_CELLS': {
      return updateSheet(state, action.sheetId, (s) => ({
        ...s,
        mergedCells: s.mergedCells.filter((m) => !(m.startRow === action.startRow && m.startCol === action.startCol)),
      }))
    }

    // ── Clipboard ──

    case 'PASTE_CELLS': {
      return updateSheet(state, action.sheetId, (s) => {
        const newCells = { ...s.cells }
        for (const [relKey, cell] of Object.entries(action.data)) {
          const [dr, dc] = relKey.split('-').map(Number)
          const key = `${action.startRow + dr}-${action.startCol + dc}`
          newCells[key] = { ...cell }
        }
        return { ...s, cells: newCells }
      })
    }

    // ── Sorting & Filtering ──

    case 'SORT_SHEET': {
      return updateSheet(state, action.sheetId, (s) => {
        // Collect unique row indices that have data
        const rowSet = new Set<number>()
        for (const key of Object.keys(s.cells)) {
          const r = Number(key.split('-')[0])
          rowSet.add(r)
        }
        const rows = Array.from(rowSet).sort((a, b) => a - b)

        // Sort rows by value in the specified column
        const sorted = [...rows].sort((a, b) => {
          const aVal = s.cells[`${a}-${action.col}`]?.value ?? ''
          const bVal = s.cells[`${b}-${action.col}`]?.value ?? ''
          const aNum = Number(aVal)
          const bNum = Number(bVal)
          let cmp: number
          if (!isNaN(aNum) && !isNaN(bNum) && aVal !== '' && bVal !== '') {
            cmp = aNum - bNum
          } else {
            cmp = aVal.localeCompare(bVal)
          }
          return action.direction === 'asc' ? cmp : -cmp
        })

        // Build mapping from old row index to new row index
        const rowMapping = new Map<number, number>()
        for (let i = 0; i < rows.length; i++) {
          rowMapping.set(sorted[i], rows[i])
        }

        // Rekey all cells to new row positions
        const newCells: Record<string, Cell> = {}
        for (const [key, cell] of Object.entries(s.cells)) {
          const [r, c] = key.split('-').map(Number)
          const newRow = rowMapping.get(r)
          if (newRow !== undefined) {
            newCells[`${newRow}-${c}`] = cell
          } else {
            newCells[key] = cell
          }
        }

        return { ...s, cells: newCells, sortState: { col: action.col, direction: action.direction } }
      })
    }

    case 'SET_FILTER': {
      return updateSheet(state, action.sheetId, (s) => {
        const existing = s.filterState ?? []
        const idx = existing.findIndex((f) => f.col === action.col)
        let filterState: { col: number; values: string[] }[]
        if (idx >= 0) {
          filterState = existing.map((f, i) => (i === idx ? { col: action.col, values: action.values } : f))
        } else {
          filterState = [...existing, { col: action.col, values: action.values }]
        }
        return { ...s, filterState }
      })
    }

    case 'CLEAR_FILTERS': {
      return updateSheet(state, action.sheetId, (s) => {
        const { filterState: _, ...rest } = s
        return { ...rest } as Sheet
      })
    }

    // ── Freeze Panes ──

    case 'SET_FREEZE': {
      return updateSheet(state, action.sheetId, (s) => ({
        ...s,
        frozenRows: action.frozenRows,
        frozenCols: action.frozenCols,
      }))
    }

    // ── Conditional Formatting ──

    case 'ADD_CONDITIONAL_FORMAT': {
      return updateSheet(state, action.sheetId, (s) => ({
        ...s,
        conditionalFormats: [...(s.conditionalFormats ?? []), action.format],
      }))
    }

    case 'DELETE_CONDITIONAL_FORMAT': {
      return updateSheet(state, action.sheetId, (s) => ({
        ...s,
        conditionalFormats: (s.conditionalFormats ?? []).filter((cf) => cf.id !== action.formatId),
      }))
    }

    // ── Fill Operations ──

    case 'FILL_DOWN': {
      return updateSheet(state, action.sheetId, (s) => {
        const newCells = { ...s.cells }
        for (let c = action.startCol; c <= action.endCol; c++) {
          const sourceKey = `${action.startRow}-${c}`
          const source = s.cells[sourceKey]
          if (!source) continue
          for (let r = action.startRow + 1; r <= action.endRow; r++) {
            newCells[`${r}-${c}`] = { ...source }
          }
        }
        return { ...s, cells: newCells }
      })
    }

    case 'FILL_RIGHT': {
      return updateSheet(state, action.sheetId, (s) => {
        const newCells = { ...s.cells }
        for (let r = action.startRow; r <= action.endRow; r++) {
          const sourceKey = `${r}-${action.startCol}`
          const source = s.cells[sourceKey]
          if (!source) continue
          for (let c = action.startCol + 1; c <= action.endCol; c++) {
            newCells[`${r}-${c}`] = { ...source }
          }
        }
        return { ...s, cells: newCells }
      })
    }

    // ── Clear Formatting ──

    case 'CLEAR_FORMAT': {
      return updateSheet(state, action.sheetId, (s) => {
        const newCells = { ...s.cells }
        for (let r = action.startRow; r <= action.endRow; r++) {
          for (let c = action.startCol; c <= action.endCol; c++) {
            const key = `${r}-${c}`
            const existing = newCells[key]
            if (existing) {
              const { format: _, ...rest } = existing
              newCells[key] = rest
            }
          }
        }
        return { ...s, cells: newCells }
      })
    }

    // ── Data Validation ──

    case 'SET_DATA_VALIDATION': {
      return updateSheet(state, action.sheetId, (s) => {
        const dv = { ...(s.dataValidation ?? {}) }
        for (let r = action.startRow; r <= action.endRow; r++) {
          for (let c = action.startCol; c <= action.endCol; c++) {
            dv[`${r}-${c}`] = { ...action.validation }
          }
        }
        return { ...s, dataValidation: dv }
      })
    }

    case 'REMOVE_DATA_VALIDATION': {
      return updateSheet(state, action.sheetId, (s) => {
        const dv = { ...(s.dataValidation ?? {}) }
        for (let r = action.startRow; r <= action.endRow; r++) {
          for (let c = action.startCol; c <= action.endCol; c++) {
            delete dv[`${r}-${c}`]
          }
        }
        return { ...s, dataValidation: dv }
      })
    }

    default:
      return state
  }
}

const INITIAL: SpreadsheetDocument = {
  meta: { id: '', title: '', type: 'spreadsheet', createdAt: '', updatedAt: '' },
  sheets: [],
  activeSheetId: '',
}

const undoableSpreadsheetReducer = createUndoableReducer(spreadsheetReducer)

export function useSpreadsheet() {
  const [undoState, rawDispatch] = useReducer(undoableSpreadsheetReducer, initUndoable(INITIAL))
  const state = undoState.present
  const canUndo = undoState.past.length > 0
  const canRedo = undoState.future.length > 0
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const dispatch = useCallback((action: UndoableAction<SpreadsheetAction>) => {
    rawDispatch(action)
  }, [])

  useEffect(() => {
    if (!state.meta.id) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      try {
        saveSpreadsheetDoc(state)
      } catch (e) {
        console.error('[DocCraft] Failed to save spreadsheet:', e)
      }
    }, 800)
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [state])

  return { state, dispatch, canUndo, canRedo }
}
