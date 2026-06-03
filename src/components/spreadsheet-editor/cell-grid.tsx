'use client'

import { useRef, useEffect, useCallback, useState, useMemo, memo } from 'react'
import type { Sheet, ConditionalFormat } from '@/types'
import type { SelectionRange } from './spreadsheet-editor'
import type { SpreadsheetAction } from '@/hooks/use-spreadsheet'
import type { UndoableAction } from '@/lib/undoable'
import { colIndexToLetter, formatCellValue } from '@/lib/formula-engine'
import { ChevronDown, Link as LinkIcon, AlertCircle, FileSpreadsheet, Lock, MessageSquare } from 'lucide-react'
import SparklineCell, { parseSparklineMarker } from './sparkline-cell'
import { sanitizeHtml } from '@/lib/sanitize'

// ── Formula error tooltip explanations ──

const FORMULA_ERROR_EXPLANATIONS: Record<string, string> = {
  '#ERROR!': '数式にエラーがあります',
  '#REF!': '参照先のセルが見つかりません',
  '#DIV/0!': '0で除算しています',
  '#NAME?': '関数名が正しくありません',
  '#CIRCULAR!': '循環参照が検出されました',
  '#VALUE!': '値の型が正しくありません',
}

function getFormulaErrorExplanation(value: string | number | undefined): string | null {
  if (typeof value !== 'string') return null
  for (const [errorCode, explanation] of Object.entries(FORMULA_ERROR_EXPLANATIONS)) {
    if (value.startsWith(errorCode.replace(/[!?]$/, ''))) return explanation
  }
  return null
}

// ── Auto-fill sequence patterns ──

const JP_WEEKDAYS = ['月', '火', '水', '木', '金', '土', '日']
const JP_MONTHS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
const EN_WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const EN_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

type SequenceType = 'weekday-jp' | 'month-jp' | 'weekday-en' | 'month-en' | 'date'

function detectSequence(values: string[]): { type: SequenceType; startIndex: number } | null {
  if (values.length === 0) return null
  const sequences: [SequenceType, string[]][] = [
    ['weekday-jp', JP_WEEKDAYS],
    ['month-jp', JP_MONTHS],
    ['weekday-en', EN_WEEKDAYS],
    ['month-en', EN_MONTHS],
  ]
  for (const [type, seq] of sequences) {
    const idx = seq.indexOf(values[0])
    if (idx >= 0) {
      const allMatch = values.every((v, i) => seq[(idx + i) % seq.length] === v)
      if (allMatch) return { type, startIndex: idx }
    }
  }
  // Check date pattern (YYYY/MM/DD)
  const dateMatch = values[0]?.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/)
  if (dateMatch) {
    const allDates = values.every((v) => /^\d{4}\/\d{1,2}\/\d{1,2}$/.test(v))
    if (allDates) return { type: 'date', startIndex: 0 }
  }
  return null
}

