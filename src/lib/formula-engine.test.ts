import { describe, it, expect } from 'vitest'
import {
  colIndexToLetter,
  colLetterToIndex,
  cellKeyToRef,
  refToCellKey,
  isFormula,
  evaluateCell,
  recalcAllCells,
  formatCellValue,
} from './formula-engine'
import type { Cell } from '@/types'

// ── Helper ──
function makeCells(entries: Record<string, string>): Record<string, Cell> {
  const cells: Record<string, Cell> = {}
  for (const [ref, value] of Object.entries(entries)) {
    const key = refToCellKey(ref)
    if (key) cells[key] = { value }
  }
  return cells
}

function evalRef(ref: string, cells: Record<string, Cell>): string | number {
  const key = refToCellKey(ref)!
  return evaluateCell(key, cells)
}

// ══════════════════════════════════
// Coordinate helpers
// ══════════════════════════════════

describe('colIndexToLetter', () => {
  it('converts 0 → A', () => expect(colIndexToLetter(0)).toBe('A'))
  it('converts 25 → Z', () => expect(colIndexToLetter(25)).toBe('Z'))
  it('converts 26 → AA', () => expect(colIndexToLetter(26)).toBe('AA'))
  it('converts 27 → AB', () => expect(colIndexToLetter(27)).toBe('AB'))
  it('converts 701 → ZZ', () => expect(colIndexToLetter(701)).toBe('ZZ'))
})

describe('colLetterToIndex', () => {
  it('converts A → 0', () => expect(colLetterToIndex('A')).toBe(0))
  it('converts Z → 25', () => expect(colLetterToIndex('Z')).toBe(25))
  it('converts AA → 26', () => expect(colLetterToIndex('AA')).toBe(26))
  it('is case-insensitive', () => expect(colLetterToIndex('aa')).toBe(26))
  it('round-trips with colIndexToLetter', () => {
    for (let i = 0; i < 100; i++) {
      expect(colLetterToIndex(colIndexToLetter(i))).toBe(i)
    }
  })
})

describe('cellKeyToRef / refToCellKey', () => {
  it('converts 0-0 → A1', () => expect(cellKeyToRef('0-0')).toBe('A1'))
  it('converts A1 → 0-0', () => expect(refToCellKey('A1')).toBe('0-0'))
  it('round-trips', () => {
    expect(refToCellKey(cellKeyToRef('5-3'))).toBe('5-3')
  })
  it('returns null for invalid ref', () => {
    expect(refToCellKey('123')).toBeNull()
    expect(refToCellKey('')).toBeNull()
  })
})

describe('isFormula', () => {
  it('detects formulas', () => expect(isFormula('=SUM(A1:A5)')).toBe(true))
  it('rejects plain text', () => expect(isFormula('hello')).toBe(false))
  it('rejects numbers', () => expect(isFormula('42')).toBe(false))
})

// ══════════════════════════════════
// Basic evaluation
// ══════════════════════════════════

describe('evaluateCell — basics', () => {
  it('returns empty string for empty cell', () => {
    expect(evaluateCell('0-0', {})).toBe('')
  })

  it('returns number for numeric value', () => {
    const cells = makeCells({ A1: '42' })
    expect(evalRef('A1', cells)).toBe(42)
  })

  it('returns string for text value', () => {
    const cells = makeCells({ A1: 'hello' })
    expect(evalRef('A1', cells)).toBe('hello')
  })

  it('evaluates simple cell reference', () => {
    const cells = makeCells({ A1: '10', B1: '=A1' })
    expect(evalRef('B1', cells)).toBe(10)
  })

  it('evaluates arithmetic: =A1+B1', () => {
    const cells = makeCells({ A1: '10', B1: '20', C1: '=A1+B1' })
    expect(evalRef('C1', cells)).toBe(30)
  })

  it('respects operator precedence: =2+3*4', () => {
    const cells = makeCells({ A1: '=2+3*4' })
    expect(evalRef('A1', cells)).toBe(14)
  })

  it('handles parentheses: =(2+3)*4', () => {
    const cells = makeCells({ A1: '=(2+3)*4' })
    expect(evalRef('A1', cells)).toBe(20)
  })

  it('handles division by zero', () => {
    const cells = makeCells({ A1: '=5/0' })
    expect(evalRef('A1', cells)).toBe('#DIV/0!')
  })

  it('detects circular reference', () => {
    const cells = makeCells({ A1: '=B1', B1: '=A1' })
    expect(evalRef('A1', cells)).toBe('#REF!')
  })

  it('handles self-reference', () => {
    const cells = makeCells({ A1: '=A1' })
    expect(evalRef('A1', cells)).toBe('#REF!')
  })

  it('handles string concatenation with &', () => {
    const cells = makeCells({ A1: 'Hello', B1: 'World', C1: '=A1&" "&B1' })
    expect(evalRef('C1', cells)).toBe('Hello World')
  })
})

