/**
 * Spreadsheet formula engine
 * Supports: Math, String, Logical, Date, Lookup, Conditional Aggregate, Statistical functions
 * Plus basic arithmetic with cell references and & string concatenation
 */

import type { Cell, Sheet } from '@/types'

// ── Cross-sheet & absolute reference context ──
// Context object threaded through evaluation (no more mutable globals)
interface FormulaContext {
  allSheets: Sheet[]
  activeSheetId: string
}

// Default context (empty) — used when no cross-sheet refs exist
const DEFAULT_CTX: FormulaContext = { allSheets: [], activeSheetId: '' }

/** Strip $ signs from a cell reference for evaluation (absolute refs only matter for copy/paste) */
function stripDollarSigns(ref: string): string {
  return ref.replace(/\$/g, '')
}

/**
 * Parse a potentially cross-sheet reference like `Sheet2!A1` or `'Sheet Name'!A1:B5`.
 * Returns { sheetName, ref } where ref is the cell/range part without $ signs.
 * If no sheet prefix, sheetName is null.
 */
function parseCrossSheetRef(expr: string): { sheetName: string | null; ref: string } {
  // Match 'Sheet Name'!ref or SheetName!ref
  const quotedMatch = expr.match(/^'([^']+)'!(.+)$/)
  if (quotedMatch) {
    return { sheetName: quotedMatch[1], ref: stripDollarSigns(quotedMatch[2]) }
  }
  const simpleMatch = expr.match(/^([A-Za-z0-9_]+)!(.+)$/)
  if (simpleMatch) {
    return { sheetName: simpleMatch[1], ref: stripDollarSigns(simpleMatch[2]) }
  }
  return { sheetName: null, ref: stripDollarSigns(expr) }
}

/** Resolve cells record for a given sheet name (or return current sheet cells) */
function resolveCells(sheetName: string | null, currentCells: Record<string, Cell>, ctx: FormulaContext): Record<string, Cell> {
  if (!sheetName) return currentCells
  const sheet = ctx.allSheets.find((s) => s.name === sheetName)
  if (!sheet) return {} // sheet not found → will produce empty values
  return sheet.cells
}

// ── Coordinate helpers (exported) ──

export function colIndexToLetter(index: number): string {
  let result = ''
  let i = index
  while (i >= 0) {
    result = String.fromCharCode(65 + (i % 26)) + result
    i = Math.floor(i / 26) - 1
  }
  return result
}

export function colLetterToIndex(letter: string): number {
  let result = 0
  const upper = letter.toUpperCase()
  for (let i = 0; i < upper.length; i++) {
    result = result * 26 + (upper.charCodeAt(i) - 64)
  }
  return result - 1
}

export function cellKeyToRef(key: string): string {
  const [r, c] = key.split('-').map(Number)
  return colIndexToLetter(c) + (r + 1)
}

export function refToCellKey(ref: string): string | null {
  const stripped = stripDollarSigns(ref)
  const match = stripped.match(/^([A-Za-z]+)(\d+)$/)
  if (!match) return null
  const col = colLetterToIndex(match[1])
  const row = parseInt(match[2], 10) - 1
  if (row < 0 || col < 0) return null
  return `${row}-${col}`
}

export function isFormula(value: string): boolean {
  return value.startsWith('=')
}

// ── Range parsing ──

interface RangeRect {
  startRow: number
  startCol: number
  endRow: number
  endCol: number
}

function parseRange(range: string): RangeRect | null {
  const stripped = stripDollarSigns(range)
  const parts = stripped.split(':')
  if (parts.length !== 2) return null
  const start = refToCellKey(parts[0].trim())
  const end = refToCellKey(parts[1].trim())
  if (!start || !end) return null
  const [sr, sc] = start.split('-').map(Number)
  const [er, ec] = end.split('-').map(Number)
  return {
    startRow: Math.min(sr, er),
    startCol: Math.min(sc, ec),
    endRow: Math.max(sr, er),
    endCol: Math.max(sc, ec),
  }
}

/** Internal cell evaluation — ctx is threaded explicitly, no global state */
function evaluateCellInternal(
  cellKey: string,
  cells: Record<string, Cell>,
  visited: Set<string>,
  ctx: FormulaContext,
): string | number {
  if (visited.has(cellKey)) return '#CIRCULAR!'
  visited.add(cellKey)

  const cell = cells[cellKey]
  if (cell == null || cell.value == null || cell.value === '') return ''

  if (!isFormula(cell.value)) {
    const n = parseFloat(cell.value)
    return !isNaN(n) && cell.value.trim() !== '' ? n : cell.value
  }

  const formula = cell.value.substring(1).trim()
  try {
    return evaluateExpression(formula, cells, visited, ctx, cellKey)
  } catch {
    return '#ERROR!'
  }
}

/** Get numeric values from a range (supports cross-sheet like Sheet2!A1:B5) */
function getRangeValues(rangeStr: string, cells: Record<string, Cell>, visited: Set<string>, ctx: FormulaContext): number[] {
  const crossRef = parseCrossSheetRef(rangeStr)
  const targetCells = resolveCells(crossRef.sheetName, cells, ctx)
  const range = parseRange(crossRef.ref)
  if (!range) return []
  const values: number[] = []
  for (let r = range.startRow; r <= range.endRow; r++) {
    for (let c = range.startCol; c <= range.endCol; c++) {
      const key = `${r}-${c}`
      const val = evaluateCellInternal(key, targetCells, new Set(visited), ctx)
      if (typeof val === 'number' && !isNaN(val)) {
        values.push(val)
      } else if (typeof val === 'string') {
        const n = parseFloat(val)
        if (!isNaN(n)) values.push(n)
      }
    }
  }
  return values
}

/** Get raw cell values (number | string) from a range (supports cross-sheet) */
function getRangeRawValues(rangeStr: string, cells: Record<string, Cell>, visited: Set<string>, ctx: FormulaContext): (string | number)[] {
  const crossRef = parseCrossSheetRef(rangeStr)
  const targetCells = resolveCells(crossRef.sheetName, cells, ctx)
  const range = parseRange(crossRef.ref)
  if (!range) return []
  const values: (string | number)[] = []
  for (let r = range.startRow; r <= range.endRow; r++) {
    for (let c = range.startCol; c <= range.endCol; c++) {
      const key = `${r}-${c}`
      const val = evaluateCellInternal(key, targetCells, new Set(visited), ctx)
      values.push(val)
    }
  }
  return values
}

/** Get a 2D array from a range (for VLOOKUP / HLOOKUP / INDEX, supports cross-sheet) */
function getRange2D(rangeStr: string, cells: Record<string, Cell>, visited: Set<string>, ctx: FormulaContext): (string | number)[][] {
  const crossRef = parseCrossSheetRef(rangeStr)
  const targetCells = resolveCells(crossRef.sheetName, cells, ctx)
  const range = parseRange(crossRef.ref)
  if (!range) return []
  const rows: (string | number)[][] = []
  for (let r = range.startRow; r <= range.endRow; r++) {
    const row: (string | number)[] = []
    for (let c = range.startCol; c <= range.endCol; c++) {
      const key = `${r}-${c}`
      row.push(evaluateCellInternal(key, targetCells, new Set(visited), ctx))
    }
    rows.push(row)
  }
  return rows
}

// ── Argument splitting (respects nested parens and quoted strings) ──

function splitArgs(str: string): string[] {
  const result: string[] = []
  let depth = 0
  let current = ''
  let inString = false
  let stringChar = ''

  for (let i = 0; i < str.length; i++) {
    const ch = str[i]
    if (inString) {
      current += ch
      if (ch === stringChar) inString = false
      continue
    }
    if (ch === '"' || ch === "'") {
      inString = true
      stringChar = ch
      current += ch
      continue
    }
    if (ch === '(') depth++
    else if (ch === ')') depth--
    if (ch === ',' && depth === 0) {
      result.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  if (current) result.push(current)
  return result
}

// ── Condition evaluation ──

function evaluateCondition(expr: string, cells: Record<string, Cell>, visited: Set<string>, ctx: FormulaContext): boolean {
  const operators = ['>=', '<=', '<>', '!=', '>', '<', '=']
  for (const op of operators) {
    const idx = expr.indexOf(op)
    if (idx >= 0) {
      const left = evaluateExpression(expr.substring(0, idx).trim(), cells, visited, ctx)
      const right = evaluateExpression(expr.substring(idx + op.length).trim(), cells, visited, ctx)
      const l = typeof left === 'number' ? left : parseFloat(String(left)) || 0
      const r = typeof right === 'number' ? right : parseFloat(String(right)) || 0
      switch (op) {
        case '>=':
          return l >= r
        case '<=':
          return l <= r
        case '<>':
        case '!=':
          return l !== r
        case '>':
          return l > r
        case '<':
          return l < r
        case '=':
          return l === r
      }
    }
  }
  const val = evaluateExpression(expr, cells, visited, ctx)
  return typeof val === 'number' ? val !== 0 : Boolean(val)
}

/** Match criteria string (e.g. ">5", "=hello", "<>0") against a value */
function matchesCriteria(value: string | number, criteria: string): boolean {
  const trimmed = criteria.trim()
  const opMatch = trimmed.match(/^(>=|<=|<>|!=|>|<|=)(.*)$/)
  if (opMatch) {
    const op = opMatch[1]
    const target = opMatch[2]
    const numVal = typeof value === 'number' ? value : parseFloat(String(value))
    const numTarget = parseFloat(target)
    if (!isNaN(numVal) && !isNaN(numTarget)) {
      switch (op) {
        case '>=':
          return numVal >= numTarget
        case '<=':
          return numVal <= numTarget
        case '<>':
        case '!=':
          return numVal !== numTarget
        case '>':
          return numVal > numTarget
        case '<':
          return numVal < numTarget
        case '=':
          return numVal === numTarget
      }
    }
    const strVal = String(value).toLowerCase()
    const strTarget = target.toLowerCase()
    if (op === '=') return strVal === strTarget
    if (op === '<>' || op === '!=') return strVal !== strTarget
    return false
  }
  const numCriteria = parseFloat(trimmed)
  if (!isNaN(numCriteria)) {
    const numVal = typeof value === 'number' ? value : parseFloat(String(value))
    return numVal === numCriteria
  }
  return String(value).toLowerCase() === trimmed.toLowerCase()
}

// ── Date helpers ──

/** Days since Excel epoch 1900-01-01 (with the Excel leap year bug for compatibility) */
function dateToSerial(year: number, month: number, day: number): number {
  const d = new Date(year, month - 1, day)
  const epoch = new Date(1900, 0, 1)
  const diff = Math.floor((d.getTime() - epoch.getTime()) / 86400000)
  return diff + 2 // Excel counts from 1, and has a fake Feb 29 1900
}

function serialToDate(serial: number): { year: number; month: number; day: number } {
  const epoch = new Date(1900, 0, 1)
  const d = new Date(epoch.getTime() + (serial - 2) * 86400000)
  return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() }
}

// ── Utility helpers for lookups ──

function stripQuotes(s: string): string {
  const t = s.trim()
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1)
  }
  return t
}

