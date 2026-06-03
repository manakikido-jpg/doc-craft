import { describe, it, expect } from 'vitest'
import { computeRotatedResize, type ResizeInput } from './resize-geometry'

const base = { origX: 100, origY: 100, origW: 200, origH: 100, rotation: 0, rawDx: 0, rawDy: 0 }

/** The corner that should stay fixed for a given handle (opposite corner), in world space at rotation 0. */
function anchorOf(handle: string, b: typeof base) {
  const left = b.origX, top = b.origY, right = b.origX + b.origW, bottom = b.origY + b.origH
  // opposite corner
  if (handle === 'se') return { x: left, y: top }
  if (handle === 'nw') return { x: right, y: bottom }
  if (handle === 'ne') return { x: left, y: bottom }
  if (handle === 'sw') return { x: right, y: top }
  return { x: left, y: top }
}

describe('computeRotatedResize — unrotated (standard behavior)', () => {
  it('SE handle grows w/h and keeps top-left fixed', () => {
    const r = computeRotatedResize({ ...base, handle: 'se', rawDx: 40, rawDy: 30 })
    expect(r).toEqual({ x: 100, y: 100, w: 240, h: 130 })
  })

  it('NW handle shrinks and moves origin', () => {
    const r = computeRotatedResize({ ...base, handle: 'nw', rawDx: 20, rawDy: 10 })
    expect(r.w).toBeCloseTo(180)
    expect(r.h).toBeCloseTo(90)
    expect(r.x).toBeCloseTo(120)
    expect(r.y).toBeCloseTo(110)
  })

  it('enforces the minimum size', () => {
    const r = computeRotatedResize({ ...base, handle: 'se', rawDx: -500, rawDy: -500, minSize: 20 })
    expect(r.w).toBe(20)
    expect(r.h).toBe(20)
  })

  it('Shift locks aspect ratio on a corner handle', () => {
    const r = computeRotatedResize({ ...base, handle: 'se', rawDx: 100, rawDy: 0, lockAspect: true })
    // aspect 200/100 = 2; width grows to 300 → height should be 150
    expect(r.w / r.h).toBeCloseTo(2)
  })
})

describe('computeRotatedResize — rotated keeps the opposite corner anchored', () => {
  // For a rotated element, the opposite corner's WORLD position must not move
  // when resizing. We compute that corner before and after and compare.
  function worldCorner(res: { x: number; y: number; w: number; h: number }, sx: number, sy: number, rotation: number) {
    const cx = res.x + res.w / 2, cy = res.y + res.h / 2
    const lx = (sx * res.w) / 2, ly = (sy * res.h) / 2
    const r = (rotation * Math.PI) / 180
    return { x: cx + lx * Math.cos(r) - ly * Math.sin(r), y: cy + lx * Math.sin(r) + ly * Math.cos(r) }
  }

  for (const rotation of [30, 45, 90, 137]) {
    it(`anchor (nw corner) stays fixed when dragging SE at ${rotation}°`, () => {
      const input: ResizeInput = { ...base, rotation, handle: 'se', rawDx: 37, rawDy: -21 }
      const before = worldCorner({ x: base.origX, y: base.origY, w: base.origW, h: base.origH }, -1, -1, rotation)
      const after = computeRotatedResize(input)
      const anchorAfter = worldCorner(after, -1, -1, rotation)
      expect(anchorAfter.x).toBeCloseTo(before.x, 5)
      expect(anchorAfter.y).toBeCloseTo(before.y, 5)
    })

    it(`anchor (se corner) stays fixed when dragging NW at ${rotation}°`, () => {
      const input: ResizeInput = { ...base, rotation, handle: 'nw', rawDx: -18, rawDy: 25 }
      const before = worldCorner({ x: base.origX, y: base.origY, w: base.origW, h: base.origH }, 1, 1, rotation)
      const after = computeRotatedResize(input)
      const anchorAfter = worldCorner(after, 1, 1, rotation)
      expect(anchorAfter.x).toBeCloseTo(before.x, 5)
      expect(anchorAfter.y).toBeCloseTo(before.y, 5)
    })
  }
})

import { computeGroupResize } from './resize-geometry'

describe('computeGroupResize — multi-select scaling', () => {
  const box = { x: 0, y: 0, w: 200, h: 100 }
  const els = [
    { id: 'a', x: 0, y: 0, w: 50, h: 50 },
    { id: 'b', x: 150, y: 50, w: 50, h: 50 },
  ]

  it('SE handle scales elements about the top-left anchor', () => {
    // double the width (dx=200), keep height (dy=0)
    const out = computeGroupResize({ handle: 'se', box, els, rawDx: 200, rawDy: 0 })
    const a = out.find((e) => e.id === 'a')!
    const b = out.find((e) => e.id === 'b')!
    // sx=2, sy=1
    expect(a.x).toBeCloseTo(0)
    expect(a.w).toBeCloseTo(100)
    expect(b.x).toBeCloseTo(300) // 0 + (150-0)*2
    expect(b.w).toBeCloseTo(100)
    expect(a.h).toBeCloseTo(50) // height unchanged
  })

  it('NW handle scales about the bottom-right anchor', () => {
    // shrink width by half via west drag: newW = 200 - 100 = 100 → sx=0.5
    const out = computeGroupResize({ handle: 'nw', box, els, rawDx: 100, rawDy: 0 })
    const anchorX = 200 // bx+bw
    const a = out.find((e) => e.id === 'a')!
    expect(a.x).toBeCloseTo(anchorX + (0 - anchorX) * 0.5) // 100
    expect(a.w).toBeCloseTo(25)
  })

  it('clamps to a minimum positive scale', () => {
    const out = computeGroupResize({ handle: 'se', box, els, rawDx: -10000, rawDy: -10000 })
    // every element keeps positive dimensions
    for (const e of out) { expect(e.w).toBeGreaterThan(0); expect(e.h).toBeGreaterThan(0) }
  })

  it('preserves relative gaps between elements', () => {
    const out = computeGroupResize({ handle: 'se', box, els, rawDx: 200, rawDy: 100 })
    // gap between a and b along x scales by sx=2
    const a = out.find((e) => e.id === 'a')!
    const b = out.find((e) => e.id === 'b')!
    expect(b.x - a.x).toBeCloseTo((150 - 0) * 2)
  })
})
