'use client'

import type { SlideChartElement } from '@/types'
import {
  stackedSegments, stackedMax, percentStackedSegments,
  smoothPath, steppedPoints, waterfallSteps, waterfallRange, funnelWidths,
} from '@/lib/chart-geometry'
import { formatCompact, formatThousands } from '@/lib/format-number'
import { getPalette, themeOverridesColors } from '@/lib/chart-palettes'

interface Props {
  chart: SlideChartElement
}

function computeTrendLine(values: number[], type: 'linear' | 'exponential' | 'moving-average'): number[] {
  const n = values.length
  if (n === 0) return []

  if (type === 'moving-average') {
    const window = 3
    return values.map((_, i) => {
      const start = Math.max(0, i - Math.floor(window / 2))
      const slice = values.slice(start, Math.min(n, start + window))
      return slice.reduce((a, b) => a + b, 0) / slice.length
    })
  }

  if (type === 'exponential') {
    // Use ln-transform for exponential fit: y = a * e^(bx)
    // Filter out non-positive values for log
    const validIndices = values.map((v, i) => ({ v, i })).filter(({ v }) => v > 0)
    if (validIndices.length < 2) {
      // Fallback to linear if not enough positive values
      return computeTrendLine(values, 'linear')
    }
    const lnValues = validIndices.map(({ v }) => Math.log(v))
    const xs = validIndices.map(({ i }) => i)
    const lnN = xs.length
    const sumX = xs.reduce((a, b) => a + b, 0)
    const sumLnY = lnValues.reduce((a, b) => a + b, 0)
    const sumXLnY = xs.reduce((acc, x, i) => acc + x * lnValues[i], 0)
    const sumX2 = xs.reduce((acc, x) => acc + x * x, 0)
    const b = (lnN * sumXLnY - sumX * sumLnY) / (lnN * sumX2 - sumX * sumX || 1)
    const lnA = (sumLnY - b * sumX) / lnN
    const a = Math.exp(lnA)
    return values.map((_, i) => a * Math.exp(b * i))
  }

  // Linear: y = mx + b (least squares)
  const sumX = values.reduce((acc, _, i) => acc + i, 0)
  const sumY = values.reduce((acc, v) => acc + v, 0)
  const sumXY = values.reduce((acc, v, i) => acc + i * v, 0)
  const sumX2 = values.reduce((acc, _, i) => acc + i * i, 0)
  const m = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX || 1)
  const b = (sumY - m * sumX) / n
  return values.map((_, i) => m * i + b)
}