// ══════════════════════════════════
// Math functions
// ══════════════════════════════════

describe('Math functions', () => {
  it('SUM', () => {
    const cells = makeCells({ A1: '1', A2: '2', A3: '3', B1: '=SUM(A1:A3)' })
    expect(evalRef('B1', cells)).toBe(6)
  })

  it('SUM on empty range returns 0', () => {
    const cells = makeCells({ B1: '=SUM(A1:A3)' })
    expect(evalRef('B1', cells)).toBe(0)
  })

  it('SUM with multiple ranges', () => {
    const cells = makeCells({ A1: '1', A2: '2', B1: '10', B2: '20', C1: '=SUM(A1:A2, B1:B2)' })
    expect(evalRef('C1', cells)).toBe(33)
  })

  it('SUM with mixed ranges and values', () => {
    const cells = makeCells({ A1: '1', A2: '2', C1: '=SUM(A1:A2, 100)' })
    expect(evalRef('C1', cells)).toBe(103)
  })

  it('AVERAGE', () => {
    const cells = makeCells({ A1: '10', A2: '20', A3: '30', B1: '=AVERAGE(A1:A3)' })
    expect(evalRef('B1', cells)).toBe(20)
  })

  it('AVG alias', () => {
    const cells = makeCells({ A1: '10', A2: '20', B1: '=AVG(A1:A2)' })
    expect(evalRef('B1', cells)).toBe(15)
  })

  it('COUNT', () => {
    const cells = makeCells({ A1: '1', A2: 'text', A3: '3', B1: '=COUNT(A1:A3)' })
    expect(evalRef('B1', cells)).toBe(2)
  })

  it('MAX', () => {
    const cells = makeCells({ A1: '5', A2: '3', A3: '9', B1: '=MAX(A1:A3)' })
    expect(evalRef('B1', cells)).toBe(9)
  })

  it('MIN', () => {
    const cells = makeCells({ A1: '5', A2: '3', A3: '9', B1: '=MIN(A1:A3)' })
    expect(evalRef('B1', cells)).toBe(3)
  })

  it('ABS', () => {
    const cells = makeCells({ A1: '=ABS(-5)' })
    expect(evalRef('A1', cells)).toBe(5)
  })

  it('ROUND', () => {
    const cells = makeCells({ A1: '=ROUND(3.456, 2)' })
    expect(evalRef('A1', cells)).toBe(3.46)
  })

  it('ROUNDUP', () => {
    const cells = makeCells({ A1: '=ROUNDUP(3.421, 2)' })
    expect(evalRef('A1', cells)).toBe(3.43)
  })

  it('ROUNDDOWN', () => {
    const cells = makeCells({ A1: '=ROUNDDOWN(3.429, 2)' })
    expect(evalRef('A1', cells)).toBe(3.42)
  })

  it('FLOOR', () => {
    const cells = makeCells({ A1: '=FLOOR(7, 3)' })
    expect(evalRef('A1', cells)).toBe(6)
  })

  it('CEILING', () => {
    const cells = makeCells({ A1: '=CEILING(7, 3)' })
    expect(evalRef('A1', cells)).toBe(9)
  })

  it('SQRT', () => {
    const cells = makeCells({ A1: '=SQRT(16)' })
    expect(evalRef('A1', cells)).toBe(4)
  })

  it('SQRT of negative returns #NUM!', () => {
    const cells = makeCells({ A1: '=SQRT(-1)' })
    expect(evalRef('A1', cells)).toBe('#NUM!')
  })

  it('POWER', () => {
    const cells = makeCells({ A1: '=POWER(2, 10)' })
    expect(evalRef('A1', cells)).toBe(1024)
  })

  it('MOD', () => {
    const cells = makeCells({ A1: '=MOD(10, 3)' })
    expect(evalRef('A1', cells)).toBe(1)
  })

  it('MOD by zero → #DIV/0!', () => {
    const cells = makeCells({ A1: '=MOD(10, 0)' })
    expect(evalRef('A1', cells)).toBe('#DIV/0!')
  })

  it('INT', () => {
    const cells = makeCells({ A1: '=INT(5.9)' })
    expect(evalRef('A1', cells)).toBe(5)
  })

  it('PI', () => {
    const cells = makeCells({ A1: '=PI()' })
    expect(evalRef('A1', cells)).toBeCloseTo(Math.PI)
  })

  it('LOG base 10', () => {
    const cells = makeCells({ A1: '=LOG(100)' })
    expect(evalRef('A1', cells)).toBeCloseTo(2)
  })

  it('LOG custom base', () => {
    const cells = makeCells({ A1: '=LOG(8, 2)' })
    expect(evalRef('A1', cells)).toBeCloseTo(3)
  })

  it('LN', () => {
    const cells = makeCells({ A1: '=LN(1)' })
    expect(evalRef('A1', cells)).toBe(0)
  })

  it('EXP', () => {
    const cells = makeCells({ A1: '=EXP(0)' })
    expect(evalRef('A1', cells)).toBe(1)
  })

  it('MEDIAN odd count', () => {
    const cells = makeCells({ A1: '3', A2: '1', A3: '5', B1: '=MEDIAN(A1:A3)' })
    expect(evalRef('B1', cells)).toBe(3)
  })

  it('MEDIAN even count', () => {
    const cells = makeCells({ A1: '1', A2: '2', A3: '3', A4: '4', B1: '=MEDIAN(A1:A4)' })
    expect(evalRef('B1', cells)).toBe(2.5)
  })

  it('STDEV', () => {
    const cells = makeCells({ A1: '2', A2: '4', A3: '6', B1: '=STDEV(A1:A3)' })
    expect(evalRef('B1', cells)).toBeCloseTo(2)
  })

  it('VAR', () => {
    const cells = makeCells({ A1: '2', A2: '4', A3: '6', B1: '=VAR(A1:A3)' })
    expect(evalRef('B1', cells)).toBeCloseTo(4)
  })
})

