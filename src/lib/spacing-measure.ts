/**
 * Compute Figma-style spacing measurements between a moving box and the nearest
 * neighbor on each side whose perpendicular extent overlaps the box. Pure so it
 * can be unit-tested; the design editor renders the returned dimension lines.
 */

export interface Box { x: number; y: number; w: number; h: number }

export interface SpacingMeasure {
  x1: number; y1: number; x2: number; y2: number
  label: string
  orientation: 'h' | 'v'
}

export function computeSpacingMeasures(box: Box, others: Box[]): SpacingMeasure[] {
  const measures: SpacingMeasure[] = []
  const cx = box.x + box.w / 2
  const cy = box.y + box.h / 2
  const vOverlap = (o: Box) => o.y < box.y + box.h && o.y + o.h > box.y
  const hOverlap = (o: Box) => o.x < box.x + box.w && o.x + o.w > box.x

  const nearestLeft = others
    .filter((o) => vOverlap(o) && o.x + o.w <= box.x)
    .reduce<Box | null>((best, o) => (!best || o.x + o.w > best.x + best.w ? o : best), null)
  if (nearestLeft) {
    const gap = box.x - (nearestLeft.x + nearestLeft.w)
    measures.push({ x1: nearestLeft.x + nearestLeft.w, y1: cy, x2: box.x, y2: cy, label: String(Math.round(gap)), orientation: 'h' })
  }

  const nearestRight = others
    .filter((o) => vOverlap(o) && o.x >= box.x + box.w)
    .reduce<Box | null>((best, o) => (!best || o.x < best.x ? o : best), null)
  if (nearestRight) {
    const gap = nearestRight.x - (box.x + box.w)
    measures.push({ x1: box.x + box.w, y1: cy, x2: nearestRight.x, y2: cy, label: String(Math.round(gap)), orientation: 'h' })
  }

  const nearestTop = others
    .filter((o) => hOverlap(o) && o.y + o.h <= box.y)
    .reduce<Box | null>((best, o) => (!best || o.y + o.h > best.y + best.h ? o : best), null)
  if (nearestTop) {
    const gap = box.y - (nearestTop.y + nearestTop.h)
    measures.push({ x1: cx, y1: nearestTop.y + nearestTop.h, x2: cx, y2: box.y, label: String(Math.round(gap)), orientation: 'v' })
  }

  const nearestBottom = others
    .filter((o) => hOverlap(o) && o.y >= box.y + box.h)
    .reduce<Box | null>((best, o) => (!best || o.y < best.y ? o : best), null)
  if (nearestBottom) {
    const gap = nearestBottom.y - (box.y + box.h)
    measures.push({ x1: cx, y1: box.y + box.h, x2: cx, y2: nearestBottom.y, label: String(Math.round(gap)), orientation: 'v' })
  }

  return measures
}
