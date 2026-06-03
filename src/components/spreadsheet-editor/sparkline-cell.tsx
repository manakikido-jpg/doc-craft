'use client'

import { memo } from 'react'

interface Props {
  values: number[]
  type: 'line' | 'bar' | 'win-loss'
  width: number
  height: number
  color?: string
}

export default memo(function SparklineCell({ values, type, width, height, color }: Props) {
  if (values.length === 0) return null

  const lineColor = color || '#6366f1'
  const padding = 2

  if (type === 'line') {
    const min = Math.min(...values)
    const max = Math.max(...values)
    const range = max - min || 1
    const innerW = width - padding * 2
    const innerH = height - padding * 2
    const step = values.length > 1 ? innerW / (values.length - 1) : 0

    const points = values
      .map((v, i) => {
        const x = padding + i * step
        const y = padding + innerH - ((v - min) / range) * innerH
        return `${x},${y}`
      })
      .join(' ')

    return (
      <svg width={width} height={height} className="inline-block align-middle">
        <polyline
          points={points}
          fill="none"
          stroke={lineColor}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* End dot */}
        {values.length > 0 && (() => {
          const lastX = padding + (values.length - 1) * step
          const lastY = padding + innerH - ((values[values.length - 1] - min) / range) * innerH
          return <circle cx={lastX} cy={lastY} r={1.5} fill={lineColor} />
        })()}
      </svg>
    )
  }

  if (type === 'bar') {
    const max = Math.max(...values.map(Math.abs))
    const absMax = max || 1
    const innerW = width - padding * 2
    const innerH = height - padding * 2
    const barWidth = Math.max(1, (innerW / values.length) - 1)
    const gap = 1

    return (
      <svg width={width} height={height} className="inline-block align-middle">
        {values.map((v, i) => {
          const barH = (Math.abs(v) / absMax) * innerH
          const x = padding + i * (barWidth + gap)
          const y = padding + innerH - barH
          return (
            <rect
              key={i}
              x={x}
              y={y}
              width={barWidth}
              height={barH}
              fill={v >= 0 ? lineColor : '#ef4444'}
              rx={0.5}
            />
          )
        })}
      </svg>
    )
  }

  if (type === 'win-loss') {
    const innerW = width - padding * 2
    const innerH = height - padding * 2
    const barWidth = Math.max(1, (innerW / values.length) - 1)
    const gap = 1
    const halfH = innerH / 2

    return (
      <svg width={width} height={height} className="inline-block align-middle">
        {values.map((v, i) => {
          const isWin = v > 0
          const x = padding + i * (barWidth + gap)
          const barH = halfH - 1
          const y = isWin ? padding : padding + halfH + 1
          return (
            <rect
              key={i}
              x={x}
              y={y}
              width={barWidth}
              height={barH}
              fill={isWin ? '#22c55e' : '#ef4444'}
              rx={0.5}
            />
          )
        })}
        {/* Center line */}
        <line
          x1={padding}
          y1={padding + halfH}
          x2={padding + innerW}
          y2={padding + halfH}
          stroke="#475569"
          strokeWidth={0.5}
        />
      </svg>
    )
  }

  return null
})

/** Parse a sparkline marker string like "__SPARKLINE:line:1,2,3,4,5" */
export function parseSparklineMarker(value: string): { type: 'line' | 'bar' | 'win-loss'; values: number[] } | null {
  if (typeof value !== 'string' || !value.startsWith('__SPARKLINE:')) return null
  const parts = value.substring('__SPARKLINE:'.length).split(':')
  if (parts.length !== 2) return null
  const type = parts[0] as 'line' | 'bar' | 'win-loss'
  if (!['line', 'bar', 'win-loss'].includes(type)) return null
  const values = parts[1].split(',').map(Number).filter((n) => !isNaN(n))
  if (values.length === 0) return null
  return { type, values }
}