export default function ChartRenderer({ chart }: Props) {
  const { chartType, data, showLegend, showValues, title } = chart
  if (!data.labels.length || !data.datasets.length) {
    return <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs">データなし</div>
  }

  // Active color palette (so all CHART_COLORS[...] references below pick it up).
  const CHART_COLORS = getPalette(chart.colorTheme)
  const themed = themeOverridesColors(chart.colorTheme)
  // Resolve a dataset's color: an explicit per-dataset color wins UNLESS a theme
  // is selected, in which case the theme palette overrides it.
  const dsColor = (ds: { color?: string } | undefined, i: number) =>
    themed ? CHART_COLORS[i % CHART_COLORS.length] : (ds?.color || CHART_COLORS[i % CHART_COLORS.length])

  const padding = { top: title ? 24 : 8, right: 12, bottom: 28, left: 36 }
  const allValues = data.datasets.flatMap((d) => d.values)
  const maxVal = Math.max(...allValues, 1)
  const minVal = Math.min(0, ...allValues)
  const range = maxVal - minVal || 1

  // Radar chart
  if (chartType === 'radar') {
    const labels = data.labels
    const n = labels.length
    const cx = 100, cy = 105, r = 65
    const values = data.datasets[0]?.values || []
    const maxV = Math.max(...values, 1)

    // Draw grid
    const gridLevels = [0.25, 0.5, 0.75, 1]
    const gridElements = gridLevels.map(level => {
      const points = labels.map((_, i) => {
        const angle = (Math.PI * 2 * i) / n - Math.PI / 2
        return `${cx + r * level * Math.cos(angle)},${cy + r * level * Math.sin(angle)}`
      }).join(' ')
      return <polygon key={level} points={points} fill="none" stroke="#334155" strokeWidth="0.5" />
    })

    // Draw axes
    const axes = labels.map((label, i) => {
      const angle = (Math.PI * 2 * i) / n - Math.PI / 2
      const x2 = cx + r * Math.cos(angle)
      const y2 = cy + r * Math.sin(angle)
      const lx = cx + (r + 12) * Math.cos(angle)
      const ly = cy + (r + 12) * Math.sin(angle)
      return (
        <g key={i}>
          <line x1={cx} y1={cy} x2={x2} y2={y2} stroke="#334155" strokeWidth="0.5" />
          <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fill="#94a3b8" fontSize="6">{label.slice(0, 4)}</text>
        </g>
      )
    })

    // Draw data
    const dataPolygons = data.datasets.map((ds, di) => {
      const color = dsColor(ds, di)
      const points = ds.values.map((v, i) => {
        const angle = (Math.PI * 2 * i) / n - Math.PI / 2
        const vr = (v / maxV) * r
        return `${cx + vr * Math.cos(angle)},${cy + vr * Math.sin(angle)}`
      }).join(' ')
      return (
        <g key={di}>
          <polygon points={points} fill={color} fillOpacity={0.15} stroke={color} strokeWidth="1.5" />
          {ds.values.map((v, i) => {
            const angle = (Math.PI * 2 * i) / n - Math.PI / 2
            const vr = (v / maxV) * r
            return <circle key={i} cx={cx + vr * Math.cos(angle)} cy={cy + vr * Math.sin(angle)} r="2.5" fill={color} />
          })}
        </g>
      )
    })

    return (
      <svg viewBox="0 0 200 200" className="w-full h-full">
        {title && <text x="100" y="14" textAnchor="middle" fill="#cbd5e1" fontSize="10" fontWeight="600">{title}</text>}
        {gridElements}
        {axes}
        {dataPolygons}
      </svg>
    )
  }

  // ── Funnel chart ──
  if (chartType === 'funnel') {
    const values = data.datasets[0]?.values || []
    const labels = data.labels
    const widths = funnelWidths(values)
    const top = title ? 24 : 10
    const bottom = 14
    const availH = 200 - top - bottom
    const rowH = values.length > 0 ? availH / values.length : availH
    const maxW = 150
    return (
      <svg viewBox="0 0 200 200" className="w-full h-full">
        {title && <text x="100" y="14" textAnchor="middle" fill="#cbd5e1" fontSize="10" fontWeight="600">{title}</text>}
        {values.map((v, i) => {
          const w = Math.max(2, widths[i] * maxW)
          const wNext = i < values.length - 1 ? Math.max(2, widths[i + 1] * maxW) : w
          const y = top + rowH * i
          const color = CHART_COLORS[i % CHART_COLORS.length]
          // Trapezoid from this row's width to the next row's width.
          const x1 = 100 - w / 2, x2 = 100 + w / 2
          const x3 = 100 + wNext / 2, x4 = 100 - wNext / 2
          const pad = rowH * 0.12
          return (
            <g key={i}>
              <path d={`M${x1},${y + pad} L${x2},${y + pad} L${x3},${y + rowH - pad} L${x4},${y + rowH - pad} Z`} fill={color} fillOpacity={0.85} />
              <text x={100} y={y + rowH / 2} textAnchor="middle" dominantBaseline="middle" fill="#fff" fontSize="7" fontWeight="500">
                {labels[i] ? `${labels[i]}: ${formatThousands(v)}` : formatThousands(v)}
              </text>
            </g>
          )
        })}
      </svg>
    )
  }

  // ── Waterfall chart ──
  if (chartType === 'waterfall') {
    const values = data.datasets[0]?.values || []
    const steps = waterfallSteps(values)
    const { min: wMin, max: wMax } = waterfallRange(values)
    const wRange = wMax - wMin || 1
    const pad = { top: title ? 24 : 10, right: 10, bottom: 28, left: 30 }
    const cW = 200 - pad.left - pad.right
    const cH = 200 - pad.top - pad.bottom
    const slot = values.length > 0 ? cW / values.length : cW
    const yOf = (val: number) => pad.top + cH * (1 - (val - wMin) / wRange)
    return (
      <svg viewBox="0 0 200 200" className="w-full h-full">
        {title && <text x="100" y="14" textAnchor="middle" fill="#cbd5e1" fontSize="10" fontWeight="600">{title}</text>}
        {/* zero baseline */}
        <line x1={pad.left} y1={yOf(0)} x2={pad.left + cW} y2={yOf(0)} stroke="#475569" strokeWidth="0.6" />
        {steps.map((s, i) => {
          const x = pad.left + slot * i + slot * 0.18
          const barW = slot * 0.64
          const yTop = yOf(Math.max(s.start, s.end))
          const h = Math.abs(yOf(s.start) - yOf(s.end))
          const color = s.rising ? '#22c55e' : '#ef4444'
          return (
            <g key={i}>
              <rect x={x} y={yTop} width={barW} height={Math.max(1, h)} fill={color} rx="1" />
              {showValues && (
                <text x={x + barW / 2} y={yTop - 2} textAnchor="middle" fill="#94a3b8" fontSize="5">{formatThousands(s.value)}</text>
              )}
              <text x={x + barW / 2} y={200 - pad.bottom + 10} textAnchor="middle" fill="#94a3b8" fontSize="6">
                {(data.labels[i] || '').slice(0, 6)}
              </text>
            </g>
          )
        })}
      </svg>
    )
  }

  if (chartType === 'pie' || chartType === 'donut') {
    const values = data.datasets[0]?.values || []
    const total = values.reduce((a, b) => a + b, 0) || 1
    // Precompute cumulative angles to avoid mutable variable in render
    const cumAngles = values.reduce<number[]>((acc, val) => {
      const prev = acc.length > 0 ? acc[acc.length - 1] : -90
      acc.push(prev + (val / total) * 360)
      return acc
    }, [])

    return (
      <svg viewBox="0 0 200 200" className="w-full h-full">
        {title && (
          <text x="100" y="16" textAnchor="middle" fill="#cbd5e1" fontSize="10" fontWeight="600">
            {title}
          </text>
        )}
        {values.map((val, i) => {
          const angle = (val / total) * 360
          const cumAngle = i === 0 ? -90 : cumAngles[i - 1]
          const startRad = (cumAngle * Math.PI) / 180
          const endRad = ((cumAngle + angle) * Math.PI) / 180
          const cx = 100,
            cy = 105,
            r = chartType === 'donut' ? 55 : 70
          const innerR = chartType === 'donut' ? 35 : 0
          const x1 = cx + r * Math.cos(startRad),
            y1 = cy + r * Math.sin(startRad)
          const x2 = cx + r * Math.cos(endRad),
            y2 = cy + r * Math.sin(endRad)
          const large = angle > 180 ? 1 : 0
          const _color = data.datasets[0]?.color || CHART_COLORS[i % CHART_COLORS.length]
          if (chartType === 'donut') {
            const ix1 = cx + innerR * Math.cos(startRad),
              iy1 = cy + innerR * Math.sin(startRad)
            const ix2 = cx + innerR * Math.cos(endRad),
              iy2 = cy + innerR * Math.sin(endRad)
            return (
              <path
                key={i}
                d={`M${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2} L${ix2},${iy2} A${innerR},${innerR} 0 ${large},0 ${ix1},${iy1} Z`}
                fill={CHART_COLORS[i % CHART_COLORS.length]}
                stroke="#0f172a"
                strokeWidth="1"
              />
            )
          }
          if (values.length === 1) {
            return <circle key={i} cx={cx} cy={cy} r={r} fill={CHART_COLORS[i % CHART_COLORS.length]} />
          }
          return (
            <path
              key={i}
              d={`M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2} Z`}
              fill={CHART_COLORS[i % CHART_COLORS.length]}
              stroke="#0f172a"
              strokeWidth="1"
            />
          )
        })}
        {showLegend &&
          data.labels.map((label, i) => (
            <g key={i}>
              <rect
                x={10}
                y={180 - (data.labels.length - i - 1) * 12}
                width="8"
                height="8"
                rx="1"
                fill={CHART_COLORS[i % CHART_COLORS.length]}
              />
              <text x={22} y={187 - (data.labels.length - i - 1) * 12} fill="#94a3b8" fontSize="7">
                {label}
              </text>
            </g>
          ))}
      </svg>
    )
  }

  // Bar / Line / Area / Scatter / HorizontalBar chart
  const dualAxisPadding = chart.dualAxis ? { ...padding, right: 36 } : padding
  const activePadding = chart.dualAxis ? dualAxisPadding : padding
  const chartW = 200 - activePadding.left - activePadding.right
  const chartH = 200 - activePadding.top - activePadding.bottom

  // ── Dual-Axis: separate primary/secondary datasets and compute independent scales ──
  const primaryDatasets = chart.dualAxis
    ? data.datasets.filter(ds => ds.axis !== 'secondary')
    : data.datasets
  const secondaryDatasets = chart.dualAxis
    ? data.datasets.filter(ds => ds.axis === 'secondary')
    : []

  const primaryValues = primaryDatasets.flatMap(d => d.values)
  const primaryMax = Math.max(...primaryValues, 1)
  const primaryMin = Math.min(0, ...primaryValues)
  const primaryRange = primaryMax - primaryMin || 1

  const secondaryValues = secondaryDatasets.flatMap(d => d.values)
  const secondaryMax = secondaryValues.length > 0 ? Math.max(...secondaryValues, 1) : 1
  const secondaryMin = secondaryValues.length > 0 ? Math.min(0, ...secondaryValues) : 0
  const secondaryRange = secondaryMax - secondaryMin || 1

  // Stacked variants scale the Y axis to the per-label TOTAL, not the max value.
  const isStacked = chartType === 'stackedBar' || chartType === 'stackedArea'
  const isPercentStacked = chartType === 'stackedBar100'
  const stackTotalMax = isStacked ? stackedMax(data.datasets, data.labels.length) : 1

  // For non-dual-axis, use the original global scale (or the stacked total).
  const effectiveMax = chart.dualAxis ? primaryMax : isPercentStacked ? 1 : isStacked ? stackTotalMax : maxVal
  const effectiveMin = chart.dualAxis ? primaryMin : (isStacked || isPercentStacked) ? 0 : minVal
  const effectiveRange = chart.dualAxis ? primaryRange : (effectiveMax - effectiveMin) || 1

  const barDatasetCount = chart.dualAxis ? primaryDatasets.length : data.datasets.length
  const barGroupW = chartW / data.labels.length
  const barW = barGroupW / (barDatasetCount + 0.5)

  // Precomputed stacking bases/tops (per dataset, per label) for stacked charts.
  const stackSeg = isStacked ? stackedSegments(data.datasets, data.labels.length) : null
  const pctSeg = isPercentStacked ? percentStackedSegments(data.datasets, data.labels.length) : null
  // Y position for a value in the current effective scale.
  const yForValue = (v: number) => activePadding.top + chartH * (1 - (v - effectiveMin) / effectiveRange)

  return (
    <svg viewBox="0 0 200 200" className="w-full h-full">
      {title && (
        <text x="100" y="14" textAnchor="middle" fill="#cbd5e1" fontSize="10" fontWeight="600">
          {title}
        </text>
      )}

      {/* Y axis lines (conditional on showGridLines) */}
      {(chart.showGridLines !== false) && [0, 0.25, 0.5, 0.75, 1].map((t) => {
        const y = activePadding.top + chartH * (1 - t)
        const val = effectiveMin + effectiveRange * t
        return (
          <g key={t}>
            <line x1={activePadding.left} y1={y} x2={activePadding.left + chartW} y2={y} stroke="#334155" strokeWidth="0.5" />
            <text x={activePadding.left - 3} y={y + 3} textAnchor="end" fill="#64748b" fontSize="6">
              {formatCompact(val)}
            </text>
          </g>
        )
      })}

      {/* ── Dual-Axis: secondary Y-axis labels on the right ── */}
      {chart.dualAxis && secondaryDatasets.length > 0 && (chart.showGridLines !== false) && [0, 0.25, 0.5, 0.75, 1].map((t) => {
        const y = activePadding.top + chartH * (1 - t)
        const val = secondaryMin + secondaryRange * t
        return (
          <text key={`sec-${t}`} x={activePadding.left + chartW + 3} y={y + 3} textAnchor="start" fill="#f97316" fontSize="6">
            {formatCompact(val)}
          </text>
        )
      })}

      {/* ── Dual-Axis: secondary axis label on the right ── */}
      {chart.dualAxis && chart.secondaryAxisLabel && (
        <text
          x={200 - 4}
          y={activePadding.top + chartH / 2}
          textAnchor="middle"
          fill="#f97316"
          fontSize="7"
          fontWeight="500"
          transform={`rotate(90, ${200 - 4}, ${activePadding.top + chartH / 2})`}
        >
          {chart.secondaryAxisLabel}
        </text>
      )}

      {/* Labels */}
      {data.labels.map((label, i) => (
        <text
          key={i}
          x={activePadding.left + barGroupW * i + barGroupW / 2}
          y={200 - activePadding.bottom + 12}
          textAnchor="middle"
          fill="#94a3b8"
          fontSize="6"
        >
          {label.length > 6 ? label.slice(0, 6) + '..' : label}
        </text>
      ))}

      {/* Axis labels */}
      {chart.axisLabelX && (
        <text x={activePadding.left + chartW / 2} y={198} textAnchor="middle" fill="#94a3b8" fontSize="7" fontWeight="500">
          {chart.axisLabelX}
        </text>
      )}
      {chart.axisLabelY && (
        <text x={6} y={activePadding.top + chartH / 2} textAnchor="middle" fill="#94a3b8" fontSize="7" fontWeight="500" transform={`rotate(-90, 6, ${activePadding.top + chartH / 2})`}>
          {chart.axisLabelY}
        </text>
      )}

      {/* ── Dual-Axis: render primary datasets as bars, secondary as lines ── */}
      {chart.dualAxis && chartType === 'bar' && (
        <>
          {/* Primary datasets: bars */}
          {primaryDatasets.map((ds, di) => {
            const color = dsColor(ds, di)
            return ds.values.map((v, i) => {
              const x = activePadding.left + barGroupW * i + barW * di + barGroupW * 0.15
              const h = chartH * ((v - effectiveMin) / effectiveRange)
              const y = activePadding.top + chartH - h
              return (
                <g key={`primary-${di}-${i}`}>
                  <rect x={x} y={y} width={barW * 0.85} height={h} fill={color} rx="1" />
                  {showValues && (
                    <text x={x + barW * 0.42} y={y - 2} textAnchor="middle" fill="#94a3b8" fontSize="5">
                      {formatThousands(v)}
                    </text>
                  )}
                </g>
              )
            })
          })}
          {/* Secondary datasets: lines */}
          {secondaryDatasets.map((ds, di) => {
            const color = ds.color || CHART_COLORS[(primaryDatasets.length + di) % CHART_COLORS.length]
            const points = ds.values
              .map((v, i) => {
                const x = activePadding.left + barGroupW * i + barGroupW / 2
                const y = activePadding.top + chartH * (1 - (v - secondaryMin) / secondaryRange)
                return `${x},${y}`
              })
              .join(' ')
            return (
              <g key={`secondary-${di}`}>
                <polyline points={points} fill="none" stroke={color} strokeWidth="2" />
                {ds.values.map((v, i) => {
                  const x = activePadding.left + barGroupW * i + barGroupW / 2
                  const y = activePadding.top + chartH * (1 - (v - secondaryMin) / secondaryRange)
                  return (
                    <g key={i}>
                      <circle cx={x} cy={y} r="3" fill={color} />
                      {showValues && (
                        <text x={x} y={y - 5} textAnchor="middle" fill="#f97316" fontSize="5">
                          {formatThousands(v)}
                        </text>
                      )}
                    </g>
                  )
                })}
              </g>
            )
          })}
        </>
      )}

      {/* ── Standard (non-dual-axis) dataset rendering ── */}
      {!(chart.dualAxis && chartType === 'bar') && data.datasets.map((ds, di) => {
        const color = dsColor(ds, di)
        const cx = (i: number) => activePadding.left + barGroupW * i + barGroupW / 2

        // Stacked bar (absolute) and 100% stacked bar
        if ((chartType === 'stackedBar' && stackSeg) || (chartType === 'stackedBar100' && pctSeg)) {
          const seg = chartType === 'stackedBar100' ? pctSeg! : stackSeg!
          return (
            <g key={di}>
              {ds.values.map((_, i) => {
                const base = seg.bases[di][i]
                const top = seg.tops[di][i]
                const yTop = yForValue(top)
                const yBase = yForValue(base)
                const bx = activePadding.left + barGroupW * i + barGroupW * 0.2
                const bw = barGroupW * 0.6
                const h = Math.max(0, yBase - yTop)
                if (h <= 0) return null
                return <rect key={i} x={bx} y={yTop} width={bw} height={h} fill={color} />
              })}
            </g>
          )
        }

        // Stacked area
        if (chartType === 'stackedArea' && stackSeg) {
          const topPts = ds.values.map((_, i) => ({ x: cx(i), y: yForValue(stackSeg.tops[di][i]) }))
          const basePts = ds.values.map((_, i) => ({ x: cx(i), y: yForValue(stackSeg.bases[di][i]) }))
          const path = `M${topPts.map(p => `${p.x},${p.y}`).join(' L')} L${[...basePts].reverse().map(p => `${p.x},${p.y}`).join(' L')} Z`
          return (
            <g key={di}>
              <path d={path} fill={color} fillOpacity={0.35} />
              <polyline points={topPts.map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke={color} strokeWidth="1.5" />
            </g>
          )
        }

        // Smooth (spline) line
        if (chartType === 'smoothLine') {
          const pts = ds.values.map((v, i) => ({ x: cx(i), y: yForValue(v) }))
          return (
            <g key={di}>
              <path d={smoothPath(pts)} fill="none" stroke={color} strokeWidth="2" />
              {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="2.5" fill={color} />)}
            </g>
          )
        }

        // Stepped line
        if (chartType === 'steppedLine') {
          const pts = ds.values.map((v, i) => ({ x: cx(i), y: yForValue(v) }))
          return (
            <g key={di}>
              <polyline points={steppedPoints(pts)} fill="none" stroke={color} strokeWidth="2" />
              {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="2.5" fill={color} />)}
            </g>
          )
        }

        // Bubble (scatter sized by value)
        if (chartType === 'bubble') {
          const maxV = Math.max(...ds.values.map(Math.abs), 1)
          return (
            <g key={di}>
              {ds.values.map((v, i) => {
                const r = 2 + (Math.abs(v) / maxV) * 8
                return <circle key={i} cx={cx(i)} cy={yForValue(v)} r={r} fill={color} fillOpacity={0.55} stroke={color} strokeWidth="0.8" />
              })}
            </g>
          )
        }

        // Combo: first dataset as bars, remaining datasets as lines
        if (chartType === 'combo') {
          if (di === 0) {
            return (
              <g key={di}>
                {ds.values.map((v, i) => {
                  const h = chartH * ((v - effectiveMin) / effectiveRange)
                  const bx = activePadding.left + barGroupW * i + barGroupW * 0.22
                  return <rect key={i} x={bx} y={activePadding.top + chartH - h} width={barGroupW * 0.56} height={Math.max(0, h)} fill={color} rx="1" />
                })}
              </g>
            )
          }
          const pts = ds.values.map((v, i) => `${cx(i)},${yForValue(v)}`).join(' ')
          return (
            <g key={di}>
              <polyline points={pts} fill="none" stroke={color} strokeWidth="2" />
              {ds.values.map((v, i) => <circle key={i} cx={cx(i)} cy={yForValue(v)} r="2.5" fill={color} />)}
            </g>
          )
        }

        // Area chart
        if (chartType === 'area') {
          const points = ds.values.map((v, i) => {
            const x = activePadding.left + barGroupW * i + barGroupW / 2
            const y = activePadding.top + chartH * (1 - (v - minVal) / range)
            return `${x},${y}`
          })
          const baseY = activePadding.top + chartH
          const areaPath = `M${activePadding.left + barGroupW / 2},${baseY} ${points.map(p => `L${p}`).join(' ')} L${activePadding.left + barGroupW * (ds.values.length - 1) + barGroupW / 2},${baseY} Z`
          return (
            <g key={di}>
              <path d={areaPath} fill={color} fillOpacity={0.2} />
              <polyline points={points.join(' ')} fill="none" stroke={color} strokeWidth="2" />
              {ds.values.map((v, i) => {
                const x = activePadding.left + barGroupW * i + barGroupW / 2
                const y = activePadding.top + chartH * (1 - (v - minVal) / range)
                return <circle key={i} cx={x} cy={y} r="2.5" fill={color} />
              })}
            </g>
          )
        }

        // Scatter chart
        if (chartType === 'scatter') {
          return (
            <g key={di}>
              {ds.values.map((v, i) => {
                const x = activePadding.left + barGroupW * i + barGroupW / 2
                const y = activePadding.top + chartH * (1 - (v - minVal) / range)
                return <circle key={i} cx={x} cy={y} r="3" fill={color} />
              })}
            </g>
          )
        }

        // Horizontal bar chart
        if (chartType === 'horizontalBar') {
          const barH = chartH / data.labels.length / (data.datasets.length + 0.5)
          return ds.values.map((v, i) => {
            const barY = activePadding.top + (chartH / data.labels.length) * i + barH * di + (chartH / data.labels.length) * 0.15
            const w = chartW * ((v - minVal) / range)
            return (
              <g key={`${di}-${i}`}>
                <rect x={activePadding.left} y={barY} width={w} height={barH * 0.85} fill={color} rx="1" />
                {showValues && (
                  <text x={activePadding.left + w + 3} y={barY + barH * 0.5} fill="#94a3b8" fontSize="5" dominantBaseline="middle">
                    {formatThousands(v)}
                  </text>
                )}
              </g>
            )
          })
        }

        // Line chart
        if (chartType === 'line') {
          const points = ds.values
            .map((v, i) => {
              const x = activePadding.left + barGroupW * i + barGroupW / 2
              const y = activePadding.top + chartH * (1 - (v - minVal) / range)
              return `${x},${y}`
            })
            .join(' ')
          return (
            <g key={di}>
              <polyline points={points} fill="none" stroke={color} strokeWidth="2" />
              {ds.values.map((v, i) => {
                const x = activePadding.left + barGroupW * i + barGroupW / 2
                const y = activePadding.top + chartH * (1 - (v - minVal) / range)
                return <circle key={i} cx={x} cy={y} r="3" fill={color} />
              })}
            </g>
          )
        }

        // Bar chart (default)
        return ds.values.map((v, i) => {
          const x = activePadding.left + barGroupW * i + barW * di + barGroupW * 0.15
          const h = chartH * ((v - minVal) / range)
          const y = activePadding.top + chartH - h
          const labelPosition = chart.dataLabelPosition || (showValues ? 'outside' : 'none')
          const shouldShowLabel = showValues || (labelPosition !== 'none')
          return (
            <g key={`${di}-${i}`}>
              <rect x={x} y={y} width={barW * 0.85} height={h} fill={color} rx="1" />
              {shouldShowLabel && labelPosition === 'center' && (
                <text x={x + barW * 0.42} y={y + h / 2} textAnchor="middle" dominantBaseline="middle" fill="#fff" fontSize="5">
                  {formatThousands(v)}
                </text>
              )}
              {shouldShowLabel && (labelPosition === 'outside' || labelPosition === 'above') && (
                <text x={x + barW * 0.42} y={y - 2} textAnchor="middle" fill="#94a3b8" fontSize="5">
                  {formatThousands(v)}
                </text>
              )}
              {showValues && labelPosition === 'none' && (
                <text x={x + barW * 0.42} y={y - 2} textAnchor="middle" fill="#94a3b8" fontSize="5">
                  {formatThousands(v)}
                </text>
              )}
            </g>
          )
        })
      })}

      {/* Trend line overlay */}
      {chart.trendLine && chart.trendLine !== 'none' && data.datasets.length > 0 &&
        (chartType === 'bar' || chartType === 'line' || chartType === 'area' || chartType === 'scatter') && (() => {
          const trendValues = computeTrendLine(data.datasets[0].values, chart.trendLine)
          const trendColor = chart.trendLineColor || '#f97316'
          const points = trendValues.map((v, i) => {
            const x = activePadding.left + barGroupW * i + barGroupW / 2
            const y = activePadding.top + chartH * (1 - (v - minVal) / range)
            return `${x},${y}`
          }).join(' ')
          return (
            <polyline
              points={points}
              fill="none"
              stroke={trendColor}
              strokeWidth="1.5"
              strokeDasharray="4 2"
            />
          )
        })()
      }

      {showLegend && data.datasets.length > 1 && (() => {
        // Dynamic, centered legend so it reads well for 2+ series of any label
        // length (used by grouped, stacked, combo, line and area charts alike).
        const items = data.datasets.map((ds, i) => ({
          label: ds.label || `データ${i + 1}`,
          color: dsColor(ds, i),
        }))
        const widths = items.map((it) => 10 + it.label.length * 3.1 + 6)
        const totalW = widths.reduce((a, b) => a + b, 0)
        let cx = Math.max(4, (200 - totalW) / 2)
        const y = activePadding.top - 6
        return items.map((it, i) => {
          const x = cx
          cx += widths[i]
          return (
            <g key={i}>
              <rect x={x} y={y - 4} width="6" height="6" rx="1" fill={it.color} />
              <text x={x + 9} y={y + 1} fill="#94a3b8" fontSize="6">{it.label}</text>
            </g>
          )
        })
      })()}
    </svg>
  )
}
