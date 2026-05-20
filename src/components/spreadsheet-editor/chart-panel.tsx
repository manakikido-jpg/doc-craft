'use client'

import { useState, useMemo } from 'react'
import type { Sheet } from '@/types'
import { colIndexToLetter, evaluateCell } from '@/lib/formula-engine'
import { X, BarChart3, TrendingUp, PieChart, ScatterChart } from 'lucide-react'

const CHART_COLORS = ['#6366f1', '#f97316', '#22c55e', '#eab308', '#ec4899', '#06b6d4', '#8b5cf6', '#ef4444']

export interface SpreadsheetChart {
  id: string
  chartType: 'bar' | 'line' | 'pie' | 'scatter'
  title: string
  range: { startRow: number; startCol: number; endRow: number; endCol: number }
  x: number
  y: number
}

interface Props {
  sheet: Sheet
  selectionRange: { startRow: number; startCol: number; endRow: number; endCol: number } | null
  onAddChart: (chart: SpreadsheetChart) => void
  onClose: () => void
}

type ChartType = 'bar' | 'line' | 'pie' | 'scatter'

const CHART_TYPES: { type: ChartType; label: string; icon: typeof BarChart3 }[] = [
  { type: 'bar', label: '棒グラフ', icon: BarChart3 },
  { type: 'line', label: '折れ線', icon: TrendingUp },
  { type: 'pie', label: '円グラフ', icon: PieChart },
  { type: 'scatter', label: '散布図', icon: ScatterChart },
]

function generateId() {
  return 'chart-' + Math.random().toString(36).substring(2, 9)
}

