'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { ArrowUpDown, ArrowUp, ArrowDown, Merge, SplitSquareVertical, Bold, Italic, Paintbrush, AlignVerticalJustifyStart, AlignVerticalJustifyCenter, AlignVerticalJustifyEnd, Repeat } from 'lucide-react'

const TABLE_STYLE_PRESETS = [
  { label: 'シンプル', headerBg: '', headerText: '', stripeBg: '' },
  { label: 'インディゴ', headerBg: '#312e81', headerText: '#e0e7ff', stripeBg: 'rgba(99,102,241,0.05)' },
  { label: 'グリーン', headerBg: '#14532d', headerText: '#dcfce7', stripeBg: 'rgba(34,197,94,0.05)' },
  { label: 'レッド', headerBg: '#7f1d1d', headerText: '#fecaca', stripeBg: 'rgba(239,68,68,0.05)' },
  { label: 'ダーク', headerBg: '#1e293b', headerText: '#f1f5f9', stripeBg: 'rgba(30,41,59,0.3)' },
]

/**
 * Safe math expression parser that only allows numeric literals and
 * basic arithmetic operators (+, -, *, /, %, ^) with parentheses.
 * No Function()/eval - uses recursive descent parsing instead.
 */
function safeEvalMath(expr: string): number | null {
  const tokens: string[] = []
  const src = expr.replace(/\s+/g, '')
  let i = 0
  while (i < src.length) {
    if ('+-*/%^()'.includes(src[i])) {
      tokens.push(src[i])
      i++
    } else if (/\d/.test(src[i]) || src[i] === '.') {
      let num = ''
      while (i < src.length && (/\d/.test(src[i]) || src[i] === '.')) {
        num += src[i]
        i++
      }
      tokens.push(num)
    } else {
      return null // unexpected character
    }
  }

  let pos = 0

  function peek(): string | undefined { return tokens[pos] }
  function consume(): string { return tokens[pos++] }

  // expr = term (('+' | '-') term)*
  function parseExpr(): number | null {
    let left = parseTerm()
    if (left === null) return null
    while (peek() === '+' || peek() === '-') {
      const op = consume()
      const right = parseTerm()
      if (right === null) return null
      left = op === '+' ? left + right : left - right
    }
    return left
  }

  // term = power (('*' | '/' | '%') power)*
  function parseTerm(): number | null {
    let left = parsePower()
    if (left === null) return null
    while (peek() === '*' || peek() === '/' || peek() === '%') {
      const op = consume()
      const right = parsePower()
      if (right === null) return null
      if (op === '*') left = left * right
      else if (op === '/') { if (right === 0) return null; left = left / right }
      else left = left % right
    }
    return left
  }

  // power = unary ('^' power)?
  function parsePower(): number | null {
    let base = parseUnary()
    if (base === null) return null
    if (peek() === '^') {
      consume()
      const exp = parsePower() // right-associative
      if (exp === null) return null
      base = Math.pow(base, exp)
    }
    return base
  }

  // unary = ('+' | '-')? atom
  function parseUnary(): number | null {
    if (peek() === '-') { consume(); const v = parseAtom(); return v === null ? null : -v }
    if (peek() === '+') { consume() }
    return parseAtom()
  }

  // atom = number | '(' expr ')'
  function parseAtom(): number | null {
    if (peek() === '(') {
      consume()
      const v = parseExpr()
      if (peek() !== ')') return null
      consume()
      return v
    }
    const tok = peek()
    if (tok && /^\d+(\.\d+)?$/.test(tok)) {
      consume()
      return parseFloat(tok)
    }
    return null
  }

  const result = parseExpr()
  if (pos !== tokens.length) return null // leftover tokens
  if (result === null || !isFinite(result)) return null
  return result
}

