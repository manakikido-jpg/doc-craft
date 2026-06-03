'use client'

import { useState, useMemo } from 'react'
import type { Sheet, SpreadsheetChart, SpreadsheetChartType } from '@/types'
import { colIndexToLetter, evaluateCell } from '@/lib/formula-engine'
import { stackedSegments, stackedMax, percentStackedSegments } from '@/lib/chart-geometry'
import { formatCompact } from '@/lib/format-number'
import { X, BarChart3, TrendingUp, PieChart, ScatterChart, AreaChart, BarChartHorizontal, Layers, CircleDot } from 'lucide-react'

const CHART_COLORS = ['#6366f1', '#f97316', '#22c55e', '#eab308', '#ec4899', '#06b6d4', '#8b5cf6', '#ef4444']

export type { SpreadsheetChart, SpreadsheetChartType }

interface Props {
  sheet: Sheet
  selectionRange: { startRow: number; startCol: number; endRow: number; endCol: number } | null
  onAddChart: (chart: SpreadsheetChart) => void
  onClose: () => void
}

type ChartType = SpreadsheetChartType

const CHART_TYPES: { type: ChartType; label: string; icon: typeof BarChart3 }[] = [
  { type: 'bar', label: '棒グラフ', icon: BarChart3 },
  { type: 'stackedBar', label: '積み上げ棒', icon: Layers },
  { type: 'stackedBar100', label: '100%積み上げ', icon: Layers },
  { type: 'horizontalBar', label: '横棒', icon: BarChartHorizontal },
  { type: 'line', label: '折れ線', icon: TrendingUp },
  { type: 'area', label: '面', icon: AreaChart },
  { type: 'combo', label: '複合(棒+線)', icon: BarChart3 },
  { type: 'pie', label: '円グラフ', icon: PieChart },
  { type: 'donut', label: 'ドーナツ', icon: CircleDot },
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

  if (chartType === 'pie' || chartType === 'donut') {
    const values = data.datasets[0]?.values || []
    const total = values.reduce((a, b) => a + b, 0) || 1
    const innerR = chartType === 'donut' ? 36 : 0
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
      if (chartType === 'donut') {
        const ix1 = cx + innerR * Math.cos(startRad), iy1 = cy + innerR * Math.sin(startRad)
        const ix2 = cx + innerR * Math.cos(endRad), iy2 = cy + innerR * Math.sin(endRad)
        paths += `<path d="M${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2} L${ix2},${iy2} A${innerR},${innerR} 0 ${large},0 ${ix1},${iy1} Z" fill="${color}" stroke="#0f172a" stroke-width="1"/>`
      } else if (values.length === 1) {
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
      svg += `<text x="${padding.left - 4}" y="${y + 3}" text-anchor="end" fill="#64748b" font-size="7">${formatCompact(yMin + yRange * t)}</text>`
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

  // Bar / Line / Area / Stacked / Horizontal / Combo
  const chartW = W - padding.left - padding.right
  const chartH = H - padding.top - padding.bottom
  const barGroupW = chartW / data.labels.length
  const barW = barGroupW / (data.datasets.length + 0.5)
  const cxAt = (i: number) => padding.left + barGroupW * i + barGroupW / 2

  // ── Stacked / 100% stacked column ──
  if (chartType === 'stackedBar' || chartType === 'stackedBar100') {
    const isPct = chartType === 'stackedBar100'
    const seg = isPct ? percentStackedSegments(data.datasets, data.labels.length) : stackedSegments(data.datasets, data.labels.length)
    const yMax = isPct ? 1 : stackedMax(data.datasets, data.labels.length)
    const yOf = (v: number) => padding.top + chartH * (1 - v / yMax)
    let svg = ''
    if (title) svg += `<text x="150" y="18" text-anchor="middle" fill="#e2e8f0" font-size="12" font-weight="600">${escapeXml(title)}</text>`
    for (const t of [0, 0.25, 0.5, 0.75, 1]) {
      const y = padding.top + chartH * (1 - t)
      svg += `<line x1="${padding.left}" y1="${y}" x2="${padding.left + chartW}" y2="${y}" stroke="#334155" stroke-width="0.5"/>`
      svg += `<text x="${padding.left - 4}" y="${y + 3}" text-anchor="end" fill="#64748b" font-size="7">${isPct ? Math.round(t * 100) + '%' : formatCompact(yMax * t)}</text>`
    }
    data.labels.forEach((label, i) => {
      svg += `<text x="${cxAt(i)}" y="${H - padding.bottom + 14}" text-anchor="middle" fill="#94a3b8" font-size="7">${escapeXml(label.length > 8 ? label.slice(0, 8) + '..' : label)}</text>`
    })
    data.datasets.forEach((ds, di) => {
      const color = CHART_COLORS[di % CHART_COLORS.length]
      ds.values.forEach((_, i) => {
        const yTop = yOf(seg.tops[di][i]); const yBase = yOf(seg.bases[di][i])
        const bx = padding.left + barGroupW * i + barGroupW * 0.2
        const h = Math.max(0, yBase - yTop)
        if (h > 0) svg += `<rect x="${bx}" y="${yTop}" width="${barGroupW * 0.6}" height="${h}" fill="${color}"/>`
      })
    })
    return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:100%">${svg}</svg>`
  }

  // ── Horizontal bar ──
  if (chartType === 'horizontalBar') {
    const rowH = chartH / data.labels.length
    const ds0 = data.datasets
    let svg = ''
    if (title) svg += `<text x="150" y="18" text-anchor="middle" fill="#e2e8f0" font-size="12" font-weight="600">${escapeXml(title)}</text>`
    data.labels.forEach((label, i) => {
      svg += `<text x="${padding.left - 4}" y="${padding.top + rowH * i + rowH / 2 + 3}" text-anchor="end" fill="#94a3b8" font-size="7">${escapeXml(label.length > 7 ? label.slice(0, 7) + '..' : label)}</text>`
    })
    const barH = rowH / (ds0.length + 0.5)
    ds0.forEach((ds, di) => {
      const color = CHART_COLORS[di % CHART_COLORS.length]
      ds.values.forEach((v, i) => {
        const w = chartW * ((v - minVal) / range)
        const by = padding.top + rowH * i + barH * di + rowH * 0.15
        svg += `<rect x="${padding.left}" y="${by}" width="${Math.max(0, w)}" height="${barH * 0.85}" fill="${color}" rx="2"/>`
      })
    })
    return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:100%">${svg}</svg>`
  }

  let svg = ''
  if (title) svg += `<text x="150" y="18" text-anchor="middle" fill="#e2e8f0" font-size="12" font-weight="600">${escapeXml(title)}</text>`
  // Y axis
  for (const t of [0, 0.25, 0.5, 0.75, 1]) {
    const y = padding.top + chartH * (1 - t)
    const val = minVal + range * t
    svg += `<line x1="${padding.left}" y1="${y}" x2="${padding.left + chartW}" y2="${y}" stroke="#334155" stroke-width="0.5"/>`
    svg += `<text x="${padding.left - 4}" y="${y + 3}" text-anchor="end" fill="#64748b" font-size="7">${formatCompact(val)}</text>`
  }
  // Labels
  data.labels.forEach((label, i) => {
    svg += `<text x="${padding.left + barGroupW * i + barGroupW / 2}" y="${H - padding.bottom + 14}" text-anchor="middle" fill="#94a3b8" font-size="7">${escapeXml(label.length > 8 ? label.slice(0, 8) + '..' : label)}</text>`
  })
  // Data
  const yAt = (v: number) => padding.top + chartH * (1 - (v - minVal) / range)
  data.datasets.forEach((ds, di) => {
    const color = CHART_COLORS[di % CHART_COLORS.length]
    // Combo: first dataset as bars, the rest as lines.
    const asLine = chartType === 'line' || (chartType === 'combo' && di > 0)
    const asArea = chartType === 'area'
    if (asArea) {
      const pts = ds.values.map((v, i) => `${cxAt(i)},${yAt(v)}`)
      const baseY = padding.top + chartH
      svg += `<path d="M${cxAt(0)},${baseY} ${pts.map(p => `L${p}`).join(' ')} L${cxAt(ds.values.length - 1)},${baseY} Z" fill="${color}" fill-opacity="0.25"/>`
      svg += `<polyline points="${pts.join(' ')}" fill="none" stroke="${color}" stroke-width="2"/>`
      ds.values.forEach((v, i) => { svg += `<circle cx="${cxAt(i)}" cy="${yAt(v)}" r="3" fill="${color}"/>` })
    } else if (asLine) {
      const points = ds.values.map((v, i) => `${cxAt(i)},${yAt(v)}`).join(' ')
      svg += `<polyline points="${points}" fill="none" stroke="${color}" stroke-width="2"/>`
      ds.values.forEach((v, i) => { svg += `<circle cx="${cxAt(i)}" cy="${yAt(v)}" r="3" fill="${color}"/>` })
    } else if (chartType === 'combo') {
      // combo, di === 0 → wide centered bars
      ds.values.forEach((v, i) => {
        const h = chartH * ((v - minVal) / range)
        const bx = padding.left + barGroupW * i + barGroupW * 0.22
        svg += `<rect x="${bx}" y="${padding.top + chartH - h}" width="${barGroupW * 0.56}" height="${Math.max(0, h)}" fill="${color}" rx="2"/>`
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