// ══════════════════════════════════
// String functions
// ══════════════════════════════════

describe('String functions', () => {
  it('CONCAT', () => {
    const cells = makeCells({ A1: '=CONCAT("hello", " ", "world")' })
    expect(evalRef('A1', cells)).toBe('hello world')
  })

  it('LEN', () => {
    const cells = makeCells({ A1: '=LEN("hello")' })
    expect(evalRef('A1', cells)).toBe(5)
  })

  it('UPPER', () => {
    const cells = makeCells({ A1: '=UPPER("hello")' })
    expect(evalRef('A1', cells)).toBe('HELLO')
  })

  it('LOWER', () => {
    const cells = makeCells({ A1: '=LOWER("HELLO")' })
    expect(evalRef('A1', cells)).toBe('hello')
  })

  it('TRIM', () => {
    const cells = makeCells({ A1: '=TRIM("  hello   world  ")' })
    expect(evalRef('A1', cells)).toBe('hello world')
  })

  it('LEFT', () => {
    const cells = makeCells({ A1: '=LEFT("hello", 3)' })
    expect(evalRef('A1', cells)).toBe('hel')
  })

  it('RIGHT', () => {
    const cells = makeCells({ A1: '=RIGHT("hello", 3)' })
    expect(evalRef('A1', cells)).toBe('llo')
  })

  it('MID', () => {
    const cells = makeCells({ A1: '=MID("hello", 2, 3)' })
    expect(evalRef('A1', cells)).toBe('ell')
  })

  it('FIND', () => {
    const cells = makeCells({ A1: '=FIND("lo", "hello")' })
    expect(evalRef('A1', cells)).toBe(4)
  })

  it('FIND not found → #VALUE!', () => {
    const cells = makeCells({ A1: '=FIND("xyz", "hello")' })
    expect(evalRef('A1', cells)).toBe('#VALUE!')
  })

  it('SUBSTITUTE', () => {
    const cells = makeCells({ A1: '=SUBSTITUTE("banana", "na", "xy")' })
    expect(evalRef('A1', cells)).toBe('baxyxy')
  })

  it('SUBSTITUTE with instance', () => {
    const cells = makeCells({ A1: '=SUBSTITUTE("banana", "na", "XY", 2)' })
    expect(evalRef('A1', cells)).toBe('banaXY')
  })

  it('REPT', () => {
    const cells = makeCells({ A1: '=REPT("ab", 3)' })
    expect(evalRef('A1', cells)).toBe('ababab')
  })

  it('VALUE', () => {
    const cells = makeCells({ A1: '=VALUE("42.5")' })
    expect(evalRef('A1', cells)).toBe(42.5)
  })

  it('VALUE non-numeric → #VALUE!', () => {
    const cells = makeCells({ A1: '=VALUE("abc")' })
    expect(evalRef('A1', cells)).toBe('#VALUE!')
  })
})

