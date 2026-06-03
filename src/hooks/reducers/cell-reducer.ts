import type { SpreadsheetDocument, Sheet, Cell, CellComment } from '@/types'
import type { SpreadsheetAction } from '../use-spreadsheet'
import { updateSheet, rekeyRowInsert, rekeyRowDelete, rekeyColInsert, rekeyColDelete } from './shared-helpers'

/** Cell value operations, row/col operations, clipboard, fill, clear, checkbox, hyperlink, comments, protection */
const CELL_ACTION_TYPES = new Set([
  'SET_CELL_VALUE',
  'SET_CELL_FORMAT',
  'SET_RANGE_FORMAT',
  'CLEAR_CELLS',
  'INSERT_ROW',
  'DELETE_ROW',
  'INSERT_COL',
  'DELETE_COL',
  'SET_COL_WIDTH',
  'SET_ROW_HEIGHT',
  'PASTE_CELLS',
  'FILL_DOWN',
  'FILL_RIGHT',
  'CLEAR_FORMAT',
  'TOGGLE_CHECKBOX',
  'SET_CELL_HYPERLINK',
  'REMOVE_CELL_HYPERLINK',
  'SET_CELL_COMMENT',
  'DELETE_CELL_COMMENT',
  'ADD_CELL_COMMENT',
  'RESOLVE_CELL_COMMENT',
  'SET_CELL_LOCKED',
  'TOGGLE_SHEET_PROTECTION',
  'HIDE_ROWS',
  'SHOW_ROWS',
  'HIDE_COLS',
  'SHOW_COLS',
  'GROUP_ROWS',
  'GROUP_COLS',
  'UNGROUP_ROWS',
  'UNGROUP_COLS',
  'TOGGLE_GROUP_COLLAPSE',
])

