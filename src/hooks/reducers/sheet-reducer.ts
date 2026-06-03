import type { SpreadsheetDocument, Sheet, Cell } from '@/types'
import type { SpreadsheetAction } from '../use-spreadsheet'
import { updateSheet } from './shared-helpers'
import { generateId } from '@/lib/utils'

/** Sheet management operations */
const SHEET_ACTION_TYPES = new Set([
  'ADD_SHEET',
  'DELETE_SHEET',
  'RENAME_SHEET',
  'DUPLICATE_SHEET',
  'REORDER_SHEETS',
  'INSERT_SHEET_AT',
  'SET_SHEET_COLOR',
])

export function sheetReducer(state: SpreadsheetDocument, action: SpreadsheetAction): SpreadsheetDocument | null {
  if (!SHEET_ACTION_TYPES.has(action.type)) return null

  switch (action.type) {
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
        colCount: 52,
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

    case 'REORDER_SHEETS': {
      const sheets = [...state.sheets]
      const [moved] = sheets.splice(action.fromIndex, 1)
      sheets.splice(action.toIndex, 0, moved)
      return { ...state, sheets }
    }

    case 'INSERT_SHEET_AT': {
      const sheets = [...state.sheets]
      sheets.splice(action.atIndex, 0, action.sheet)
      return { ...state, sheets, activeSheetId: action.sheet.id }
    }

    case 'DUPLICATE_SHEET': {
      const source = state.sheets.find((s) => s.id === action.id)
      if (!source) return state
      const newId = generateId()
      const deepCells: Record<string, Cell> = {}
      for (const [key, cell] of Object.entries(source.cells)) {
        deepCells[key] = {
          value: cell.value,
          ...(cell.format ? { format: { ...cell.format } } : {}),
          ...(cell.comment ? { comment: cell.comment } : {}),
          ...(cell.hyperlink ? { hyperlink: { ...cell.hyperlink } } : {}),
        }
      }
      const copy: Sheet = {
        ...source,
        id: newId,
        name: source.name + ' (コピー)',
        cells: deepCells,
        mergedCells: source.mergedCells.map((m) => ({ ...m })),
        colWidths: { ...source.colWidths },
        rowHeights: { ...source.rowHeights },
        conditionalFormats: source.conditionalFormats?.map((cf) => ({ ...cf, range: { ...cf.range } })),
        dataValidation: source.dataValidation ? { ...source.dataValidation } : undefined,
        filterState: source.filterState?.map((f) => ({ ...f, values: [...f.values] })),
        hiddenRows: source.hiddenRows ? [...source.hiddenRows] : undefined,
        hiddenCols: source.hiddenCols ? [...source.hiddenCols] : undefined,
      }
      const idx = state.sheets.findIndex((s) => s.id === action.id)
      const sheets = [...state.sheets]
      sheets.splice(idx + 1, 0, copy)
      return { ...state, sheets, activeSheetId: newId }
    }

    case 'SET_SHEET_COLOR': {
      return {
        ...state,
        sheets: state.sheets.map((s) =>
          s.id === action.id
            ? { ...s, color: action.color || undefined }
            : s
        ),
      }
    }

    default:
      return null
  }
}