// ══════════════════════════════════
// Logical functions
// ══════════════════════════════════

describe('Logical functions', () => {
  it('IF true branch', () => {
    const cells = makeCells({ A1: '10', B1: '=IF(A1>5, "big", "small")' })
    expect(evalRef('B1', cells)).toBe('big')
  })

  it('IF false branch', () => {
    const cells = makeCells({ A1: '3', B1: '=IF(A1>5, "big", "small")' })
    expect(evalRef('B1', cells)).toBe('small')
  })

  it('IF with 2 args (no false_value) returns 0 when false', () => {
    const cells = makeCells({ A1: '3', B1: '=IF(A1>5, "big")' })
    expect(evalRef('B1', cells)).toBe(0)
  })

  it('IF with 2 args returns true_value when true', () => {
    const cells = makeCells({ A1: '10', B1: '=IF(A1>5, "big")' })
    expect(evalRef('B1', cells)).toBe('big')
  })

  it('AND all true → 1', () => {
    const cells = makeCells({ A1: '=AND(1>0, 2>1, 3>2)' })
    expect(evalRef('A1', cells)).toBe(1)
  })

  it('AND with false → 0', () => {
    const cells = makeCells({ A1: '=AND(1>0, 2>3)' })
    expect(evalRef('A1', cells)).toBe(0)
  })

  it('OR with one true → 1', () => {
    const cells = makeCells({ A1: '=OR(1>5, 2>1)' })
    expect(evalRef('A1', cells)).toBe(1)
  })

  it('NOT', () => {
    const cells = makeCells({ A1: '=NOT(1>5)' })
    expect(evalRef('A1', cells)).toBe(1)
  })

  it('TRUE / FALSE', () => {
    const cells = makeCells({ A1: '=TRUE()', B1: '=FALSE()' })
    expect(evalRef('A1', cells)).toBe(1)
    expect(evalRef('B1', cells)).toBe(0)
  })

  it('IFERROR catches error', () => {
    const cells = makeCells({ A1: '=IFERROR(5/0, -1)' })
    expect(evalRef('A1', cells)).toBe(-1)
  })

  it('IFERROR passes through valid', () => {
    const cells = makeCells({ A1: '=IFERROR(10/2, -1)' })
    expect(evalRef('A1', cells)).toBe(5)
  })

  it('ISBLANK', () => {
    const cells = makeCells({ B1: '=ISBLANK(A1)' })
    expect(evalRef('B1', cells)).toBe(1)
  })

  it('ISNUMBER', () => {
    const cells = makeCells({ A1: '42', B1: '=ISNUMBER(A1)' })
    expect(evalRef('B1', cells)).toBe(1)
  })

  it('ISTEXT', () => {
    const cells = makeCells({ A1: 'hello', B1: '=ISTEXT(A1)' })
    expect(evalRef('B1', cells)).toBe(1)
  })
})