export function cellReducer(state: SpreadsheetDocument, action: SpreadsheetAction): SpreadsheetDocument | null {
  if (!CELL_ACTION_TYPES.has(action.type)) return null

  switch (action.type) {
    case 'SET_CELL_VALUE': {
      return updateSheet(state, action.sheetId, (s) => {
        const key = `${action.row}-${action.col}`
        const existing = s.cells[key]
        if (!action.value && !existing?.format) {
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

    case 'INSERT_ROW':
      return updateSheet(state, action.sheetId, (s) => ({
        ...s,
        cells: rekeyRowInsert(s.cells, action.atRow),
        rowCount: s.rowCount + 1,
        mergedCells: s.mergedCells.map((m) =>
          m.startRow >= action.atRow
            ? { ...m, startRow: m.startRow + 1 }
            : m.startRow + m.rowSpan > action.atRow
              ? { ...m, rowSpan: m.rowSpan + 1 }
              : m,
        ),
        conditionalFormats: s.conditionalFormats?.map((cf) => ({
          ...cf,
          range: {
            ...cf.range,
            startRow: cf.range.startRow >= action.atRow ? cf.range.startRow + 1 : cf.range.startRow,
            endRow: cf.range.endRow >= action.atRow ? cf.range.endRow + 1 : cf.range.endRow,
          },
        })),
      }))

    case 'DELETE_ROW':
      return updateSheet(state, action.sheetId, (s) => ({
        ...s,
        cells: rekeyRowDelete(s.cells, action.row),
        rowCount: Math.max(1, s.rowCount - 1),
        mergedCells: s.mergedCells
          .filter((m) => !(m.startRow === action.row && m.rowSpan === 1))
          .map((m) =>
            m.startRow > action.row
              ? { ...m, startRow: m.startRow - 1 }
              : m.startRow + m.rowSpan - 1 >= action.row
                ? { ...m, rowSpan: Math.max(1, m.rowSpan - 1) }
                : m,
          ),
        conditionalFormats: s.conditionalFormats?.map((cf) => ({
          ...cf,
          range: {
            ...cf.range,
            startRow: cf.range.startRow > action.row ? cf.range.startRow - 1 : cf.range.startRow,
            endRow: cf.range.endRow > action.row ? cf.range.endRow - 1 : cf.range.endRow,
          },
        })),
      }))

    case 'INSERT_COL':
      return updateSheet(state, action.sheetId, (s) => ({
        ...s,
        cells: rekeyColInsert(s.cells, action.atCol),
        colCount: s.colCount + 1,
        mergedCells: s.mergedCells.map((m) =>
          m.startCol >= action.atCol
            ? { ...m, startCol: m.startCol + 1 }
            : m.startCol + m.colSpan > action.atCol
              ? { ...m, colSpan: m.colSpan + 1 }
              : m,
        ),
        conditionalFormats: s.conditionalFormats?.map((cf) => ({
          ...cf,
          range: {
            ...cf.range,
            startCol: cf.range.startCol >= action.atCol ? cf.range.startCol + 1 : cf.range.startCol,
            endCol: cf.range.endCol >= action.atCol ? cf.range.endCol + 1 : cf.range.endCol,
          },
        })),
      }))

    case 'DELETE_COL':
      return updateSheet(state, action.sheetId, (s) => ({
        ...s,
        cells: rekeyColDelete(s.cells, action.col),
        colCount: Math.max(1, s.colCount - 1),
        mergedCells: s.mergedCells
          .filter((m) => !(m.startCol === action.col && m.colSpan === 1))
          .map((m) =>
            m.startCol > action.col
              ? { ...m, startCol: m.startCol - 1 }
              : m.startCol + m.colSpan - 1 >= action.col
                ? { ...m, colSpan: Math.max(1, m.colSpan - 1) }
                : m,
          ),
        conditionalFormats: s.conditionalFormats?.map((cf) => ({
          ...cf,
          range: {
            ...cf.range,
            startCol: cf.range.startCol > action.col ? cf.range.startCol - 1 : cf.range.startCol,
            endCol: cf.range.endCol > action.col ? cf.range.endCol - 1 : cf.range.endCol,
          },
        })),
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

    case 'TOGGLE_CHECKBOX': {
      return updateSheet(state, action.sheetId, (s) => {
        const key = `${action.row}-${action.col}`
        const existing = s.cells[key] || { value: '' }
        const currentCheckbox = existing.checkbox ?? false
        const newCheckbox = !currentCheckbox
        return {
          ...s,
          cells: {
            ...s.cells,
            [key]: {
              ...existing,
              checkbox: newCheckbox,
              value: newCheckbox ? 'TRUE' : 'FALSE',
            },
          },
        }
      })
    }

    case 'SET_CELL_HYPERLINK': {
      return updateSheet(state, action.sheetId, (s) => {
        const key = `${action.row}-${action.col}`
        const existing = s.cells[key] || { value: '' }
        return {
          ...s,
          cells: {
            ...s.cells,
            [key]: { ...existing, hyperlink: { url: action.url, label: action.label } },
          },
        }
      })
    }

    case 'REMOVE_CELL_HYPERLINK': {
      return updateSheet(state, action.sheetId, (s) => {
        const key = `${action.row}-${action.col}`
        const existing = s.cells[key]
        if (!existing) return s
        const { hyperlink: _, ...rest } = existing
        return {
          ...s,
          cells: {
            ...s.cells,
            [key]: rest,
          },
        }
      })
    }

    case 'SET_CELL_COMMENT': {
      return updateSheet(state, action.sheetId, (s) => {
        const key = `${action.row}-${action.col}`
        const existing = s.cells[key] || { value: '' }
        return {
          ...s,
          cells: {
            ...s.cells,
            [key]: { ...existing, comment: action.comment },
          },
        }
      })
    }

    case 'DELETE_CELL_COMMENT': {
      return updateSheet(state, action.sheetId, (s) => {
        const key = `${action.row}-${action.col}`
        const existing = s.cells[key]
        if (!existing) return s
        const { comment: _, ...rest } = existing
        return {
          ...s,
          cells: {
            ...s.cells,
            [key]: rest,
          },
        }
      })
    }

    case 'ADD_CELL_COMMENT': {
      return updateSheet(state, action.sheetId, (s) => {
        const key = `${action.row}-${action.col}`
        const existing = s.cells[key] || { value: '' }
        const newComment: CellComment = {
          author: action.author,
          text: action.text,
          timestamp: Date.now(),
        }
        const existingComments = existing.comments ?? []
        const legacyComment = existing.comment || action.text
        return {
          ...s,
          cells: {
            ...s.cells,
            [key]: {
              ...existing,
              comment: legacyComment,
              comments: [...existingComments, newComment],
            },
          },
        }
      })
    }

    case 'RESOLVE_CELL_COMMENT': {
      return updateSheet(state, action.sheetId, (s) => {
        const key = `${action.row}-${action.col}`
        const existing = s.cells[key]
        if (!existing || !existing.comments) return s
        const newComments = existing.comments.map((c, i) =>
          i === action.commentIndex ? { ...c, resolved: !c.resolved } : c,
        )
        return {
          ...s,
          cells: {
            ...s.cells,
            [key]: { ...existing, comments: newComments },
          },
        }
      })
    }

    case 'SET_CELL_LOCKED': {
      return updateSheet(state, action.sheetId, (s) => {
        const newCells = { ...s.cells }
        for (let r = action.startRow; r <= action.endRow; r++) {
          for (let c = action.startCol; c <= action.endCol; c++) {
            const key = `${r}-${c}`
            const existing = newCells[key] || { value: '' }
            newCells[key] = { ...existing, format: { ...existing.format, locked: action.locked } }
          }
        }
        return { ...s, cells: newCells }
      })
    }

    case 'TOGGLE_SHEET_PROTECTION': {
      return updateSheet(state, action.sheetId, (s) => ({
        ...s,
        protected: !s.protected,
      }))
    }

    case 'HIDE_ROWS': {
      return updateSheet(state, action.sheetId, (s) => ({
        ...s,
        hiddenRows: [...new Set([...(s.hiddenRows ?? []), ...action.rows])],
      }))
    }

    case 'SHOW_ROWS': {
      return updateSheet(state, action.sheetId, (s) => ({
        ...s,
        hiddenRows: (s.hiddenRows ?? []).filter((r) => !action.rows.includes(r)),
      }))
    }

    case 'HIDE_COLS': {
      return updateSheet(state, action.sheetId, (s) => ({
        ...s,
        hiddenCols: [...new Set([...(s.hiddenCols ?? []), ...action.cols])],
      }))
    }

    case 'SHOW_COLS': {
      return updateSheet(state, action.sheetId, (s) => ({
        ...s,
        hiddenCols: (s.hiddenCols ?? []).filter((c) => !action.cols.includes(c)),
      }))
    }

    case 'GROUP_ROWS': {
      return updateSheet(state, action.sheetId, (s) => ({
        ...s,
        rowGroups: [...(s.rowGroups ?? []), { start: action.startRow, end: action.endRow, collapsed: false }],
      }))
    }

    case 'GROUP_COLS': {
      return updateSheet(state, action.sheetId, (s) => ({
        ...s,
        colGroups: [...(s.colGroups ?? []), { start: action.startCol, end: action.endCol, collapsed: false }],
      }))
    }

    case 'UNGROUP_ROWS': {
      return updateSheet(state, action.sheetId, (s) => ({
        ...s,
        rowGroups: (s.rowGroups ?? []).filter(
          (g) => !(g.start === action.startRow && g.end === action.endRow),
        ),
      }))
    }

    case 'UNGROUP_COLS': {
      return updateSheet(state, action.sheetId, (s) => ({
        ...s,
        colGroups: (s.colGroups ?? []).filter(
          (g) => !(g.start === action.startCol && g.end === action.endCol),
        ),
      }))
    }

    case 'TOGGLE_GROUP_COLLAPSE': {
      return updateSheet(state, action.sheetId, (s) => {
        if (action.groupType === 'row') {
          const groups = [...(s.rowGroups ?? [])]
          if (groups[action.index]) {
            groups[action.index] = { ...groups[action.index], collapsed: !groups[action.index].collapsed }
          }
          return { ...s, rowGroups: groups }
        } else {
          const groups = [...(s.colGroups ?? [])]
          if (groups[action.index]) {
            groups[action.index] = { ...groups[action.index], collapsed: !groups[action.index].collapsed }
          }
          return { ...s, colGroups: groups }
        }
      })
    }

    default:
      return null
  }
}
