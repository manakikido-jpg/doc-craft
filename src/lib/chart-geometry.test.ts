import { describe, it, expect } from 'vitest'
import {
  stackedSegments,
  stackedMax,
  percentStackedSegments,
  smoothPath,
  steppedPoints,
  waterfallSteps,
  waterfallRange,
  funnelWidths,
} from './chart-geometry'

const ds = (values: number[]) => ({ values })

describe('stackedSegments', () => {
  it('stacks datasets cumulatively per label', () => {
    const { bases, tops, totals } = stackedSegments([ds([10, 5]), ds([20, 15])], 2)
    expect(bases[0]).toEqual([0, 0])
    expect(tops[0]).toEqual([10, 5])
    expect(bases[1]).toEqual([10, 5]) // second dataset sits on the first
    expect(tops[1]).toEqual([30, 20])
    expect(totals).toEqual([30, 20])
  })

  it('clamps negatives to keep the stack monotonic', () => {
    const { tops } = stackedSegments([ds([-5]), ds([10])], 1)
    expect(tops[0]).toEqual([0]) // negative clamped
    expect(tops[1]).toEqual([10])
  })

  it('stackedMax returns the largest per-label total', () => {
    expect(stackedMax([ds([10, 5]), ds([20, 40])], 2)).toBe(45)
  })
})

describe('percentStackedSegments', () => {
  it('normalizes each label to fractions summing to 1', () => {
    const { tops } = percentStackedSegments([ds([1]), ds([3])], 1)
    expect(tops[0][0]).toBeCloseTo(0.25)
    expect(tops[1][0]).toBeCloseTo(1)
  })

  it('handles empty labels (total 0) without dividing by zero', () => {
    const { tops } = percentStackedSegments([ds([0]), ds([0])], 1)
    expect(tops[0][0]).toBe(0)
    expect(tops[1][0]).toBe(0)
  })
})

describe('smoothPath', () => {
  it('returns a straight line for fewer than 3 points', () => {
    expect(smoothPath([{ x: 0, y: 0 }, { x: 10, y: 10 }])).toBe('M0,0 L10,10')
  })
  it('produces cubic bezier segments for 3+ points', () => {
    const d = smoothPath([{ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 20, y: 0 }])
    expect(d.startsWith('M0,0')).toBe(true)
    expect(d).toContain('C')
  })
})

describe('steppedPoints', () => {
  it('inserts an orthogonal corner between each pair', () => {
    expect(steppedPoints([{ x: 0, y: 0 }, { x: 10, y: 20 }])).toBe('0,0 10,0 10,20')
  })
})

describe('waterfallSteps', () => {
  it('accumulates deltas into floating bars', () => {
    const steps = waterfallSteps([100, -30, 50])
    expect(steps[0]).toEqual({ start: 0, end: 100, value: 100, rising: true })
    expect(steps[1]).toEqual({ start: 100, end: 70, value: -30, rising: false })
    expect(steps[2]).toEqual({ start: 70, end: 120, value: 50, rising: true })
  })
  it('waterfallRange envelopes all starts/ends and 0', () => {
    expect(waterfallRange([100, -30, 50])).toEqual({ min: 0, max: 120 })
    expect(waterfallRange([-40, -20])).toEqual({ min: -60, max: 0 })
  })
})

describe('funnelWidths', () => {
  it('returns fractions of the largest value', () => {
    expect(funnelWidths([100, 50, 25])).toEqual([1, 0.5, 0.25])
  })
  it('handles all-zero input without NaN', () => {
    expect(funnelWidths([0, 0])).toEqual([0, 0])
  })
})