function evaluateTableFormula(formula: string, rows: string[][]): string {
  try {
    const f = formula.substring(1).trim().toUpperCase()

    // Parse cell references like A1, B2
    function getCellValue(ref: string): number {
      const col = ref.charCodeAt(0) - 65
      const row = parseInt(ref.substring(1)) - 1
      if (row >= 0 && row < rows.length && col >= 0 && col < (rows[0]?.length || 0)) {
        return parseFloat(rows[row][col]) || 0
      }
      return 0
    }

    // SUM(A1:A5)
    const sumMatch = f.match(/^SUM\(([A-Z])(\d+):([A-Z])(\d+)\)$/)
    if (sumMatch) {
      const col = sumMatch[1].charCodeAt(0) - 65
      const startRow = parseInt(sumMatch[2]) - 1
      const endRow = parseInt(sumMatch[4]) - 1
      let sum = 0
      for (let r = startRow; r <= endRow; r++) {
        sum += parseFloat(rows[r]?.[col] || '0') || 0
      }
      return String(sum)
    }

    // AVG/AVERAGE(A1:A5)
    const avgMatch = f.match(/^(?:AVG|AVERAGE)\(([A-Z])(\d+):([A-Z])(\d+)\)$/)
    if (avgMatch) {
      const col = avgMatch[1].charCodeAt(0) - 65
      const startRow = parseInt(avgMatch[2]) - 1
      const endRow = parseInt(avgMatch[4]) - 1
      let sum = 0, count = 0
      for (let r = startRow; r <= endRow; r++) {
        const val = parseFloat(rows[r]?.[col] || '0')
        if (!isNaN(val)) { sum += val; count++ }
      }
      return count > 0 ? String(Math.round((sum / count) * 100) / 100) : '0'
    }

    // COUNT(A1:A5)
    const countMatch = f.match(/^COUNT\(([A-Z])(\d+):([A-Z])(\d+)\)$/)
    if (countMatch) {
      const col = countMatch[1].charCodeAt(0) - 65
      const startRow = parseInt(countMatch[2]) - 1
      const endRow = parseInt(countMatch[4]) - 1
      let count = 0
      for (let r = startRow; r <= endRow; r++) {
        if (rows[r]?.[col]?.trim()) count++
      }
      return String(count)
    }

    // MAX/MIN
    const maxMinMatch = f.match(/^(MAX|MIN)\(([A-Z])(\d+):([A-Z])(\d+)\)$/)
    if (maxMinMatch) {
      const fn = maxMinMatch[1]
      const col = maxMinMatch[2].charCodeAt(0) - 65
      const startRow = parseInt(maxMinMatch[3]) - 1
      const endRow = parseInt(maxMinMatch[5]) - 1
      const vals: number[] = []
      for (let r = startRow; r <= endRow; r++) {
        const v = parseFloat(rows[r]?.[col] || '')
        if (!isNaN(v)) vals.push(v)
      }
      return vals.length > 0 ? String(fn === 'MAX' ? Math.max(...vals) : Math.min(...vals)) : '0'
    }

    // Simple cell reference arithmetic: =A1+B1, =A1*2
    const simpleExpr = formula.substring(1).replace(/([A-Z])(\d+)/gi, (_, col, row) => {
      return String(getCellValue(col.toUpperCase() + row))
    })
    // Safe math evaluation without Function()/eval - whitelist-based parser
    if (/^[\d\s+\-*/().%^]+$/.test(simpleExpr)) {
      const result = safeEvalMath(simpleExpr)
      if (result !== null) {
        return String(Math.round(result * 100) / 100)
      }
    }

    return '#ERROR!'
  } catch {
    return '#ERROR!'
  }
}

interface Props {
  data?: Record<string, string>
  onUpdateData?: (data: Record<string, string>) => void
}

type CellStyles = Record<string, { bgColor?: string; textColor?: string; bold?: boolean; italic?: boolean; verticalAlign?: 'top' | 'middle' | 'bottom' }>
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

function parseColWidths(data?: Record<string, string>): Record<number, number> {
  if (!data?.colWidths) return {}
  try { return JSON.parse(data.colWidths) } catch { return {} }
}