// ══════════════════════════════════
// Date functions
// ══════════════════════════════════

describe('Date functions', () => {
  it('DATE creates serial number', () => {
    const cells = makeCells({ A1: '=DATE(2024, 1, 1)' })
    const val = evalRef('A1', cells) as number
    expect(typeof val).toBe('number')
    expect(val).toBeGreaterThan(0)
  })

  it('YEAR/MONTH/DAY extract from DATE', () => {
    const cells = makeCells({
      A1: '=DATE(2024, 6, 15)',
      B1: '=YEAR(A1)',
      C1: '=MONTH(A1)',
      D1: '=DAY(A1)',
    })
    expect(evalRef('B1', cells)).toBe(2024)
    expect(evalRef('C1', cells)).toBe(6)
    expect(evalRef('D1', cells)).toBe(15)
  })

  it('TODAY returns a number', () => {
    const cells = makeCells({ A1: '=TODAY()' })
    const val = evalRef('A1', cells) as number
    expect(typeof val).toBe('number')
    expect(val).toBeGreaterThan(40000)
  })

  it('NOW returns a number with fractional part', () => {
    const cells = makeCells({ A1: '=NOW()' })
    const val = evalRef('A1', cells) as number
    expect(typeof val).toBe('number')
    expect(val).toBeGreaterThan(40000)
  })
})

// ══════════════════════════════════
// Lookup functions
// ══════════════════════════════════

describe('Lookup functions', () => {
  const lookupCells = () =>
    makeCells({
      A1: '1',
      B1: 'Apple',
      A2: '2',
      B2: 'Banana',
      A3: '3',
      B3: 'Cherry',
    })

  it('VLOOKUP exact match', () => {
    const cells = { ...lookupCells(), ...makeCells({ D1: '=VLOOKUP(2, A1:B3, 2, 0)' }) }
    expect(evalRef('D1', cells)).toBe('Banana')
  })

  it('VLOOKUP not found → #N/A', () => {
    const cells = { ...lookupCells(), ...makeCells({ D1: '=VLOOKUP(5, A1:B3, 2, 0)' }) }
    expect(evalRef('D1', cells)).toBe('#N/A')
  })

  it('VLOOKUP approximate match', () => {
    const cells = { ...lookupCells(), ...makeCells({ D1: '=VLOOKUP(2.5, A1:B3, 2, 1)' }) }
    expect(evalRef('D1', cells)).toBe('Banana')
  })

  it('INDEX', () => {
    const cells = { ...lookupCells(), ...makeCells({ D1: '=INDEX(A1:B3, 2, 2)' }) }
    expect(evalRef('D1', cells)).toBe('Banana')
  })

  it('INDEX out of range → #REF!', () => {
    const cells = { ...lookupCells(), ...makeCells({ D1: '=INDEX(A1:B3, 5, 1)' }) }
    expect(evalRef('D1', cells)).toBe('#REF!')
  })

  it('MATCH exact', () => {
    const cells = { ...lookupCells(), ...makeCells({ D1: '=MATCH(2, A1:A3, 0)' }) }
    expect(evalRef('D1', cells)).toBe(2)
  })
})

// ══════════════════════════════════
// Conditional aggregates
// ══════════════════════════════════

