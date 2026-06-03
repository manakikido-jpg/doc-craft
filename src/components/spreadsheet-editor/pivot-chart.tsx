'use client'

import { useState, useMemo } from 'react'
import { X, BarChart3, PieChart } from 'lucide-react'
import type { PivotResult } from './pivot-table-dialog'
import { renderChartSVG } from './chart-panel'

interface Props {
  pivotResult: PivotResult
  onClose: () => void
}

type PivotChartType = 'bar' | 'pie'

export default function PivotChart({ pivotResult, onClose }: Props) {
  const [chartType, setChartType] = useState<PivotChartType>('bar')

  // Convert pivot result into chart data format
  const chartData = useMemo(() => {
    if (!pivotResult.rows.length || pivotResult.rows.length < 2) {
      return { labels: [], datasets: [] }
    }

    // Exclude the grand total row (last row)
    const dataRows = pivotResult.rows.slice(0, -1)

    const labels = dataRows.map((row) => row[0] || '')
    const values = dataRows.map((row) => {
      const num = parseFloat(row[1] || '0')
      return isNaN(num) ? 0 : num
    })

    return {
      labels,
      datasets: [{ label: pivotResult.headers[1] || '値', values }],
    }
  }, [pivotResult])

  const svgContent = useMemo(() => {
    if (!chartData.labels.length) return ''
    return renderChartSVG(chartType, chartData, pivotResult.headers[1] || 'ピボットチャート')
  }, [chartType, chartData, pivotResult.headers])

  if (!chartData.labels.length) return null

  return (
    <div className="bg-slate-900/95 border border-slate-700 rounded-lg shadow-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-800/80 border-b border-slate-700">
        <span className="text-xs text-slate-300 font-medium">ピボットチャート</span>
        <div className="flex items-center gap-1.5">
          {/* Chart type toggles */}
          <button
            onClick={() => setChartType('bar')}
            className={`w-6 h-6 flex items-center justify-center rounded transition-colors ${
              chartType === 'bar' ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
            title="棒グラフ"
          >
            <BarChart3 size={12} />
          </button>
          <button
            onClick={() => setChartType('pie')}
            className={`w-6 h-6 flex items-center justify-center rounded transition-colors ${
              chartType === 'pie' ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
            title="円グラフ"
          >
            <PieChart size={12} />
          </button>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-red-400 transition-colors ml-1"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Chart */}
      <div
        className="p-3"
        style={{ width: 360, height: 220 }}
        dangerouslySetInnerHTML={{ __html: svgContent }}
      />
    </div>
  )
}
