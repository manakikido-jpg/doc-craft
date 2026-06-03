import { describe, it, expect } from 'vitest'
import { cellReducer } from './cell-reducer'
import type { SpreadsheetDocument } from '@/types'
import type { SpreadsheetAction } from '../use-spreadsheet'

function makeDoc(cells: Record<string, { value: string; [k: string]: unknown }> = {}): SpreadsheetDocument {
  return {
    meta: { id: 'doc1', title: 'Test', type: 'spreadsheet', createdAt: '', updatedAt: '' },
    sheets: [
      {
        id: 's1',
        name: 'Sheet1',
        cells,
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

describe('cellReducer', () => {
  it('returns null for unhandled action types', () => {
    const doc = makeDoc()
    const result = cellReducer(doc, { type: 'LOAD', doc } as unknown as SpreadsheetAction)
    expect(result).toBeNull()
  })

  describe('SET_CELL_VALUE', () => {
    it('sets a new cell value', () => {
      const doc = makeDoc()
      const result = cellReducer(doc, { type: 'SET_CELL_VALUE', sheetId: 's1', row: 0, col: 0, value: 'hello' })
      expect(result).not.toBeNull()
      expect(result!.sheets[0].cells['0-0'].value).toBe('hello')
    })

    it('removes cell when value is empty and no format exists', () => {
      const doc = makeDoc({ '0-0': { value: 'old' } })
      const result = cellReducer(doc, { type: 'SET_CELL_VALUE', sheetId: 's1', row: 0, col: 0, value: '' })
      expect(result).not.toBeNull()
      expect(result!.sheets[0].cells['0-0']).toBeUndefined()
    })

    it('keeps cell when value is empty but format exists', () => {
      const doc = makeDoc({ '0-0': { value: 'old', format: { bold: true } } })
      const result = cellReducer(doc, { type: 'SET_CELL_VALUE', sheetId: 's1', row: 0, col: 0, value: '' })
      expect(result).not.toBeNull()
      expect(result!.sheets[0].cells['0-0']).toBeDefined()
      expect(result!.sheets[0].cells['0-0'].value).toBe('')
    })
  })

  describe('CLEAR_CELLS', () => {
    it('clears cells in the specified range', () => {
      const doc = makeDoc({ '0-0': { value: 'a' }, '0-1': { value: 'b' }, '1-0': { value: 'c' }, '5-5': { value: 'keep' } })
      const result = cellReducer(doc, { type: 'CLEAR_CELLS', sheetId: 's1', startRow: 0, startCol: 0, endRow: 1, endCol: 1 })
      expect(result).not.toBeNull()
      expect(result!.sheets[0].cells['0-0']).toBeUndefined()
      expect(result!.sheets[0].cells['0-1']).toBeUndefined()
      expect(result!.sheets[0].cells['1-0']).toBeUndefined()
      expect(result!.sheets[0].cells['5-5'].value).toBe('keep')
    })
  })

  describe('INSERT_ROW', () => {
    it('shifts cells below the inserted row down by 1', () => {
      const doc = makeDoc({ '0-0': { value: 'top' }, '2-0': { value: 'bottom' } })
      const result = cellReducer(doc, { type: 'INSERT_ROW', sheetId: 's1', atRow: 1 })
      expect(result).not.toBeNull()
      expect(result!.sheets[0].cells['0-0'].value).toBe('top')
      expect(result!.sheets[0].cells['3-0'].value).toBe('bottom')
      expect(result!.sheets[0].cells['2-0']).toBeUndefined()
      expect(result!.sheets[0].rowCount).toBe(11)
    })
  })

  describe('DELETE_ROW', () => {
    it('removes cells on the deleted row and shifts cells below up by 1', () => {
      const doc = makeDoc({ '0-0': { value: 'top' }, '1-0': { value: 'delete-me' }, '2-0': { value: 'bottom' } })
      const result = cellReducer(doc, { type: 'DELETE_ROW', sheetId: 's1', row: 1 })
      expect(result).not.toBeNull()
      expect(result!.sheets[0].cells['0-0'].value).toBe('top')
      expect(result!.sheets[0].cells['1-0'].value).toBe('bottom')
      expect(result!.sheets[0].cells['2-0']).toBeUndefined()
      expect(result!.sheets[0].rowCount).toBe(9)
    })

    it('does not reduce rowCount below 1', () => {
      const doc: SpreadsheetDocument = {
        ...makeDoc(),
        sheets: [{ ...makeDoc().sheets[0], rowCount: 1 }],
      }
      const result = cellReducer(doc, { type: 'DELETE_ROW', sheetId: 's1', row: 0 })
      expect(result).not.toBeNull()
      expect(result!.sheets[0].rowCount).toBe(1)
    })
  })

  describe('SET_CELL_FORMAT', () => {
    it('sets format on an existing cell', () => {
      const doc = makeDoc({ '0-0': { value: 'text' } })
      const result = cellReducer(doc, { type: 'SET_CELL_FORMAT', sheetId: 's1', row: 0, col: 0, format: { bold: true } })
      expect(result).not.toBeNull()
      expect(result!.sheets[0].cells['0-0'].format?.bold).toBe(true)
    })

    it('creates cell with empty value if it does not exist', () => {
      const doc = makeDoc()
      const result = cellReducer(doc, { type: 'SET_CELL_FORMAT', sheetId: 's1', row: 3, col: 3, format: { italic: true } })
      expect(result).not.toBeNull()
      expect(result!.sheets[0].cells['3-3'].value).toBe('')
      expect(result!.sheets[0].cells['3-3'].format?.italic).toBe(true)
    })
  })
})