function looseEqual(a: string | number, b: string | number): boolean {
  if (typeof a === typeof b) return a === b
  return String(a).toLowerCase() === String(b).toLowerCase()
}

function looseCompare(a: string | number, b: string | number): number {
  const na = typeof a === 'number' ? a : parseFloat(String(a))
  const nb = typeof b === 'number' ? b : parseFloat(String(b))
  if (!isNaN(na) && !isNaN(nb)) return na - nb
  return String(a).localeCompare(String(b))
}

// ── Function evaluation via lookup map ──

/** Helper type for function implementation context */
interface FnCtx {
  args: string[]
  cells: Record<string, Cell>
  visited: Set<string>
  ctx: FormulaContext
  cellKey?: string
  numArg: (i: number, defaultVal?: number) => number
  strArg: (i: number) => string
  anyArg: (i: number) => string | number
}

type FnImpl = (fc: FnCtx) => string | number

/** Periodic payment (shared by PMT/IPMT/PPMT). */
function FINANCIAL_PMT(rate: number, nper: number, pv: number, fv = 0, type = 0): number {
  if (nper === 0) return 0
  if (rate === 0) return -(pv + fv) / nper
  const p = Math.pow(1 + rate, nper)
  return -(rate * (fv + pv * p)) / ((1 + rate * type) * (p - 1))
}

