import type { SpreadsheetDocument, Sheet, Cell } from '@/types'
import type { SpreadsheetAction } from '../use-spreadsheet'
import { updateSheet } from './shared-helpers'

/** Filter, sort, and remove-duplicates operations */
const FILTER_SORT_ACTION_TYPES = new Set([
  'SORT_SHEET',
  'MULTI_SORT_SHEET',
  'SET_FILTER',
  'CLEAR_FILTERS',
  'REMOVE_DUPLICATES',
])

export function filterSortReducer(state: SpreadsheetDocument, action: SpreadsheetAction): SpreadsheetDocument | null {
  if (!FILTER_SORT_ACTION_TYPES.has(action.type)) return null

  switch (action.type) {
    case 'SORT_SHEET': {
      return updateSheet(state, action.sheetId, (s) => {
        const rowSet = new Set<number>()
        for (const key of Object.keys(s.cells)) {
          const r = Number(key.split('-')[0])
          rowSet.add(r)
        }
        const rows = Array.from(rowSet).sort((a, b) => a - b)

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

        const rowMapping = new Map<number, number>()
        for (let i = 0; i < rows.length; i++) {
          rowMapping.set(sorted[i], rows[i])
        }

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

    case 'MULTI_SORT_SHEET': {
      return updateSheet(state, action.sheetId, (s) => {
        const rowSet = new Set<number>()
        for (const key of Object.keys(s.cells)) {
          const r = Number(key.split('-')[0])
          rowSet.add(r)
        }
        const rows = Array.from(rowSet).sort((a, b) => a - b)

        const sorted = [...rows].sort((a, b) => {
          for (const sortKey of action.keys) {
            const aVal = s.cells[`${a}-${sortKey.col}`]?.value ?? ''
            const bVal = s.cells[`${b}-${sortKey.col}`]?.value ?? ''
            const aNum = Number(aVal)
            const bNum = Number(bVal)
            let cmp: number
            if (!isNaN(aNum) && !isNaN(bNum) && aVal !== '' && bVal !== '') {
              cmp = aNum - bNum
            } else {
              cmp = aVal.localeCompare(bVal)
            }
            if (sortKey.direction === 'desc') cmp = -cmp
            if (cmp !== 0) return cmp
          }
          return 0
        })

        const rowMapping = new Map<number, number>()
        for (let i = 0; i < rows.length; i++) {
          rowMapping.set(sorted[i], rows[i])
        }

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

        return { ...s, cells: newCells }
      })
    }

    case 'REMOVE_DUPLICATES': {
      return updateSheet(state, action.sheetId, (s) => {
        const seen = new Set<string>()
        const duplicateRows: number[] = []
        for (let r = action.startRow; r <= action.endRow; r++) {
          const key = action.cols.map((c) => s.cells[`${r}-${c}`]?.value ?? '').join('\0')
          if (seen.has(key)) {
            duplicateRows.push(r)
          } else {
            seen.add(key)
          }
        }
        if (duplicateRows.length === 0) return s

        const dupSet = new Set(duplicateRows)
        const newCells: Record<string, Cell> = {}
        let offset = 0
        for (let r = 0; r < s.rowCount; r++) {
          if (dupSet.has(r)) {
            offset++
            continue
          }
          for (let c = 0; c < s.colCount; c++) {
            const oldKey = `${r}-${c}`
            if (s.cells[oldKey]) {
              newCells[`${r - offset}-${c}`] = s.cells[oldKey]
            }
          }
        }
        return { ...s, cells: newCells, rowCount: Math.max(1, s.rowCount - duplicateRows.length) }
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

    default:
      return null
  }
}