export default function TableBlock({ data, onUpdateData }: Props) {
  const [cells, setCells] = useState<string[][]>(() => parseTable(data))
  const [cellStyles, setCellStyles] = useState<CellStyles>(() => parseCellStyles(data))
  const [mergedCells, setMergedCells] = useState<MergedCell[]>(() => parseMergedCells(data))
  const [colWidths, setColWidths] = useState<Record<number, number>>(() => parseColWidths(data))
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null)
  const [selectionEnd, setSelectionEnd] = useState<{ row: number; col: number } | null>(null)
  const [showBorderMenu, setShowBorderMenu] = useState(false)
  const [rowContextMenu, setRowContextMenu] = useState<{ x: number; y: number; row: number } | null>(null)
  const rowContextRef = useRef<HTMLDivElement>(null)
  const [sortCol, setSortCol] = useState<number | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc' | 'none'>('asc')
  const [originalRows, setOriginalRows] = useState<string[][] | null>(null)
  const [resizingCol, setResizingCol] = useState<number | null>(null)
  const resizeStartX = useRef(0)
  const resizeStartW = useRef(0)
  const borderStyle = data?.borderStyle || 'solid'
  const hasHeader = data?.hasHeader !== 'false'

  useEffect(() => {
    setCells(parseTable(data))
    setCellStyles(parseCellStyles(data))
    setMergedCells(parseMergedCells(data))
    setColWidths(parseColWidths(data))
  }, [data?.tableData, data?.cellStyles, data?.mergedCells, data?.colWidths])

  // Close row context menu on click outside
  useEffect(() => {
    if (!rowContextMenu) return
    function handleClick(e: MouseEvent) {
      if (rowContextRef.current && !rowContextRef.current.contains(e.target as Node)) {
        setRowContextMenu(null)
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setRowContextMenu(null)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [rowContextMenu])

  function save(nextCells: string[][], nextStyles?: CellStyles, nextMerges?: MergedCell[], nextColWidths?: Record<number, number>) {
    const result: Record<string, string> = { tableData: JSON.stringify(nextCells) }
    if (nextStyles) result.cellStyles = JSON.stringify(nextStyles)
    else if (Object.keys(cellStyles).length > 0) result.cellStyles = JSON.stringify(cellStyles)
    const m = nextMerges ?? mergedCells
    if (m.length > 0) result.mergedCells = JSON.stringify(m)
    const w = nextColWidths ?? colWidths
    if (Object.keys(w).length > 0) result.colWidths = JSON.stringify(w)
    if (data?.borderStyle) result.borderStyle = data.borderStyle
    if (data?.hasHeader) result.hasHeader = data.hasHeader
    if (data?.caption) result.caption = data.caption
    if (data?.repeatHeader) result.repeatHeader = data.repeatHeader
    // Preserve row background colors and table style presets
    if (data) {
      for (const key of Object.keys(data)) {
        if (key.startsWith('rowBg_') || key.startsWith('tableStyle')) result[key] = data[key]
      }
    }
    onUpdateData?.(result)
  }

  const handleColResize = useCallback((colIdx: number, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setResizingCol(colIdx)
    resizeStartX.current = e.clientX
    resizeStartW.current = colWidths[colIdx] || 120

    function onMove(ev: MouseEvent) {
      const diff = ev.clientX - resizeStartX.current
      const newW = Math.max(50, resizeStartW.current + diff)
      setColWidths(prev => ({ ...prev, [colIdx]: newW }))
    }
    function onUp() {
      setResizingCol(null)
      // Save with current widths
      setColWidths(prev => {
        const cw = { ...prev }
        save(cells, undefined, undefined, cw)
        return cw
      })
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [cells, colWidths, cellStyles, mergedCells, data])

  const handleColAutoFit = useCallback((colIdx: number) => {
    // Auto-fit column width based on content
    let maxWidth = 50
    for (const row of cells) {
      const cellText = row[colIdx] || ''
      // Rough estimate: 8px per character + padding
      const estimatedWidth = cellText.length * 8 + 24
      if (estimatedWidth > maxWidth) maxWidth = estimatedWidth
    }
    maxWidth = Math.min(maxWidth, 400)
    const nextWidths = { ...colWidths, [colIdx]: maxWidth }
    setColWidths(nextWidths)
    save(cells, undefined, undefined, nextWidths)
  }, [cells, colWidths, cellStyles, mergedCells, data])

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

  function setRowBgColor(row: number, color: string | undefined) {
    const result: Record<string, string> = { ...data }
    if (color) {
      result[`rowBg_${row}`] = color
    } else {
      delete result[`rowBg_${row}`]
    }
    onUpdateData?.(result)
    setRowContextMenu(null)
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
    // Cycle: none -> asc -> desc -> none
    let newDir: 'asc' | 'desc' | 'none'
    if (sortCol !== colIdx) {
      newDir = 'asc'
    } else if (sortDir === 'asc') {
      newDir = 'desc'
    } else if (sortDir === 'desc') {
      newDir = 'none'
    } else {
      newDir = 'asc'
    }

    const startRow = hasHeader ? 1 : 0
    const header = hasHeader ? [cells[0]] : []

    // Save original row order on first sort
    if (!originalRows) {
      setOriginalRows(cells.slice(startRow))
    }

    if (newDir === 'none') {
      // Restore original order
      setSortCol(null)
      setSortDir('none')
      const restored = [...header, ...(originalRows || cells.slice(startRow))]
      setOriginalRows(null)
      setCells(restored)
      save(restored)
      return
    }

    setSortCol(colIdx)
    setSortDir(newDir)
    const body = (originalRows || cells.slice(startRow)).map(r => [...r])
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

  const caption = data?.caption || ''
  const repeatHeader = data?.repeatHeader === 'true'

  return (
    <div className="my-3 overflow-x-auto">
      {/* Table caption */}
      <div className="mb-1">
        <input
          type="text"
          value={caption}
          onChange={(e) => onUpdateData?.({ ...data, caption: e.target.value } as Record<string, string>)}
          placeholder="表のキャプションを入力..."
          className="w-full bg-transparent text-xs text-slate-400 placeholder-slate-600 focus:outline-none focus:text-slate-300 border-b border-transparent focus:border-slate-700 py-0.5 px-1 text-center italic"
        />
      </div>

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
        <button
          onClick={() => onUpdateData?.({ ...data, repeatHeader: repeatHeader ? 'false' : 'true' } as Record<string, string>)}
          className={`text-[10px] px-2 py-0.5 rounded border transition-colors flex items-center gap-1 ${
            repeatHeader
              ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400'
              : 'border-slate-700 text-slate-500 hover:text-slate-300'
          }`}
          title="ページ分割時にヘッダー行を繰り返す"
        >
          <Repeat size={10} /> ヘッダー繰り返し
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
            <div className="flex items-center gap-0.5 ml-1">
              <span className="text-[10px] text-slate-500">縦:</span>
              {([
                { v: 'top' as const, icon: AlignVerticalJustifyStart, label: '上揃え' },
                { v: 'middle' as const, icon: AlignVerticalJustifyCenter, label: '中央揃え' },
                { v: 'bottom' as const, icon: AlignVerticalJustifyEnd, label: '下揃え' },
              ]).map(({ v, icon: Icon, label }) => (
                <button
                  key={v}
                  onClick={() => setCellStyle(selectedCell.row, selectedCell.col, { verticalAlign: v })}
                  className={`p-0.5 rounded text-[10px] transition-colors ${cellStyles[`${selectedCell.row}-${selectedCell.col}`]?.verticalAlign === v ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-500 hover:text-white'}`}
                  title={label}
                >
                  <Icon size={12} />
                </button>
              ))}
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

      {/* Table style presets */}
      <div className="flex items-center gap-1 mb-1.5">
        <span className="text-[10px] text-slate-500 mr-1">スタイル:</span>
        {TABLE_STYLE_PRESETS.map((preset) => (
          <button
            key={preset.label}
            onClick={() => {
              const result: Record<string, string> = { ...data }
              if (preset.headerBg) {
                result.tableStyleHeaderBg = preset.headerBg
                result.tableStyleHeaderText = preset.headerText
                result.tableStyleStripeBg = preset.stripeBg
              } else {
                delete result.tableStyleHeaderBg
                delete result.tableStyleHeaderText
                delete result.tableStyleStripeBg
              }
              onUpdateData?.(result)
            }}
            className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${
              (data?.tableStyleHeaderBg || '') === preset.headerBg
                ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400'
                : 'border-slate-700 text-slate-500 hover:text-slate-300'
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>

      <table className={`w-full border-collapse border ${borderClass} border-slate-700 rounded-lg overflow-hidden`} style={{ tableLayout: Object.keys(colWidths).length > 0 ? 'fixed' : 'auto' }}>
        {caption && (
          <caption className="text-xs text-slate-400 text-center mb-1 caption-top italic">
            {caption}
            {repeatHeader && (
              <span className="ml-2 text-[10px] text-indigo-400/60" title="ヘッダー繰り返し有効">[繰り返し]</span>
            )}
          </caption>
        )}
        {Object.keys(colWidths).length > 0 && (
          <colgroup>
            {(cells[0] || []).map((_, ci) => (
              <col key={ci} style={{ width: colWidths[ci] ? `${colWidths[ci]}px` : undefined }} />
            ))}
          </colgroup>
        )}
        <tbody>
          {cells.map((row, ri) => {
            const rowBg = data?.[`rowBg_${ri}`]
            return (
            <tr
              key={ri}
              className="group/row"
              onContextMenu={(e) => {
                e.preventDefault()
                setRowContextMenu({ x: e.clientX, y: e.clientY, row: ri })
              }}
            >
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
                const tableStyleHeaderBg = data?.tableStyleHeaderBg
                const tableStyleHeaderText = data?.tableStyleHeaderText
                const tableStyleStripeBg = data?.tableStyleStripeBg
                const isEvenDataRow = !isHeader && ri % 2 === 0
                const cellBg = style?.bgColor || rowBg || (isHeader && tableStyleHeaderBg ? tableStyleHeaderBg : (isEvenDataRow && tableStyleStripeBg ? tableStyleStripeBg : (isHeader ? '#334155' : 'rgba(15,23,42,0.4)')))
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
                      backgroundColor: cellBg,
                      verticalAlign: style?.verticalAlign || undefined,
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
                      {cell.startsWith('=') && !(isSelected) ? (
                        <div
                          className={`flex-1 px-3 py-2 text-sm min-w-0 cursor-text ${
                            isHeader ? 'text-white font-semibold' : 'text-slate-300'
                          }`}
                          style={{
                            color: style?.textColor || (isHeader && tableStyleHeaderText ? tableStyleHeaderText : undefined),
                            fontWeight: style?.bold ? 'bold' : (isHeader ? 600 : undefined),
                            fontStyle: style?.italic ? 'italic' : undefined,
                          }}
                          title={cell}
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedCell({ row: ri, col: ci })
                            setSelectionEnd(null)
                          }}
                        >
                          {evaluateTableFormula(cell, cells)}
                        </div>
                      ) : (
                      <input
                        type="text"
                        value={cell}
                        onChange={(e) => updateCell(ri, ci, e.target.value)}
                        className={`flex-1 px-3 py-2 bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500/50 min-w-0 ${
                          isHeader ? 'text-white font-semibold' : 'text-slate-300'
                        }`}
                        style={{
                          color: style?.textColor || (isHeader && tableStyleHeaderText ? tableStyleHeaderText : undefined),
                          fontWeight: style?.bold ? 'bold' : (isHeader ? 600 : undefined),
                          fontStyle: style?.italic ? 'italic' : undefined,
                        }}
                        placeholder={isHeader ? '見出し' : ''}
                      />
                      )}
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
                    {/* Column resize handle */}
                    {ri === 0 && (
                      <div
                        onMouseDown={(e) => handleColResize(ci, e)}
                        onDoubleClick={(e) => { e.preventDefault(); e.stopPropagation(); handleColAutoFit(ci) }}
                        className={`absolute top-0 right-0 w-[3px] h-full cursor-col-resize transition-colors ${resizingCol === ci ? 'bg-blue-500' : 'bg-slate-600/50 hover:bg-blue-500/70'}`}
                        title="ドラッグでリサイズ / ダブルクリックで自動調整"
                      />
                    )}
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
          )})}
        </tbody>
      </table>

      {/* Row context menu for background color */}
      {rowContextMenu && (
        <div
          ref={rowContextRef}
          className="fixed z-50 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl py-1 w-44"
          style={{ top: rowContextMenu.y, left: rowContextMenu.x }}
        >
          <div className="px-3 py-1 text-[10px] text-slate-500 font-medium">行 {rowContextMenu.row + 1}</div>
          {/* Sort options */}
          <button
            onClick={() => { sortByColumn(0); setRowContextMenu(null) }}
            className="w-full flex items-center gap-2 px-3 py-1 text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <ArrowUp size={10} /> 昇順ソート
          </button>
          <button
            onClick={() => {
              setSortCol(0); setSortDir('desc')
              const startRow = hasHeader ? 1 : 0
              const header = hasHeader ? [cells[0]] : []
              const body = cells.slice(startRow)
              body.sort((a, b) => {
                const av = a[0] || '', bv = b[0] || ''
                const an = parseFloat(av), bn = parseFloat(bv)
                if (!isNaN(an) && !isNaN(bn)) return bn - an
                return bv.localeCompare(av, 'ja')
              })
              const next = [...header, ...body]
              setCells(next); save(next)
              setRowContextMenu(null)
            }}
            className="w-full flex items-center gap-2 px-3 py-1 text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <ArrowDown size={10} /> 降順ソート
          </button>
          <div className="h-px bg-slate-800 my-0.5" />
          <div className="px-3 py-1.5">
            <div className="flex items-center gap-1 text-[10px] text-slate-400 mb-1">
              <Paintbrush size={10} /> 背景色
            </div>
            <div className="flex items-center gap-1 flex-wrap">
              <button
                onClick={() => setRowBgColor(rowContextMenu.row, undefined)}
                className="w-5 h-5 rounded border border-slate-600 hover:scale-110 transition-transform"
                style={{ background: 'repeating-conic-gradient(#334155 0 25%,transparent 0 50%) 0/8px 8px' }}
                title="なし"
              />
              {['#1e293b', '#334155', '#1e3a5f', '#1a3a2e', '#3a2e1a', '#3a1a2e', '#2e1a3a', '#1a2e3a'].map((c) => (
                <button
                  key={c}
                  onClick={() => setRowBgColor(rowContextMenu.row, c)}
                  className={`w-5 h-5 rounded border border-slate-600 hover:scale-110 transition-transform ${data?.[`rowBg_${rowContextMenu.row}`] === c ? 'ring-1 ring-indigo-400' : ''}`}
                  style={{ background: c }}
                />
              ))}
              <input
                type="color"
                value={data?.[`rowBg_${rowContextMenu.row}`] || '#1e293b'}
                onChange={(e) => setRowBgColor(rowContextMenu.row, e.target.value)}
                className="w-5 h-5 rounded cursor-pointer border border-slate-600 bg-transparent"
                title="カスタム色"
              />
            </div>
          </div>
        </div>
      )}
      <div className="flex gap-2 mt-1.5 flex-wrap">
        <button onClick={addRow} className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
          + 行を末尾に追加
        </button>
        {selectedCell && (
          <>
            <button
              onClick={() => {
                const next = [...cells]
                next.splice(selectedCell.row, 0, Array(cells[0]?.length || 3).fill(''))
                setCells(next)
                save(next)
              }}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              ↑ 上に行挿入
            </button>
            <button
              onClick={() => {
                const next = [...cells]
                next.splice(selectedCell.row + 1, 0, Array(cells[0]?.length || 3).fill(''))
                setCells(next)
                save(next)
              }}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              ↓ 下に行挿入
            </button>
            <button
              onClick={() => {
                const next = cells.map(r => { const nr = [...r]; nr.splice(selectedCell.col, 0, ''); return nr })
                setCells(next)
                save(next)
              }}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              ← 左に列挿入
            </button>
            <button
              onClick={() => {
                const next = cells.map(r => { const nr = [...r]; nr.splice(selectedCell.col + 1, 0, ''); return nr })
                setCells(next)
                save(next)
              }}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              → 右に列挿入
            </button>
          </>
        )}
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
