import type { SpreadsheetDocument, Sheet, Cell } from '@/types'

export function updateSheet(state: SpreadsheetDocument, sheetId: string, fn: (s: Sheet) => Sheet): SpreadsheetDocument {
  return { ...state, sheets: state.sheets.map((s) => (s.id === sheetId ? fn(s) : s)) }
}

export function rekeyRowInsert(cells: Record<string, Cell>, atRow: number): Record<string, Cell> {
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

export function rekeyRowDelete(cells: Record<string, Cell>, row: number): Record<string, Cell> {
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

export function rekeyColInsert(cells: Record<string, Cell>, atCol: number): Record<string, Cell> {
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

export function rekeyColDelete(cells: Record<string, Cell>, col: number): Record<string, Cell> {
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
