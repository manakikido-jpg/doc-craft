/**
 * CSV Export utility — export sheet data as properly quoted CSV.
 */

import type { Sheet } from '@/types'

/**
 * Determine the used range of the sheet (max row/col that has data).
 */
function getUsedRange(sheet: Sheet): { maxRow: number; maxCol: number } {
  let maxRow = 0
  let maxCol = 0
  for (const key of Object.keys(sheet.cells)) {
    const [rStr, cStr] = key.split(',')
    const r = parseInt(rStr, 10)
    const c = parseInt(cStr, 10)
    if (r > maxRow) maxRow = r
    if (c > maxCol) maxCol = c
  }
  return { maxRow, maxCol }
}

/**
 * Escape a field for CSV: quote if it contains commas, newlines, or double-quotes.
 */
function escapeField(value: string): string {
  if (value.includes(',') || value.includes('\n') || value.includes('\r') || value.includes('"')) {
    return '"' + value.replace(/"/g, '""') + '"'
  }
  return value
}

/**
 * Export a sheet to CSV string.
 */
export function exportSheetToCSV(sheet: Sheet): string {
  const { maxRow, maxCol } = getUsedRange(sheet)
  if (maxRow === 0 && maxCol === 0 && !sheet.cells['0,0']) return ''

  const lines: string[] = []

  for (let r = 0; r <= maxRow; r++) {
    const fields: string[] = []
    for (let c = 0; c <= maxCol; c++) {
      const cell = sheet.cells[`${r},${c}`]
      fields.push(escapeField(cell?.value ?? ''))
    }
    lines.push(fields.join(','))
  }

  return lines.join('\r\n')
}

/**
 * Trigger a CSV file download in the browser.
 */
export function downloadCSV(csv: string, filename: string = 'export.csv'): void {
  // Add BOM for Excel compatibility with Japanese characters
  const bom = '﻿'
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
