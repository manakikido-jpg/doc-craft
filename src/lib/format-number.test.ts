import { describe, it, expect } from 'vitest'
import { formatThousands, formatCompact } from './format-number'

describe('formatThousands', () => {
  it('inserts separators', () => {
    expect(formatThousands(1234)).toBe('1,234')
    expect(formatThousands(1234567)).toBe('1,234,567')
    expect(formatThousands(999)).toBe('999')
  })
  it('handles negatives and zero', () => {
    expect(formatThousands(-12345)).toBe('-12,345')
    expect(formatThousands(0)).toBe('0')
  })
  it('keeps small fractions', () => {
    expect(formatThousands(1234.5)).toBe('1,234.5')
  })
})

describe('formatCompact', () => {
  it('keeps separators below 10k', () => {
    expect(formatCompact(1234)).toBe('1,234')
    expect(formatCompact(9999)).toBe('9,999')
  })
  it('uses K / M / B above thresholds', () => {
    expect(formatCompact(12345)).toBe('12.3K')
    expect(formatCompact(2_500_000)).toBe('2.5M')
    expect(formatCompact(3_000_000_000)).toBe('3B')
  })
  it('drops trailing .0', () => {
    expect(formatCompact(10000)).toBe('10K')
    expect(formatCompact(1_000_000)).toBe('1M')
  })
  it('handles negatives', () => {
    expect(formatCompact(-2_500_000)).toBe('-2.5M')
  })
})