export default function ChartPanel({ sheet, selectionRange, onAddChart, onClose }: Props) {
  const [chartType, setChartType] = useState<ChartType>('bar')
  const [chartTitle, setChartTitle] = useState('')

  // Extract data from selected range
  const chartData = useMemo(() => {
    if (!selectionRange) return null
    const { startRow, startCol, endRow, endCol } = selectionRange
    const labels: string[] = []
    const datasets: { label: string; values: number[] }[] = []

    // If multiple columns, first column = labels, rest = data series
    // If single column, row indices = labels
    const colCount = endCol - startCol + 1
    const rowCount = endRow - startRow + 1

    if (colCount >= 2) {
      // First row might be headers
      const firstRowValues: string[] = []
      for (let c = startCol; c <= endCol; c++) {
        const val = evaluateCell(`${startRow}-${c}`, sheet.cells)
        firstRowValues.push(String(val))
      }

      // Check if first row looks like headers (has non-numeric text)
      const hasHeaders = firstRowValues.some((v, i) => i > 0 && isNaN(Number(v)) && v !== '')
      const dataStartRow = hasHeaders ? startRow + 1 : startRow

      // Labels from first column
      for (let r = dataStartRow; r <= endRow; r++) {
        const val = evaluateCell(`${r}-${startCol}`, sheet.cells)
        labels.push(String(val) || `行${r + 1}`)
      }

      // Data series from remaining columns
      for (let c = startCol + 1; c <= endCol; c++) {
        const seriesLabel = hasHeaders ? firstRowValues[c - startCol] : `${colIndexToLetter(c)}`
        const values: number[] = []
        for (let r = dataStartRow; r <= endRow; r++) {
          const val = evaluateCell(`${r}-${c}`, sheet.cells)
          values.push(typeof val === 'number' ? val : parseFloat(String(val)) || 0)
        }
        datasets.push({ label: seriesLabel, values })
      }
    } else {
      // Single column: labels are row numbers, single dataset
      const values: number[] = []
      for (let r = startRow; r <= endRow; r++) {
        labels.push(`行${r + 1}`)
        const val = evaluateCell(`${r}-${startCol}`, sheet.cells)
        values.push(typeof val === 'number' ? val : parseFloat(String(val)) || 0)
      }
      datasets.push({ label: colIndexToLetter(startCol), values })
    }

    return { labels, datasets }
  }, [selectionRange, sheet.cells])

  const rangeLabel = selectionRange
    ? `${colIndexToLetter(selectionRange.startCol)}${selectionRange.startRow + 1}:${colIndexToLetter(selectionRange.endCol)}${selectionRange.endRow + 1}`
    : 'なし'

  const handleCreate = () => {
    if (!selectionRange || !chartData) return
    onAddChart({
      id: generateId(),
      chartType,
      title: chartTitle || `グラフ`,
      range: selectionRange,
      x: 50,
      y: 50,
    })
    onClose()
  }

  // Preview SVG
  const previewSVG = useMemo(() => {
    if (!chartData || chartData.labels.length === 0) return null
    return renderChartSVG(chartType, chartData, chartTitle)
  }, [chartType, chartData, chartTitle])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-[560px] max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800">
          <h3 className="text-sm font-semibold text-white">グラフ作成</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Range display */}
          <div>
            <label className="text-xs text-slate-400 block mb-1">データ範囲</label>
            <div className="text-sm text-white bg-slate-800 px-3 py-1.5 rounded font-mono">{rangeLabel}</div>
            {!selectionRange && (
              <p className="text-xs text-amber-400 mt-1">データ範囲を選択してからグラフを作成してください</p>
            )}
          </div>

          {/* Chart type */}
          <div>
            <label className="text-xs text-slate-400 block mb-2">グラフの種類</label>
            <div className="grid grid-cols-4 gap-2">
              {CHART_TYPES.map(({ type, label, icon: Icon }) => (
                <button
                  key={type}
                  onClick={() => setChartType(type)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-colors ${
                    chartType === type
                      ? 'border-indigo-500 bg-indigo-600/20 text-white'
                      : 'border-slate-700 bg-slate-800 text-slate-400 hover:text-white hover:border-slate-600'
                  }`}
                >
                  <Icon size={20} />
                  <span className="text-[11px]">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="text-xs text-slate-400 block mb-1">タイトル</label>
            <input
              type="text"
              value={chartTitle}
              onChange={(e) => setChartTitle(e.target.value)}
              placeholder="グラフのタイトル"
              className="w-full h-8 bg-slate-800 border border-slate-700 rounded px-3 text-sm text-white outline-none focus:border-indigo-500"
            />
          </div>

          {/* Preview */}
          {previewSVG && (
            <div>
              <label className="text-xs text-slate-400 block mb-1">プレビュー</label>
              <div
                className="bg-slate-950 border border-slate-800 rounded-lg p-4 h-48 flex items-center justify-center"
                dangerouslySetInnerHTML={{ __html: previewSVG }}
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              キャンセル
            </button>
            <button
              onClick={handleCreate}
              disabled={!selectionRange || !chartData}
              className="px-4 py-2 text-xs text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              グラフを挿入
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Inline SVG chart rendering (same approach as chart-renderer.tsx)
export function renderChartSVG(
  chartType: ChartType,
  data: { labels: string[]; datasets: { label: string; values: number[] }[] },
  title?: string,
): string {
  if (!data.labels.length || !data.datasets.length) return ''

  const padding = { top: title ? 30 : 12, right: 16, bottom: 32, left: 44 }
  const W = 300
  const H = 200
  const allValues = data.datasets.flatMap((d) => d.values)
  const maxVal = Math.max(...allValues, 1)
  const minVal = Math.min(0, ...allValues)
  const range = maxVal - minVal || 1

  if (chartType === 'pie') {
    const values = data.datasets[0]?.values || []
    const total = values.reduce((a, b) => a + b, 0) || 1
    let cumAngle = -90
    let paths = ''
    values.forEach((val, i) => {
      const angle = (val / total) * 360
      const startRad = (cumAngle * Math.PI) / 180
      const endRad = ((cumAngle + angle) * Math.PI) / 180
      cumAngle += angle
      const cx = 150, cy = 105, r = 70
      const x1 = cx + r * Math.cos(startRad), y1 = cy + r * Math.sin(startRad)
      const x2 = cx + r * Math.cos(endRad), y2 = cy + r * Math.sin(endRad)
      const large = angle > 180 ? 1 : 0
      const color = CHART_COLORS[i % CHART_COLORS.length]
      if (values.length === 1) {
        paths += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}"/>`
      } else {
        paths += `<path d="M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2} Z" fill="${color}" stroke="#0f172a" stroke-width="1"/>`
      }
    })
    let legend = ''
    data.labels.forEach((label, i) => {
      legend += `<rect x="10" y="${180 - (data.labels.length - i - 1) * 14}" width="10" height="10" rx="2" fill="${CHART_COLORS[i % CHART_COLORS.length]}"/>`
      legend += `<text x="24" y="${189 - (data.labels.length - i - 1) * 14}" fill="#94a3b8" font-size="9">${escapeXml(label.length > 10 ? label.slice(0, 10) + '..' : label)}</text>`
    })
    return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:100%">${title ? `<text x="150" y="18" text-anchor="middle" fill="#e2e8f0" font-size="12" font-weight="600">${escapeXml(title)}</text>` : ''}${paths}${legend}</svg>`
  }

  if (chartType === 'scatter') {
    // Scatter: first dataset = X, second dataset = Y
    const xVals = data.datasets[0]?.values || []
    const yVals = data.datasets[1]?.values || data.datasets[0]?.values || []
    const chartW = W - padding.left - padding.right
    const chartH = H - padding.top - padding.bottom
    const xMax = Math.max(...xVals, 1)
    const xMin = Math.min(0, ...xVals)
    const xRange = xMax - xMin || 1
    const yMax = Math.max(...yVals, 1)
    const yMin = Math.min(0, ...yVals)
    const yRange = yMax - yMin || 1

    let svg = ''
    if (title) svg += `<text x="150" y="18" text-anchor="middle" fill="#e2e8f0" font-size="12" font-weight="600">${escapeXml(title)}</text>`
    // Grid
    for (const t of [0, 0.25, 0.5, 0.75, 1]) {
      const y = padding.top + chartH * (1 - t)
      svg += `<line x1="${padding.left}" y1="${y}" x2="${padding.left + chartW}" y2="${y}" stroke="#334155" stroke-width="0.5"/>`
      svg += `<text x="${padding.left - 4}" y="${y + 3}" text-anchor="end" fill="#64748b" font-size="7">${Math.round(yMin + yRange * t)}</text>`
    }
    // Points
    const len = Math.min(xVals.length, yVals.length)
    for (let i = 0; i < len; i++) {
      const x = padding.left + chartW * ((xVals[i] - xMin) / xRange)
      const y = padding.top + chartH * (1 - (yVals[i] - yMin) / yRange)
      svg += `<circle cx="${x}" cy="${y}" r="4" fill="${CHART_COLORS[0]}" opacity="0.8"/>`
    }
    return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:100%">${svg}</svg>`
  }

  // Bar / Line
  const chartW = W - padding.left - padding.right
  const chartH = H - padding.top - padding.bottom
  const barGroupW = chartW / data.labels.length
  const barW = barGroupW / (data.datasets.length + 0.5)

  let svg = ''
  if (title) svg += `<text x="150" y="18" text-anchor="middle" fill="#e2e8f0" font-size="12" font-weight="600">${escapeXml(title)}</text>`
  // Y axis
  for (const t of [0, 0.25, 0.5, 0.75, 1]) {
    const y = padding.top + chartH * (1 - t)
    const val = minVal + range * t
    svg += `<line x1="${padding.left}" y1="${y}" x2="${padding.left + chartW}" y2="${y}" stroke="#334155" stroke-width="0.5"/>`
    svg += `<text x="${padding.left - 4}" y="${y + 3}" text-anchor="end" fill="#64748b" font-size="7">${Math.round(val)}</text>`
  }
  // Labels
  data.labels.forEach((label, i) => {
    svg += `<text x="${padding.left + barGroupW * i + barGroupW / 2}" y="${H - padding.bottom + 14}" text-anchor="middle" fill="#94a3b8" font-size="7">${escapeXml(label.length > 8 ? label.slice(0, 8) + '..' : label)}</text>`
  })
  // Data
  data.datasets.forEach((ds, di) => {
    const color = CHART_COLORS[di % CHART_COLORS.length]
    if (chartType === 'line') {
      const points = ds.values
        .map((v, i) => `${padding.left + barGroupW * i + barGroupW / 2},${padding.top + chartH * (1 - (v - minVal) / range)}`)
        .join(' ')
      svg += `<polyline points="${points}" fill="none" stroke="${color}" stroke-width="2"/>`
      ds.values.forEach((v, i) => {
        const x = padding.left + barGroupW * i + barGroupW / 2
        const y = padding.top + chartH * (1 - (v - minVal) / range)
        svg += `<circle cx="${x}" cy="${y}" r="3" fill="${color}"/>`
      })
    } else {
      ds.values.forEach((v, i) => {
        const x = padding.left + barGroupW * i + barW * di + barGroupW * 0.15
        const h = chartH * ((v - minVal) / range)
        const y = padding.top + chartH - h
        svg += `<rect x="${x}" y="${y}" width="${barW * 0.85}" height="${h}" fill="${color}" rx="2"/>`
      })
    }
  })
  // Legend
  if (data.datasets.length > 1) {
    data.datasets.forEach((ds, i) => {
      svg += `<rect x="${padding.left + i * 60}" y="${padding.top - 14}" width="8" height="8" rx="1" fill="${CHART_COLORS[i % CHART_COLORS.length]}"/>`
      svg += `<text x="${padding.left + i * 60 + 11}" y="${padding.top - 7}" fill="#94a3b8" font-size="7">${escapeXml(ds.label)}</text>`
    })
  }
  return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:100%">${svg}</svg>`
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
