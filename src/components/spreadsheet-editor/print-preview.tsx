'use client'

import { useState, useMemo } from 'react'
import type { Sheet } from '@/types'
import { colIndexToLetter, formatCellValue } from '@/lib/formula-engine'
import { X, Printer } from 'lucide-react'

interface Props {
  sheet: Sheet
  computedValues: Record<string, string | number>
  onClose: () => void
}

const PAGE_SIZES = {
  A4: { width: 210, height: 297 },
  Letter: { width: 216, height: 279 },
}

type PageSize = keyof typeof PAGE_SIZES
type Orientation = 'portrait' | 'landscape'

const DEFAULT_COL_WIDTH = 100
const DEFAULT_ROW_HEIGHT = 28

export function PrintPreview({ sheet, computedValues, onClose }: Props) {
  const [pageSize, setPageSize] = useState<PageSize>('A4')
  const [orientation, setOrientation] = useState<Orientation>('portrait')
  const [showGridLines, setShowGridLines] = useState(true)
  const [scaleToFit, setScaleToFit] = useState(false)

  const dims = PAGE_SIZES[pageSize]
  const pageW = orientation === 'portrait' ? dims.width : dims.height
  const pageH = orientation === 'portrait' ? dims.height : dims.width
  // Convert mm to px at roughly 3.78px/mm (96dpi)
  const pxW = pageW * 3.78
  const pxH = pageH * 3.78

  // Find the extent of data
  const extent = useMemo(() => {
    let maxRow = 0
    let maxCol = 0
    for (const key of Object.keys(sheet.cells)) {
      const [r, c] = key.split('-').map(Number)
      if (r > maxRow) maxRow = r
      if (c > maxCol) maxCol = c
    }
    return { maxRow: maxRow + 1, maxCol: maxCol + 1 }
  }, [sheet.cells])

  const totalWidth = useMemo(() => {
    let w = 0
    for (let c = 0; c < extent.maxCol; c++) w += sheet.colWidths[c] || DEFAULT_COL_WIDTH
    return w
  }, [extent.maxCol, sheet.colWidths])

  const totalHeight = useMemo(() => {
    let h = 0
    for (let r = 0; r < extent.maxRow; r++) h += sheet.rowHeights[r] || DEFAULT_ROW_HEIGHT
    return h
  }, [extent.maxRow, sheet.rowHeights])

  const scale = scaleToFit ? Math.min(1, (pxW - 40) / totalWidth, (pxH - 40) / totalHeight) : 1

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/60" onClick={onClose}>
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-700 shrink-0" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-sm font-semibold text-white">印刷プレビュー</h2>
        <div className="flex items-center gap-3">
          {/* Page size */}
          <label className="text-xs text-slate-400 flex items-center gap-1">
            用紙:
            <select
              value={pageSize}
              onChange={(e) => setPageSize(e.target.value as PageSize)}
              className="h-7 bg-slate-700 border border-slate-600 rounded text-xs text-white px-1 outline-none"
            >
              <option value="A4">A4</option>
              <option value="Letter">Letter</option>
            </select>
          </label>
          {/* Orientation */}
          <label className="text-xs text-slate-400 flex items-center gap-1">
            向き:
            <select
              value={orientation}
              onChange={(e) => setOrientation(e.target.value as Orientation)}
              className="h-7 bg-slate-700 border border-slate-600 rounded text-xs text-white px-1 outline-none"
            >
              <option value="portrait">縦</option>
              <option value="landscape">横</option>
            </select>
          </label>
          {/* Grid lines */}
          <label className="text-xs text-slate-400 flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={showGridLines}
              onChange={(e) => setShowGridLines(e.target.checked)}
              className="w-3 h-3 accent-indigo-500"
            />
            枠線
          </label>
          {/* Scale to fit */}
          <label className="text-xs text-slate-400 flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={scaleToFit}
              onChange={(e) => setScaleToFit(e.target.checked)}
              className="w-3 h-3 accent-indigo-500"
            />
            ページに合わせる
          </label>
          {/* Print button */}
          <button
            onClick={handlePrint}
            className="h-7 px-3 flex items-center gap-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs transition-colors"
          >
            <Printer size={14} />
            印刷
          </button>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto flex justify-center py-8" onClick={(e) => e.stopPropagation()}>
        <div
          className="bg-white shadow-2xl shrink-0"
          style={{
            width: pxW,
            minHeight: pxH,
            padding: 20,
          }}
        >
          <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}>
            <table
              className="border-collapse"
              style={{ tableLayout: 'fixed' }}
            >
              <colgroup>
                {Array.from({ length: extent.maxCol }, (_, c) => (
                  <col key={c} style={{ width: sheet.colWidths[c] || DEFAULT_COL_WIDTH }} />
                ))}
              </colgroup>
              <tbody>
                {Array.from({ length: extent.maxRow }, (_, r) => (
                  <tr key={r} style={{ height: sheet.rowHeights[r] || DEFAULT_ROW_HEIGHT }}>
                    {Array.from({ length: extent.maxCol }, (_, c) => {
                      const key = `${r}-${c}`
                      const cell = sheet.cells[key]
                      const computed = computedValues[key]
                      const fmt = cell?.format || {}
                      const displayValue = computed !== undefined ? formatCellValue(computed, fmt) : ''

                      const textDecorations: string[] = []
                      if (fmt.underline) textDecorations.push('underline')
                      if (fmt.strikethrough) textDecorations.push('line-through')

                      return (
                        <td
                          key={c}
                          style={{
                            border: showGridLines ? '1px solid #d1d5db' : '1px solid transparent',
                            padding: '2px 4px',
                            fontSize: fmt.fontSize ? `${fmt.fontSize}px` : '12px',
                            fontWeight: fmt.bold ? 'bold' : undefined,
                            fontStyle: fmt.italic ? 'italic' : undefined,
                            textDecoration: textDecorations.length > 0 ? textDecorations.join(' ') : undefined,
                            textAlign: fmt.align || 'left',
                            verticalAlign: fmt.verticalAlign || 'middle',
                            backgroundColor: fmt.bgColor || undefined,
                            color: fmt.textColor || '#000',
                            whiteSpace: fmt.wrap ? 'pre-wrap' : 'nowrap',
                            overflow: 'hidden',
                          }}
                        >
                          {displayValue}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Print-only styles */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          body > .fixed { display: flex !important; }
          .fixed > div:first-child { display: none !important; }
        }
      `}</style>
    </div>
  )
}