const FUNCTION_MAP: Record<string, FnImpl> = {
  // ── Original functions ──
  IF: ({ args, cells, visited, ctx, cellKey }) => {
    if (args.length < 2) return '#ERROR!'
    const condResult = evaluateCondition(args[0].trim(), cells, visited, ctx)
    if (condResult) return evaluateExpression(args[1].trim(), cells, visited, ctx, cellKey)
    return args.length >= 3 ? evaluateExpression(args[2].trim(), cells, visited, ctx, cellKey) : 0
  },

  SUM: ({ args, numArg, cells, visited, ctx }) => {
    let total = 0
    for (const arg of args) {
      const trimmed = arg.trim()
      if (trimmed.includes(':')) {
        const values = getRangeValues(trimmed, cells, visited, ctx)
        total += values.reduce((a, b) => a + b, 0)
      } else {
        total += numArg(args.indexOf(arg))
      }
    }
    return total
  },

  AVG: ({ args, cells, visited, ctx }) => {
    const values = getRangeValues(args[0].trim(), cells, visited, ctx)
    return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0
  },

  AVERAGE: ({ args, cells, visited, ctx }) => {
    const values = getRangeValues(args[0].trim(), cells, visited, ctx)
    return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0
  },

  COUNT: ({ args, cells, visited, ctx }) => getRangeValues(args[0].trim(), cells, visited, ctx).length,

  MAX: ({ args, cells, visited, ctx }) => {
    const values = getRangeValues(args[0].trim(), cells, visited, ctx)
    return values.length > 0 ? Math.max(...values) : 0
  },

  MIN: ({ args, cells, visited, ctx }) => {
    const values = getRangeValues(args[0].trim(), cells, visited, ctx)
    return values.length > 0 ? Math.min(...values) : 0
  },

  // ── Math Functions ──
  ABS: ({ numArg }) => Math.abs(numArg(0)),
  ROUND: ({ numArg }) => parseFloat(numArg(0).toFixed(numArg(1, 0))),
  ROUNDUP: ({ numArg }) => {
    const n = numArg(0), d = numArg(1, 0), factor = Math.pow(10, d)
    return n >= 0 ? Math.ceil(n * factor) / factor : Math.floor(n * factor) / factor
  },
  ROUNDDOWN: ({ numArg }) => {
    const n = numArg(0), d = numArg(1, 0), factor = Math.pow(10, d)
    return n >= 0 ? Math.floor(n * factor) / factor : Math.ceil(n * factor) / factor
  },
  FLOOR: ({ numArg }) => { const n = numArg(0), sig = numArg(1, 1); return sig === 0 ? 0 : Math.floor(n / sig) * sig },
  CEILING: ({ numArg }) => { const n = numArg(0), sig = numArg(1, 1); return sig === 0 ? 0 : Math.ceil(n / sig) * sig },
  SQRT: ({ numArg }) => { const n = numArg(0); return n < 0 ? '#NUM!' : Math.sqrt(n) },
  POWER: ({ numArg }) => Math.pow(numArg(0), numArg(1)),
  MOD: ({ numArg }) => { const d = numArg(1); return d === 0 ? '#DIV/0!' : numArg(0) % d },
  INT: ({ numArg }) => Math.trunc(numArg(0)),
  RAND: () => Math.random(),
  RANDBETWEEN: ({ numArg }) => { const low = numArg(0), high = numArg(1); return Math.floor(Math.random() * (high - low + 1)) + low },
  PI: () => Math.PI,
  LOG: ({ args, numArg }) => {
    const n = numArg(0); if (n <= 0) return '#NUM!'
    const base = args.length > 1 ? numArg(1) : 10
    if (base <= 0 || base === 1) return '#NUM!'
    return Math.log(n) / Math.log(base)
  },
  LN: ({ numArg }) => { const n = numArg(0); return n <= 0 ? '#NUM!' : Math.log(n) },
  EXP: ({ numArg }) => Math.exp(numArg(0)),

  // ── String Functions ──
  CONCAT: ({ args, cells, visited, ctx, cellKey }) => args.map((a) => String(evaluateExpression(a.trim(), cells, visited, ctx, cellKey))).join(''),
  CONCATENATE: ({ args, cells, visited, ctx, cellKey }) => args.map((a) => String(evaluateExpression(a.trim(), cells, visited, ctx, cellKey))).join(''),
  LEN: ({ strArg }) => strArg(0).length,
  UPPER: ({ strArg }) => strArg(0).toUpperCase(),
  LOWER: ({ strArg }) => strArg(0).toLowerCase(),
  PROPER: ({ strArg }) => strArg(0).replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()),
  TRIM: ({ strArg }) => strArg(0).replace(/\s+/g, ' ').trim(),
  LEFT: ({ strArg, numArg }) => strArg(0).substring(0, numArg(1, 1)),
  RIGHT: ({ strArg, numArg }) => { const s = strArg(0), n = numArg(1, 1); return s.substring(Math.max(0, s.length - n)) },
  MID: ({ strArg, numArg }) => { const s = strArg(0), start = numArg(1, 1) - 1, count = numArg(2, 1); return s.substring(start, start + count) },
  FIND: ({ args, strArg, numArg }) => {
    const search = strArg(0), text = strArg(1), startPos = args.length > 2 ? numArg(2, 1) - 1 : 0
    const idx = text.indexOf(search, startPos)
    return idx === -1 ? '#VALUE!' : idx + 1
  },
  SUBSTITUTE: ({ args, strArg, numArg }) => {
    const text = strArg(0), oldStr = strArg(1), newStr = strArg(2)
    if (args.length > 3) {
      const instance = numArg(3)
      let count = 0, result = '', pos = 0
      while (pos < text.length) {
        const found = text.indexOf(oldStr, pos)
        if (found === -1) { result += text.substring(pos); break }
        count++; result += text.substring(pos, found)
        result += count === instance ? newStr : oldStr
        pos = found + oldStr.length
      }
      return result
    }
    return text.split(oldStr).join(newStr)
  },
  REPT: ({ strArg, numArg }) => { const s = strArg(0), n = numArg(1, 1); return n < 0 ? '#VALUE!' : s.repeat(Math.floor(n)) },
  TEXTJOIN: ({ args, strArg, numArg, cells, visited, ctx, cellKey }) => {
    const delimiter = strArg(0), ignoreEmpty = Boolean(numArg(1))
    const parts: string[] = []
    for (let i = 2; i < args.length; i++) {
      const trimmed = args[i].trim()
      if (trimmed.includes(':')) {
        const raw = getRangeRawValues(trimmed, cells, visited, ctx)
        for (const v of raw) { const s = String(v); if (ignoreEmpty && s === '') continue; parts.push(s) }
      } else {
        const v = String(evaluateExpression(trimmed, cells, visited, ctx, cellKey))
        if (ignoreEmpty && v === '') continue; parts.push(v)
      }
    }
    return parts.join(delimiter)
  },
  TEXT: ({ anyArg }) => String(anyArg(0)),
  VALUE: ({ strArg }) => { const n = parseFloat(strArg(0)); return isNaN(n) ? '#VALUE!' : n },

  // ── Logical Functions ──
  AND: ({ args, cells, visited, ctx }) => { for (const a of args) { if (!evaluateCondition(a.trim(), cells, visited, ctx)) return 0 } return 1 },
  OR: ({ args, cells, visited, ctx }) => { for (const a of args) { if (evaluateCondition(a.trim(), cells, visited, ctx)) return 1 } return 0 },
  NOT: ({ args, cells, visited, ctx }) => evaluateCondition(args[0].trim(), cells, visited, ctx) ? 0 : 1,
  TRUE: () => 1,
  FALSE: () => 0,
  IFERROR: ({ args, cells, visited, ctx, cellKey }) => {
    try {
      const val = evaluateExpression(args[0].trim(), cells, visited, ctx, cellKey)
      if (typeof val === 'string' && val.startsWith('#')) return args.length > 1 ? evaluateExpression(args[1].trim(), cells, visited, ctx, cellKey) : ''
      return val
    } catch { return args.length > 1 ? evaluateExpression(args[1].trim(), cells, visited, ctx, cellKey) : '' }
  },
  ISBLANK: ({ anyArg }) => anyArg(0) === '' ? 1 : 0,
  ISNUMBER: ({ anyArg }) => typeof anyArg(0) === 'number' ? 1 : 0,
  ISTEXT: ({ anyArg }) => { const v = anyArg(0); return typeof v === 'string' && !v.startsWith('#') ? 1 : 0 },

  // ── Date Functions ──
  TODAY: () => { const now = new Date(); return dateToSerial(now.getFullYear(), now.getMonth() + 1, now.getDate()) },
  NOW: () => {
    const now = new Date()
    const serial = dateToSerial(now.getFullYear(), now.getMonth() + 1, now.getDate())
    return serial + (now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()) / 86400
  },
  DATE: ({ numArg }) => dateToSerial(numArg(0), numArg(1), numArg(2)),
  YEAR: ({ numArg }) => serialToDate(numArg(0)).year,
  MONTH: ({ numArg }) => serialToDate(numArg(0)).month,
  DAY: ({ numArg }) => serialToDate(numArg(0)).day,

  // ── Lookup Functions ──
  VLOOKUP: ({ args, anyArg, numArg, cells, visited, ctx }) => {
    const searchKey = anyArg(0), rangeStr = args[1].trim(), colIndex = numArg(2)
    const isSorted = args.length > 3 ? Boolean(numArg(3)) : true
    const data = getRange2D(rangeStr, cells, visited, ctx)
    if (colIndex < 1 || data.length === 0 || colIndex > (data[0]?.length ?? 0)) return '#REF!'
    if (!isSorted) { for (const row of data) { if (looseEqual(row[0], searchKey)) return row[colIndex - 1] } return '#N/A' }
    let bestRow: (string | number)[] | null = null
    for (const row of data) { if (looseCompare(row[0], searchKey) <= 0) bestRow = row; else break }
    return bestRow ? bestRow[colIndex - 1] : '#N/A'
  },

  HLOOKUP: ({ args, anyArg, numArg, cells, visited, ctx }) => {
    const searchKey = anyArg(0), rangeStr = args[1].trim(), rowIndex = numArg(2)
    const isSorted = args.length > 3 ? Boolean(numArg(3)) : true
    const data = getRange2D(rangeStr, cells, visited, ctx)
    if (rowIndex < 1 || data.length < rowIndex) return '#REF!'
    const firstRow = data[0] ?? []
    if (!isSorted) { for (let c = 0; c < firstRow.length; c++) { if (looseEqual(firstRow[c], searchKey)) return data[rowIndex - 1][c] } return '#N/A' }
    let bestCol = -1
    for (let c = 0; c < firstRow.length; c++) { if (looseCompare(firstRow[c], searchKey) <= 0) bestCol = c; else break }
    return bestCol >= 0 ? data[rowIndex - 1][bestCol] : '#N/A'
  },

  INDEX: ({ args, numArg, cells, visited, ctx }) => {
    const rangeStr = args[0].trim(), rowIdx = numArg(1), colIdx = args.length > 2 ? numArg(2, 1) : 1
    const data = getRange2D(rangeStr, cells, visited, ctx)
    if (rowIdx < 1 || rowIdx > data.length) return '#REF!'
    const row = data[rowIdx - 1]
    if (colIdx < 1 || colIdx > row.length) return '#REF!'
    return row[colIdx - 1]
  },

  MATCH: ({ args, anyArg, numArg, cells, visited, ctx }) => {
    const searchKey = anyArg(0), rangeStr = args[1].trim(), matchType = args.length > 2 ? numArg(2, 1) : 1
    const rawValues = getRangeRawValues(rangeStr, cells, visited, ctx)
    if (matchType === 0) { for (let i = 0; i < rawValues.length; i++) { if (looseEqual(rawValues[i], searchKey)) return i + 1 } return '#N/A' }
    if (matchType === 1) { let best = -1; for (let i = 0; i < rawValues.length; i++) { if (looseCompare(rawValues[i], searchKey) <= 0) best = i; else break } return best >= 0 ? best + 1 : '#N/A' }
    let best = -1; for (let i = 0; i < rawValues.length; i++) { if (looseCompare(rawValues[i], searchKey) >= 0) best = i; else break }
    return best >= 0 ? best + 1 : '#N/A'
  },

  // ── Conditional Aggregates ──
  SUMIF: ({ args, strArg, cells, visited, ctx }) => {
    const criteriaRangeStr = args[0].trim(), criteria = stripQuotes(strArg(1))
    const sumRangeStr = args.length > 2 ? args[2].trim() : criteriaRangeStr
    const criteriaValues = getRangeRawValues(criteriaRangeStr, cells, visited, ctx)
    const sumValues = getRangeValues(sumRangeStr, cells, visited, ctx)
    let total = 0
    for (let i = 0; i < criteriaValues.length; i++) { if (matchesCriteria(criteriaValues[i], criteria)) total += sumValues[i] ?? 0 }
    return total
  },

  COUNTIF: ({ args, strArg, cells, visited, ctx }) => {
    const criteriaRangeStr = args[0].trim(), criteria = stripQuotes(strArg(1))
    const criteriaValues = getRangeRawValues(criteriaRangeStr, cells, visited, ctx)
    let count = 0; for (const v of criteriaValues) { if (matchesCriteria(v, criteria)) count++ }
    return count
  },

  AVERAGEIF: ({ args, strArg, cells, visited, ctx }) => {
    const criteriaRangeStr = args[0].trim(), criteria = stripQuotes(strArg(1))
    const avgRangeStr = args.length > 2 ? args[2].trim() : criteriaRangeStr
    const criteriaValues = getRangeRawValues(criteriaRangeStr, cells, visited, ctx)
    const avgValues = getRangeValues(avgRangeStr, cells, visited, ctx)
    let total = 0, count = 0
    for (let i = 0; i < criteriaValues.length; i++) { if (matchesCriteria(criteriaValues[i], criteria)) { total += avgValues[i] ?? 0; count++ } }
    return count > 0 ? total / count : '#DIV/0!'
  },

  SUMIFS: ({ args, cells, visited, ctx, cellKey }) => {
    if (args.length < 3 || (args.length - 1) % 2 !== 0) return '#ERROR!'
    const sumValues = getRangeValues(args[0].trim(), cells, visited, ctx)
    const pairs: { values: (string | number)[]; criteria: string }[] = []
    for (let i = 1; i < args.length; i += 2) {
      pairs.push({ values: getRangeRawValues(args[i].trim(), cells, visited, ctx), criteria: stripQuotes(String(evaluateExpression(args[i + 1].trim(), cells, visited, ctx, cellKey))) })
    }
    let total = 0
    for (let i = 0; i < sumValues.length; i++) { if (pairs.every((p) => matchesCriteria(p.values[i] ?? '', p.criteria))) total += sumValues[i] ?? 0 }
    return total
  },

  // ── Statistical ──
  MEDIAN: ({ args, cells, visited, ctx }) => {
    const values = getRangeValues(args[0].trim(), cells, visited, ctx)
    if (values.length === 0) return '#NUM!'
    const sorted = [...values].sort((a, b) => a - b), mid = Math.floor(sorted.length / 2)
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
  },

  MODE: ({ args, cells, visited, ctx }) => {
    const values = getRangeValues(args[0].trim(), cells, visited, ctx)
    if (values.length === 0) return '#NUM!'
    const freq = new Map<number, number>()
    for (const v of values) freq.set(v, (freq.get(v) ?? 0) + 1)
    let maxCount = 0, modeVal = values[0]
    for (const [val, count] of freq) { if (count > maxCount) { maxCount = count; modeVal = val } }
    return maxCount <= 1 ? '#N/A' : modeVal
  },

  STDEV: ({ args, cells, visited, ctx }) => {
    const values = getRangeValues(args[0].trim(), cells, visited, ctx)
    if (values.length < 2) return '#DIV/0!'
    const mean = values.reduce((a, b) => a + b, 0) / values.length
    return Math.sqrt(values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (values.length - 1))
  },

  VAR: ({ args, cells, visited, ctx }) => {
    const values = getRangeValues(args[0].trim(), cells, visited, ctx)
    if (values.length < 2) return '#DIV/0!'
    const mean = values.reduce((a, b) => a + b, 0) / values.length
    return values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (values.length - 1)
  },

  COUNTA: ({ args, cells, visited, ctx }) => getRangeRawValues(args[0].trim(), cells, visited, ctx).filter((v) => v !== '').length,

  // ── Conditional Aggregates (multi-criteria) ──
  COUNTIFS: ({ args, cells, visited, ctx, cellKey }) => {
    if (args.length < 2 || args.length % 2 !== 0) return '#ERROR!'
    const pairs: { values: (string | number)[]; criteria: string }[] = []
    for (let i = 0; i < args.length; i += 2) {
      pairs.push({ values: getRangeRawValues(args[i].trim(), cells, visited, ctx), criteria: stripQuotes(String(evaluateExpression(args[i + 1].trim(), cells, visited, ctx, cellKey))) })
    }
    const len = pairs[0]?.values.length ?? 0
    let count = 0; for (let i = 0; i < len; i++) { if (pairs.every((p) => matchesCriteria(p.values[i] ?? '', p.criteria))) count++ }
    return count
  },

  AVERAGEIFS: ({ args, cells, visited, ctx, cellKey }) => {
    if (args.length < 3 || (args.length - 1) % 2 !== 0) return '#ERROR!'
    const avgValues = getRangeValues(args[0].trim(), cells, visited, ctx)
    const pairs: { values: (string | number)[]; criteria: string }[] = []
    for (let i = 1; i < args.length; i += 2) {
      pairs.push({ values: getRangeRawValues(args[i].trim(), cells, visited, ctx), criteria: stripQuotes(String(evaluateExpression(args[i + 1].trim(), cells, visited, ctx, cellKey))) })
    }
    let total = 0, count = 0
    for (let i = 0; i < avgValues.length; i++) { if (pairs.every((p) => matchesCriteria(p.values[i] ?? '', p.criteria))) { total += avgValues[i] ?? 0; count++ } }
    return count > 0 ? total / count : '#DIV/0!'
  },

  // ── Math/Statistical (additional) ──
  PRODUCT: ({ args, cells, visited, ctx }) => { const v = getRangeValues(args[0].trim(), cells, visited, ctx); return v.length > 0 ? v.reduce((a, b) => a * b, 1) : 0 },

  SUMPRODUCT: ({ args, cells, visited, ctx }) => {
    if (args.length < 2) return '#ERROR!'
    const ranges = args.map((a) => getRangeValues(a.trim(), cells, visited, ctx))
    const len = ranges[0]?.length ?? 0
    if (ranges.some((r) => r.length !== len)) return '#VALUE!'
    let total = 0; for (let i = 0; i < len; i++) { let product = 1; for (const r of ranges) product *= r[i] ?? 0; total += product }
    return total
  },

  LARGE: ({ args, numArg, cells, visited, ctx }) => {
    const values = getRangeValues(args[0].trim(), cells, visited, ctx), k = numArg(1)
    if (k < 1 || k > values.length) return '#NUM!'
    return [...values].sort((a, b) => b - a)[k - 1]
  },

  SMALL: ({ args, numArg, cells, visited, ctx }) => {
    const values = getRangeValues(args[0].trim(), cells, visited, ctx), k = numArg(1)
    if (k < 1 || k > values.length) return '#NUM!'
    return [...values].sort((a, b) => a - b)[k - 1]
  },

  RANK: ({ args, numArg, cells, visited, ctx }) => {
    const num = numArg(0), values = getRangeValues(args[1].trim(), cells, visited, ctx)
    const order = args.length > 2 ? numArg(2, 0) : 0
    const sorted = [...values].sort((a, b) => (order === 0 ? b - a : a - b))
    const rank = sorted.indexOf(num); return rank >= 0 ? rank + 1 : '#N/A'
  },

  SIGN: ({ numArg }) => { const n = numArg(0); return n > 0 ? 1 : n < 0 ? -1 : 0 },

  FACT: ({ numArg }) => {
    const n = numArg(0); if (n < 0 || !Number.isInteger(n)) return '#NUM!'
    let result = 1; for (let i = 2; i <= n; i++) result *= i; return result
  },

  GCD: ({ numArg }) => {
    let a = Math.abs(Math.floor(numArg(0))), b = Math.abs(Math.floor(numArg(1)))
    while (b) { const t = b; b = a % b; a = t }; return a
  },

  LCM: ({ numArg }) => {
    const a = Math.abs(Math.floor(numArg(0))), b = Math.abs(Math.floor(numArg(1)))
    if (a === 0 && b === 0) return 0
    let gcdVal = a, temp = b
    while (temp) { const t = temp; temp = gcdVal % temp; gcdVal = t }
    return (a * b) / gcdVal
  },

  // ── Financial ──
  // PMT(rate, nper, pv, [fv], [type]) — periodic payment for a loan/annuity.
  PMT: ({ numArg, args }) => {
    const rate = numArg(0), nper = numArg(1), pv = numArg(2)
    const fv = args.length > 3 ? numArg(3) : 0
    const type = args.length > 4 ? numArg(4) : 0
    if (nper === 0) return '#NUM!'
    if (rate === 0) return -(pv + fv) / nper
    const p = Math.pow(1 + rate, nper)
    return -(rate * (fv + pv * p)) / ((1 + rate * type) * (p - 1))
  },
  // FV(rate, nper, pmt, [pv], [type]) — future value.
  FV: ({ numArg, args }) => {
    const rate = numArg(0), nper = numArg(1), pmt = numArg(2)
    const pv = args.length > 3 ? numArg(3) : 0
    const type = args.length > 4 ? numArg(4) : 0
    if (rate === 0) return -(pv + pmt * nper)
    const p = Math.pow(1 + rate, nper)
    return -(pv * p + pmt * (1 + rate * type) * (p - 1) / rate)
  },
  // PV(rate, nper, pmt, [fv], [type]) — present value.
  PV: ({ numArg, args }) => {
    const rate = numArg(0), nper = numArg(1), pmt = numArg(2)
    const fv = args.length > 3 ? numArg(3) : 0
    const type = args.length > 4 ? numArg(4) : 0
    if (rate === 0) return -(fv + pmt * nper)
    const p = Math.pow(1 + rate, nper)
    return -(fv + pmt * (1 + rate * type) * (p - 1) / rate) / p
  },
  // NPER(rate, pmt, pv, [fv], [type]) — number of periods.
  NPER: ({ numArg, args }) => {
    const rate = numArg(0), pmt = numArg(1), pv = numArg(2)
    const fv = args.length > 3 ? numArg(3) : 0
    const type = args.length > 4 ? numArg(4) : 0
    if (rate === 0) { if (pmt === 0) return '#NUM!'; return -(pv + fv) / pmt }
    const adj = pmt * (1 + rate * type)
    const num = adj - fv * rate
    const den = pv * rate + adj
    if (num / den <= 0) return '#NUM!'
    return Math.log(num / den) / Math.log(1 + rate)
  },
  // RATE(nper, pmt, pv, [fv], [type], [guess]) — interest rate (Newton's method).
  RATE: ({ numArg, args }) => {
    const nper = numArg(0), pmt = numArg(1), pv = numArg(2)
    const fv = args.length > 3 ? numArg(3) : 0
    const type = args.length > 4 ? numArg(4) : 0
    let rate = args.length > 5 ? numArg(5) : 0.1
    for (let i = 0; i < 50; i++) {
      const p = Math.pow(1 + rate, nper)
      const f = pv * p + pmt * (1 + rate * type) * (p - 1) / (rate || 1e-10) + fv
      // numeric derivative
      const dr = 1e-6
      const p2 = Math.pow(1 + rate + dr, nper)
      const f2 = pv * p2 + pmt * (1 + (rate + dr) * type) * (p2 - 1) / ((rate + dr) || 1e-10) + fv
      const deriv = (f2 - f) / dr
      if (Math.abs(deriv) < 1e-12) break
      const next = rate - f / deriv
      if (Math.abs(next - rate) < 1e-8) return next
      rate = next
    }
    return rate
  },
  // IPMT(rate, per, nper, pv, [fv], [type]) — interest portion of a payment.
  IPMT: (ctx) => {
    const { numArg, args } = ctx
    const rate = numArg(0), per = numArg(1), nper = numArg(2), pv = numArg(3)
    const fv = args.length > 4 ? numArg(4) : 0
    const type = args.length > 5 ? numArg(5) : 0
    if (per < 1 || per > nper) return '#NUM!'
    const pmt = FINANCIAL_PMT(rate, nper, pv, fv, type)
    // balance at start of period `per`
    let bal = pv
    for (let i = 1; i < per; i++) bal = bal * (1 + rate) + pmt
    const interest = type === 1 ? 0 : -bal * rate
    return interest
  },
  // PPMT(rate, per, nper, pv, [fv], [type]) — principal portion of a payment.
  PPMT: ({ numArg, args }) => {
    const rate = numArg(0), per = numArg(1), nper = numArg(2), pv = numArg(3)
    const fv = args.length > 4 ? numArg(4) : 0
    const type = args.length > 5 ? numArg(5) : 0
    if (per < 1 || per > nper) return '#NUM!'
    const pmt = FINANCIAL_PMT(rate, nper, pv, fv, type)
    let bal = pv
    for (let i = 1; i < per; i++) bal = bal * (1 + rate) + pmt
    const interest = type === 1 ? 0 : -bal * rate
    return pmt - interest
  },

  // ── Trigonometry ──
  SIN: ({ numArg }) => Math.sin(numArg(0)),
  COS: ({ numArg }) => Math.cos(numArg(0)),
  TAN: ({ numArg }) => Math.tan(numArg(0)),
  ASIN: ({ numArg }) => { const n = numArg(0); return (n < -1 || n > 1) ? '#NUM!' : Math.asin(n) },
  ACOS: ({ numArg }) => { const n = numArg(0); return (n < -1 || n > 1) ? '#NUM!' : Math.acos(n) },
  ATAN: ({ numArg }) => Math.atan(numArg(0)),
  ATAN2: ({ numArg }) => Math.atan2(numArg(1), numArg(0)),
  DEGREES: ({ numArg }) => (numArg(0) * 180) / Math.PI,
  RADIANS: ({ numArg }) => (numArg(0) * Math.PI) / 180,

  // ── String (additional) ──
  SEARCH: ({ args, strArg, numArg }) => {
    const search = strArg(0).toLowerCase(), text = strArg(1).toLowerCase()
    const startPos = args.length > 2 ? numArg(2, 1) - 1 : 0
    const idx = text.indexOf(search, startPos); return idx === -1 ? '#VALUE!' : idx + 1
  },
  REPLACE: ({ strArg, numArg }) => { const text = strArg(0), start = numArg(1) - 1, numChars = numArg(2), newText = strArg(3); return text.substring(0, start) + newText + text.substring(start + numChars) },
  EXACT: ({ strArg }) => strArg(0) === strArg(1) ? 1 : 0,
  CLEAN: ({ strArg }) => strArg(0).replace(/[\x00-\x1F]/g, ''),
  CODE: ({ strArg }) => { const s = strArg(0); return s.length === 0 ? '#VALUE!' : s.charCodeAt(0) },
  CHAR: ({ numArg }) => { const n = numArg(0); return (n < 1 || n > 65535) ? '#VALUE!' : String.fromCharCode(n) },

  // ── Logical (additional) ──
  IFS: ({ args, cells, visited, ctx, cellKey }) => {
    for (let i = 0; i < args.length - 1; i += 2) {
      if (evaluateCondition(args[i].trim(), cells, visited, ctx)) return evaluateExpression(args[i + 1].trim(), cells, visited, ctx, cellKey)
    }
    return '#N/A'
  },

  SWITCH: ({ args, anyArg, cells, visited, ctx, cellKey }) => {
    if (args.length < 3) return '#ERROR!'
    const switchExpr = anyArg(0)
    for (let i = 1; i < args.length - 1; i += 2) {
      const caseVal = evaluateExpression(args[i].trim(), cells, visited, ctx, cellKey)
      if (looseEqual(switchExpr, caseVal)) return evaluateExpression(args[i + 1].trim(), cells, visited, ctx, cellKey)
    }
    return args.length % 2 === 0 ? evaluateExpression(args[args.length - 1].trim(), cells, visited, ctx, cellKey) : '#N/A'
  },

  CHOOSE: ({ args, numArg, cells, visited, ctx, cellKey }) => {
    const idx = numArg(0); return (idx < 1 || idx >= args.length) ? '#VALUE!' : evaluateExpression(args[idx].trim(), cells, visited, ctx, cellKey)
  },

  ISEVEN: ({ numArg }) => Math.floor(numArg(0)) % 2 === 0 ? 1 : 0,
  ISODD: ({ numArg }) => Math.floor(numArg(0)) % 2 !== 0 ? 1 : 0,

  ISERROR: ({ args, cells, visited, ctx, cellKey }) => {
    try { const val = evaluateExpression(args[0].trim(), cells, visited, ctx, cellKey); return typeof val === 'string' && val.startsWith('#') ? 1 : 0 } catch { return 1 }
  },

  // ── Date (additional) ──
  DATEDIF: ({ numArg, strArg }) => {
    const startSerial = numArg(0), endSerial = numArg(1), unit = stripQuotes(strArg(2)).toUpperCase()
    const startDate = serialToDate(startSerial), endDate = serialToDate(endSerial)
    if (endSerial < startSerial) return '#NUM!'
    if (unit === 'Y') { let y = endDate.year - startDate.year; if (endDate.month < startDate.month || (endDate.month === startDate.month && endDate.day < startDate.day)) y--; return y }
    if (unit === 'M') { let m = (endDate.year - startDate.year) * 12 + (endDate.month - startDate.month); if (endDate.day < startDate.day) m--; return m }
    if (unit === 'D') return Math.floor(endSerial - startSerial)
    return '#VALUE!'
  },

  WEEKDAY: ({ args, numArg }) => {
    const serial = numArg(0), type = args.length > 1 ? numArg(1, 1) : 1
    const { year, month, day } = serialToDate(serial), d = new Date(year, month - 1, day), jsDay = d.getDay()
    if (type === 1) return jsDay + 1; if (type === 2) return jsDay === 0 ? 7 : jsDay; if (type === 3) return jsDay === 0 ? 6 : jsDay - 1
    return jsDay + 1
  },

  HOUR: ({ numArg }) => { const f = numArg(0) - Math.floor(numArg(0)); return Math.floor(f * 24) },
  MINUTE: ({ numArg }) => { const f = numArg(0) - Math.floor(numArg(0)); return Math.floor((f * 1440) % 60) },
  SECOND: ({ numArg }) => { const f = numArg(0) - Math.floor(numArg(0)); return Math.floor((f * 86400) % 60) },

  // ── ROW / COLUMN ──
  ROW: ({ cellKey }) => { if (cellKey) { const [r] = cellKey.split('-').map(Number); return r + 1 } return '#REF!' },
  COLUMN: ({ cellKey }) => { if (cellKey) { const parts = cellKey.split('-').map(Number); return parts[1] + 1 } return '#REF!' },

  // ── SPARKLINE ──
  SPARKLINE: ({ args, strArg, cells, visited, ctx }) => {
    if (args.length < 1) return '#ERROR!'
    const sparkType = args.length > 1 ? stripQuotes(strArg(1)).toLowerCase() : 'line'
    const resolvedType = ['line', 'bar', 'win-loss'].includes(sparkType) ? sparkType : 'line'
    const values = getRangeValues(args[0].trim(), cells, visited, ctx)
    return values.length === 0 ? '' : `__SPARKLINE:${resolvedType}:${values.join(',')}`
  },

  // ── Dynamic Array Functions ──
  FILTER: ({ args, cells, visited, ctx, cellKey }) => {
    if (args.length < 3) return '#ERROR!'
    const criteria = stripQuotes(String(evaluateExpression(args[2].trim(), cells, visited, ctx, cellKey)))
    const dataValues = getRangeRawValues(args[0].trim(), cells, visited, ctx)
    const criteriaValues = getRangeRawValues(args[1].trim(), cells, visited, ctx)
    const result: (string | number)[] = []
    for (let i = 0; i < dataValues.length; i++) { if (i < criteriaValues.length && matchesCriteria(criteriaValues[i], criteria)) result.push(dataValues[i]) }
    return result.length === 0 ? '#CALC!' : `__SPILL:${result.join('|')}`
  },

  UNIQUE: ({ args, cells, visited, ctx }) => {
    if (args.length < 1) return '#ERROR!'
    const rawValues = getRangeRawValues(args[0].trim(), cells, visited, ctx)
    const seen = new Set<string>(); const unique: (string | number)[] = []
    for (const v of rawValues) { const key = String(v).toLowerCase(); if (!seen.has(key)) { seen.add(key); unique.push(v) } }
    return unique.length === 0 ? '' : `__SPILL:${unique.join('|')}`
  },

  SORT: ({ args, numArg, cells, visited, ctx }) => {
    if (args.length < 1) return '#ERROR!'
    const sortOrder = args.length > 2 ? numArg(2, 1) : 1
    const rawValues = getRangeRawValues(args[0].trim(), cells, visited, ctx)
    if (rawValues.length === 0) return ''
    const sorted = [...rawValues].sort((a, b) => { const cmp = looseCompare(a, b); return sortOrder === 1 ? cmp : -cmp })
    return `__SPILL:${sorted.join('|')}`
  },

  SORTBY: ({ args, numArg, cells, visited, ctx }) => {
    if (args.length < 2) return '#ERROR!'
    const order = args.length > 2 ? numArg(2, 1) : 1
    const dataValues = getRangeRawValues(args[0].trim(), cells, visited, ctx)
    const byValues = getRangeRawValues(args[1].trim(), cells, visited, ctx)
    if (dataValues.length === 0) return ''
    const indices = dataValues.map((_, i) => i)
    indices.sort((a, b) => { const va = a < byValues.length ? byValues[a] : ''; const vb = b < byValues.length ? byValues[b] : ''; const cmp = looseCompare(va, vb); return order === 1 ? cmp : -cmp })
    return `__SPILL:${indices.map((i) => dataValues[i]).join('|')}`
  },

  SEQUENCE: ({ args, numArg }) => {
    const rows = numArg(0, 1), cols = args.length > 1 ? numArg(1, 1) : 1, start = args.length > 2 ? numArg(2, 1) : 1, step = args.length > 3 ? numArg(3, 1) : 1
    const total = rows * cols; if (total < 1 || total > 10000) return '#ERROR!'
    const seq: number[] = []; for (let i = 0; i < total; i++) seq.push(start + i * step)
    return `__SPILL:${seq.join('|')}`
  },

  // ── XLOOKUP ──
  XLOOKUP: ({ args, anyArg, numArg, cells, visited, ctx, cellKey }) => {
    if (args.length < 3) return '#ERROR!'
    const lookupValue = anyArg(0)
    const ifNotFound = args.length > 3 ? evaluateExpression(args[3].trim(), cells, visited, ctx, cellKey) : '#N/A'
    const matchMode = args.length > 4 ? numArg(4, 0) : 0
    const searchMode = args.length > 5 ? numArg(5, 1) : 1
    const lookupValues = getRangeRawValues(args[1].trim(), cells, visited, ctx)
    const returnValues = getRangeRawValues(args[2].trim(), cells, visited, ctx)

    if (matchMode === 0) {
      if (searchMode === 1) { for (let i = 0; i < lookupValues.length; i++) { if (looseEqual(lookupValues[i], lookupValue)) return i < returnValues.length ? returnValues[i] : ifNotFound } }
      else { for (let i = lookupValues.length - 1; i >= 0; i--) { if (looseEqual(lookupValues[i], lookupValue)) return i < returnValues.length ? returnValues[i] : ifNotFound } }
      return ifNotFound
    }
    if (matchMode === -1) {
      let bestIdx = -1
      for (let i = 0; i < lookupValues.length; i++) {
        if (looseEqual(lookupValues[i], lookupValue)) return i < returnValues.length ? returnValues[i] : ifNotFound
        if (looseCompare(lookupValues[i], lookupValue) < 0 && (bestIdx === -1 || looseCompare(lookupValues[i], lookupValues[bestIdx]) > 0)) bestIdx = i
      }
      return bestIdx >= 0 && bestIdx < returnValues.length ? returnValues[bestIdx] : ifNotFound
    }
    if (matchMode === 1) {
      let bestIdx = -1
      for (let i = 0; i < lookupValues.length; i++) {
        if (looseEqual(lookupValues[i], lookupValue)) return i < returnValues.length ? returnValues[i] : ifNotFound
        if (looseCompare(lookupValues[i], lookupValue) > 0 && (bestIdx === -1 || looseCompare(lookupValues[i], lookupValues[bestIdx]) < 0)) bestIdx = i
      }
      return bestIdx >= 0 && bestIdx < returnValues.length ? returnValues[bestIdx] : ifNotFound
    }
    return ifNotFound
  },

  // ── QUERY ──
  QUERY: ({ args, strArg, cells, visited, ctx }) => {
    if (args.length < 2) return '#ERROR!'
    const queryStr = stripQuotes(strArg(1))
    const data2D = getRange2D(args[0].trim(), cells, visited, ctx)
    if (data2D.length === 0) return '#ERROR!'
    const qUpper = queryStr.toUpperCase().trim()
    const selectMatch = qUpper.match(/^SELECT\s+(.+?)(?:\s+WHERE\s+|\s+ORDER\s+BY\s+|\s+LIMIT\s+|$)/)
    if (!selectMatch) return '#ERROR!'
    const selectPart = selectMatch[1].trim()
    const selectCols = selectPart === '*' ? data2D[0].map((_, i) => i) : selectPart.split(',').map((s) => { const match = s.trim().match(/^([A-Z]+)$/i); return match ? match[1].toUpperCase().charCodeAt(0) - 65 : -1 }).filter((i) => i >= 0)
    if (selectCols.length === 0) return '#ERROR!'
    let filteredRows = data2D.slice(0)
    const whereMatch = queryStr.match(/WHERE\s+(.+?)(?:\s+ORDER\s+BY\s+|\s+LIMIT\s+|$)/i)
    if (whereMatch) {
      const condMatch = whereMatch[1].trim().match(/^([A-Z])\s*(>=|<=|<>|!=|>|<|=)\s*(.+)$/i)
      if (condMatch) {
        const condColIdx = condMatch[1].toUpperCase().charCodeAt(0) - 65, condOp = condMatch[2], condValRaw = condMatch[3].trim().replace(/^['"]|['"]$/g, ''), condValNum = parseFloat(condValRaw)
        filteredRows = filteredRows.filter((row) => {
          if (condColIdx >= row.length) return false
          const cellVal = row[condColIdx], cellNum = typeof cellVal === 'number' ? cellVal : parseFloat(String(cellVal)), useNum = !isNaN(cellNum) && !isNaN(condValNum)
          switch (condOp) {
            case '>': return useNum ? cellNum > condValNum : String(cellVal) > condValRaw
            case '<': return useNum ? cellNum < condValNum : String(cellVal) < condValRaw
            case '>=': return useNum ? cellNum >= condValNum : String(cellVal) >= condValRaw
            case '<=': return useNum ? cellNum <= condValNum : String(cellVal) <= condValRaw
            case '=': return useNum ? cellNum === condValNum : String(cellVal).toLowerCase() === condValRaw.toLowerCase()
            case '<>': case '!=': return useNum ? cellNum !== condValNum : String(cellVal).toLowerCase() !== condValRaw.toLowerCase()
            default: return true
          }
        })
      }
    }
    const orderMatch = queryStr.match(/ORDER\s+BY\s+([A-Z])\s*(ASC|DESC)?/i)
    if (orderMatch) { const oCol = orderMatch[1].toUpperCase().charCodeAt(0) - 65, oDir = (orderMatch[2] || 'ASC').toUpperCase(); filteredRows.sort((a, b) => { const cmp = looseCompare(oCol < a.length ? a[oCol] : '', oCol < b.length ? b[oCol] : ''); return oDir === 'DESC' ? -cmp : cmp }) }
    const limitMatch = queryStr.match(/LIMIT\s+(\d+)/i)
    if (limitMatch) filteredRows = filteredRows.slice(0, parseInt(limitMatch[1], 10))
    const resultRows = filteredRows.map((row) => selectCols.map((ci) => (ci < row.length ? row[ci] : '')))
    if (resultRows.length === 0) return ''
    return `__SPILL:${resultRows.map((row) => row.join(',')).join('|')}`
  },

  // ── INDIRECT ──
  INDIRECT: ({ strArg, cells, visited, ctx }) => {
    const refText = stripQuotes(strArg(0)); if (!refText) return '#REF!'
    const crossRef = parseCrossSheetRef(refText)
    if (crossRef.sheetName) {
      const targetCells = resolveCells(crossRef.sheetName, cells, ctx)
      const cellRefKey = refToCellKey(crossRef.ref); if (!cellRefKey) return '#REF!'
      return evaluateCellInternal(cellRefKey, targetCells, new Set(visited), ctx)
    }
    const cellRefKey = refToCellKey(refText); if (!cellRefKey) return '#REF!'
    return evaluateCellInternal(cellRefKey, cells, new Set(visited), ctx)
  },

  // ── OFFSET ──
  OFFSET: ({ args, numArg, cells, visited, ctx }) => {
    if (args.length < 3) return '#ERROR!'
    const crossRef = parseCrossSheetRef(args[0].trim())
    const baseCellKey = refToCellKey(crossRef.ref); if (!baseCellKey) return '#REF!'
    const [baseRow, baseCol] = baseCellKey.split('-').map(Number)
    const targetRow = baseRow + numArg(1), targetCol = baseCol + numArg(2)
    if (targetRow < 0 || targetCol < 0) return '#REF!'
    const targetCells = resolveCells(crossRef.sheetName, cells, ctx)
    const height = args.length > 3 ? numArg(3, 1) : 1, width = args.length > 4 ? numArg(4, 1) : 1
    if (height === 1 && width === 1) return evaluateCellInternal(`${targetRow}-${targetCol}`, targetCells, new Set(visited), ctx)
    const values: number[] = []
    for (let r = targetRow; r < targetRow + height; r++) {
      for (let c = targetCol; c < targetCol + width; c++) {
        const val = evaluateCellInternal(`${r}-${c}`, targetCells, new Set(visited), ctx)
        if (typeof val === 'number' && !isNaN(val)) values.push(val)
        else if (typeof val === 'string') { const n = parseFloat(val); if (!isNaN(n)) values.push(n) }
      }
    }
    return values.reduce((a, b) => a + b, 0)
  },

  // ── IMAGE ──
  IMAGE: ({ strArg }) => { const url = stripQuotes(strArg(0)); return url ? `__IMAGE__${url}__` : '#VALUE!' },

  // ── LET ──
  LET: ({ args, cells, visited, ctx, cellKey }) => {
    if (args.length < 3 || args.length % 2 === 0) return '#ERROR!'
    const letCells = { ...cells }; const bindingCount = Math.floor(args.length / 2)
    for (let i = 0; i < bindingCount; i++) {
      const varName = stripQuotes(args[i * 2].trim()).toUpperCase()
      const varValue = evaluateExpression(args[i * 2 + 1].trim(), letCells, visited, ctx, cellKey)
      letCells[`__LET_${varName}`] = { value: String(varValue) }
    }
    let resolvedCalc = args[args.length - 1].trim()
    for (let i = 0; i < bindingCount; i++) {
      const varName = stripQuotes(args[i * 2].trim()).toUpperCase()
      const syntheticKey = `__LET_${varName}`
      if (letCells[syntheticKey]) {
        const escapedName = varName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const val = evaluateCellInternal(syntheticKey, letCells, new Set(visited), ctx)
        resolvedCalc = resolvedCalc.replace(new RegExp(`\\b${escapedName}\\b`, 'g'), typeof val === 'number' ? String(val) : `"${val}"`)
      }
    }
    return evaluateExpression(resolvedCalc, cells, visited, ctx, cellKey)
  },
}

function evaluateFunction(
  name: string,
  argsStr: string,
  cells: Record<string, Cell>,
  visited: Set<string>,
  ctx: FormulaContext,
  cellKey?: string,
): string | number {
  const fn = name.toUpperCase()
  const args = splitArgs(argsStr)

  const numArg = (i: number, defaultVal?: number): number => {
    if (i >= args.length) return defaultVal ?? 0
    const v = evaluateExpression(args[i].trim(), cells, visited, ctx, cellKey)
    return typeof v === 'number' ? v : parseFloat(String(v)) || (defaultVal ?? 0)
  }

  const strArg = (i: number): string => {
    if (i >= args.length) return ''
    const v = evaluateExpression(args[i].trim(), cells, visited, ctx, cellKey)
    return String(v)
  }

  const anyArg = (i: number): string | number => {
    if (i >= args.length) return ''
    return evaluateExpression(args[i].trim(), cells, visited, ctx, cellKey)
  }

  const impl = FUNCTION_MAP[fn]
  if (impl) {
    return impl({ args, cells, visited, ctx, cellKey, numArg, strArg, anyArg })
  }
  return '#ERROR!'
}

// ── Expression evaluation (supports &, arithmetic, parenthesized groups) ──

function evaluateExpression(
  expr: string,
  cells: Record<string, Cell>,
  visited: Set<string>,
  ctx: FormulaContext,
  cellKey?: string,
): string | number {
  expr = expr.trim()
  if (!expr) return 0

  // String literal
  if ((expr.startsWith('"') && expr.endsWith('"')) || (expr.startsWith("'") && expr.endsWith("'"))) {
    return expr.slice(1, -1)
  }

  // Pure number
  if (/^-?\d+\.?\d*$/.test(expr)) {
    return parseFloat(expr)
  }

  // Handle & (string concatenation) at top level
  if (containsOperatorAtTopLevel(expr, '&')) {
    return evaluateStringConcat(expr, cells, visited, ctx, cellKey)
  }

  // Function call: NAME(args) — handles zero-arg functions like PI(), TODAY() etc.
  // Must verify the opening paren matches the closing paren at the end
  const funcMatch = expr.match(/^([A-Za-z]+)\(/)
  if (funcMatch) {
    const parenStart = funcMatch[0].length - 1
    const parenEnd = findMatchingParen(expr, parenStart)
    if (parenEnd === expr.length - 1) {
      const argsStr = expr.substring(parenStart + 1, parenEnd)
      return evaluateFunction(funcMatch[1], argsStr, cells, visited, ctx, cellKey)
    }
  }

  // Parenthesized expression
  if (expr.startsWith('(') && findMatchingParen(expr, 0) === expr.length - 1) {
    return evaluateExpression(expr.slice(1, -1), cells, visited, ctx, cellKey)
  }

  // Cross-sheet cell reference (e.g., Sheet2!A1 or 'Sheet Name'!A1)
  const crossRef = parseCrossSheetRef(expr)
  if (crossRef.sheetName) {
    const targetCells = resolveCells(crossRef.sheetName, cells, ctx)
    // Could be a range like Sheet2!A1:B5
    if (crossRef.ref.includes(':')) {
      // This is a range reference in another sheet - will be handled by function args
      // For standalone cross-sheet range, return first cell value
      const rangeRect = parseRange(crossRef.ref)
      if (rangeRect) {
        const key = `${rangeRect.startRow}-${rangeRect.startCol}`
        return evaluateCellInternal(key, targetCells, new Set(visited), ctx)
      }
    }
    const cellRefKey = refToCellKey(crossRef.ref)
    if (cellRefKey) {
      return evaluateCellInternal(cellRefKey, targetCells, new Set(visited), ctx)
    }
  }

  // Cell reference (with $ stripping)
  const cellRefKey = refToCellKey(expr)
  if (cellRefKey) {
    return evaluateCellInternal(cellRefKey, cells, new Set(visited), ctx)
  }

  // Arithmetic expression
  return evaluateArithmetic(expr, cells, visited, ctx, cellKey)
}

/** Check if an operator exists at the top level (not inside parens or strings) */
function containsOperatorAtTopLevel(expr: string, op: string): boolean {
  let depth = 0
  let inString = false
  let stringChar = ''
  for (let i = 0; i < expr.length; i++) {
    const ch = expr[i]
    if (inString) {
      if (ch === stringChar) inString = false
      continue
    }
    if (ch === '"' || ch === "'") {
      inString = true
      stringChar = ch
      continue
    }
    if (ch === '(') depth++
    else if (ch === ')') depth--
    if (depth === 0 && expr.substring(i, i + op.length) === op) return true
  }
  return false
}

/** Find the closing paren index matching paren at position pos */
function findMatchingParen(expr: string, pos: number): number {
  let depth = 0
  for (let i = pos; i < expr.length; i++) {
    if (expr[i] === '(') depth++
    else if (expr[i] === ')') {
      depth--
      if (depth === 0) return i
    }
  }
  return -1
}

/** Evaluate string concatenation with & */
function evaluateStringConcat(
  expr: string,
  cells: Record<string, Cell>,
  visited: Set<string>,
  ctx: FormulaContext,
  cellKey?: string,
): string {
  const parts: string[] = []
  let depth = 0
  let current = ''
  let inString = false
  let stringChar = ''

  for (let i = 0; i < expr.length; i++) {
    const ch = expr[i]
    if (inString) {
      current += ch
      if (ch === stringChar) inString = false
      continue
    }
    if (ch === '"' || ch === "'") {
      inString = true
      stringChar = ch
      current += ch
      continue
    }
    if (ch === '(') depth++
    else if (ch === ')') depth--
    if (depth === 0 && ch === '&') {
      parts.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  if (current) parts.push(current)

  return parts
    .map((p) => {
      const val = evaluateExpression(p.trim(), cells, visited, ctx, cellKey)
      return String(val)
    })
    .join('')
}

/** Tokenize and evaluate arithmetic with correct operator precedence and paren support */
function evaluateArithmetic(
  expr: string,
  cells: Record<string, Cell>,
  visited: Set<string>,
  ctx: FormulaContext,
  cellKey?: string,
): string | number {
  const tokens: (string | number)[] = []
  let current = ''
  let depth = 0
  let inString = false
  let stringChar = ''

  for (let i = 0; i < expr.length; i++) {
    const ch = expr[i]
    if (inString) {
      current += ch
      if (ch === stringChar) inString = false
      continue
    }
    if (ch === '"' || ch === "'") {
      inString = true
      stringChar = ch
      current += ch
      continue
    }
    if (ch === '(') depth++
    else if (ch === ')') depth--

    if (depth === 0 && (ch === '+' || ch === '-' || ch === '*' || ch === '/') && current.trim()) {
      tokens.push(current.trim())
      tokens.push(ch)
      current = ''
    } else {
      current += ch
    }
  }
  if (current.trim()) tokens.push(current.trim())

  if (tokens.length === 1) {
    const val = evaluateExpression(String(tokens[0]), cells, visited, ctx, cellKey)
    if (typeof val === 'string' && !val.startsWith('#')) return parseFloat(val) || 0
    return val
  }

  // Resolve each operand
  const resolvedTokens: (number | string)[] = tokens.map((t) => {
    if (typeof t === 'number') return t
    if (['+', '-', '*', '/'].includes(t as string)) return t
    const val = evaluateExpression(String(t), cells, visited, ctx, cellKey)
    if (typeof val === 'string' && val.startsWith('#')) return val
    return typeof val === 'number' ? val : parseFloat(String(val)) || 0
  })

  // Check for errors
  for (const t of resolvedTokens) {
    if (typeof t === 'string' && t.startsWith('#')) return t
  }

  // Multiply/divide pass
  const mdResult: (number | string)[] = []
  for (let i = 0; i < resolvedTokens.length; i++) {
    const token = resolvedTokens[i]
    if (token === '*' || token === '/') {
      const left = mdResult.pop() as number
      const right = resolvedTokens[++i] as number
      if (token === '/') {
        if (right === 0) return '#DIV/0!'
        mdResult.push(left / right)
      } else {
        mdResult.push(left * right)
      }
    } else {
      mdResult.push(resolvedTokens[i])
    }
  }

  // Add/subtract pass
  let result = mdResult[0] as number
  for (let i = 1; i < mdResult.length; i += 2) {
    const op = mdResult[i] as string
    const val = mdResult[i + 1] as number
    if (op === '+') result += val
    else if (op === '-') result -= val
  }

  return result
}


// ── Public API ──

export function evaluateCell(
  cellKey: string,
  cells: Record<string, Cell>,
  visited: Set<string> = new Set(),
  ctx: FormulaContext = DEFAULT_CTX,
): string | number {
  return evaluateCellInternal(cellKey, cells, visited, ctx)
}

export function recalcAllCells(
  cells: Record<string, Cell>,
  allSheets?: Sheet[],
  activeSheetId?: string,
): Record<string, string | number> {
  const ctx: FormulaContext = { allSheets: allSheets || [], activeSheetId: activeSheetId || '' }
  const computed: Record<string, string | number> = {}
  for (const key of Object.keys(cells)) {
    computed[key] = evaluateCellInternal(key, cells, new Set(), ctx)
  }
  return computed
}

/**
 * Async version of recalcAllCells that yields to the UI thread
 * when cell count exceeds 500, using setTimeout(0) chunking.
 * Returns a promise that resolves with the computed values.
 * The `onProgress` callback can be used to show a "計算中..." indicator.
 */
export function recalcAllCellsAsync(
  cells: Record<string, Cell>,
  allSheets?: Sheet[],
  activeSheetId?: string,
  onProgress?: (calculating: boolean) => void,
): Promise<Record<string, string | number>> {
  const keys = Object.keys(cells)
  const THRESHOLD = 500

  if (keys.length <= THRESHOLD) {
    // Small sheet: compute synchronously
    return Promise.resolve(recalcAllCells(cells, allSheets, activeSheetId))
  }

  // Large sheet: chunk computation to avoid blocking UI
  return new Promise((resolve) => {
    onProgress?.(true)
    const ctx: FormulaContext = { allSheets: allSheets || [], activeSheetId: activeSheetId || '' }
    const computed: Record<string, string | number> = {}
    const CHUNK_SIZE = 200
    let idx = 0

    function processChunk() {
      const end = Math.min(idx + CHUNK_SIZE, keys.length)
      for (; idx < end; idx++) {
        computed[keys[idx]] = evaluateCellInternal(keys[idx], cells, new Set(), ctx)
      }
      if (idx < keys.length) {
        setTimeout(processChunk, 0)
      } else {
        onProgress?.(false)
        resolve(computed)
      }
    }

    setTimeout(processChunk, 0)
  })
}

export function formatCellValue(raw: string | number, format?: { numberFormat?: string; customFormat?: string }): string {
  if (typeof raw === 'string') return raw
  if (!format?.numberFormat || format.numberFormat === 'plain') return String(raw)

  switch (format.numberFormat) {
    case 'number':
      return raw.toLocaleString('ja-JP', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
    case 'percent':
      return (raw * 100).toFixed(1) + '%'
    case 'currency':
      return '¥' + raw.toLocaleString('ja-JP')
    case 'currencyUSD':
      return (raw < 0 ? '-$' : '$') + Math.abs(raw).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    case 'currencyEUR':
      return (raw < 0 ? '-€' : '€') + Math.abs(raw).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    case 'comma':
      return raw.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
    case 'accounting': {
      // Accounting: currency symbol, negatives in parentheses (Excel style).
      const abs = Math.abs(raw).toLocaleString('ja-JP', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
      return raw < 0 ? `(¥${abs})` : `¥${abs}`
    }
    case 'date': {
      const { year, month, day } = serialToDate(raw)
      const mm = String(month).padStart(2, '0')
      const dd = String(day).padStart(2, '0')
      return `${year}/${mm}/${dd}`
    }
    case 'time': {
      const fraction = raw - Math.floor(raw)
      const totalSeconds = Math.round(fraction * 86400)
      const hours = Math.floor(totalSeconds / 3600)
      const minutes = Math.floor((totalSeconds % 3600) / 60)
      const seconds = totalSeconds % 60
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    }
    case 'scientific': {
      return raw.toExponential(2).toUpperCase()
    }
    case 'fraction': {
      const intPart = Math.floor(Math.abs(raw))
      const decPart = Math.abs(raw) - intPart
      if (decPart < 0.0001) return raw < 0 ? `-${intPart}` : String(intPart)
      // Find closest fraction with denominator up to 16
      let bestNum = 0, bestDen = 1, bestErr = decPart
      for (let den = 2; den <= 16; den++) {
        const num = Math.round(decPart * den)
        const err = Math.abs(decPart - num / den)
        if (err < bestErr) { bestNum = num; bestDen = den; bestErr = err }
      }
      const sign = raw < 0 ? '-' : ''
      if (bestNum === 0) return `${sign}${intPart}`
      if (intPart === 0) return `${sign}${bestNum}/${bestDen}`
      return `${sign}${intPart} ${bestNum}/${bestDen}`
    }
    case 'custom': {
      const pattern = format.customFormat || ''
      if (!pattern) return String(raw)
      try {
        return applyCustomFormat(raw, pattern)
      } catch {
        return String(raw)
      }
    }
    default:
      return String(raw)
  }
}

/** Apply a custom number format pattern to a numeric value */
function applyCustomFormat(value: number, pattern: string): string {
  const lower = pattern.toLowerCase()

  // Percentage format: 0% or 0.0% or 0.00%
  if (lower.endsWith('%')) {
    const pctPattern = lower.slice(0, -1)
    const decMatch = pctPattern.match(/\.(\d+|0+)$/)
    const decimals = decMatch ? decMatch[1].length : 0
    return (value * 100).toFixed(decimals) + '%'
  }

  // Date formats: yyyy/mm/dd, yyyy-mm-dd, mm/dd/yyyy, etc.
  if (/^[ymd\-\/\. ]+$/i.test(lower)) {
    const { year, month, day } = serialToDate(value)
    let result = pattern
    result = result.replace(/yyyy/gi, String(year))
    result = result.replace(/yy/gi, String(year).slice(-2))
    result = result.replace(/mm/gi, String(month).padStart(2, '0'))
    result = result.replace(/m/gi, String(month))
    result = result.replace(/dd/gi, String(day).padStart(2, '0'))
    result = result.replace(/d/gi, String(day))
    return result
  }

  // Number formats: #,##0 / 0.00 / #,##0.00 / #,##0.0 etc.
  const hasThousandsSep = pattern.includes(',')
  const decimalMatch = lower.match(/\.(0+|#+)/)
  const decimals = decimalMatch ? decimalMatch[1].length : 0

  const absValue = Math.abs(value)
  const sign = value < 0 ? '-' : ''

  let formatted: string
  if (decimals > 0) {
    formatted = absValue.toFixed(decimals)
  } else {
    formatted = Math.round(absValue).toString()
  }

  if (hasThousandsSep) {
    const parts = formatted.split('.')
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    formatted = parts.join('.')
  }

  return sign + formatted
}

// ── Formula Error Checker ──

/** Known function names recognized by the engine */
const KNOWN_FUNCTIONS = new Set([
  'PMT', 'FV', 'PV', 'NPER', 'RATE', 'IPMT', 'PPMT',
  'IF', 'SUM', 'AVG', 'AVERAGE', 'COUNT', 'MAX', 'MIN',
  'ABS', 'ROUND', 'ROUNDUP', 'ROUNDDOWN', 'FLOOR', 'CEILING',
  'SQRT', 'POWER', 'MOD', 'INT', 'RAND', 'RANDBETWEEN', 'PI',
  'LOG', 'LN', 'EXP', 'CONCAT', 'CONCATENATE', 'LEN', 'UPPER',
  'LOWER', 'PROPER', 'TRIM', 'LEFT', 'RIGHT', 'MID', 'FIND',
  'SUBSTITUTE', 'REPT', 'TEXTJOIN', 'TEXT', 'VALUE',
  'AND', 'OR', 'NOT', 'TRUE', 'FALSE', 'IFERROR', 'ISBLANK',
  'ISNUMBER', 'ISTEXT', 'TODAY', 'NOW', 'DATE', 'YEAR', 'MONTH',
  'DAY', 'VLOOKUP', 'HLOOKUP', 'INDEX', 'MATCH',
  'SUMIF', 'COUNTIF', 'AVERAGEIF', 'SUMIFS', 'COUNTIFS', 'AVERAGEIFS',
  'MEDIAN', 'MODE', 'STDEV', 'VAR', 'COUNTA', 'PRODUCT', 'SUMPRODUCT',
  'LARGE', 'SMALL', 'RANK', 'SIGN', 'FACT', 'GCD', 'LCM',
  'SIN', 'COS', 'TAN', 'ASIN', 'ACOS', 'ATAN', 'ATAN2',
  'DEGREES', 'RADIANS', 'SEARCH', 'REPLACE', 'EXACT', 'CLEAN',
  'CODE', 'CHAR', 'IFS', 'SWITCH', 'CHOOSE', 'ISEVEN', 'ISODD',
  'ISERROR', 'DATEDIF', 'WEEKDAY', 'HOUR', 'MINUTE', 'SECOND',
  'ROW', 'COLUMN', 'SPARKLINE',
  'FILTER', 'UNIQUE', 'SORT', 'SORTBY', 'SEQUENCE',
  'XLOOKUP', 'LET', 'QUERY',
  'INDIRECT', 'OFFSET', 'IMAGE',
])

/**
 * Check a formula string for common errors before evaluation.
 * Returns an error descriptor or null if no issues detected.
 */
export function checkFormulaErrors(
  formula: string,
  cells: Record<string, Cell>,
): { type: string; message: string } | null {
  if (!formula.startsWith('=')) return null
  const expr = formula.substring(1).trim()
  if (!expr) return null

  // 1. Unmatched parentheses
  let depth = 0
  let inStr = false
  let strCh = ''
  for (const ch of expr) {
    if (inStr) {
      if (ch === strCh) inStr = false
      continue
    }
    if (ch === '"' || ch === "'") {
      inStr = true
      strCh = ch
      continue
    }
    if (ch === '(') depth++
    if (ch === ')') depth--
    if (depth < 0) {
      return { type: 'SYNTAX', message: '閉じ括弧が多すぎます' }
    }
  }
  if (depth > 0) {
    return { type: 'SYNTAX', message: '括弧が閉じられていません' }
  }

  // 2. Unknown function names
  const funcNames = expr.match(/([A-Za-z]+)\s*\(/g)
  if (funcNames) {
    for (const match of funcNames) {
      const name = match.replace(/\s*\($/, '').toUpperCase()
      if (!KNOWN_FUNCTIONS.has(name)) {
        return { type: 'NAME', message: `不明な関数: ${name}` }
      }
    }
  }

  // 3. Self-reference (circular) — extract all cell refs and check against current cell context
  // This requires knowledge of which cell the formula is in, so we check all refs
  // and flag if the formula references itself. We check the raw ref strings.
  const cellRefs = extractCellReferences(expr)
  // Circular detection happens at evaluation time via visited set, but we can flag
  // obvious self-references if the caller passes the cell's own key

  // 4. Division by empty cell reference (potential #DIV/0!)
  const divPattern = /\/\s*([A-Za-z]+\d+)\b/g
  let divMatch: RegExpExecArray | null
  while ((divMatch = divPattern.exec(expr)) !== null) {
    const ref = divMatch[1]
    const key = refToCellKey(ref)
    if (key) {
      const cell = cells[key]
      if (!cell || !cell.value || cell.value.trim() === '' || cell.value.trim() === '0') {
        return { type: 'DIV0', message: `${ref}による除算で#DIV/0!の可能性があります` }
      }
    }
  }

  return null
}

// ── Formula Trace (Precedents / Dependents) ──

/** Extract all cell references (e.g., A1, B2, $C$3) from a formula string */
function extractCellReferences(expr: string): string[] {
  const refs: string[] = []
  // Match cell refs like A1, $A$1, AA10 etc., but not function names
  const refPattern = /\$?[A-Za-z]{1,3}\$?\d+/g
  let match: RegExpExecArray | null
  while ((match = refPattern.exec(expr)) !== null) {
    const candidate = match[0]
    // Skip if this is part of a function name (preceded by alpha chars that form a function)
    const before = expr.substring(0, match.index)
    if (/[A-Za-z]$/.test(before)) continue
    refs.push(stripDollarSigns(candidate).toUpperCase())
  }
  return [...new Set(refs)]
}

/**
 * Get the cell references that a formula depends on (precedents).
 * Returns an array of cell reference strings like ["A1", "B2", "C3:D5"].
 */
export function getFormulaPrecedents(formula: string): string[] {
  if (!formula.startsWith('=')) return []
  const expr = formula.substring(1)

  const refs: string[] = []

  // Match range references (e.g., A1:B5)
  const rangePattern = /\$?[A-Za-z]{1,3}\$?\d+:\$?[A-Za-z]{1,3}\$?\d+/g
  let rangeMatch: RegExpExecArray | null
  const rangeSpans = new Set<string>()
  while ((rangeMatch = rangePattern.exec(expr)) !== null) {
    const raw = rangeMatch[0]
    const cleaned = stripDollarSigns(raw).toUpperCase()
    refs.push(cleaned)
    // Track the character spans covered by ranges so we don't double-count
    for (let i = rangeMatch.index; i < rangeMatch.index + raw.length; i++) {
      rangeSpans.add(String(i))
    }
  }

  // Match individual cell references not already part of a range
  const cellPattern = /\$?[A-Za-z]{1,3}\$?\d+/g
  let cellMatch: RegExpExecArray | null
  while ((cellMatch = cellPattern.exec(expr)) !== null) {
    // Skip if this position is inside a range we already captured
    if (rangeSpans.has(String(cellMatch.index))) continue
    const before = expr.substring(0, cellMatch.index)
    if (/[A-Za-z]$/.test(before)) continue // part of function name
    const cleaned = stripDollarSigns(cellMatch[0]).toUpperCase()
    if (!refs.includes(cleaned)) refs.push(cleaned)
  }

  return refs
}

/**
 * Get cells that depend on a given cell reference (dependents).
 * Scans all cells to find formulas that reference the given cell.
 */
export function getFormulaDependents(
  cellRef: string,
  cells: Record<string, Cell>,
): string[] {
  const targetRef = cellRef.toUpperCase()
  const targetKey = refToCellKey(targetRef)
  if (!targetKey) return []

  const dependents: string[] = []
  const [targetRow, targetCol] = targetKey.split('-').map(Number)

  for (const [key, cell] of Object.entries(cells)) {
    if (!cell.value || !isFormula(cell.value)) continue
    if (key === targetKey) continue

    const formula = cell.value.substring(1)

    // Check individual cell references
    const precedents = getFormulaPrecedents(cell.value)
    for (const prec of precedents) {
      // Check if it's a range
      if (prec.includes(':')) {
        const rect = parseRange(prec)
        if (
          rect &&
          targetRow >= rect.startRow && targetRow <= rect.endRow &&
          targetCol >= rect.startCol && targetCol <= rect.endCol
        ) {
          const ref = cellKeyToRef(key)
          if (!dependents.includes(ref)) dependents.push(ref)
          break
        }
      } else if (prec === targetRef) {
        const ref = cellKeyToRef(key)
        if (!dependents.includes(ref)) dependents.push(ref)
        break
      }
    }
  }

  return dependents
}