function getSequenceFillValue(
  type: SequenceType,
  sourceValues: string[],
  fillIndex: number,
): string {
  const sequences: Record<string, string[]> = {
    'weekday-jp': JP_WEEKDAYS,
    'month-jp': JP_MONTHS,
    'weekday-en': EN_WEEKDAYS,
    'month-en': EN_MONTHS,
  }
  if (type === 'date') {
    const lastDateStr = sourceValues[sourceValues.length - 1]
    const match = lastDateStr.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/)
    if (!match) return lastDateStr
    let dayStep = 1
    if (sourceValues.length > 1) {
      const firstDate = new Date(sourceValues[0].replace(/\//g, '-'))
      const lastDate = new Date(lastDateStr.replace(/\//g, '-'))
      const totalDays = Math.round((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24))
      dayStep = Math.round(totalDays / (sourceValues.length - 1)) || 1
    }
    const baseDate = new Date(lastDateStr.replace(/\//g, '-'))
    const targetDate = new Date(baseDate.getTime() + fillIndex * dayStep * 24 * 60 * 60 * 1000)
    const yyyy = targetDate.getFullYear()
    const mm = String(targetDate.getMonth() + 1).padStart(2, '0')
    const dd = String(targetDate.getDate()).padStart(2, '0')
    return `${yyyy}/${mm}/${dd}`
  }
  const seq = sequences[type]
  if (!seq) return sourceValues[fillIndex % sourceValues.length]
  const startIdx = seq.indexOf(sourceValues[sourceValues.length - 1])
  if (startIdx < 0) return sourceValues[fillIndex % sourceValues.length]
  return seq[(startIdx + fillIndex) % seq.length]
}

/** Parse a hex color into {r,g,b} */
function parseHexColor(hex: string): { r: number; g: number; b: number } {
  const c = hex.replace('#', '')
  return {
    r: parseInt(c.substring(0, 2), 16),
    g: parseInt(c.substring(2, 4), 16),
    b: parseInt(c.substring(4, 6), 16),
  }
}

/** Blend two hex colors. t=0 returns color1, t=1 returns color2. */
function interpolateColor(color1: string, color2: string, t: number): string {
  const c1 = parseHexColor(color1)
  const c2 = parseHexColor(color2)
  const r = Math.round(c1.r + (c2.r - c1.r) * t)
  const g = Math.round(c1.g + (c2.g - c1.g) * t)
  const b = Math.round(c1.b + (c2.b - c1.b) * t)
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

/** 3-stop color gradient: t=0 returns color1, t=0.5 returns color2, t=1 returns color3. */
function interpolateColor3(color1: string, color2: string, color3: string, t: number): string {
  if (t <= 0.5) {
    return interpolateColor(color1, color2, t * 2)
  }
  return interpolateColor(color2, color3, (t - 0.5) * 2)
}

/** Check if a string contains HTML formatting tags */
function isRichText(value: string): boolean {
  return /<(b|i|u|em|strong|s|del|mark|span)\b[^>]*>/i.test(value)
}

/** Strip HTML tags for plain text editing */
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '')
}

/** Detect IMAGE marker and extract URL */
function parseImageMarker(value: string): string | null {
  if (typeof value === 'string' && value.startsWith('__IMAGE__') && value.endsWith('__')) {
    return value.slice(9, -2)
  }
  return null
}

/** Validate a cell value against its DataValidation rule */
function validateCell(
  value: string | number | undefined,
  validation: { type: 'number' | 'text' | 'list' | 'date'; min?: number; max?: number; listValues?: string[]; errorMessage?: string } | undefined,
): boolean {
  if (!validation || value === undefined || value === '') return true
  const strVal = String(value)
  switch (validation.type) {
    case 'number': {
      const n = Number(value)
      if (isNaN(n)) return false
      if (validation.min !== undefined && n < validation.min) return false
      if (validation.max !== undefined && n > validation.max) return false
      return true
    }
    case 'list':
      return !validation.listValues || validation.listValues.includes(strVal)
    case 'text':
      if (validation.min !== undefined && strVal.length < validation.min) return false
      if (validation.max !== undefined && strVal.length > validation.max) return false
      return true
    case 'date': {
      const d = new Date(strVal)
      return !isNaN(d.getTime())
    }
    default:
      return true
  }
}

/** Collect numeric values in a conditional format range */
function getRangeNumericValues(
  cf: ConditionalFormat,
  computedValues: Record<string, string | number>,
): number[] {
  const nums: number[] = []
  for (let r = cf.range.startRow; r <= cf.range.endRow; r++) {
    for (let c = cf.range.startCol; c <= cf.range.endCol; c++) {
      const v = computedValues[`${r}-${c}`]
      const n = typeof v === 'number' ? v : v !== undefined ? Number(v) : NaN
      if (!isNaN(n)) nums.push(n)
    }
  }
  return nums
}

interface FindResult {
  row: number
  col: number
}

interface Props {
  sheet: Sheet
  selectedCell: { row: number; col: number } | null
  selectionRange: SelectionRange | null
  editingCell: { row: number; col: number } | null
  editValue: string
  computedValues: Record<string, string | number>
  onSelectCell: (row: number, col: number, shiftKey?: boolean) => void
  onExtendSelection: (row: number, col: number) => void
  onStartEdit: (row: number, col: number, initialValue?: string) => void
  onEditValueChange: (value: string) => void
  onCommitEdit: () => void
  onCancelEdit: () => void
  onContextMenu: (x: number, y: number) => void
  dispatch: (action: UndoableAction<SpreadsheetAction>) => void
  validationError?: string | null
  onListSelect?: (row: number, col: number, value: string) => void
  formulaReferencedCells?: Set<string>
  /** Color-coded formula reference map: cell key -> color index */
  formulaRefColorMap?: Map<string, number>
  onNavigateToSheet?: (sheetName: string, cellRef: string) => void
  cutRange?: SelectionRange | null
  editInputRef?: React.RefObject<HTMLTextAreaElement | null>
  zoom?: number
  showFormulas?: boolean
  formatPainterActive?: boolean
  findResults?: FindResult[]
  printRange?: { startRow: number; startCol: number; endRow: number; endCol: number } | null
}

const DEFAULT_COL_WIDTH = 100
const DEFAULT_ROW_HEIGHT = 28
const HEADER_WIDTH = 46
const HEADER_HEIGHT = 26

function isCellHidden(row: number, col: number, mergedCells: Sheet['mergedCells']): boolean {
  for (const m of mergedCells) {
    if (
      row >= m.startRow &&
      row < m.startRow + m.rowSpan &&
      col >= m.startCol &&
      col < m.startCol + m.colSpan &&
      !(row === m.startRow && col === m.startCol)
    ) {
      return true
    }
  }
  return false
}

function getMerge(row: number, col: number, mergedCells: Sheet['mergedCells']) {
  return mergedCells.find((m) => m.startRow === row && m.startCol === col)
}

function isInRange(row: number, col: number, range: SelectionRange | null): boolean {
  if (!range) return false
  const minR = Math.min(range.startRow, range.endRow)
  const maxR = Math.max(range.startRow, range.endRow)
  const minC = Math.min(range.startCol, range.endCol)
  const maxC = Math.max(range.startCol, range.endCol)
  return row >= minR && row <= maxR && col >= minC && col <= maxC
}

/** Get selection range edge info for border rendering */
function getSelectionEdges(row: number, col: number, range: SelectionRange | null): { top: boolean; bottom: boolean; left: boolean; right: boolean } {
  if (!range) return { top: false, bottom: false, left: false, right: false }
  const minR = Math.min(range.startRow, range.endRow)
  const maxR = Math.max(range.startRow, range.endRow)
  const minC = Math.min(range.startCol, range.endCol)
  const maxC = Math.max(range.startCol, range.endCol)
  if (row < minR || row > maxR || col < minC || col > maxC) return { top: false, bottom: false, left: false, right: false }
  return {
    top: row === minR,
    bottom: row === maxR,
    left: col === minC,
    right: col === maxC,
  }
}

/** Color palette for formula reference ranges */
const FORMULA_REF_COLORS = [
  { bg: 'rgba(59, 130, 246, 0.12)', border: 'rgb(59, 130, 246)' },    // blue
  { bg: 'rgba(239, 68, 68, 0.12)', border: 'rgb(239, 68, 68)' },      // red
  { bg: 'rgba(16, 185, 129, 0.12)', border: 'rgb(16, 185, 129)' },    // green
  { bg: 'rgba(168, 85, 247, 0.12)', border: 'rgb(168, 85, 247)' },    // purple
  { bg: 'rgba(245, 158, 11, 0.12)', border: 'rgb(245, 158, 11)' },    // amber
  { bg: 'rgba(236, 72, 153, 0.12)', border: 'rgb(236, 72, 153)' },    // pink
]

/** Result of conditional formatting evaluation */
interface ConditionalResult {
  style?: React.CSSProperties
  dataBar?: { ratio: number; color: string }
  iconSet?: { icon: string; color: string }
  colorScale?: { min: number; max: number; value: number; color: string }
}

/** Check conditional formatting rules for a cell */
function getConditionalStyle(
  row: number,
  col: number,
  computedValue: string | number | undefined,
  formats: ConditionalFormat[] | undefined,
  computedValues?: Record<string, string | number>,
): ConditionalResult | undefined {
  if (!formats || formats.length === 0) return undefined
  for (const cf of formats) {
    if (row < cf.range.startRow || row > cf.range.endRow || col < cf.range.startCol || col > cf.range.endCol) continue
    const val = computedValue
    const numVal = typeof val === 'number' ? val : val !== undefined ? Number(val) : NaN
    const ruleStr = cf.rule as string

    // Color Scale (supports 2-color and 3-color gradients)
    if (ruleStr.includes('colorScale') && computedValues) {
      if (isNaN(numVal)) continue
      const nums = getRangeNumericValues(cf, computedValues)
      if (nums.length === 0) continue
      const min = Math.min(...nums)
      const max = Math.max(...nums)
      const t = max === min ? 0.5 : (numVal - min) / (max - min)
      const color1 = cf.values[0] || '#ff0000'
      const color2 = cf.values[1] || (cf.values.length >= 3 ? '#ffff00' : '#00ff00')
      const color3 = cf.values[2] || undefined
      const bgColor = color3
        ? interpolateColor3(color1, color2, color3, t)
        : interpolateColor(color1, color2, t)
      return {
        style: { backgroundColor: bgColor },
        colorScale: { min, max, value: numVal, color: bgColor },
      }
    }

    // Data Bar
    if (ruleStr === 'dataBar' && computedValues) {
      if (isNaN(numVal)) continue
      const nums = getRangeNumericValues(cf, computedValues)
      if (nums.length === 0) continue
      const min = Math.min(...nums)
      const max = Math.max(...nums)
      const ratio = max === min ? 1 : (numVal - min) / (max - min)
      const barColor = cf.values[0] || '#4f46e5'
      return { dataBar: { ratio, color: barColor } }
    }

    // Icon Set
    if (ruleStr === 'iconSet' && computedValues) {
      if (isNaN(numVal)) continue
      const nums = getRangeNumericValues(cf, computedValues)
      if (nums.length === 0) continue
      const sorted = [...nums].sort((a, b) => a - b)
      const rank = sorted.filter((n) => n <= numVal).length
      const percentile = rank / sorted.length
      let icon: string
      let color: string
      if (percentile > 0.666) {
        icon = '▲'
        color = '#22c55e'
      } else if (percentile > 0.333) {
        icon = '►'
        color = '#eab308'
      } else {
        icon = '▼'
        color = '#ef4444'
      }
      return { iconSet: { icon, color } }
    }

    let match = false
    switch (cf.rule) {
      case 'greaterThan':
        match = !isNaN(numVal) && numVal > Number(cf.values[0])
        break
      case 'lessThan':
        match = !isNaN(numVal) && numVal < Number(cf.values[0])
        break
      case 'equalTo':
        match = String(val) === cf.values[0] || (!isNaN(numVal) && numVal === Number(cf.values[0]))
        break
      case 'between':
        match = !isNaN(numVal) && numVal >= Number(cf.values[0]) && numVal <= Number(cf.values[1])
        break
      case 'textContains':
        match = typeof val === 'string' && val.includes(cf.values[0])
        break
      case 'isEmpty':
        match = val === undefined || val === ''
        break
      case 'isNotEmpty':
        match = val !== undefined && val !== ''
        break
      case 'topN': {
        if (!computedValues || isNaN(numVal)) break
        const topNums = getRangeNumericValues(cf, computedValues)
        const n1 = Number(cf.values[0]) || 10
        const topSorted = [...topNums].sort((a, b) => b - a)
        const topThreshold = topSorted[Math.min(n1, topSorted.length) - 1]
        match = topThreshold !== undefined && numVal >= topThreshold
        break
      }
      case 'bottomN': {
        if (!computedValues || isNaN(numVal)) break
        const botNums = getRangeNumericValues(cf, computedValues)
        const n2 = Number(cf.values[0]) || 10
        const botSorted = [...botNums].sort((a, b) => a - b)
        const botThreshold = botSorted[Math.min(n2, botSorted.length) - 1]
        match = botThreshold !== undefined && numVal <= botThreshold
        break
      }
      case 'aboveAverage': {
        if (!computedValues || isNaN(numVal)) break
        const avgNums = getRangeNumericValues(cf, computedValues)
        if (avgNums.length === 0) break
        const avg = avgNums.reduce((s, v) => s + v, 0) / avgNums.length
        match = numVal > avg
        break
      }
      case 'belowAverage': {
        if (!computedValues || isNaN(numVal)) break
        const bavgNums = getRangeNumericValues(cf, computedValues)
        if (bavgNums.length === 0) break
        const bavg = bavgNums.reduce((s, v) => s + v, 0) / bavgNums.length
        match = numVal < bavg
        break
      }
      case 'duplicate': {
        if (!computedValues || val === undefined || val === '') break
        const strVal = String(val)
        let dupCount = 0
        for (let r = cf.range.startRow; r <= cf.range.endRow; r++) {
          for (let c = cf.range.startCol; c <= cf.range.endCol; c++) {
            const v = computedValues[`${r}-${c}`]
            if (v !== undefined && String(v) === strVal) dupCount++
          }
        }
        match = dupCount > 1
        break
      }
      case 'unique': {
        if (!computedValues || val === undefined || val === '') break
        const uStrVal = String(val)
        let uCount = 0
        for (let r = cf.range.startRow; r <= cf.range.endRow; r++) {
          for (let c = cf.range.startCol; c <= cf.range.endCol; c++) {
            const v = computedValues[`${r}-${c}`]
            if (v !== undefined && String(v) === uStrVal) uCount++
          }
        }
        match = uCount === 1
        break
      }
    }
    if (match) {
      const s: React.CSSProperties = {}
      if (cf.style.bgColor) s.backgroundColor = cf.style.bgColor
      if (cf.style.textColor) s.color = cf.style.textColor
      if (cf.style.bold) s.fontWeight = 'bold'
      return { style: s }
    }
  }
  return undefined
}

/** Sub-component for list dropdown with optional search */
function ListDropdownContent({
  listValues,
  hasSearch,
  displayValue,
  onSelect,
  onClose,
}: {
  listValues: string[]
  hasSearch: boolean
  displayValue: string
  onSelect: (val: string) => void
  onClose: () => void
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const filtered = hasSearch && searchQuery
    ? listValues.filter((v) => v.toLowerCase().includes(searchQuery.toLowerCase()))
    : listValues
  return (
    <div className="absolute top-full left-0 mt-0.5 z-40 bg-slate-800 border border-slate-600 rounded shadow-xl min-w-[160px] max-h-52 flex flex-col py-0.5">
      {hasSearch && (
        <div className="px-1.5 py-1 border-b border-slate-700">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            placeholder="検索..."
            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-xs text-white outline-none placeholder-slate-500 focus:border-indigo-500"
            autoFocus
          />
        </div>
      )}
      <div className="overflow-y-auto flex-1">
        {filtered.map((val) => (
          <button
            key={val}
            onClick={(e) => {
              e.stopPropagation()
              onSelect(val)
            }}
            className={`w-full text-left px-2 py-1 text-xs hover:bg-indigo-600 hover:text-white transition-colors ${
              displayValue === val ? 'text-indigo-400 bg-slate-700' : 'text-slate-300'
            }`}
          >
            {val}
          </button>
        ))}
        {filtered.length === 0 && (
          <div className="px-2 py-2 text-xs text-slate-500 text-center">一致なし</div>
        )}
      </div>
    </div>
  )
}

export default memo(function CellGrid({
  sheet,
  selectedCell,
  selectionRange,
  editingCell,
  editValue,
  computedValues,
  onSelectCell,
  onExtendSelection,
  onStartEdit,
  onEditValueChange,
  onCommitEdit,
  onCancelEdit,
  onContextMenu,
  dispatch,
  validationError,
  onListSelect,
  formulaReferencedCells,
  formulaRefColorMap,
  onNavigateToSheet,
  cutRange,
  editInputRef: externalEditInputRef,
  zoom,
  showFormulas,
  formatPainterActive,
  findResults,
  printRange,
}: Props) {
  const internalEditInputRef = useRef<HTMLTextAreaElement>(null)
  const editInputRef = externalEditInputRef || internalEditInputRef
  const [isDragging, setIsDragging] = useState(false)
  const [isFillDragging, setIsFillDragging] = useState(false)
  const [fillTarget, setFillTarget] = useState<{ row: number; col: number } | null>(null)
  const [resizingCol, setResizingCol] = useState<number | null>(null)
  const [resizingRow, setResizingRow] = useState<number | null>(null)
  const resizeStartRef = useRef<{ pos: number; size: number }>({ pos: 0, size: 0 })
  const [filterDropdown, setFilterDropdown] = useState<{ col: number } | null>(null)
  const [listDropdown, setListDropdown] = useState<{ row: number; col: number } | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [viewportHeight, setViewportHeight] = useState(800)

  // Build a set of find result keys for O(1) lookup
  const findResultKeys = useMemo(() => {
    if (!findResults || findResults.length === 0) return null
    const keys = new Set<string>()
    for (const fr of findResults) keys.add(`${fr.row}-${fr.col}`)
    return keys
  }, [findResults])

  const frozenRows = sheet.frozenRows ?? 0
  const frozenCols = sheet.frozenCols ?? 0
  const hasFilter = !!(sheet.filterState && sheet.filterState.length > 0)
  const hiddenRows = sheet.hiddenRows ?? []
  const hiddenCols = sheet.hiddenCols ?? []

  useEffect(() => {
    if (editingCell && editInputRef.current) {
      editInputRef.current.focus()
    }
  }, [editingCell])

  const getColWidth = useCallback((col: number) => sheet.colWidths[col] || DEFAULT_COL_WIDTH, [sheet.colWidths])
  const getRowHeight = useCallback((row: number) => sheet.rowHeights[row] || DEFAULT_ROW_HEIGHT, [sheet.rowHeights])

  // Compute cumulative column left positions for frozen pane sticky
  const colLeftPositions = useMemo(() => {
    const pos: number[] = []
    let x = HEADER_WIDTH
    for (let c = 0; c < sheet.colCount; c++) {
      pos.push(x)
      x += getColWidth(c)
    }
    return pos
  }, [sheet.colCount, getColWidth])

  // Compute cumulative row top positions for frozen pane sticky
  const rowTopPositions = useMemo(() => {
    const pos: number[] = []
    let y = HEADER_HEIGHT
    for (let r = 0; r < sheet.rowCount; r++) {
      pos.push(y)
      y += getRowHeight(r)
    }
    return pos
  }, [sheet.rowCount, getRowHeight])

  // Unique values per column for filter dropdown
  const getUniqueValues = useCallback(
    (col: number): string[] => {
      const vals = new Set<string>()
      for (let r = 0; r < sheet.rowCount; r++) {
        const key = `${r}-${col}`
        const cv = computedValues[key]
        if (cv !== undefined && cv !== '') vals.add(String(cv))
      }
      return Array.from(vals).sort()
    },
    [sheet.rowCount, computedValues],
  )

  // Determine which rows are visible given active filters
  const visibleRows = useMemo(() => {
    if (!sheet.filterState || sheet.filterState.length === 0) return null // all visible
    const activeFilters = sheet.filterState.filter((f) => f.values.length > 0)
    if (activeFilters.length === 0) return null
    const hidden = new Set<number>()
    for (let r = 0; r < sheet.rowCount; r++) {
      for (const f of activeFilters) {
        const key = `${r}-${f.col}`
        const val = computedValues[key] !== undefined ? String(computedValues[key]) : ''
        if (!f.values.includes(val)) {
          hidden.add(r)
          break
        }
      }
    }
    return hidden
  }, [sheet.filterState, sheet.rowCount, computedValues])

  // Selection status bar
  const selectionStats = useMemo(() => {
    const range =
      selectionRange ||
      (selectedCell
        ? {
            startRow: selectedCell.row,
            startCol: selectedCell.col,
            endRow: selectedCell.row,
            endCol: selectedCell.col,
          }
        : null)
    if (!range) return null
    let count = 0
    let sum = 0
    let numCount = 0
    for (let r = range.startRow; r <= range.endRow; r++) {
      for (let c = range.startCol; c <= range.endCol; c++) {
        count++
        const cv = computedValues[`${r}-${c}`]
        if (cv !== undefined && cv !== '') {
          const n = Number(cv)
          if (!isNaN(n)) {
            sum += n
            numCount++
          }
        }
      }
    }
    return { count, sum, avg: numCount > 0 ? sum / numCount : 0, numCount }
  }, [selectionRange, selectedCell, computedValues])

  // Mouse handlers for drag selection
  const handleMouseDown = useCallback(
    (e: React.MouseEvent, row: number, col: number) => {
      if (e.button === 2) return
      // Prevent textarea blur when in formula mode (clicking to insert cell reference)
      if (editingCell && editValue.startsWith('=')) {
        e.preventDefault()
      }
      if (e.shiftKey) {
        onSelectCell(row, col, true)
      } else {
        onSelectCell(row, col)
      }
      setIsDragging(true)
    },
    [onSelectCell, onExtendSelection, editingCell, editValue],
  )

  const handleMouseEnter = useCallback(
    (row: number, col: number) => {
      if (isDragging) {
        onExtendSelection(row, col)
      }
      if (isFillDragging) {
        setFillTarget({ row, col })
      }
    },
    [isDragging, isFillDragging, onExtendSelection],
  )

  useEffect(() => {
    function handleMouseUp() {
      setIsDragging(false)
      if (isFillDragging && fillTarget && selectedCell) {
        // Perform auto-fill from selection to fillTarget
        const range = selectionRange || { startRow: selectedCell.row, startCol: selectedCell.col, endRow: selectedCell.row, endCol: selectedCell.col }
        const normRange = {
          startRow: Math.min(range.startRow, range.endRow),
          startCol: Math.min(range.startCol, range.endCol),
          endRow: Math.max(range.startRow, range.endRow),
          endCol: Math.max(range.startCol, range.endCol),
        }
        // Fill downward
        if (fillTarget.row > normRange.endRow) {
          for (let c = normRange.startCol; c <= normRange.endCol; c++) {
            const sourceValues: string[] = []
            for (let r = normRange.startRow; r <= normRange.endRow; r++) {
              sourceValues.push(sheet.cells[`${r}-${c}`]?.value ?? '')
            }
            // Check for sequence patterns (weekdays, months, dates)
            const seq = detectSequence(sourceValues)
            for (let r = normRange.endRow + 1; r <= fillTarget.row; r++) {
              let fillVal: string
              if (seq) {
                fillVal = getSequenceFillValue(seq.type, sourceValues, r - normRange.endRow)
              } else {
                const idx = (r - normRange.endRow - 1) % sourceValues.length
                const srcVal = sourceValues[idx]
                const srcNum = Number(srcVal)
                fillVal = srcVal
                // Detect numeric pattern: if all source values are numbers, increment
                if (sourceValues.length === 1 && !isNaN(srcNum) && srcVal !== '') {
                  fillVal = String(srcNum + (r - normRange.endRow))
                } else if (sourceValues.every((v) => !isNaN(Number(v)) && v !== '') && sourceValues.length > 1) {
                  const diff = Number(sourceValues[1]) - Number(sourceValues[0])
                  fillVal = String(Number(sourceValues[sourceValues.length - 1]) + diff * (r - normRange.endRow))
                }
              }
              dispatch({
                type: 'SET_CELL_VALUE',
                sheetId: sheet.id,
                row: r,
                col: c,
                value: fillVal,
              })
            }
          }
        }
        // Fill rightward
        if (fillTarget.col > normRange.endCol) {
          for (let r = normRange.startRow; r <= normRange.endRow; r++) {
            const sourceValues: string[] = []
            for (let c = normRange.startCol; c <= normRange.endCol; c++) {
              sourceValues.push(sheet.cells[`${r}-${c}`]?.value ?? '')
            }
            // Check for sequence patterns (weekdays, months, dates)
            const seq = detectSequence(sourceValues)
            for (let c = normRange.endCol + 1; c <= fillTarget.col; c++) {
              let fillVal: string
              if (seq) {
                fillVal = getSequenceFillValue(seq.type, sourceValues, c - normRange.endCol)
              } else {
                const idx = (c - normRange.endCol - 1) % sourceValues.length
                const srcVal = sourceValues[idx]
                const srcNum = Number(srcVal)
                fillVal = srcVal
                if (sourceValues.length === 1 && !isNaN(srcNum) && srcVal !== '') {
                  fillVal = String(srcNum + (c - normRange.endCol))
                } else if (sourceValues.every((v) => !isNaN(Number(v)) && v !== '') && sourceValues.length > 1) {
                  const diff = Number(sourceValues[1]) - Number(sourceValues[0])
                  fillVal = String(Number(sourceValues[sourceValues.length - 1]) + diff * (c - normRange.endCol))
                }
              }
              dispatch({
                type: 'SET_CELL_VALUE',
                sheetId: sheet.id,
                row: r,
                col: c,
                value: fillVal,
              })
            }
          }
        }
        setIsFillDragging(false)
        setFillTarget(null)
      }
    }
    window.addEventListener('mouseup', handleMouseUp)
    return () => window.removeEventListener('mouseup', handleMouseUp)
  }, [isFillDragging, fillTarget, selectedCell, selectionRange, sheet.cells, sheet.id, dispatch])

  // Fill handle drag: track which cell the mouse is over
  const handleFillMouseEnter = useCallback(
    (row: number, col: number) => {
      if (isFillDragging) {
        setFillTarget({ row, col })
      }
    },
    [isFillDragging],
  )

  const handleFillHandleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsFillDragging(true)
  }, [])

  // Column resize handlers
  const handleColResizeStart = useCallback(
    (e: React.MouseEvent, col: number) => {
      e.preventDefault()
      e.stopPropagation()
      setResizingCol(col)
      resizeStartRef.current = { pos: e.clientX, size: getColWidth(col) }

      function onMouseMove(ev: MouseEvent) {
        const delta = ev.clientX - resizeStartRef.current.pos
        const newWidth = Math.max(40, resizeStartRef.current.size + delta)
        dispatch({ type: 'SET_COL_WIDTH', sheetId: sheet.id, col, width: newWidth })
      }
      function onMouseUp() {
        setResizingCol(null)
        window.removeEventListener('mousemove', onMouseMove)
        window.removeEventListener('mouseup', onMouseUp)
      }
      window.addEventListener('mousemove', onMouseMove)
      window.addEventListener('mouseup', onMouseUp)
    },
    [sheet.id, dispatch, getColWidth],
  )

  // Column auto-fit on double-click
  const handleColAutoFit = useCallback(
    (col: number) => {
      // Calculate optimal width based on content
      const headerText = colIndexToLetter(col)
      let maxWidth = Math.max(headerText.length * 8 + 16, 60)

      for (let r = 0; r < sheet.rowCount; r++) {
        const key = `${r}-${col}`
        const cell = sheet.cells[key]
        const computed = computedValues[key]
        if (computed !== undefined && computed !== '') {
          const textWidth = computed.toString().length * 8 + 16
          maxWidth = Math.max(maxWidth, textWidth)
        } else if (cell?.value) {
          const textWidth = cell.value.length * 8 + 16
          maxWidth = Math.max(maxWidth, textWidth)
        }
      }

      // Cap at 400px
      maxWidth = Math.min(maxWidth, 400)

      dispatch({ type: 'SET_COL_WIDTH', sheetId: sheet.id, col, width: maxWidth })
    },
    [sheet.id, sheet.rowCount, sheet.cells, computedValues, dispatch],
  )

  // Row resize handlers
  const handleRowResizeStart = useCallback(
    (e: React.MouseEvent, row: number) => {
      e.preventDefault()
      e.stopPropagation()
      setResizingRow(row)
      resizeStartRef.current = { pos: e.clientY, size: getRowHeight(row) }

      function onMouseMove(ev: MouseEvent) {
        const delta = ev.clientY - resizeStartRef.current.pos
        const newHeight = Math.max(20, resizeStartRef.current.size + delta)
        dispatch({ type: 'SET_ROW_HEIGHT', sheetId: sheet.id, row, height: newHeight })
      }
      function onMouseUp() {
        setResizingRow(null)
        window.removeEventListener('mousemove', onMouseMove)
        window.removeEventListener('mouseup', onMouseUp)
      }
      window.addEventListener('mousemove', onMouseMove)
      window.addEventListener('mouseup', onMouseUp)
    },
    [sheet.id, dispatch, getRowHeight],
  )

  // Row auto-fit on double-click
  const handleRowAutoFit = useCallback(
    (row: number) => {
      let maxHeight = DEFAULT_ROW_HEIGHT

      for (let c = 0; c < sheet.colCount; c++) {
        const key = `${row}-${c}`
        const cell = sheet.cells[key]
        const computed = computedValues[key]
        const text = computed !== undefined ? String(computed) : cell?.value || ''
        if (!text) continue

        const colW = getColWidth(c)
        const wrap = cell?.format?.wrap

        if (text.includes('\n')) {
          const lineCount = text.split('\n').length
          const lineHeight = Math.max(lineCount * 18 + 8, DEFAULT_ROW_HEIGHT)
          maxHeight = Math.max(maxHeight, lineHeight)
        }

        if (wrap) {
          const charsPerLine = Math.max(1, Math.floor((colW - 8) / 7))
          const wrappedLines = Math.ceil(text.length / charsPerLine)
          const wrappedHeight = Math.max(wrappedLines * 18 + 8, DEFAULT_ROW_HEIGHT)
          maxHeight = Math.max(maxHeight, wrappedHeight)
        }
      }

      maxHeight = Math.min(maxHeight, 400)
      dispatch({ type: 'SET_ROW_HEIGHT', sheetId: sheet.id, row, height: maxHeight })
    },
    [sheet.id, sheet.colCount, sheet.cells, computedValues, dispatch, getColWidth],
  )

  // Select entire column
  const handleSelectColumn = useCallback(
    (col: number) => {
      onSelectCell(0, col)
      onExtendSelection(sheet.rowCount - 1, col)
    },
    [onSelectCell, onExtendSelection, sheet.rowCount],
  )

  // Select entire row
  const handleSelectRow = useCallback(
    (row: number) => {
      onSelectCell(row, 0)
      onExtendSelection(row, sheet.colCount - 1)
    },
    [onSelectCell, onExtendSelection, sheet.colCount],
  )

  // Select all
  const handleSelectAll = useCallback(() => {
    onSelectCell(0, 0)
    onExtendSelection(sheet.rowCount - 1, sheet.colCount - 1)
  }, [onSelectCell, onExtendSelection, sheet.rowCount, sheet.colCount])

  // Virtual scroll: compute visible rows (item 38)
  const VIRTUAL_BUFFER = 5
  const totalTableHeight = useMemo(() => {
    let h = HEADER_HEIGHT
    for (let r = 0; r < sheet.rowCount; r++) {
      if (hiddenRows.includes(r)) continue
      if (visibleRows && visibleRows.has(r)) continue
      h += getRowHeight(r)
    }
    return h
  }, [sheet.rowCount, getRowHeight, hiddenRows, visibleRows])

  const visibleRowRange = useMemo(() => {
    // Find the first and last visible rows based on scroll position
    let cumH = HEADER_HEIGHT
    let startRow = 0
    let endRow = sheet.rowCount - 1
    let foundStart = false
    for (let r = 0; r < sheet.rowCount; r++) {
      if (hiddenRows.includes(r)) continue
      if (visibleRows && visibleRows.has(r)) continue
      const rh = getRowHeight(r)
      if (!foundStart && cumH + rh > scrollTop) {
        startRow = r
        foundStart = true
      }
      if (cumH > scrollTop + viewportHeight) {
        endRow = r
        break
      }
      cumH += rh
    }
    return {
      startRow: Math.max(0, startRow - VIRTUAL_BUFFER),
      endRow: Math.min(sheet.rowCount - 1, endRow + VIRTUAL_BUFFER),
    }
  }, [scrollTop, viewportHeight, sheet.rowCount, getRowHeight, hiddenRows, visibleRows])

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop)
  }, [])

  useEffect(() => {
    if (scrollContainerRef.current) {
      setViewportHeight(scrollContainerRef.current.clientHeight)
    }
  }, [])

  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return
    const obs = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setViewportHeight(entry.contentRect.height)
      }
    })
    obs.observe(container)
    return () => obs.disconnect()
  }, [])

  // Shift+Ctrl+Arrow selection extension (item 33)
  const findLastNonEmptyCell = useCallback(
    (startRow: number, startCol: number, direction: 'up' | 'down' | 'left' | 'right'): { row: number; col: number } => {
      let r = startRow
      let c = startCol
      const step = direction === 'down' || direction === 'right' ? 1 : -1
      const isVertical = direction === 'up' || direction === 'down'

      // If current cell is non-empty, skip to next empty then find next non-empty
      // If current cell is empty, find the next non-empty
      const currentKey = `${r}-${c}`
      const currentVal = computedValues[currentKey]
      const currentIsEmpty = currentVal === undefined || currentVal === ''

      if (isVertical) {
        if (currentIsEmpty) {
          // Find next non-empty
          r += step
          while (r >= 0 && r < sheet.rowCount) {
            const v = computedValues[`${r}-${c}`]
            if (v !== undefined && v !== '') return { row: r, col: c }
            r += step
          }
          return { row: Math.max(0, Math.min(sheet.rowCount - 1, r - step + (step > 0 ? 0 : 0))), col: c }
        } else {
          // Skip non-empty, then find last non-empty in contiguous block
          r += step
          while (r >= 0 && r < sheet.rowCount) {
            const v = computedValues[`${r}-${c}`]
            if (v === undefined || v === '') {
              return { row: r - step, col: c }
            }
            r += step
          }
          return { row: step > 0 ? sheet.rowCount - 1 : 0, col: c }
        }
      } else {
        if (currentIsEmpty) {
          c += step
          while (c >= 0 && c < sheet.colCount) {
            const v = computedValues[`${r}-${c}`]
            if (v !== undefined && v !== '') return { row: r, col: c }
            c += step
          }
          return { row: r, col: Math.max(0, Math.min(sheet.colCount - 1, c - step)) }
        } else {
          c += step
          while (c >= 0 && c < sheet.colCount) {
            const v = computedValues[`${r}-${c}`]
            if (v === undefined || v === '') {
              return { row: r, col: c - step }
            }
            c += step
          }
          return { row: r, col: step > 0 ? sheet.colCount - 1 : 0 }
        }
      }
    },
    [computedValues, sheet.rowCount, sheet.colCount],
  )

  // Handle Shift+Ctrl+Arrow key for selection extension
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!selectedCell) return
      if (!e.shiftKey || !e.ctrlKey) return
      const arrows = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']
      if (!arrows.includes(e.key)) return
      e.preventDefault()

      const anchor = selectionRange
        ? { row: selectionRange.startRow, col: selectionRange.startCol }
        : selectedCell

      const movingEnd = selectionRange
        ? { row: selectionRange.endRow, col: selectionRange.endCol }
        : selectedCell

      const dirMap: Record<string, 'up' | 'down' | 'left' | 'right'> = {
        ArrowUp: 'up',
        ArrowDown: 'down',
        ArrowLeft: 'left',
        ArrowRight: 'right',
      }
      const target = findLastNonEmptyCell(movingEnd.row, movingEnd.col, dirMap[e.key])
      onSelectCell(anchor.row, anchor.col)
      onExtendSelection(target.row, target.col)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedCell, selectionRange, findLastNonEmptyCell, onSelectCell, onExtendSelection])

  // Fill direction hint
  const fillDirection = useMemo<'down' | 'right' | null>(() => {
    if (!isFillDragging || !fillTarget || !selectedCell) return null
    const range = selectionRange || { startRow: selectedCell.row, startCol: selectedCell.col, endRow: selectedCell.row, endCol: selectedCell.col }
    const normRange = {
      startRow: Math.min(range.startRow, range.endRow),
      startCol: Math.min(range.startCol, range.endCol),
      endRow: Math.max(range.startRow, range.endRow),
      endCol: Math.max(range.startCol, range.endCol),
    }
    const dRow = fillTarget.row - normRange.endRow
    const dCol = fillTarget.col - normRange.endCol
    if (dRow > 0 && dRow >= dCol) return 'down'
    if (dCol > 0) return 'right'
    return null
  }, [isFillDragging, fillTarget, selectedCell, selectionRange])

  // Compute fill range for highlighting
  const fillRange = useMemo(() => {
    if (!isFillDragging || !fillTarget || !selectedCell) return null
    const range = selectionRange || { startRow: selectedCell.row, startCol: selectedCell.col, endRow: selectedCell.row, endCol: selectedCell.col }
    const normRange = {
      startRow: Math.min(range.startRow, range.endRow),
      startCol: Math.min(range.startCol, range.endCol),
      endRow: Math.max(range.startRow, range.endRow),
      endCol: Math.max(range.startCol, range.endCol),
    }
    return {
      startRow: normRange.endRow + 1,
      startCol: normRange.startCol,
      endRow: Math.max(normRange.endRow, fillTarget.row),
      endCol: Math.max(normRange.endCol, fillTarget.col),
    }
  }, [isFillDragging, fillTarget, selectedCell, selectionRange])

  // Bottom-right cell of current selection (for fill handle placement)
  const selectionBottomRight = useMemo(() => {
    if (!selectedCell) return null
    if (selectionRange) {
      return {
        row: Math.max(selectionRange.startRow, selectionRange.endRow),
        col: Math.max(selectionRange.startCol, selectionRange.endCol),
      }
    }
    return { row: selectedCell.row, col: selectedCell.col }
  }, [selectedCell, selectionRange])

  // Compute frozen area sizes
  const _frozenColsWidth = useMemo(() => {
    let w = 0
    for (let c = 0; c < frozenCols; c++) w += getColWidth(c)
    return w
  }, [frozenCols, getColWidth])

  const _frozenRowsHeight = useMemo(() => {
    let h = 0
    for (let r = 0; r < frozenRows; r++) h += getRowHeight(r)
    return h
  }, [frozenRows, getRowHeight])

  const zoomScale = (zoom || 100) / 100

  return (
    <div
      className="w-full h-full flex flex-col relative select-none"
      style={{ cursor: resizingCol !== null ? 'col-resize' : resizingRow !== null ? 'row-resize' : formatPainterActive ? 'copy' : undefined }}
    >
      <div className="flex-1 overflow-auto relative" ref={scrollContainerRef} onScroll={handleScroll}>
       <div style={{ width: `${100 / zoomScale}%`, height: `${100 / zoomScale}%` }}>
        <div style={{ transform: `scale(${zoomScale})`, transformOrigin: 'top left' }}>
        <table
          className="border-collapse"
          style={{ tableLayout: 'fixed' }}
          role="grid"
          aria-rowcount={sheet.rowCount}
          aria-colcount={sheet.colCount}
          aria-label="スプレッドシート"
        >
          <colgroup>
            <col style={{ width: HEADER_WIDTH }} />
            {Array.from({ length: sheet.colCount }, (_, c) => (
              <col key={c} style={hiddenCols.includes(c) ? { width: 0, display: 'none' } : { width: getColWidth(c) }} />
            ))}
          </colgroup>

          {/* Column headers */}
          <thead>
            <tr role="row" style={{ height: HEADER_HEIGHT }}>
              <th
                role="columnheader"
                className="sticky top-0 left-0 z-30 bg-slate-800 border-b border-r border-slate-700 text-[10px] text-slate-500 cursor-pointer hover:bg-slate-700"
                onClick={handleSelectAll}
                title="全選択"
                aria-label="全選択"
              />
              {Array.from({ length: sheet.colCount }, (_, c) => {
                const isFrozenCol = c < frozenCols
                return (
                  <th
                    key={c}
                    role="columnheader"
                    aria-colindex={c + 1}
                    className={`sticky top-0 ${isFrozenCol ? 'z-30' : 'z-20'} bg-slate-800 border-b border-r border-slate-700 text-[10px] font-medium text-slate-400 relative select-none ${
                      selectedCell?.col === c || (selectionRange && c >= Math.min(selectionRange.startCol, selectionRange.endCol) && c <= Math.max(selectionRange.startCol, selectionRange.endCol)) ? 'bg-indigo-900/40 text-indigo-300 font-bold' : ''
                    }${c === frozenCols - 1 ? ' border-r-2 border-r-indigo-500' : ''}`}
                    style={isFrozenCol ? { position: 'sticky', left: colLeftPositions[c], zIndex: 31 } : undefined}
                    onClick={() => handleSelectColumn(c)}
                  >
                    <span className="flex items-center justify-center gap-0.5">
                      {colIndexToLetter(c)}
                      {/* Auto-filter dropdown arrow */}
                      {hasFilter && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setFilterDropdown(filterDropdown?.col === c ? null : { col: c })
                          }}
                          className="w-3.5 h-3.5 flex items-center justify-center rounded hover:bg-slate-600"
                          title="フィルター"
                        >
                          <ChevronDown size={10} />
                        </button>
                      )}
                    </span>
                    {/* Resize handle */}
                    <div
                      className="absolute top-0 right-[-3px] bottom-0 w-[6px] cursor-col-resize hover:bg-indigo-500/60 z-10"
                      onMouseDown={(e) => handleColResizeStart(e, c)}
                      onDoubleClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        handleColAutoFit(c)
                      }}
                    />
                    {/* Filter dropdown */}
                    {filterDropdown?.col === c && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setFilterDropdown(null)} />
                        <div className="absolute top-full left-0 mt-1 z-50 bg-slate-800 border border-slate-700 rounded-lg shadow-xl w-44 py-1 max-h-60 overflow-y-auto text-left">
                          <button
                            onClick={() => {
                              dispatch({ type: 'SET_FILTER', sheetId: sheet.id, col: c, values: [] })
                              setFilterDropdown(null)
                            }}
                            className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700 hover:text-white"
                          >
                            すべて表示
                          </button>
                          <div className="border-t border-slate-700 my-1" />
                          {getUniqueValues(c).map((val) => {
                            const currentFilter = sheet.filterState?.find((f) => f.col === c)
                            const isChecked =
                              !currentFilter || currentFilter.values.length === 0 || currentFilter.values.includes(val)
                            return (
                              <label
                                key={val}
                                className="flex items-center gap-2 px-3 py-1 text-xs text-slate-300 hover:bg-slate-700 cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {
                                    const current = sheet.filterState?.find((f) => f.col === c)?.values || []
                                    let newValues: string[]
                                    if (current.length === 0) {
                                      // Currently showing all, so deselect this one
                                      newValues = getUniqueValues(c).filter((v) => v !== val)
                                    } else if (current.includes(val)) {
                                      newValues = current.filter((v) => v !== val)
                                    } else {
                                      newValues = [...current, val]
                                    }
                                    dispatch({ type: 'SET_FILTER', sheetId: sheet.id, col: c, values: newValues })
                                  }}
                                  className="w-3 h-3 accent-indigo-500"
                                />
                                <span className="truncate">{val || '(空白)'}</span>
                              </label>
                            )
                          })}
                        </div>
                      </>
                    )}
                  </th>
                )
              })}
            </tr>
          </thead>

          <tbody>
            {/* Virtual scroll spacer for rows above visible range */}
            {visibleRowRange.startRow > 0 && (
              <tr>
                <td
                  colSpan={sheet.colCount + 1}
                  style={{
                    height: (() => {
                      let h = 0
                      for (let r = 0; r < visibleRowRange.startRow; r++) {
                        if (hiddenRows.includes(r)) continue
                        if (visibleRows && visibleRows.has(r)) continue
                        h += getRowHeight(r)
                      }
                      return h
                    })(),
                    padding: 0,
                    border: 'none',
                  }}
                />
              </tr>
            )}
            {Array.from({ length: sheet.rowCount }, (_, r) => {
              // Skip filtered-out rows
              if (visibleRows && visibleRows.has(r)) return null

              // Virtual scroll: skip rows outside visible range (but always render frozen rows)
              if (r >= frozenRows && (r < visibleRowRange.startRow || r > visibleRowRange.endRow)) return null

              const isFrozenRow = r < frozenRows
              const rowH = getRowHeight(r)
              const isEvenRow = r % 2 === 0

              return (
                <tr key={r} role="row" aria-rowindex={r + 1} style={{ height: rowH }}>
                  {/* Row header */}
                  <td
                    className={`sticky left-0 z-10 bg-slate-800 border-b border-r border-slate-700 text-[10px] font-medium text-slate-400 text-center select-none relative cursor-pointer hover:bg-slate-700 ${
                      selectedCell?.row === r || (selectionRange && r >= Math.min(selectionRange.startRow, selectionRange.endRow) && r <= Math.max(selectionRange.startRow, selectionRange.endRow)) ? 'bg-indigo-900/40 text-indigo-300 font-bold' : ''
                    }${r === frozenRows - 1 ? ' border-b-2 border-b-indigo-500' : ''}`}
                    style={isFrozenRow ? { position: 'sticky', top: rowTopPositions[r], zIndex: 21 } : undefined}
                    onClick={() => handleSelectRow(r)}
                  >
                    {r + 1}
                    {/* Row resize handle */}
                    <div
                      className="absolute bottom-0 left-0 right-0 h-1 cursor-row-resize hover:bg-indigo-500 z-10"
                      onMouseDown={(e) => handleRowResizeStart(e, r)}
                      onDoubleClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        handleRowAutoFit(r)
                      }}
                    />
                  </td>

                  {/* Data cells */}
                  {Array.from({ length: sheet.colCount }, (_, c) => {
                    if (isCellHidden(r, c, sheet.mergedCells)) return null
                    const merge = getMerge(r, c, sheet.mergedCells)
                    const key = `${r}-${c}`
                    const cell = sheet.cells[key]
                    const computed = computedValues[key]
                    const isSelected = selectedCell?.row === r && selectedCell?.col === c
                    const isEditing = editingCell?.row === r && editingCell?.col === c
                    const inRange = isInRange(r, c, selectionRange)
                    const inCutRange = isInRange(r, c, cutRange || null)
                    const fmt = cell?.format || {}
                    const isFrozenCol = c < frozenCols

                    const displayValue = showFormulas && cell?.value
                      ? cell.value
                      : computed !== undefined ? formatCellValue(computed, fmt) : ''

                    // Build text decoration
                    const textDecorations: string[] = []
                    if (fmt.underline) textDecorations.push('underline')
                    if (fmt.strikethrough) textDecorations.push('line-through')

                    const cellStyle: React.CSSProperties = {
                      fontWeight: fmt.bold ? 'bold' : undefined,
                      fontStyle: fmt.italic ? 'italic' : undefined,
                      textDecoration: textDecorations.length > 0 ? textDecorations.join(' ') : undefined,
                      color: fmt.textColor || undefined,
                      backgroundColor: fmt.bgColor || (isEvenRow ? 'rgba(15, 23, 42, 0.03)' : undefined),
                      textAlign: fmt.align || 'left',
                      verticalAlign: fmt.verticalAlign || 'middle',
                      fontSize: fmt.fontSize ? `${fmt.fontSize}px` : '12px',
                      fontFamily: fmt.fontFamily || undefined,
                      whiteSpace: fmt.wrap ? 'pre-wrap' : 'nowrap',
                      wordBreak: fmt.wrap ? 'break-word' : undefined,
                      overflow: fmt.wrap ? 'visible' : undefined,
                      borderTop: fmt.borderTop || undefined,
                      borderRight: fmt.borderRight || undefined,
                      borderBottom: fmt.borderBottom || undefined,
                      borderLeft: fmt.borderLeft || undefined,
                    }

                    // Frozen pane sticky positioning
                    if (isFrozenRow && isFrozenCol) {
                      cellStyle.position = 'sticky'
                      cellStyle.top = rowTopPositions[r]
                      cellStyle.left = colLeftPositions[c]
                      cellStyle.zIndex = 15
                    } else if (isFrozenRow) {
                      cellStyle.position = 'sticky'
                      cellStyle.top = rowTopPositions[r]
                      cellStyle.zIndex = 12
                    } else if (isFrozenCol) {
                      cellStyle.position = 'sticky'
                      cellStyle.left = colLeftPositions[c]
                      cellStyle.zIndex = 11
                    }

                    // Locked cell tint for protected sheets
                    const isLockedCell = sheet.protected && fmt.locked
                    if (isLockedCell && !cellStyle.backgroundColor) {
                      cellStyle.backgroundColor = 'rgba(100, 116, 139, 0.12)'
                    }

                    // Conditional formatting overlay
                    const condResult = getConditionalStyle(r, c, computed, sheet.conditionalFormats, computedValues)
                    if (condResult?.style) {
                      if (condResult.style.backgroundColor) cellStyle.backgroundColor = condResult.style.backgroundColor
                      if (condResult.style.color) cellStyle.color = condResult.style.color
                      if (condResult.style.fontWeight) cellStyle.fontWeight = condResult.style.fontWeight
                    }

                    // Search highlight
                    if (findResultKeys?.has(key)) {
                      cellStyle.backgroundColor = cellStyle.backgroundColor
                        ? cellStyle.backgroundColor
                        : undefined
                      // Apply yellow highlight; will be combined via className below
                    }

                    // Validation error display
                    const cellValidationRule = sheet.dataValidation?.[key]
                    const hasValidationError = cellValidationRule && !validateCell(computed, cellValidationRule)
                    if (hasValidationError) {
                      cellStyle.border = '2px solid #ef4444'
                    }

                    // Text rotation
                    const rotation = (cell?.format as Record<string, unknown> | undefined)?.rotation as number | undefined
                    // Cell indent
                    const indent = (cell?.format as Record<string, unknown> | undefined)?.indent as number | undefined

                    // Frozen pane divider borders
                    if (c === frozenCols - 1 && frozenCols > 0) {
                      cellStyle.borderRight = '2px solid rgb(99, 102, 241)'
                    }
                    if (r === frozenRows - 1 && frozenRows > 0) {
                      cellStyle.borderBottom = '2px solid rgb(99, 102, 241)'
                    }

                    // Cell text overflow into adjacent empty cells (Excel-like behavior)
                    const shouldOverflow = (() => {
                      if (isEditing || fmt.wrap) return false
                      const text = String(displayValue)
                      if (!text) return false
                      const colW = getColWidth(c)
                      const estimatedTextWidth = text.length * 8 + 16
                      if (estimatedTextWidth <= colW) return false
                      // Check if cells to the right are empty
                      for (let adjC = c + 1; adjC < sheet.colCount; adjC++) {
                        const adjKey = `${r}-${adjC}`
                        const adjVal = computedValues[adjKey]
                        if (adjVal !== undefined && adjVal !== '') return false
                        // Check if we've covered enough width
                        const coveredWidth = colW + (adjC - c) * getColWidth(adjC)
                        if (coveredWidth >= estimatedTextWidth) break
                      }
                      return true
                    })()

                    if (shouldOverflow) {
                      cellStyle.overflow = 'visible'
                      cellStyle.whiteSpace = 'nowrap'
                      cellStyle.zIndex = (cellStyle.zIndex as number | undefined) || 1
                    }

                    const isFillRangeCell = fillRange && r >= fillRange.startRow && r <= fillRange.endRow && c >= fillRange.startCol && c <= fillRange.endCol
                    const isBottomRight = selectionBottomRight && r === selectionBottomRight.row && c === selectionBottomRight.col && !isEditing
                    const cellValidation = sheet.dataValidation?.[key]
                    const hasListValidation = cellValidation?.type === 'list'
                    const isListOpen = listDropdown?.row === r && listDropdown?.col === c

                    // Print range blue dashed border
                    if (printRange) {
                      if (r === printRange.startRow && c >= printRange.startCol && c <= printRange.endCol) {
                        cellStyle.borderTop = '2px dashed rgb(56, 189, 248)'
                      }
                      if (r === printRange.endRow && c >= printRange.startCol && c <= printRange.endCol) {
                        cellStyle.borderBottom = '2px dashed rgb(56, 189, 248)'
                      }
                      if (c === printRange.startCol && r >= printRange.startRow && r <= printRange.endRow) {
                        cellStyle.borderLeft = '2px dashed rgb(56, 189, 248)'
                      }
                      if (c === printRange.endCol && r >= printRange.startRow && r <= printRange.endRow) {
                        cellStyle.borderRight = '2px dashed rgb(56, 189, 248)'
                      }
                    }

                    // Cut range dashed border (marching ants style)
                    if (inCutRange && cutRange) {
                      if (r === cutRange.startRow) cellStyle.borderTop = '2px dashed rgb(245, 158, 11)'
                      if (r === cutRange.endRow) cellStyle.borderBottom = '2px dashed rgb(245, 158, 11)'
                      if (c === cutRange.startCol) cellStyle.borderLeft = '2px dashed rgb(245, 158, 11)'
                      if (c === cutRange.endCol) cellStyle.borderRight = '2px dashed rgb(245, 158, 11)'
                    }

                    // Formula reference highlight (color-coded per reference)
                    const isFormulaRef = formulaReferencedCells?.has(`${r}-${c}`) ?? false
                    const formulaColorIdx = formulaRefColorMap?.get(`${r}-${c}`)
                    const formulaColor = formulaColorIdx !== undefined ? FORMULA_REF_COLORS[formulaColorIdx % FORMULA_REF_COLORS.length] : null
                    if (isFormulaRef && !isSelected && formulaColor) {
                      cellStyle.backgroundColor = formulaColor.bg
                      cellStyle.outline = `2px solid ${formulaColor.border}`
                      cellStyle.outlineOffset = '-1px'
                      cellStyle.zIndex = 4
                    } else if (isFormulaRef && !isSelected) {
                      cellStyle.backgroundColor = 'rgba(59, 130, 246, 0.12)'
                      cellStyle.outline = '2px solid rgb(59, 130, 246)'
                      cellStyle.outlineOffset = '-1px'
                      cellStyle.zIndex = 4
                    }

                    // Selection range border (solid border around range perimeter)
                    const selEdges = getSelectionEdges(r, c, selectionRange)
                    if (inRange && !isSelected) {
                      if (selEdges.top) cellStyle.borderTop = '2px solid rgb(99, 102, 241)'
                      if (selEdges.bottom) cellStyle.borderBottom = '2px solid rgb(99, 102, 241)'
                      if (selEdges.left) cellStyle.borderLeft = '2px solid rgb(99, 102, 241)'
                      if (selEdges.right) cellStyle.borderRight = '2px solid rgb(99, 102, 241)'
                    }

                    // Inline edit blue border (item 39)
                    if (isEditing) {
                      cellStyle.border = '2px solid #3b82f6'
                      cellStyle.backgroundColor = cellStyle.backgroundColor || 'rgba(59, 130, 246, 0.05)'
                    }

                    return (
                      <td
                        key={c}
                        role="gridcell"
                        aria-colindex={c + 1}
                        aria-selected={isSelected || inRange}
                        rowSpan={merge?.rowSpan}
                        colSpan={merge?.colSpan}
                        className={`border-b border-r border-slate-800 px-1 relative group ${isEditing || shouldOverflow ? 'overflow-visible' : 'overflow-hidden'} ${
                          isSelected && !isEditing ? 'outline outline-2 outline-indigo-500 z-[5]' : inRange ? 'bg-indigo-500/20' : ''
                        }${isFrozenCol || isFrozenRow ? ' bg-slate-900' : ''}${isFillRangeCell ? ' bg-indigo-500/20 outline-dashed outline-1 outline-indigo-400' : ''}${inCutRange ? ' bg-amber-500/5' : ''}${isFormulaRef && !isSelected && !formulaColor ? ' bg-blue-500/12' : ''}${findResultKeys?.has(key) ? ' bg-yellow-200/50' : ''}`}
                        style={cellStyle}
                        onMouseDown={(e) => handleMouseDown(e, r, c)}
                        onMouseEnter={() => handleMouseEnter(r, c)}
                        onDoubleClick={() => onStartEdit(r, c)}
                        onContextMenu={(e) => {
                          e.preventDefault()
                          // If right-clicked cell is within the current selection range, preserve the selection
                          // so the context menu operates on the whole range
                          const inCurrentSelection = isInRange(r, c, selectionRange)
                          if (!inCurrentSelection) {
                            onSelectCell(r, c)
                          }
                          onContextMenu(e.clientX, e.clientY)
                        }}
                      >
                        {isEditing ? (
                          <>
                            {/* Rich text bold toggle */}
                            <div className="absolute -top-6 left-0 z-30 flex items-center gap-0.5 bg-slate-800 rounded-t border border-slate-600 border-b-0 px-1 py-0.5">
                              <button
                                onMouseDown={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  const textarea = editInputRef.current
                                  if (!textarea) return
                                  const start = textarea.selectionStart
                                  const end = textarea.selectionEnd
                                  if (start !== end) {
                                    const selected = editValue.substring(start, end)
                                    const newVal = editValue.substring(0, start) + '<b>' + selected + '</b>' + editValue.substring(end)
                                    onEditValueChange(newVal)
                                  }
                                }}
                                className="w-5 h-5 flex items-center justify-center rounded text-[10px] font-bold text-slate-400 hover:text-white hover:bg-slate-700"
                                title="太字タグで囲む (選択テキスト)"
                              >
                                B
                              </button>
                            </div>
                            <textarea
                              ref={editInputRef}
                              value={editValue}
                              onChange={(e) => onEditValueChange(e.target.value)}
                              onKeyDown={(e) => {
                                // Alt+Enter: insert newline (item 16)
                                if (e.altKey && e.key === 'Enter') {
                                  e.preventDefault()
                                  const textarea = e.currentTarget
                                  const start = textarea.selectionStart
                                  const end = textarea.selectionEnd
                                  const newVal = editValue.substring(0, start) + '\n' + editValue.substring(end)
                                  onEditValueChange(newVal)
                                  // Restore cursor position after React re-render
                                  requestAnimationFrame(() => {
                                    textarea.selectionStart = textarea.selectionEnd = start + 1
                                  })
                                  return
                                }
                                // Ctrl+Enter: apply to all cells in selection (item 22)
                                if (e.ctrlKey && e.key === 'Enter') {
                                  e.preventDefault()
                                  if (selectionRange) {
                                    const sr = selectionRange
                                    const minR = Math.min(sr.startRow, sr.endRow)
                                    const maxR = Math.max(sr.startRow, sr.endRow)
                                    const minC = Math.min(sr.startCol, sr.endCol)
                                    const maxC = Math.max(sr.startCol, sr.endCol)
                                    for (let rr = minR; rr <= maxR; rr++) {
                                      for (let cc = minC; cc <= maxC; cc++) {
                                        dispatch({
                                          type: 'SET_CELL_VALUE',
                                          sheetId: sheet.id,
                                          row: rr,
                                          col: cc,
                                          value: editValue,
                                        })
                                      }
                                    }
                                    onCancelEdit()
                                  } else {
                                    onCommitEdit()
                                  }
                                  return
                                }
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault()
                                  onCommitEdit()
                                  // Move down after commit
                                  if (r + 1 < sheet.rowCount) {
                                    onSelectCell(r + 1, c)
                                  }
                                }
                                if (e.key === 'Enter' && e.shiftKey) {
                                  e.preventDefault()
                                  onCommitEdit()
                                  // Move up after commit
                                  if (r - 1 >= 0) {
                                    onSelectCell(r - 1, c)
                                  }
                                }
                                if (e.key === 'Escape') {
                                  e.preventDefault()
                                  onCancelEdit()
                                }
                                if (e.key === 'Tab') {
                                  e.preventDefault()
                                  onCommitEdit()
                                  // Move right (or left with Shift) after commit
                                  if (e.shiftKey) {
                                    if (c - 1 >= 0) {
                                      onSelectCell(r, c - 1)
                                    }
                                  } else {
                                    if (c + 1 < sheet.colCount) {
                                      onSelectCell(r, c + 1)
                                    }
                                  }
                                }
                                e.stopPropagation()
                              }}
                              onBlur={() => onCommitEdit()}
                              className="absolute top-0 left-0 bg-slate-900 text-white text-xs px-1 outline-none border-2 border-indigo-500 font-mono z-20 resize-none"
                              style={{
                                textAlign: fmt.align || 'left',
                                whiteSpace: 'pre-wrap',
                                minWidth: '100%',
                                minHeight: rowH,
                                width: Math.max(getColWidth(c), Math.min(400, editValue.length * 8 + 24)),
                                height: editValue.includes('\n')
                                  ? Math.max(rowH, (editValue.split('\n').length + 1) * 16 + 8)
                                  : Math.max(rowH, editValue.length > (getColWidth(c) / 8) ? rowH * 2 : rowH),
                                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
                                borderRadius: '2px',
                              }}
                              rows={1}
                            />
                            {validationError && isSelected && (
                              <div className="absolute top-full left-0 mt-0.5 z-20 bg-red-600 text-white text-[10px] px-2 py-1 rounded shadow-lg whitespace-nowrap">
                                {validationError}
                              </div>
                            )}
                          </>
                        ) : (
                          <>
                            {/* Data bar (item 11) */}
                            {condResult?.dataBar && (
                              <div
                                className="absolute top-0 left-0 bottom-0 pointer-events-none"
                                style={{
                                  width: `${Math.max(0, Math.min(100, condResult.dataBar.ratio * 100))}%`,
                                  backgroundColor: condResult.dataBar.color,
                                  opacity: 0.2,
                                }}
                              />
                            )}
                            {/* Checkbox cell */}
                            {cell?.checkbox !== undefined && (
                              <label
                                className="flex items-center justify-center w-full h-full cursor-pointer"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <input
                                  type="checkbox"
                                  checked={cell.checkbox}
                                  onChange={(e) => {
                                    e.stopPropagation()
                                    dispatch({
                                      type: 'TOGGLE_CHECKBOX',
                                      sheetId: sheet.id,
                                      row: r,
                                      col: c,
                                    })
                                  }}
                                  className="w-4 h-4 accent-indigo-500 cursor-pointer"
                                />
                              </label>
                            )}
                            {cell?.checkbox === undefined && (() => {
                              // Check for IMAGE marker
                              const imageUrl = typeof displayValue === 'string' ? parseImageMarker(displayValue) : null
                              if (imageUrl) {
                                return (
                                  <img
                                    src={imageUrl}
                                    alt=""
                                    className="max-w-full max-h-full object-contain pointer-events-none"
                                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                  />
                                )
                              }

                              // Check for sparkline marker
                              const sparkline = typeof displayValue === 'string' ? parseSparklineMarker(displayValue) : null
                              if (sparkline) {
                                return (
                                  <SparklineCell
                                    values={sparkline.values}
                                    type={sparkline.type}
                                    width={Math.max(60, getColWidth(c) - 8)}
                                    height={Math.max(16, rowH - 8)}
                                  />
                                )
                              }

                              // Build content style for rotation and indent
                              const contentStyle: React.CSSProperties = {}
                              if (typeof displayValue === 'string' && displayValue.includes('\n')) {
                                contentStyle.whiteSpace = 'pre-wrap'
                              }
                              if (rotation) {
                                contentStyle.transform = `rotate(${rotation}deg)`
                                contentStyle.display = 'inline-block'
                                if (Math.abs(rotation) === 90 || Math.abs(rotation) === 270) {
                                  contentStyle.writingMode = 'vertical-rl'
                                }
                              }
                              if (indent && indent > 0 && indent <= 5) {
                                contentStyle.paddingLeft = `${indent * 12}px`
                              }

                              if (cell?.hyperlink) {
                                return (
                                  <>
                                    <span
                                      className={`text-xs leading-none text-blue-400 underline cursor-pointer ${showFormulas && cell?.value?.startsWith('=') ? 'font-mono' : ''}`}
                                      style={contentStyle}
                                      onClick={(e) => {
                                        if (e.ctrlKey || e.metaKey) {
                                          e.stopPropagation()
                                          window.open(cell.hyperlink!.url, '_blank', 'noopener,noreferrer')
                                        }
                                      }}
                                      title={`${cell.hyperlink.url} (Ctrl+クリックで開く)`}
                                    >
                                      {cell.hyperlink.label || displayValue}
                                    </span>
                                    <LinkIcon size={8} className="absolute top-0.5 right-0.5 text-blue-400/60 pointer-events-none" />
                                  </>
                                )
                              }
                              // Rich text rendering: if cell value contains HTML tags, render sanitized HTML
                              const rawCellValue = cell?.value || ''
                              const isRich = typeof displayValue === 'string' && isRichText(rawCellValue)
                              if (isRich) {
                                return (
                                  <span
                                    className={`text-xs leading-none pointer-events-none ${showFormulas && cell?.value?.startsWith('=') ? 'font-mono text-blue-300' : ''}`}
                                    style={contentStyle}
                                  >
                                    {condResult?.iconSet && (
                                      <span style={{ color: condResult.iconSet.color, marginRight: 2 }}>{condResult.iconSet.icon}</span>
                                    )}
                                    <span dangerouslySetInnerHTML={{ __html: sanitizeHtml(String(displayValue)) }} />
                                  </span>
                                )
                              }
                              return (
                                <span
                                  className={`text-xs leading-none pointer-events-none ${showFormulas && cell?.value?.startsWith('=') ? 'font-mono text-blue-300' : ''}`}
                                  style={contentStyle}
                                >
                                  {/* Icon set (item 12) */}
                                  {condResult?.iconSet && (
                                    <span style={{ color: condResult.iconSet.color, marginRight: 2 }}>{condResult.iconSet.icon}</span>
                                  )}
                                  {displayValue}
                                </span>
                              )
                            })()}
                            {/* List validation dropdown arrow — always visible with subtle styling */}
                            {hasListValidation && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setListDropdown(isListOpen ? null : { row: r, col: c })
                                }}
                                className={`absolute right-0 top-0 bottom-0 w-5 flex items-center justify-center transition-colors ${
                                  isSelected
                                    ? 'text-slate-400 hover:text-indigo-400 hover:bg-slate-700/50'
                                    : 'text-slate-600 hover:text-slate-400 hover:bg-slate-700/30'
                                }`}
                              >
                                <span className="text-[8px] leading-none">▼</span>
                              </button>
                            )}
                            {/* List dropdown with search for long lists */}
                            {isListOpen && cellValidation?.listValues && (() => {
                              const listValues = cellValidation.listValues!
                              const hasSearch = listValues.length > 10
                              return (
                                <>
                                  <div className="fixed inset-0 z-30" onClick={() => setListDropdown(null)} />
                                  <ListDropdownContent
                                    listValues={listValues}
                                    hasSearch={hasSearch}
                                    displayValue={String(displayValue)}
                                    onSelect={(val) => {
                                      onListSelect?.(r, c, val)
                                      setListDropdown(null)
                                    }}
                                    onClose={() => setListDropdown(null)}
                                  />
                                </>
                              )
                            })()}
                          </>
                        )}
                        {/* Cross-sheet reference icon */}
                        {cell?.value?.startsWith('=') && /(?:'[^']+'|[A-Za-z0-9_]+)!/.test(cell.value) && !isEditing && (
                          <button
                            className="absolute top-0 left-0 w-3.5 h-3.5 flex items-center justify-center text-purple-400 hover:text-purple-300 z-[3] pointer-events-auto"
                            title="クロスシート参照 — クリックで参照先へ移動"
                            onClick={(e) => {
                              e.stopPropagation()
                              const crossMatch = cell.value!.match(/(?:'([^']+)'|([A-Za-z0-9_]+))!([A-Za-z]+\d+)/)
                              if (crossMatch && onNavigateToSheet) {
                                const sheetName = crossMatch[1] || crossMatch[2]
                                const cellRef = crossMatch[3]
                                onNavigateToSheet(sheetName, cellRef)
                              }
                            }}
                          >
                            <FileSpreadsheet size={9} />
                          </button>
                        )}
                        {/* Validation error indicator (item 28) */}
                        {hasValidationError && !isEditing && (
                          <div className="absolute top-0 right-0 pointer-events-none z-[3]" title={cellValidationRule?.errorMessage || 'バリデーションエラー'}>
                            <AlertCircle size={10} className="text-red-500" />
                          </div>
                        )}
                        {/* Color scale legend tooltip */}
                        {condResult?.colorScale && (
                          <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-1 z-50 bg-slate-800 text-slate-300 text-[10px] px-2 py-1 rounded shadow-lg border border-slate-600 whitespace-nowrap pointer-events-none">
                            <div className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: condResult.colorScale.color }} />
                              <span>値: {condResult.colorScale.value.toLocaleString()}</span>
                              <span className="text-slate-500">({condResult.colorScale.min.toLocaleString()} - {condResult.colorScale.max.toLocaleString()})</span>
                            </div>
                          </div>
                        )}
                        {/* Formula error tooltip */}
                        {!isEditing && (() => {
                          const errorExplanation = getFormulaErrorExplanation(displayValue)
                          if (!errorExplanation) return null
                          return (
                            <div className="hidden group-hover:block absolute top-full left-0 mt-1 z-50 bg-red-900/95 text-red-100 text-[10px] px-2.5 py-1.5 rounded shadow-lg border border-red-700 whitespace-nowrap pointer-events-none">
                              <div className="flex items-center gap-1.5">
                                <AlertCircle size={10} className="text-red-400 shrink-0" />
                                <span>{errorExplanation}</span>
                              </div>
                            </div>
                          )
                        })()}
                        {/* Locked cell indicator */}
                        {isLockedCell && !isEditing && (
                          <Lock size={8} className="absolute bottom-0.5 left-0.5 text-slate-500/50 pointer-events-none z-[2]" />
                        )}
                        {/* Comment indicator */}
                        {(cell?.comment || (cell?.comments && cell.comments.length > 0)) && (
                          <div className="absolute top-0 right-0 w-0 h-0 border-t-[6px] border-t-red-500 border-l-[6px] border-l-transparent pointer-events-none" />
                        )}
                        {(cell?.comment || (cell?.comments && cell.comments.length > 0)) && (
                          <div className="hidden group-hover:flex flex-col absolute top-full left-0 mt-1 z-50 bg-amber-50 text-slate-800 text-xs rounded shadow-lg border border-amber-200 max-w-[260px] max-h-[300px] overflow-y-auto pointer-events-auto">
                            {cell?.comments && cell.comments.length > 0 ? (
                              <>
                                {cell.comments.map((cmt, idx) => (
                                  <div
                                    key={idx}
                                    className={`px-2 py-1.5 border-b border-amber-100 last:border-b-0 ${cmt.resolved ? 'opacity-50' : ''}`}
                                  >
                                    <div className="flex items-center gap-1 mb-0.5">
                                      <span className="font-semibold text-slate-700">{cmt.author}</span>
                                      <span className="text-[9px] text-slate-400">
                                        {new Date(cmt.timestamp).toLocaleString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                      </span>
                                      {cmt.resolved && <span className="text-[9px] text-green-600 ml-auto">解決済</span>}
                                    </div>
                                    <div className="whitespace-pre-wrap text-slate-700">{cmt.text}</div>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        dispatch({
                                          type: 'RESOLVE_CELL_COMMENT',
                                          sheetId: sheet.id,
                                          row: r,
                                          col: c,
                                          commentIndex: idx,
                                        })
                                      }}
                                      className="text-[9px] text-indigo-600 hover:text-indigo-800 mt-0.5"
                                    >
                                      {cmt.resolved ? '再開' : '解決'}
                                    </button>
                                  </div>
                                ))}
                                {/* Reply input */}
                                <div className="px-2 py-1.5 border-t border-amber-200">
                                  <form
                                    onSubmit={(e) => {
                                      e.preventDefault()
                                      const form = e.currentTarget
                                      const input = form.querySelector('input') as HTMLInputElement
                                      if (input.value.trim()) {
                                        dispatch({
                                          type: 'ADD_CELL_COMMENT',
                                          sheetId: sheet.id,
                                          row: r,
                                          col: c,
                                          author: 'ユーザー',
                                          text: input.value.trim(),
                                        })
                                        input.value = ''
                                      }
                                    }}
                                  >
                                    <input
                                      type="text"
                                      placeholder="返信..."
                                      onClick={(e) => e.stopPropagation()}
                                      className="w-full bg-white border border-amber-300 rounded px-1.5 py-0.5 text-[10px] text-slate-700 outline-none focus:border-indigo-400 placeholder-slate-400"
                                    />
                                  </form>
                                </div>
                              </>
                            ) : (
                              <div className="p-2 whitespace-pre-wrap">{cell?.comment}</div>
                            )}
                          </div>
                        )}
                        {/* Fill handle */}
                        {isBottomRight && (
                          <>
                            <div
                              className="absolute bottom-[-3px] right-[-3px] w-[7px] h-[7px] bg-indigo-500 border border-white cursor-crosshair z-[6]"
                              onMouseDown={handleFillHandleMouseDown}
                            />
                            {/* Fill direction hint */}
                            {fillDirection && (
                              <div className="absolute bottom-[-16px] right-[-16px] z-[7] text-indigo-400 text-xs font-bold pointer-events-none animate-pulse">
                                {fillDirection === 'down' ? '↓' : '→'}
                              </div>
                            )}
                          </>
                        )}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
            {/* Virtual scroll spacer for rows below visible range */}
            {visibleRowRange.endRow < sheet.rowCount - 1 && (
              <tr>
                <td
                  colSpan={sheet.colCount + 1}
                  style={{
                    height: (() => {
                      let h = 0
                      for (let r = visibleRowRange.endRow + 1; r < sheet.rowCount; r++) {
                        if (hiddenRows.includes(r)) continue
                        if (visibleRows && visibleRows.has(r)) continue
                        h += getRowHeight(r)
                      }
                      return h
                    })(),
                    padding: 0,
                    border: 'none',
                  }}
                />
              </tr>
            )}
          </tbody>
        </table>
        </div>
       </div>
      </div>

      {/* Status bar */}
      <div className="h-6 shrink-0 flex items-center justify-end gap-4 px-3 border-t border-slate-800 bg-slate-900 text-[10px] text-slate-400">
        {selectedCell && (
          <span>
            {colIndexToLetter(selectedCell.col)}
            {selectedCell.row + 1}
          </span>
        )}
        {selectionStats && selectionStats.count > 1 && (
          <>
            <span>選択: {selectionStats.count}セル</span>
            {selectionStats.numCount > 0 && (
              <>
                <span>合計: {selectionStats.sum.toLocaleString('ja-JP', { maximumFractionDigits: 4 })}</span>
                <span>平均: {selectionStats.avg.toLocaleString('ja-JP', { maximumFractionDigits: 4 })}</span>
              </>
            )}
          </>
        )}
        {frozenRows > 0 || frozenCols > 0 ? (
          <span className="text-indigo-400">
            固定: {frozenRows}行 {frozenCols}列
          </span>
        ) : null}
      </div>
    </div>
  )
})
