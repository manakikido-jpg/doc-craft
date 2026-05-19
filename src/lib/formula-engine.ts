/**
 * Spreadsheet formula engine
 * Supports: Math, String, Logical, Date, Lookup, Conditional Aggregate, Statistical functions
 * Plus basic arithmetic with cell references and & string concatenation
 */

import type { Cell } from '@/types'

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
  const match = ref.match(/^([A-Za-z]+)(\d+)$/)
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
  const parts = range.split(':')
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

/** Get numeric values from a range */
function getRangeValues(rangeStr: string, cells: Record<string, Cell>, visited: Set<string>): number[] {
  const range = parseRange(rangeStr)
  if (!range) return []
  const values: number[] = []
  for (let r = range.startRow; r <= range.endRow; r++) {
    for (let c = range.startCol; c <= range.endCol; c++) {
      const key = `${r}-${c}`
      const val = evaluateCell(key, cells, new Set(visited))
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

/** Get raw cell values (number | string) from a range */
function getRangeRawValues(rangeStr: string, cells: Record<string, Cell>, visited: Set<string>): (string | number)[] {
  const range = parseRange(rangeStr)
  if (!range) return []
  const values: (string | number)[] = []
  for (let r = range.startRow; r <= range.endRow; r++) {
    for (let c = range.startCol; c <= range.endCol; c++) {
      const key = `${r}-${c}`
      const val = evaluateCell(key, cells, new Set(visited))
      values.push(val)
    }
  }
  return values
}

/** Get a 2D array from a range (for VLOOKUP / HLOOKUP / INDEX) */
function getRange2D(rangeStr: string, cells: Record<string, Cell>, visited: Set<string>): (string | number)[][] {
  const range = parseRange(rangeStr)
  if (!range) return []
  const rows: (string | number)[][] = []
  for (let r = range.startRow; r <= range.endRow; r++) {
    const row: (string | number)[] = []
    for (let c = range.startCol; c <= range.endCol; c++) {
      const key = `${r}-${c}`
      row.push(evaluateCell(key, cells, new Set(visited)))
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

function evaluateCondition(expr: string, cells: Record<string, Cell>, visited: Set<string>): boolean {
  const operators = ['>=', '<=', '<>', '!=', '>', '<', '=']
  for (const op of operators) {
    const idx = expr.indexOf(op)
    if (idx >= 0) {
      const left = evaluateExpression(expr.substring(0, idx).trim(), cells, visited)
      const right = evaluateExpression(expr.substring(idx + op.length).trim(), cells, visited)
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
  const val = evaluateExpression(expr, cells, visited)
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

// ── Function evaluation ──

function evaluateFunction(
  name: string,
  argsStr: string,
  cells: Record<string, Cell>,
  visited: Set<string>,
  cellKey?: string,
): string | number {
  const fn = name.toUpperCase()
  const args = splitArgs(argsStr)

  const numArg = (i: number, defaultVal?: number): number => {
    if (i >= args.length) return defaultVal ?? 0
    const v = evaluateExpression(args[i].trim(), cells, visited, cellKey)
    return typeof v === 'number' ? v : parseFloat(String(v)) || (defaultVal ?? 0)
  }

  const strArg = (i: number): string => {
    if (i >= args.length) return ''
    const v = evaluateExpression(args[i].trim(), cells, visited, cellKey)
    return String(v)
  }

  const anyArg = (i: number): string | number => {
    if (i >= args.length) return ''
    return evaluateExpression(args[i].trim(), cells, visited, cellKey)
  }

  switch (fn) {
    // ── Original functions ──
    case 'IF': {
      if (args.length < 2) return '#ERROR!'
      const condResult = evaluateCondition(args[0].trim(), cells, visited)
      if (condResult) {
        return evaluateExpression(args[1].trim(), cells, visited, cellKey)
      }
      // false_value is optional (defaults to FALSE/0, like Excel)
      return args.length >= 3 ? evaluateExpression(args[2].trim(), cells, visited, cellKey) : 0
    }

    case 'SUM': {
      let total = 0
      for (const arg of args) {
        const trimmed = arg.trim()
        if (trimmed.includes(':')) {
          // Range argument
          const values = getRangeValues(trimmed, cells, visited)
          total += values.reduce((a, b) => a + b, 0)
        } else {
          // Single value/cell reference
          total += numArg(args.indexOf(arg))
        }
      }
      return total
    }

    case 'AVG':
    case 'AVERAGE': {
      const values = getRangeValues(args[0].trim(), cells, visited)
      return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0
    }

    case 'COUNT': {
      const values = getRangeValues(args[0].trim(), cells, visited)
      return values.length
    }

    case 'MAX': {
      const values = getRangeValues(args[0].trim(), cells, visited)
      return values.length > 0 ? Math.max(...values) : 0
    }

    case 'MIN': {
      const values = getRangeValues(args[0].trim(), cells, visited)
      return values.length > 0 ? Math.min(...values) : 0
    }

    // ── Math Functions ──
    case 'ABS':
      return Math.abs(numArg(0))
    case 'ROUND':
      return parseFloat(numArg(0).toFixed(numArg(1, 0)))
    case 'ROUNDUP': {
      const n = numArg(0)
      const d = numArg(1, 0)
      const factor = Math.pow(10, d)
      return n >= 0 ? Math.ceil(n * factor) / factor : Math.floor(n * factor) / factor
    }
    case 'ROUNDDOWN': {
      const n = numArg(0)
      const d = numArg(1, 0)
      const factor = Math.pow(10, d)
      return n >= 0 ? Math.floor(n * factor) / factor : Math.ceil(n * factor) / factor
    }
    case 'FLOOR': {
      const n = numArg(0)
      const sig = numArg(1, 1)
      if (sig === 0) return 0
      return Math.floor(n / sig) * sig
    }
    case 'CEILING': {
      const n = numArg(0)
      const sig = numArg(1, 1)
      if (sig === 0) return 0
      return Math.ceil(n / sig) * sig
    }
    case 'SQRT': {
      const n = numArg(0)
      if (n < 0) return '#NUM!'
      return Math.sqrt(n)
    }
    case 'POWER':
      return Math.pow(numArg(0), numArg(1))
    case 'MOD': {
      const divisor = numArg(1)
      if (divisor === 0) return '#DIV/0!'
      return numArg(0) % divisor
    }
    case 'INT':
      return Math.trunc(numArg(0))
    case 'RAND':
      return Math.random()
    case 'RANDBETWEEN': {
      const low = numArg(0)
      const high = numArg(1)
      return Math.floor(Math.random() * (high - low + 1)) + low
    }
    case 'PI':
      return Math.PI
    case 'LOG': {
      const n = numArg(0)
      if (n <= 0) return '#NUM!'
      const base = args.length > 1 ? numArg(1) : 10
      if (base <= 0 || base === 1) return '#NUM!'
      return Math.log(n) / Math.log(base)
    }
    case 'LN': {
      const n = numArg(0)
      if (n <= 0) return '#NUM!'
      return Math.log(n)
    }
    case 'EXP':
      return Math.exp(numArg(0))

    // ── String Functions ──
    case 'CONCAT':
    case 'CONCATENATE':
      return args.map((a) => String(evaluateExpression(a.trim(), cells, visited, cellKey))).join('')
    case 'LEN':
      return strArg(0).length
    case 'UPPER':
      return strArg(0).toUpperCase()
    case 'LOWER':
      return strArg(0).toLowerCase()
    case 'PROPER':
      return strArg(0).replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    case 'TRIM':
      return strArg(0).replace(/\s+/g, ' ').trim()
    case 'LEFT':
      return strArg(0).substring(0, numArg(1, 1))
    case 'RIGHT': {
      const s = strArg(0)
      const n = numArg(1, 1)
      return s.substring(Math.max(0, s.length - n))
    }
    case 'MID': {
      const s = strArg(0)
      const start = numArg(1, 1) - 1
      const count = numArg(2, 1)
      return s.substring(start, start + count)
    }
    case 'FIND': {
      const search = strArg(0)
      const text = strArg(1)
      const startPos = args.length > 2 ? numArg(2, 1) - 1 : 0
      const idx = text.indexOf(search, startPos)
      if (idx === -1) return '#VALUE!'
      return idx + 1
    }
    case 'SUBSTITUTE': {
      const text = strArg(0)
      const oldStr = strArg(1)
      const newStr = strArg(2)
      if (args.length > 3) {
        const instance = numArg(3)
        let count = 0
        let result = ''
        let pos = 0
        while (pos < text.length) {
          const found = text.indexOf(oldStr, pos)
          if (found === -1) {
            result += text.substring(pos)
            break
          }
          count++
          result += text.substring(pos, found)
          result += count === instance ? newStr : oldStr
          pos = found + oldStr.length
        }
        return result
      }
      return text.split(oldStr).join(newStr)
    }
    case 'REPT': {
      const s = strArg(0)
      const n = numArg(1, 1)
      if (n < 0) return '#VALUE!'
      return s.repeat(Math.floor(n))
    }
    case 'TEXT':
      return String(anyArg(0))
    case 'VALUE': {
      const n = parseFloat(strArg(0))
      if (isNaN(n)) return '#VALUE!'
      return n
    }

    // ── Logical Functions ──
    case 'AND': {
      for (const a of args) {
        if (!evaluateCondition(a.trim(), cells, visited)) return 0
      }
      return 1
    }
    case 'OR': {
      for (const a of args) {
        if (evaluateCondition(a.trim(), cells, visited)) return 1
      }
      return 0
    }
    case 'NOT':
      return evaluateCondition(args[0].trim(), cells, visited) ? 0 : 1
    case 'TRUE':
      return 1
    case 'FALSE':
      return 0
    case 'IFERROR': {
      try {
        const val = evaluateExpression(args[0].trim(), cells, visited, cellKey)
        if (typeof val === 'string' && val.startsWith('#')) {
          return args.length > 1 ? evaluateExpression(args[1].trim(), cells, visited, cellKey) : ''
        }
        return val
      } catch {
        return args.length > 1 ? evaluateExpression(args[1].trim(), cells, visited, cellKey) : ''
      }
    }
    case 'ISBLANK': {
      const v = anyArg(0)
      return v === '' ? 1 : 0
    }
    case 'ISNUMBER':
      return typeof anyArg(0) === 'number' ? 1 : 0
    case 'ISTEXT': {
      const v = anyArg(0)
      return typeof v === 'string' && !v.startsWith('#') ? 1 : 0
    }

    // ── Date Functions ──
    case 'TODAY': {
      const now = new Date()
      return dateToSerial(now.getFullYear(), now.getMonth() + 1, now.getDate())
    }
    case 'NOW': {
      const now = new Date()
      const serial = dateToSerial(now.getFullYear(), now.getMonth() + 1, now.getDate())
      const fraction = (now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()) / 86400
      return serial + fraction
    }
    case 'DATE':
      return dateToSerial(numArg(0), numArg(1), numArg(2))
    case 'YEAR':
      return serialToDate(numArg(0)).year
    case 'MONTH':
      return serialToDate(numArg(0)).month
    case 'DAY':
      return serialToDate(numArg(0)).day

    // ── Lookup Functions ──
    case 'VLOOKUP': {
      const searchKey = anyArg(0)
      const rangeStr = args[1].trim()
      const colIndex = numArg(2)
      const isSorted = args.length > 3 ? Boolean(numArg(3)) : true
      const data = getRange2D(rangeStr, cells, visited)
      if (colIndex < 1 || data.length === 0 || colIndex > (data[0]?.length ?? 0)) return '#REF!'

      if (!isSorted) {
        for (const row of data) {
          if (looseEqual(row[0], searchKey)) return row[colIndex - 1]
        }
        return '#N/A'
      }
      let bestRow: (string | number)[] | null = null
      for (const row of data) {
        if (looseCompare(row[0], searchKey) <= 0) bestRow = row
        else break
      }
      return bestRow ? bestRow[colIndex - 1] : '#N/A'
    }

    case 'HLOOKUP': {
      const searchKey = anyArg(0)
      const rangeStr = args[1].trim()
      const rowIndex = numArg(2)
      const isSorted = args.length > 3 ? Boolean(numArg(3)) : true
      const data = getRange2D(rangeStr, cells, visited)
      if (rowIndex < 1 || data.length < rowIndex) return '#REF!'

      const firstRow = data[0] ?? []
      if (!isSorted) {
        for (let c = 0; c < firstRow.length; c++) {
          if (looseEqual(firstRow[c], searchKey)) return data[rowIndex - 1][c]
        }
        return '#N/A'
      }
      let bestCol = -1
      for (let c = 0; c < firstRow.length; c++) {
        if (looseCompare(firstRow[c], searchKey) <= 0) bestCol = c
        else break
      }
      return bestCol >= 0 ? data[rowIndex - 1][bestCol] : '#N/A'
    }

    case 'INDEX': {
      const rangeStr = args[0].trim()
      const rowIdx = numArg(1)
      const colIdx = args.length > 2 ? numArg(2, 1) : 1
      const data = getRange2D(rangeStr, cells, visited)
      if (rowIdx < 1 || rowIdx > data.length) return '#REF!'
      const row = data[rowIdx - 1]
      if (colIdx < 1 || colIdx > row.length) return '#REF!'
      return row[colIdx - 1]
    }

    case 'MATCH': {
      const searchKey = anyArg(0)
      const rangeStr = args[1].trim()
      const matchType = args.length > 2 ? numArg(2, 1) : 1
      const rawValues = getRangeRawValues(rangeStr, cells, visited)

      if (matchType === 0) {
        for (let i = 0; i < rawValues.length; i++) {
          if (looseEqual(rawValues[i], searchKey)) return i + 1
        }
        return '#N/A'
      }
      if (matchType === 1) {
        let best = -1
        for (let i = 0; i < rawValues.length; i++) {
          if (looseCompare(rawValues[i], searchKey) <= 0) best = i
          else break
        }
        return best >= 0 ? best + 1 : '#N/A'
      }
      // matchType === -1
      let best = -1
      for (let i = 0; i < rawValues.length; i++) {
        if (looseCompare(rawValues[i], searchKey) >= 0) best = i
        else break
      }
      return best >= 0 ? best + 1 : '#N/A'
    }

    // ── Conditional Aggregates ──
    case 'SUMIF': {
      const criteriaRangeStr = args[0].trim()
      const criteria = stripQuotes(strArg(1))
      const sumRangeStr = args.length > 2 ? args[2].trim() : criteriaRangeStr
      const criteriaValues = getRangeRawValues(criteriaRangeStr, cells, visited)
      const sumValues = getRangeValues(sumRangeStr, cells, visited)
      let total = 0
      for (let i = 0; i < criteriaValues.length; i++) {
        if (matchesCriteria(criteriaValues[i], criteria)) total += sumValues[i] ?? 0
      }
      return total
    }

    case 'COUNTIF': {
      const criteriaRangeStr = args[0].trim()
      const criteria = stripQuotes(strArg(1))
      const criteriaValues = getRangeRawValues(criteriaRangeStr, cells, visited)
      let count = 0
      for (const v of criteriaValues) {
        if (matchesCriteria(v, criteria)) count++
      }
      return count
    }

    case 'AVERAGEIF': {
      const criteriaRangeStr = args[0].trim()
      const criteria = stripQuotes(strArg(1))
      const avgRangeStr = args.length > 2 ? args[2].trim() : criteriaRangeStr
      const criteriaValues = getRangeRawValues(criteriaRangeStr, cells, visited)
      const avgValues = getRangeValues(avgRangeStr, cells, visited)
      let total = 0
      let count = 0
      for (let i = 0; i < criteriaValues.length; i++) {
        if (matchesCriteria(criteriaValues[i], criteria)) {
          total += avgValues[i] ?? 0
          count++
        }
      }
      return count > 0 ? total / count : '#DIV/0!'
    }

    case 'SUMIFS': {
      if (args.length < 3 || (args.length - 1) % 2 !== 0) return '#ERROR!'
      const sumRangeStr = args[0].trim()
      const sumValues = getRangeValues(sumRangeStr, cells, visited)
      const pairs: { values: (string | number)[]; criteria: string }[] = []
      for (let i = 1; i < args.length; i += 2) {
        pairs.push({
          values: getRangeRawValues(args[i].trim(), cells, visited),
          criteria: stripQuotes(String(evaluateExpression(args[i + 1].trim(), cells, visited, cellKey))),
        })
      }
      let total = 0
      for (let i = 0; i < sumValues.length; i++) {
        const allMatch = pairs.every((p) => matchesCriteria(p.values[i] ?? '', p.criteria))
        if (allMatch) total += sumValues[i] ?? 0
      }
      return total
    }

    // ── Statistical ──
    case 'MEDIAN': {
      const values = getRangeValues(args[0].trim(), cells, visited)
      if (values.length === 0) return '#NUM!'
      const sorted = [...values].sort((a, b) => a - b)
      const mid = Math.floor(sorted.length / 2)
      return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
    }

    case 'STDEV': {
      const values = getRangeValues(args[0].trim(), cells, visited)
      if (values.length < 2) return '#DIV/0!'
      const mean = values.reduce((a, b) => a + b, 0) / values.length
      const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (values.length - 1)
      return Math.sqrt(variance)
    }

    case 'VAR': {
      const values = getRangeValues(args[0].trim(), cells, visited)
      if (values.length < 2) return '#DIV/0!'
      const mean = values.reduce((a, b) => a + b, 0) / values.length
      return values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (values.length - 1)
    }

    case 'COUNTA': {
      const rawValues = getRangeRawValues(args[0].trim(), cells, visited)
      return rawValues.filter((v) => v !== '').length
    }

    // ── ROW / COLUMN ──
    case 'ROW': {
      if (cellKey) {
        const [r] = cellKey.split('-').map(Number)
        return r + 1
      }
      return '#REF!'
    }
    case 'COLUMN': {
      if (cellKey) {
        const parts = cellKey.split('-').map(Number)
        return parts[1] + 1
      }
      return '#REF!'
    }

    default:
      return '#ERROR!'
  }
}

// ── Expression evaluation (supports &, arithmetic, parenthesized groups) ──

function evaluateExpression(
  expr: string,
  cells: Record<string, Cell>,
  visited: Set<string>,
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
    return evaluateStringConcat(expr, cells, visited, cellKey)
  }

  // Function call: NAME(args) — handles zero-arg functions like PI(), TODAY() etc.
  // Must verify the opening paren matches the closing paren at the end
  const funcMatch = expr.match(/^([A-Za-z]+)\(/)
  if (funcMatch) {
    const parenStart = funcMatch[0].length - 1
    const parenEnd = findMatchingParen(expr, parenStart)
    if (parenEnd === expr.length - 1) {
      const argsStr = expr.substring(parenStart + 1, parenEnd)
      return evaluateFunction(funcMatch[1], argsStr, cells, visited, cellKey)
    }
  }

  // Parenthesized expression
  if (expr.startsWith('(') && findMatchingParen(expr, 0) === expr.length - 1) {
    return evaluateExpression(expr.slice(1, -1), cells, visited, cellKey)
  }

  // Cell reference
  const cellRefKey = refToCellKey(expr)
  if (cellRefKey) {
    return evaluateCell(cellRefKey, cells, new Set(visited))
  }

  // Arithmetic expression
  return evaluateArithmetic(expr, cells, visited, cellKey)
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
      const val = evaluateExpression(p.trim(), cells, visited, cellKey)
      return String(val)
    })
    .join('')
}

/** Tokenize and evaluate arithmetic with correct operator precedence and paren support */
function evaluateArithmetic(
  expr: string,
  cells: Record<string, Cell>,
  visited: Set<string>,
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
    const val = evaluateExpression(String(tokens[0]), cells, visited, cellKey)
    if (typeof val === 'string' && !val.startsWith('#')) return parseFloat(val) || 0
    return val
  }

  // Resolve each operand
  const resolvedTokens: (number | string)[] = tokens.map((t) => {
    if (typeof t === 'number') return t
    if (['+', '-', '*', '/'].includes(t as string)) return t
    const val = evaluateExpression(String(t), cells, visited, cellKey)
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
    if (resolvedTokens[i] === '*' || resolvedTokens[i] === '/') {
      const left = mdResult.pop() as number
      const right = resolvedTokens[++i] as number
      if (resolvedTokens[i - 1] === '/') {
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
): string | number {
  if (visited.has(cellKey)) return '#REF!'
  visited.add(cellKey)

  const cell = cells[cellKey]
  if (!cell || !cell.value) return ''

  if (!isFormula(cell.value)) {
    const n = parseFloat(cell.value)
    return !isNaN(n) && cell.value.trim() !== '' ? n : cell.value
  }

  const formula = cell.value.substring(1).trim()
  try {
    return evaluateExpression(formula, cells, visited, cellKey)
  } catch {
    return '#ERROR!'
  }
}

export function recalcAllCells(cells: Record<string, Cell>): Record<string, string | number> {
  const computed: Record<string, string | number> = {}
  for (const key of Object.keys(cells)) {
    computed[key] = evaluateCell(key, cells)
  }
  return computed
}

export function formatCellValue(raw: string | number, format?: { numberFormat?: string }): string {
  if (typeof raw === 'string') return raw
  if (!format?.numberFormat || format.numberFormat === 'plain') return String(raw)

  switch (format.numberFormat) {
    case 'number':
      return raw.toLocaleString('ja-JP', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
    case 'percent':
      return (raw * 100).toFixed(1) + '%'
    case 'currency':
      return '¥' + raw.toLocaleString('ja-JP')
    case 'date': {
      const { year, month, day } = serialToDate(raw)
      const mm = String(month).padStart(2, '0')
      const dd = String(day).padStart(2, '0')
      return `${year}/${mm}/${dd}`
    }
    default:
      return String(raw)
  }
}
