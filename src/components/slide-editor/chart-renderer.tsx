'use client'

import type { SlideChartElement } from '@/types'

interface Props {
  chart: SlideChartElement
}

const CHART_COLORS = ['#6366f1', '#f97316', '#22c55e', '#eab308', '#ec4899', '#06b6d4', '#8b5cf6', '#ef4444']

export default function ChartRenderer({ chart }: Props) {
  const { chartType, data, showLegend, showValues, title } = chart
  if (!data.labels.length || !data.datasets.length) {
    return <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs">データなし</div>
  }

  const padding = { top: title ? 24 : 8, right: 12, bottom: 28, left: 36 }
  const allValues = data.datasets.flatMap((d) => d.values)
  const maxVal = Math.max(...allValues, 1)
  const minVal = Math.min(0, ...allValues)
  const range = maxVal - minVal || 1

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

  // Bar / Line chart
  const chartW = 200 - padding.left - padding.right
  const chartH = 200 - padding.top - padding.bottom
  const barGroupW = chartW / data.labels.length
  const barW = barGroupW / (data.datasets.length + 0.5)

  return (
    <svg viewBox="0 0 200 200" className="w-full h-full">
      {title && (
        <text x="100" y="14" textAnchor="middle" fill="#cbd5e1" fontSize="10" fontWeight="600">
          {title}
        </text>
      )}

      {/* Y axis lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((t) => {
        const y = padding.top + chartH * (1 - t)
        const val = minVal + range * t
        return (
          <g key={t}>
            <line x1={padding.left} y1={y} x2={padding.left + chartW} y2={y} stroke="#334155" strokeWidth="0.5" />
            <text x={padding.left - 3} y={y + 3} textAnchor="end" fill="#64748b" fontSize="6">
              {Math.round(val)}
            </text>
          </g>
        )
      })}

      {/* Labels */}
      {data.labels.map((label, i) => (
        <text
          key={i}
          x={padding.left + barGroupW * i + barGroupW / 2}
          y={200 - padding.bottom + 12}
          textAnchor="middle"
          fill="#94a3b8"
          fontSize="6"
        >
          {label.length > 6 ? label.slice(0, 6) + '..' : label}
        </text>
      ))}

      {data.datasets.map((ds, di) => {
        const color = ds.color || CHART_COLORS[di % CHART_COLORS.length]
        if (chartType === 'line') {
          const points = ds.values
            .map((v, i) => {
              const x = padding.left + barGroupW * i + barGroupW / 2
              const y = padding.top + chartH * (1 - (v - minVal) / range)
              return `${x},${y}`
            })
            .join(' ')
          return (
            <g key={di}>
              <polyline points={points} fill="none" stroke={color} strokeWidth="2" />
              {ds.values.map((v, i) => {
                const x = padding.left + barGroupW * i + barGroupW / 2
                const y = padding.top + chartH * (1 - (v - minVal) / range)
                return <circle key={i} cx={x} cy={y} r="3" fill={color} />
              })}
            </g>
          )
        }
        // Bar
        return ds.values.map((v, i) => {
          const x = padding.left + barGroupW * i + barW * di + barGroupW * 0.15
          const h = chartH * ((v - minVal) / range)
          const y = padding.top + chartH - h
          return (
            <g key={`${di}-${i}`}>
              <rect x={x} y={y} width={barW * 0.85} height={h} fill={color} rx="1" />
              {showValues && (
                <text x={x + barW * 0.42} y={y - 2} textAnchor="middle" fill="#94a3b8" fontSize="5">
                  {v}
                </text>
              )}
            </g>
          )
        })
      })}

      {showLegend &&
        data.datasets.length > 1 &&
        data.datasets.map((ds, i) => (
          <g key={i}>
            <rect
              x={padding.left + i * 50}
              y={padding.top - 10}
              width="6"
              height="6"
              rx="1"
              fill={ds.color || CHART_COLORS[i % CHART_COLORS.length]}
            />
            <text x={padding.left + i * 50 + 9} y={padding.top - 5} fill="#94a3b8" fontSize="6">
              {ds.label}
            </text>
          </g>
        ))}
    </svg>
  )
}
