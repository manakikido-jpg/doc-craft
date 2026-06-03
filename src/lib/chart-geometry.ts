/**
 * Pure geometry/maths helpers for the chart renderer. Kept separate from the
 * SVG component so the numeric behavior of the richer (Excel-parity) chart
 * types can be unit-tested deterministically.
 */

export interface Dataset {
  label?: string
  values: number[]
  color?: string
}

/**
 * For stacked charts: for each label index, return the running base (bottom)
 * and top of every dataset segment. `bases[d][i]` is the cumulative sum of
 * datasets 0..d-1 at label i; `tops[d][i]` adds dataset d's own value.
 * Only non-negative values are stacked (negatives are clamped to 0 so the
 * stack stays monotonic, matching Excel's stacked-column behavior).
 */
export function stackedSegments(datasets: Dataset[], labelCount: number) {
  const bases: number[][] = []
  const tops: number[][] = []
  const running = new Array(labelCount).fill(0)
  for (let d = 0; d < datasets.length; d++) {
    const base: number[] = []
    const top: number[] = []
    for (let i = 0; i < labelCount; i++) {
      const v = Math.max(0, datasets[d].values[i] ?? 0)
      base.push(running[i])
      running[i] += v
      top.push(running[i])
    }
    bases.push(base)
    tops.push(top)
  }
  // `running` now holds the per-label totals.
  return { bases, tops, totals: running as number[] }
}

/** Maximum stacked total across all labels (the y-axis max for a stacked chart). */
export function stackedMax(datasets: Dataset[], labelCount: number): number {
  const { totals } = stackedSegments(datasets, labelCount)
  return Math.max(1, ...totals)
}

/**
 * For 100%-stacked charts: convert each dataset value to its fraction (0..1) of
 * that label's total. Empty labels (total 0) yield 0 for every dataset.
 */
export function percentStackedSegments(datasets: Dataset[], labelCount: number) {
  const totals = new Array(labelCount).fill(0)
  for (let i = 0; i < labelCount; i++) {
    for (const ds of datasets) totals[i] += Math.max(0, ds.values[i] ?? 0)
  }
  const bases: number[][] = []
  const tops: number[][] = []
  const running = new Array(labelCount).fill(0)
  for (let d = 0; d < datasets.length; d++) {
    const base: number[] = []
    const top: number[] = []
    for (let i = 0; i < labelCount; i++) {
      const frac = totals[i] > 0 ? Math.max(0, datasets[d].values[i] ?? 0) / totals[i] : 0
      base.push(running[i])
      running[i] += frac
      top.push(running[i])
    }
    bases.push(base)
    tops.push(top)
  }
  return { bases, tops }
}

/**
 * Build a smooth (Catmull-Rom → cubic Bézier) SVG path through the given
 * points. Falls back to a straight line for < 3 points.
 */
export function smoothPath(points: { x: number; y: number }[], tension = 0.5): string {
  if (points.length === 0) return ''
  if (points.length < 3) {
    return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${round(p.x)},${round(p.y)}`).join(' ')
  }
  let d = `M${round(points[0].x)},${round(points[0].y)}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[i + 2] ?? p2
    const c1x = p1.x + ((p2.x - p0.x) / 6) * tension * 2
    const c1y = p1.y + ((p2.y - p0.y) / 6) * tension * 2
    const c2x = p2.x - ((p3.x - p1.x) / 6) * tension * 2
    const c2y = p2.y - ((p3.y - p1.y) / 6) * tension * 2
    d += ` C${round(c1x)},${round(c1y)} ${round(c2x)},${round(c2y)} ${round(p2.x)},${round(p2.y)}`
  }
  return d
}

/** Build a stepped (orthogonal) polyline points string through the given points. */
export function steppedPoints(points: { x: number; y: number }[]): string {
  if (points.length === 0) return ''
  const out: string[] = [`${round(points[0].x)},${round(points[0].y)}`]
  for (let i = 1; i < points.length; i++) {
    // Horizontal to the new x at the previous y, then vertical to the new y.
    out.push(`${round(points[i].x)},${round(points[i - 1].y)}`)
    out.push(`${round(points[i].x)},${round(points[i].y)}`)
  }
  return out.join(' ')
}

export interface WaterfallStep {
  start: number
  end: number
  value: number
  rising: boolean
}

/**
 * Waterfall: turn a series of deltas into cumulative floating bars. Each step
 * starts where the previous ended. `rising` indicates a positive contribution.
 */
export function waterfallSteps(values: number[]): WaterfallStep[] {
  let cum = 0
  return values.map((v) => {
    const start = cum
    cum += v
    return { start, end: cum, value: v, rising: v >= 0 }
  })
}

/** Min/max envelope of a waterfall (for axis scaling). */
export function waterfallRange(values: number[]): { min: number; max: number } {
  const steps = waterfallSteps(values)
  let min = 0
  let max = 0
  for (const s of steps) {
    min = Math.min(min, s.start, s.end)
    max = Math.max(max, s.start, s.end)
  }
  return { min, max }
}

/**
 * Funnel: centered horizontal bars whose widths are proportional to each value
 * relative to the largest value. Returns width fraction (0..1) per value.
 */
export function funnelWidths(values: number[]): number[] {
  const max = Math.max(1, ...values.map((v) => Math.abs(v)))
  return values.map((v) => Math.max(0, Math.abs(v)) / max)
}

function round(n: number): number {
  return Math.round(n * 100) / 100
}
