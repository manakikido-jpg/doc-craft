'use client'

import { useState, useEffect } from 'react'
import { ArrowUpDown, ArrowUp, ArrowDown, Merge, SplitSquareVertical, Bold, Italic } from 'lucide-react'

interface Props {
  data?: Record<string, string>
  onUpdateData?: (data: Record<string, string>) => void
}

type CellStyles = Record<string, { bgColor?: string; textColor?: string; bold?: boolean; italic?: boolean }>
type MergedCell = { startRow: number; startCol: number; rowSpan: number; colSpan: number }

function parseTable(data?: Record<string, string>): string[][] {
  if (!data?.tableData) {
    return [
      ['', '', ''],
      ['', '', ''],
      ['', '', ''],
    ]
  }
  try {
    return JSON.parse(data.tableData)
  } catch {
    return [
      ['', '', ''],
      ['', '', ''],
      ['', '', ''],
    ]
  }
}

function parseCellStyles(data?: Record<string, string>): CellStyles {
  if (!data?.cellStyles) return {}
  try {
    return JSON.parse(data.cellStyles)
  } catch {
    return {}
  }
}

function parseMergedCells(data?: Record<string, string>): MergedCell[] {
  if (!data?.mergedCells) return []
  try {
    return JSON.parse(data.mergedCells)
  } catch {
    return []
  }
}

function isCellHidden(row: number, col: number, merges: MergedCell[]): boolean {
  return merges.some((m) => {
    if (row === m.startRow && col === m.startCol) return false
    return row >= m.startRow && row < m.startRow + m.rowSpan && col >= m.startCol && col < m.startCol + m.colSpan
  })
}

function getMerge(row: number, col: number, merges: MergedCell[]): MergedCell | undefined {
  return merges.find((m) => m.startRow === row && m.startCol === col)
}

const CELL_COLORS = ['transparent', '#1e3a5f', '#1a3a2e', '#3a2e1a', '#3a1a2e', '#2e1a3a']

