import type { SpreadsheetDocument, MergedCellRange } from '@/types'
import type { SpreadsheetAction } from '../use-spreadsheet'
import { updateSheet } from './shared-helpers'

/** Formatting operations: merge/unmerge, conditional formatting, data validation, freeze panes */
const FORMAT_ACTION_TYPES = new Set([
  'MERGE_CELLS',
  'UNMERGE_CELLS',
  'ADD_CONDITIONAL_FORMAT',
  'DELETE_CONDITIONAL_FORMAT',
  'SET_DATA_VALIDATION',
  'REMOVE_DATA_VALIDATION',
  'SET_FREEZE',
])

export function formatReducer(state: SpreadsheetDocument, action: SpreadsheetAction): SpreadsheetDocument | null {
  if (!FORMAT_ACTION_TYPES.has(action.type)) return null

  switch (action.type) {
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

    case 'SET_FREEZE': {
      return updateSheet(state, action.sheetId, (s) => ({
        ...s,
        frozenRows: action.frozenRows,
        frozenCols: action.frozenCols,
      }))
    }

    default:
      return null
  }
}
