'use client'

import { useReducer, useEffect, useRef, useCallback } from 'react'
import type { SpreadsheetDocument, Sheet, Cell, CellFormat, CellComment, MergedCellRange, ConditionalFormat, DataValidation, SpreadsheetChart } from '@/types'
import { generateId } from '@/lib/utils'
import { saveSpreadsheetDoc } from '@/lib/storage/cloud-store'
import { createUndoableReducer, initUndoable, type UndoableAction } from '@/lib/undoable'
import { cellReducer } from './reducers/cell-reducer'
import { sheetReducer } from './reducers/sheet-reducer'
import { formatReducer } from './reducers/format-reducer'
import { filterSortReducer } from './reducers/filter-sort-reducer'

type SpreadsheetAction =
  | { type: 'LOAD'; doc: SpreadsheetDocument }
  | { type: 'SET_TITLE'; title: string }
  | { type: 'SET_ACTIVE'; id: string }
  // Sheet management
  | { type: 'ADD_SHEET' }
  | { type: 'DELETE_SHEET'; id: string }
  | { type: 'RENAME_SHEET'; id: string; name: string }
  | { type: 'DUPLICATE_SHEET'; id: string }
  | { type: 'REORDER_SHEETS'; fromIndex: number; toIndex: number }
  | { type: 'INSERT_SHEET_AT'; sheet: Sheet; atIndex: number }
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
  | { type: 'MULTI_SORT_SHEET'; sheetId: string; keys: { col: number; direction: 'asc' | 'desc' }[] }
  | { type: 'SET_FILTER'; sheetId: string; col: number; values: string[] }
  | { type: 'CLEAR_FILTERS'; sheetId: string }
  // Remove Duplicates
  | { type: 'REMOVE_DUPLICATES'; sheetId: string; cols: number[]; startRow: number; endRow: number }
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
  // Hide/Show rows/cols
  | { type: 'HIDE_ROWS'; sheetId: string; rows: number[] }
  | { type: 'SHOW_ROWS'; sheetId: string; rows: number[] }
  | { type: 'HIDE_COLS'; sheetId: string; cols: number[] }
  | { type: 'SHOW_COLS'; sheetId: string; cols: number[] }
  // Cell comments
  | { type: 'SET_CELL_COMMENT'; sheetId: string; row: number; col: number; comment: string }
  | { type: 'DELETE_CELL_COMMENT'; sheetId: string; row: number; col: number }
  | { type: 'ADD_CELL_COMMENT'; sheetId: string; row: number; col: number; author: string; text: string }
  | { type: 'RESOLVE_CELL_COMMENT'; sheetId: string; row: number; col: number; commentIndex: number }
  // Checkbox
  | { type: 'TOGGLE_CHECKBOX'; sheetId: string; row: number; col: number }
  | { type: 'SET_SHEET_COLOR'; id: string; color: string }
  // Hyperlink
  | { type: 'SET_CELL_HYPERLINK'; sheetId: string; row: number; col: number; url: string; label?: string }
  | { type: 'REMOVE_CELL_HYPERLINK'; sheetId: string; row: number; col: number }
  // Row/Col grouping
  | { type: 'GROUP_ROWS'; sheetId: string; startRow: number; endRow: number }
  | { type: 'GROUP_COLS'; sheetId: string; startCol: number; endCol: number }
  | { type: 'UNGROUP_ROWS'; sheetId: string; startRow: number; endRow: number }
  | { type: 'UNGROUP_COLS'; sheetId: string; startCol: number; endCol: number }
  | { type: 'TOGGLE_GROUP_COLLAPSE'; sheetId: string; groupType: 'row' | 'col'; index: number }
  // Cell protection
  | { type: 'SET_CELL_LOCKED'; sheetId: string; startRow: number; startCol: number; endRow: number; endCol: number; locked: boolean }
  | { type: 'TOGGLE_SHEET_PROTECTION'; sheetId: string }
  // Charts (persisted on the document)
  | { type: 'ADD_CHART'; chart: SpreadsheetChart }
  | { type: 'UPDATE_CHART'; id: string; props: Partial<SpreadsheetChart> }
  | { type: 'DELETE_CHART'; id: string }

export type { SpreadsheetAction }

/** Combined reducer: delegates to sub-reducers, falls back to global actions */
function spreadsheetReducer(state: SpreadsheetDocument, action: SpreadsheetAction): SpreadsheetDocument {
  // Global actions handled directly
  switch (action.type) {
    case 'LOAD':
      return action.doc
    case 'SET_TITLE':
      return { ...state, meta: { ...state.meta, title: action.title } }
    case 'SET_ACTIVE':
      return { ...state, activeSheetId: action.id }
    case 'ADD_CHART':
      return { ...state, charts: [...(state.charts ?? []), action.chart] }
    case 'UPDATE_CHART':
      return { ...state, charts: (state.charts ?? []).map((c) => (c.id === action.id ? { ...c, ...action.props } : c)) }
    case 'DELETE_CHART':
      return { ...state, charts: (state.charts ?? []).filter((c) => c.id !== action.id) }
  }

  // Try each sub-reducer; first non-null result wins
  const subReducers = [cellReducer, sheetReducer, formatReducer, filterSortReducer]
  for (const reducer of subReducers) {
    const result = reducer(state, action)
    if (result !== null) return result
  }

  return state
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

  const undoDepth = undoState.past.length
  const redoDepth = undoState.future.length

  return { state, dispatch, canUndo, canRedo, undoDepth, redoDepth }
}