export default function TableBlock({ data, onUpdateData }: Props) {
  const [cells, setCells] = useState<string[][]>(() => parseTable(data))
  const [cellStyles, setCellStyles] = useState<CellStyles>(() => parseCellStyles(data))
  const [mergedCells, setMergedCells] = useState<MergedCell[]>(() => parseMergedCells(data))
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null)
  const [selectionEnd, setSelectionEnd] = useState<{ row: number; col: number } | null>(null)
  const [showBorderMenu, setShowBorderMenu] = useState(false)
  const [sortCol, setSortCol] = useState<number | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const borderStyle = data?.borderStyle || 'solid'
  const hasHeader = data?.hasHeader !== 'false'

  useEffect(() => {
    setCells(parseTable(data))
    setCellStyles(parseCellStyles(data))
    setMergedCells(parseMergedCells(data))
  }, [data?.tableData, data?.cellStyles, data?.mergedCells])

  function save(nextCells: string[][], nextStyles?: CellStyles, nextMerges?: MergedCell[]) {
    const result: Record<string, string> = { tableData: JSON.stringify(nextCells) }
    if (nextStyles) result.cellStyles = JSON.stringify(nextStyles)
    else if (Object.keys(cellStyles).length > 0) result.cellStyles = JSON.stringify(cellStyles)
    const m = nextMerges ?? mergedCells
    if (m.length > 0) result.mergedCells = JSON.stringify(m)
    if (data?.borderStyle) result.borderStyle = data.borderStyle
    if (data?.hasHeader) result.hasHeader = data.hasHeader
    onUpdateData?.(result)
  }

  function updateCell(row: number, col: number, value: string) {
    const next = cells.map((r, ri) => r.map((c, ci) => (ri === row && ci === col ? value : c)))
    setCells(next)
    save(next)
  }

  function setCellStyle(row: number, col: number, style: Partial<CellStyles[string]>) {
    const key = `${row}-${col}`
    const next = { ...cellStyles, [key]: { ...cellStyles[key], ...style } }
    setCellStyles(next)
    save(cells, next)
  }

  function addRow() {
    const next = [...cells, Array(cells[0]?.length || 3).fill('')]
    setCells(next)
    save(next)
  }

  function addCol() {
    const next = cells.map((r) => [...r, ''])
    setCells(next)
    save(next)
  }

  function deleteRow(idx: number) {
    if (cells.length <= 1) return
    const next = cells.filter((_, i) => i !== idx)
    setCells(next)
    save(next)
  }

  function deleteCol(idx: number) {
    if ((cells[0]?.length || 0) <= 1) return
    const next = cells.map((r) => r.filter((_, i) => i !== idx))
    setCells(next)
    save(next)
  }

  function toggleHeader() {
    const result: Record<string, string> = {
      ...data,
      hasHeader: hasHeader ? 'false' : 'true',
    }
    onUpdateData?.(result)
  }

  function setBorderStyle(style: string) {
    onUpdateData?.({ ...data, borderStyle: style } as Record<string, string>)
    setShowBorderMenu(false)
  }

  // Selection range
  const selRange =
    selectedCell && selectionEnd
      ? {
          minRow: Math.min(selectedCell.row, selectionEnd.row),
          maxRow: Math.max(selectedCell.row, selectionEnd.row),
          minCol: Math.min(selectedCell.col, selectionEnd.col),
          maxCol: Math.max(selectedCell.col, selectionEnd.col),
        }
      : null

  const canMerge = selRange && (selRange.maxRow > selRange.minRow || selRange.maxCol > selRange.minCol)

  function mergeCells() {
    if (!selRange) return
    const { minRow, maxRow, minCol, maxCol } = selRange
    // Combine text from all cells in range
    const texts: string[] = []
    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        if (cells[r]?.[c]) texts.push(cells[r][c])
      }
    }
    const nextCells = cells.map((row, ri) =>
      row.map((cell, ci) => {
        if (ri === minRow && ci === minCol) return texts.join(' ')
        if (ri >= minRow && ri <= maxRow && ci >= minCol && ci <= maxCol) return ''
        return cell
      }),
    )
    const newMerge: MergedCell = {
      startRow: minRow,
      startCol: minCol,
      rowSpan: maxRow - minRow + 1,
      colSpan: maxCol - minCol + 1,
    }
    const nextMerges = [
      ...mergedCells.filter(
        (m) => !(m.startRow >= minRow && m.startRow <= maxRow && m.startCol >= minCol && m.startCol <= maxCol),
      ),
      newMerge,
    ]
    setCells(nextCells)
    setMergedCells(nextMerges)
    setSelectionEnd(null)
    save(nextCells, undefined, nextMerges)
  }

  function unmergeCells() {
    if (!selectedCell) return
    const merge = mergedCells.find((m) => m.startRow === selectedCell.row && m.startCol === selectedCell.col)
    if (!merge) return
    const nextMerges = mergedCells.filter((m) => m !== merge)
    setMergedCells(nextMerges)
    save(cells, undefined, nextMerges)
  }

  function toggleCellBold() {
    if (!selectedCell) return
    const key = `${selectedCell.row}-${selectedCell.col}`
    setCellStyle(selectedCell.row, selectedCell.col, { bold: !cellStyles[key]?.bold })
  }

  function toggleCellItalic() {
    if (!selectedCell) return
    const key = `${selectedCell.row}-${selectedCell.col}`
    setCellStyle(selectedCell.row, selectedCell.col, { italic: !cellStyles[key]?.italic })
  }

  function addFormulaRow(fn: 'SUM' | 'AVG' | 'COUNT') {
    const colCount = cells[0]?.length || 3
    const startRow = hasHeader ? 1 : 0
    const dataRows = cells.slice(startRow)
    const formulaRow = Array(colCount)
      .fill('')
      .map((_, ci) => {
        if (ci === 0) return fn === 'SUM' ? '合計' : fn === 'AVG' ? '平均' : '件数'
        const values = dataRows.map((r) => parseFloat(r[ci])).filter((v) => !isNaN(v))
        if (values.length === 0) return '-'
        if (fn === 'SUM') return String(values.reduce((a, b) => a + b, 0))
        if (fn === 'AVG') return String(Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100)
        return String(values.length)
      })
    const next = [...cells, formulaRow]
    setCells(next)
    save(next)
  }

  function sortByColumn(colIdx: number) {
    const newDir = sortCol === colIdx && sortDir === 'asc' ? 'desc' : 'asc'
    setSortCol(colIdx)
    setSortDir(newDir)
    const startRow = hasHeader ? 1 : 0
    const header = hasHeader ? [cells[0]] : []
    const body = cells.slice(startRow)
    body.sort((a, b) => {
      const av = a[colIdx] || ''
      const bv = b[colIdx] || ''
      const an = parseFloat(av)
      const bn = parseFloat(bv)
      if (!isNaN(an) && !isNaN(bn)) return newDir === 'asc' ? an - bn : bn - an
      return newDir === 'asc' ? av.localeCompare(bv, 'ja') : bv.localeCompare(av, 'ja')
    })
    const next = [...header, ...body]
    setCells(next)
    save(next)
  }

  const borderClass =
    borderStyle === 'dashed'
      ? 'border-dashed'
      : borderStyle === 'dotted'
        ? 'border-dotted'
        : borderStyle === 'none'
          ? 'border-transparent'
          : 'border-solid'

  return (
    <div className="my-3 overflow-x-auto">
      {/* Table toolbar */}
      <div className="flex items-center gap-2 mb-1.5">
        <button
          onClick={toggleHeader}
          className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
            hasHeader
              ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400'
              : 'border-slate-700 text-slate-500 hover:text-slate-300'
          }`}
        >
          ヘッダー行
        </button>
        <div className="relative">
          <button
            onClick={() => setShowBorderMenu(!showBorderMenu)}
            className="text-[10px] px-2 py-0.5 rounded border border-slate-700 text-slate-500 hover:text-slate-300 transition-colors"
          >
            枠線:{' '}
            {borderStyle === 'none'
              ? 'なし'
              : borderStyle === 'dashed'
                ? '破線'
                : borderStyle === 'dotted'
                  ? '点線'
                  : '実線'}
          </button>
          {showBorderMenu && (
            <div className="absolute top-full mt-1 left-0 bg-slate-900 border border-slate-700 rounded-lg shadow-xl py-1 z-50 w-24">
              {[
                { v: 'solid', l: '実線' },
                { v: 'dashed', l: '破線' },
                { v: 'dotted', l: '点線' },
                { v: 'none', l: 'なし' },
              ].map((b) => (
                <button
                  key={b.v}
                  onClick={() => setBorderStyle(b.v)}
                  className="w-full text-left px-2 py-1 text-xs text-slate-300 hover:bg-slate-800"
                >
                  {b.l}
                </button>
              ))}
            </div>
          )}
        </div>
        {selectedCell && (
          <>
            <div className="flex items-center gap-1 ml-2">
              <span className="text-[10px] text-slate-500">セル背景:</span>
              {CELL_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() =>
                    setCellStyle(selectedCell.row, selectedCell.col, { bgColor: c === 'transparent' ? undefined : c })
                  }
                  className="w-4 h-4 rounded border border-slate-600 hover:scale-110 transition-transform"
                  style={{
                    background:
                      c === 'transparent' ? 'repeating-conic-gradient(#334155 0 25%,transparent 0 50%) 0/8px 8px' : c,
                  }}
                />
              ))}
            </div>
            <div className="flex items-center gap-0.5 ml-2">
              <button
                onClick={toggleCellBold}
                className={`p-0.5 rounded text-[10px] transition-colors ${cellStyles[`${selectedCell.row}-${selectedCell.col}`]?.bold ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-500 hover:text-white'}`}
                title="セル太字"
              >
                <Bold size={12} />
              </button>
              <button
                onClick={toggleCellItalic}
                className={`p-0.5 rounded text-[10px] transition-colors ${cellStyles[`${selectedCell.row}-${selectedCell.col}`]?.italic ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-500 hover:text-white'}`}
                title="セル斜体"
              >
                <Italic size={12} />
              </button>
            </div>
            {canMerge && (
              <button
                onClick={mergeCells}
                className="text-[10px] px-2 py-0.5 rounded border border-slate-700 text-slate-500 hover:text-indigo-400 transition-colors ml-1 flex items-center gap-1"
                title="セルを結合"
              >
                <Merge size={10} /> 結合
              </button>
            )}
            {getMerge(selectedCell.row, selectedCell.col, mergedCells) && (
              <button
                onClick={unmergeCells}
                className="text-[10px] px-2 py-0.5 rounded border border-slate-700 text-slate-500 hover:text-orange-400 transition-colors ml-1 flex items-center gap-1"
                title="結合解除"
              >
                <SplitSquareVertical size={10} /> 解除
              </button>
            )}
          </>
        )}
      </div>

      <table className={`w-full border-collapse border ${borderClass} border-slate-700 rounded-lg overflow-hidden`}>
        <tbody>
          {cells.map((row, ri) => (
            <tr key={ri} className="group/row">
              {row.map((cell, ci) => {
                if (isCellHidden(ri, ci, mergedCells)) return null
                const key = `${ri}-${ci}`
                const style = cellStyles[key]
                const isHeader = hasHeader && ri === 0
                const isSelected = selectedCell?.row === ri && selectedCell?.col === ci
                const inRange =
                  selRange &&
                  ri >= selRange.minRow &&
                  ri <= selRange.maxRow &&
                  ci >= selRange.minCol &&
                  ci <= selRange.maxCol
                const merge = getMerge(ri, ci, mergedCells)
                return (
                  <td
                    key={ci}
                    rowSpan={merge?.rowSpan}
                    colSpan={merge?.colSpan}
                    className={`border ${borderClass} border-slate-700 p-0 relative ${
                      isSelected
                        ? 'ring-2 ring-indigo-500/50'
                        : inRange
                          ? 'ring-1 ring-indigo-500/30 bg-indigo-500/5'
                          : ''
                    }`}
                    style={{
                      backgroundColor: style?.bgColor || (isHeader ? 'rgba(30,41,59,0.6)' : 'rgba(15,23,42,0.4)'),
                    }}
                    onClick={(e) => {
                      if (e.shiftKey && selectedCell) {
                        setSelectionEnd({ row: ri, col: ci })
                      } else {
                        setSelectedCell({ row: ri, col: ci })
                        setSelectionEnd(null)
                      }
                    }}
                  >
                    <div className="flex items-center">
                      <input
                        type="text"
                        value={cell}
                        onChange={(e) => updateCell(ri, ci, e.target.value)}
                        className={`flex-1 px-3 py-2 bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500/50 ${
                          isHeader ? 'text-white font-medium' : 'text-slate-300'
                        }`}
                        style={{
                          color: style?.textColor,
                          fontWeight: style?.bold ? 'bold' : undefined,
                          fontStyle: style?.italic ? 'italic' : undefined,
                        }}
                        placeholder={isHeader ? '見出し' : ''}
                      />
                      {isHeader && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            sortByColumn(ci)
                          }}
                          className="flex-shrink-0 p-0.5 text-slate-500 hover:text-indigo-400 transition-colors"
                          title="この列でソート"
                        >
                          {sortCol === ci ? (
                            sortDir === 'asc' ? (
                              <ArrowUp size={12} />
                            ) : (
                              <ArrowDown size={12} />
                            )
                          ) : (
                            <ArrowUpDown size={12} />
                          )}
                        </button>
                      )}
                    </div>
                  </td>
                )
              })}
              <td className="border-0 w-6 p-0">
                <button
                  onClick={() => deleteRow(ri)}
                  className="opacity-0 group-hover/row:opacity-100 w-6 h-full text-slate-600 hover:text-red-400 text-xs transition-opacity"
                  title="行を削除"
                >
                  ✕
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex gap-2 mt-1.5 flex-wrap">
        <button onClick={addRow} className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
          + 行を追加
        </button>
        <button onClick={addCol} className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
          + 列を追加
        </button>
        <button
          onClick={() => addFormulaRow('SUM')}
          className="text-xs text-slate-500 hover:text-emerald-400 transition-colors"
          title="合計行を追加"
        >
          Σ 合計
        </button>
        <button
          onClick={() => addFormulaRow('AVG')}
          className="text-xs text-slate-500 hover:text-blue-400 transition-colors"
          title="平均行を追加"
        >
          x̄ 平均
        </button>
        <button
          onClick={() => addFormulaRow('COUNT')}
          className="text-xs text-slate-500 hover:text-purple-400 transition-colors"
          title="件数行を追加"
        >
          # 件数
        </button>
        <button
          onClick={() => deleteCol(cells[0]?.length - 1)}
          className="text-xs text-slate-500 hover:text-red-400 transition-colors ml-auto"
        >
          列を削除
        </button>
      </div>
    </div>
  )
}
