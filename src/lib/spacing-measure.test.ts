import { describe, it, expect } from 'vitest'
import { computeSpacingMeasures, type Box } from './spacing-measure'

const box: Box = { x: 100, y: 100, w: 50, h: 50 } // spans x[100,150], y[100,150]

describe('computeSpacingMeasures', () => {
  it('measures the gap to a left neighbor with vertical overlap', () => {
    const left: Box = { x: 0, y: 110, w: 40, h: 30 } // right edge at 40, overlaps y
    const m = computeSpacingMeasures(box, [left])
    const h = m.find((x) => x.orientation === 'h')!
    expect(h.label).toBe('60') // 100 - 40
  })

  it('measures right, top and bottom neighbors', () => {
    const right: Box = { x: 200, y: 120, w: 20, h: 20 } // left at 200 → gap 50
    const top: Box = { x: 110, y: 0, w: 20, h: 60 } // bottom at 60 → gap 40
    const bottom: Box = { x: 110, y: 200, w: 20, h: 20 } // top at 200 → gap 50
    const m = computeSpacingMeasures(box, [right, top, bottom])
    const labels = m.map((x) => `${x.orientation}:${x.label}`).sort()
    expect(labels).toEqual(['h:50', 'v:40', 'v:50'])
  })

  it('ignores neighbors without perpendicular overlap', () => {
    const farAbove: Box = { x: 300, y: 0, w: 10, h: 10 } // no x overlap, no y overlap with box
    expect(computeSpacingMeasures(box, [farAbove])).toHaveLength(0)
  })

  it('picks the NEAREST neighbor on each side', () => {
    const near: Box = { x: 60, y: 110, w: 30, h: 20 } // right edge 90 → gap 10
    const far: Box = { x: 0, y: 110, w: 30, h: 20 } // right edge 30 → gap 70
    const m = computeSpacingMeasures(box, [far, near])
    expect(m.find((x) => x.orientation === 'h')!.label).toBe('10')
  })
})
