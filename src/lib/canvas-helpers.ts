import type { SlideElement } from '@/types'

export type SmartGuide = { x?: number; y?: number; type?: 'edge' | 'center' | 'spacing' }

export interface SmartGuideResult {
  guides: SmartGuide[]
  snapDx: number
  snapDy: number
}

/**
 * Compute smart alignment guides when elements are being moved.
 */
export function computeSmartGuides(
  elements: SlideElement[],
  movingIds: string[],
  newPositions: { elementId: string; x: number; y: number }[],
): SmartGuideResult {
  const guides: SmartGuide[] = []
  const others = elements.filter((el): el is Exclude<SlideElement, { type: 'connector' }> => !movingIds.includes(el.id) && el.type !== 'connector')
  const threshold = 1.5
  let snapDx = 0
  let snapDy = 0
  let snappedX = false
  let snappedY = false

  for (const pos of newPositions) {
    const moving = elements.find((e) => e.id === pos.elementId)
    if (!moving || moving.type === 'connector') continue
    const mw = moving.w ?? 0
    const mh = 'h' in moving ? (moving.h ?? 0) : 0
    const mLeft = pos.x
    const mRight = pos.x + mw
    const mTop = pos.y
    const mBottom = pos.y + mh
    const mCx = pos.x + mw / 2
    const mCy = pos.y + mh / 2

    for (const other of others) {
      const ow = other.w ?? 0
      const oh = 'h' in other ? (other.h ?? 0) : 0
      const oLeft = other.x
      const oRight = other.x + ow
      const oTop = other.y
      const oCx = other.x + ow / 2
      const oCy = other.y + oh / 2
      const oBottom = other.y + oh

      // Vertical guides (x-axis alignment)
      const xChecks = [
        { mv: mLeft, ov: oLeft, type: 'edge' as const },
        { mv: mRight, ov: oRight, type: 'edge' as const },
        { mv: mLeft, ov: oRight, type: 'edge' as const },
        { mv: mRight, ov: oLeft, type: 'edge' as const },
        { mv: mCx, ov: oCx, type: 'center' as const },
      ]
      for (const chk of xChecks) {
        const diff = chk.ov - chk.mv
        if (Math.abs(diff) < threshold) {
          guides.push({ x: chk.ov, type: chk.type })
          if (!snappedX) { snapDx = diff; snappedX = true }
        }
      }

      // Horizontal guides (y-axis alignment)
      const yChecks = [
        { mv: mTop, ov: oTop, type: 'edge' as const },
        { mv: mBottom, ov: oBottom, type: 'edge' as const },
        { mv: mTop, ov: oBottom, type: 'edge' as const },
        { mv: mBottom, ov: oTop, type: 'edge' as const },
        { mv: mCy, ov: oCy, type: 'center' as const },
      ]
      for (const chk of yChecks) {
        const diff = chk.ov - chk.mv
        if (Math.abs(diff) < threshold) {
          guides.push({ y: chk.ov, type: chk.type })
          if (!snappedY) { snapDy = diff; snappedY = true }
        }
      }
    }

    // Equal spacing guides (check gaps between sorted elements)
    if (others.length >= 2) {
      const otherBoxes = others.map((o) => ({
        x: o.x ?? 0,
        w: o.w ?? 0,
      }))
      otherBoxes.sort((a, b) => a.x - b.x)
      for (let i = 0; i < otherBoxes.length - 1; i++) {
        const a = otherBoxes[i]
        const b = otherBoxes[i + 1]
        const gap = b.x - (a.x + a.w)
        const gapBeforeMoving = mLeft - (a.x + a.w)
        const gapAfterMoving = b.x - mRight
        if (gap > 0 && Math.abs(gapBeforeMoving - gap) < threshold) {
          guides.push({ x: a.x + a.w + gap, type: 'spacing' })
        }
        if (gap > 0 && Math.abs(gapAfterMoving - gap) < threshold) {
          guides.push({ x: b.x + b.w + gap, type: 'spacing' })
        }
      }
    }
  }

  // Deduplicate guides
  const seen = new Set<string>()
  const unique = guides.filter((g) => {
    const key = `${g.x ?? ''}_${g.y ?? ''}_${g.type ?? ''}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  return { guides: unique, snapDx, snapDy }
}

/**
 * Compute anchor points for a non-connector element (in % coordinates).
 */
export function getAnchorPoints(el: SlideElement): { x: number; y: number; label: string }[] {
  if (el.type === 'connector') return []
  const w = el.w ?? 0
  const h = (el as any).h ?? 0
  return [
    { x: el.x + w / 2, y: el.y, label: 'top' },
    { x: el.x + w / 2, y: el.y + h, label: 'bottom' },
    { x: el.x, y: el.y + h / 2, label: 'left' },
    { x: el.x + w, y: el.y + h / 2, label: 'right' },
  ]
}

/**
 * Find the nearest anchor point within snap threshold.
 */
export const ANCHOR_SNAP_THRESHOLD = 2 // percentage units

export function findNearestAnchor(
  elements: SlideElement[],
  point: { x: number; y: number },
  _excludeConnectorId?: string,
): { anchor: { x: number; y: number }; elementId: string } | null {
  let best: { anchor: { x: number; y: number }; elementId: string; dist: number } | null = null
  for (const el of elements) {
    if (el.type === 'connector') continue
    const anchors = getAnchorPoints(el)
    for (const a of anchors) {
      const dist = Math.sqrt((a.x - point.x) ** 2 + (a.y - point.y) ** 2)
      if (dist < ANCHOR_SNAP_THRESHOLD && (!best || dist < best.dist)) {
        best = { anchor: { x: a.x, y: a.y }, elementId: el.id, dist }
      }
    }
  }
  return best ? { anchor: best.anchor, elementId: best.elementId } : null
}

/**
 * Get CSS transform string for a slide element.
 */
export function getElementTransform(el: SlideElement): string | undefined {
  if (el.type === 'connector') return undefined
  const parts: string[] = []
  if ('rotation' in el && el.rotation) parts.push(`rotate(${el.rotation}deg)`)
  if ('flipH' in el && el.flipH) parts.push('scaleX(-1)')
  if ('flipV' in el && el.flipV) parts.push('scaleY(-1)')
  return parts.length > 0 ? parts.join(' ') : undefined
}

/**
 * Get filter/opacity styles for a slide element.
 */
export function getElementFilterStyle(el: SlideElement): React.CSSProperties {
  const style: React.CSSProperties = {}
  if ('opacity' in el && el.opacity !== undefined && el.opacity !== 100) {
    style.opacity = el.opacity / 100
  }
  if ('shadow' in el && el.shadow) {
    style.filter = `drop-shadow(${el.shadow.offsetX}px ${el.shadow.offsetY}px ${el.shadow.blur}px ${el.shadow.color})`
  }
  return style
}

/**
 * Snap a value to grid.
 */
export function snapToGridValue(val: number, gridSize: number, enabled: boolean): number {
  if (!enabled) return val
  return Math.round(val / gridSize) * gridSize
}
