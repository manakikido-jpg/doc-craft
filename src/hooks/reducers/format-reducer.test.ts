import { describe, it, expect } from 'vitest'
import { formatReducer } from './format-reducer'
import type { SpreadsheetDocument } from '@/types'
import type { SpreadsheetAction } from '../use-spreadsheet'

function makeDoc(): SpreadsheetDocument {
  return {
    meta: { id: 'doc1', title: 'Test', type: 'spreadsheet', createdAt: '', updatedAt: '' },
    sheets: [
      {
        id: 's1',
        name: 'Sheet1',
        cells: {},
        colWidths: {},
        rowHeights: {},
        mergedCells: [],
        rowCount: 10,
        colCount: 10,
      },
    ],
    activeSheetId: 's1',
  }
}

describe('formatReducer', () => {
  it('returns null for unhandled action types', () => {
    const doc = makeDoc()
    const result = formatReducer(doc, { type: 'SET_CELL_VALUE', sheetId: 's1', row: 0, col: 0, value: 'x' } as SpreadsheetAction)
    expect(result).toBeNull()
  })

  describe('MERGE_CELLS', () => {
    it('adds a merged cell range spanning multiple rows and columns', () => {
      const doc = makeDoc()
      const result = formatReducer(doc, {
        type: 'MERGE_CELLS', sheetId: 's1', startRow: 0, startCol: 0, endRow: 2, endCol: 1,
      } as SpreadsheetAction)
      expect(result).not.toBeNull()
      expect(result!.sheets[0].mergedCells).toHaveLength(1)
      expect(result!.sheets[0].mergedCells[0]).toEqual({
        startRow: 0, startCol: 0, rowSpan: 3, colSpan: 2,
      })
    })

    it('returns unchanged state when merging a single cell', () => {
      const doc = makeDoc()
      const result = formatReducer(doc, {
        type: 'MERGE_CELLS', sheetId: 's1', startRow: 0, startCol: 0, endRow: 0, endCol: 0,
      } as SpreadsheetAction)
      expect(result).toBe(doc)
    })
  })

  describe('UNMERGE_CELLS', () => {
    it('removes the merged cell range matching the start position', () => {
      const doc = makeDoc()
      doc.sheets[0].mergedCells = [
        { startRow: 0, startCol: 0, rowSpan: 2, colSpan: 2 },
        { startRow: 5, startCol: 5, rowSpan: 3, colSpan: 1 },
      ]
      const result = formatReducer(doc, {
        type: 'UNMERGE_CELLS', sheetId: 's1', startRow: 0, startCol: 0,
      } as SpreadsheetAction)
      expect(result).not.toBeNull()
      expect(result!.sheets[0].mergedCells).toHaveLength(1)
      expect(result!.sheets[0].mergedCells[0].startRow).toBe(5)
    })
  })

  describe('SET_FREEZE', () => {
    it('sets frozen rows and columns', () => {
      const doc = makeDoc()
      const result = formatReducer(doc, {
        type: 'SET_FREEZE', sheetId: 's1', frozenRows: 2, frozenCols: 1,
      } as SpreadsheetAction)
      expect(result).not.toBeNull()
      expect(result!.sheets[0].frozenRows).toBe(2)
      expect(result!.sheets[0].frozenCols).toBe(1)
    })
  })
})