describe('Conditional aggregates', () => {
  const condCells = () => makeCells({ A1: '10', A2: '20', A3: '30', A4: '5', A5: '25' })

  it('SUMIF >10', () => {
    const cells = { ...condCells(), ...makeCells({ B1: '=SUMIF(A1:A5, ">10")' }) }
    expect(evalRef('B1', cells)).toBe(75)
  })

  it('COUNTIF >=20', () => {
    const cells = { ...condCells(), ...makeCells({ B1: '=COUNTIF(A1:A5, ">=20")' }) }
    expect(evalRef('B1', cells)).toBe(3)
  })

  it('AVERAGEIF >10', () => {
    const cells = { ...condCells(), ...makeCells({ B1: '=AVERAGEIF(A1:A5, ">10")' }) }
    expect(evalRef('B1', cells)).toBe(25)
  })

  it('COUNTA', () => {
    const cells = makeCells({ A1: 'a', A2: '', A3: 'c', B1: '=COUNTA(A1:A3)' })
    expect(evalRef('B1', cells)).toBe(2)
  })
})

// ══════════════════════════════════
// ROW / COLUMN
// ══════════════════════════════════

describe('ROW / COLUMN', () => {
  it('ROW returns 1-based row', () => {
    const cells = makeCells({ C3: '=ROW()' })
    expect(evalRef('C3', cells)).toBe(3)
  })

  it('COLUMN returns 1-based column', () => {
    const cells = makeCells({ C3: '=COLUMN()' })
    expect(evalRef('C3', cells)).toBe(3)
  })
})

// ══════════════════════════════════
// recalcAllCells
// ══════════════════════════════════

describe('recalcAllCells', () => {
  it('computes all cells', () => {
    const cells = makeCells({ A1: '10', A2: '20', A3: '=A1+A2' })
    const computed = recalcAllCells(cells)
    const a3Key = refToCellKey('A3')!
    expect(computed[a3Key]).toBe(30)
  })
})

// ══════════════════════════════════
// formatCellValue
// ══════════════════════════════════

describe('formatCellValue', () => {
  it('plain format returns string', () => {
    expect(formatCellValue(42)).toBe('42')
  })

  it('percent format', () => {
    expect(formatCellValue(0.5, { numberFormat: 'percent' })).toBe('50.0%')
  })

  it('currency format', () => {
    const result = formatCellValue(1000, { numberFormat: 'currency' })
    expect(result).toContain('¥')
  })

  it('date format', () => {
    const serial = 45292 // some date
    const result = formatCellValue(serial, { numberFormat: 'date' })
    expect(result).toMatch(/\d{4}\/\d{2}\/\d{2}/)
  })

  it('returns string as-is', () => {
    expect(formatCellValue('hello')).toBe('hello')
  })
})

// ══════════════════════════════════
// Edge cases & error handling
// ══════════════════════════════════

describe('Edge cases', () => {
  it('nested functions: =SUM(A1:A3)+MAX(B1:B3)', () => {
    const cells = makeCells({
      A1: '1',
      A2: '2',
      A3: '3',
      B1: '10',
      B2: '20',
      B3: '30',
      D1: '=SUM(A1:A3)+MAX(B1:B3)',
    })
    expect(evalRef('D1', cells)).toBe(36)
  })

  it('chained cell references: A1→B1→C1', () => {
    const cells = makeCells({ A1: '=B1', B1: '=C1', C1: '42' })
    expect(evalRef('A1', cells)).toBe(42)
  })

  it('unknown function → #ERROR!', () => {
    const cells = makeCells({ A1: '=UNKNOWN(1)' })
    expect(evalRef('A1', cells)).toBe('#ERROR!')
  })

  it('IFERROR wrapping circular ref', () => {
    const cells = makeCells({ A1: '=B1', B1: '=A1', C1: '=IFERROR(A1, 0)' })
    expect(evalRef('C1', cells)).toBe(0)
  })

  it('IF with nested SUM', () => {
    const cells = makeCells({
      A1: '10',
      A2: '20',
      A3: '30',
      B1: '=IF(SUM(A1:A3)>50, "big", "small")',
    })
    expect(evalRef('B1', cells)).toBe('big')
  })

  it('multiple operations: =A1*B1+C1/D1-E1', () => {
    const cells = makeCells({
      A1: '2',
      B1: '3',
      C1: '10',
      D1: '2',
      E1: '1',
      F1: '=A1*B1+C1/D1-E1',
    })
    // 2*3 + 10/2 - 1 = 6 + 5 - 1 = 10
    expect(evalRef('F1', cells)).toBe(10)
  })
})
