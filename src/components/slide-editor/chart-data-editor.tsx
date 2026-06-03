'use client'

import { useState } from 'react'
import type { SlideChartElement } from '@/types'
import { X, Plus, Trash2 } from 'lucide-react'

interface Props {
  chart: SlideChartElement
  onUpdate: (data: SlideChartElement['data']) => void
  onUpdateProps?: (props: Record<string, unknown>) => void
  onClose: () => void
}

export default function ChartDataEditor({ chart, onUpdate, onUpdateProps, onClose }: Props) {
  const [data, setData] = useState(chart.data)

  function commit(newData: typeof data) {
    setData(newData)
    onUpdate(newData)
  }

  function updateLabel(i: number, val: string) {
    const labels = [...data.labels]
    labels[i] = val
    commit({ ...data, labels })
  }

  function updateValue(di: number, vi: number, val: number) {
    const datasets = data.datasets.map((ds, idx) =>
      idx === di ? { ...ds, values: ds.values.map((v, j) => (j === vi ? val : v)) } : ds,
    )
    commit({ ...data, datasets })
  }

  function addLabel() {
    const labels = [...data.labels, `項目${data.labels.length + 1}`]
    const datasets = data.datasets.map((ds) => ({ ...ds, values: [...ds.values, 0] }))
    commit({ labels, datasets })
  }

  function removeLabel(i: number) {
    if (data.labels.length <= 1) return
    const labels = data.labels.filter((_, j) => j !== i)
    const datasets = data.datasets.map((ds) => ({ ...ds, values: ds.values.filter((_, j) => j !== i) }))
    commit({ labels, datasets })
  }

  function addDataset() {
    const ds = {
      label: `データ${data.datasets.length + 1}`,
      values: data.labels.map(() => 0),
      color: ['#6366f1', '#f97316', '#22c55e', '#eab308'][data.datasets.length % 4],
    }
    commit({ ...data, datasets: [...data.datasets, ds] })
  }

  function removeDataset(i: number) {
    if (data.datasets.length <= 1) return
    commit({ ...data, datasets: data.datasets.filter((_, j) => j !== i) })
  }

  function updateDatasetLabel(i: number, label: string) {
    const datasets = data.datasets.map((ds, idx) => (idx === i ? { ...ds, label } : ds))
    commit({ ...data, datasets })
  }

  function updateDatasetColor(i: number, color: string) {
    const datasets = data.datasets.map((ds, idx) => (idx === i ? { ...ds, color } : ds))
    commit({ ...data, datasets })
  }

  return (
    <div className="absolute right-0 top-0 w-80 h-full bg-slate-900 border-l border-slate-700 z-40 overflow-y-auto">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
        <span className="text-white text-sm font-medium">グラフデータ編集</span>
        <button onClick={onClose} className="text-slate-400 hover:text-white">
          <X size={16} />
        </button>
      </div>

      <div className="p-3 space-y-3">
        {/* Chart type selector — switch an existing chart among all types */}
        <div>
          <label className="text-[11px] text-slate-400 block mb-1">グラフの種類</label>
          <select
            value={chart.chartType}
            onChange={(e) => onUpdateProps?.({ chartType: e.target.value })}
            className="w-full rounded border border-slate-700 bg-slate-800 px-2 py-1.5 text-xs text-slate-100 outline-none focus:border-indigo-500"
          >
            <optgroup label="縦棒・横棒">
              <option value="bar">集合縦棒</option>
              <option value="stackedBar">積み上げ縦棒</option>
              <option value="stackedBar100">100%積み上げ縦棒</option>
              <option value="horizontalBar">横棒</option>
              <option value="waterfall">ウォーターフォール</option>
            </optgroup>
            <optgroup label="折れ線・面">
              <option value="line">折れ線</option>
              <option value="smoothLine">スムーズ折れ線</option>
              <option value="steppedLine">ステップ</option>
              <option value="area">面</option>
              <option value="stackedArea">積み上げ面</option>
              <option value="combo">複合（棒+線）</option>
            </optgroup>
            <optgroup label="円・割合">
              <option value="pie">円</option>
              <option value="donut">ドーナツ</option>
              <option value="funnel">ファネル</option>
              <option value="radar">レーダー</option>
            </optgroup>
            <optgroup label="分布">
              <option value="scatter">散布図</option>
              <option value="bubble">バブル</option>
            </optgroup>
          </select>
        </div>
        {/* Color theme */}
        <div>
          <label className="text-[11px] text-slate-400 block mb-1">カラーテーマ</label>
          <select
            value={chart.colorTheme || 'default'}
            onChange={(e) => onUpdateProps?.({ colorTheme: e.target.value })}
            className="w-full rounded border border-slate-700 bg-slate-800 px-2 py-1.5 text-xs text-slate-100 outline-none focus:border-indigo-500"
          >
            <option value="default">標準</option>
            <option value="mono">モノクロ</option>
            <option value="pastel">パステル</option>
            <option value="vivid">ビビッド</option>
            <option value="ocean">オーシャン</option>
            <option value="warm">ウォーム</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="text-xs border-collapse">
            <thead>
              <tr>
                <th className="text-slate-500 px-1 py-1 text-left font-normal">ラベル</th>
                {data.datasets.map((ds, di) => (
                  <th key={di} className="px-1 py-1">
                    <div className="flex items-center gap-1">
                      <input
                        type="color"
                        value={ds.color}
                        onChange={(e) => updateDatasetColor(di, e.target.value)}
                        className="w-4 h-4 bg-transparent cursor-pointer"
                      />
                      <input
                        type="text"
                        value={ds.label}
                        onChange={(e) => updateDatasetLabel(di, e.target.value)}
                        className="w-16 bg-slate-800 text-white text-xs px-1 py-0.5 rounded border border-slate-700"
                      />
                      {data.datasets.length > 1 && (
                        <button onClick={() => removeDataset(di)} className="text-slate-500 hover:text-red-400">
                          <Trash2 size={10} />
                        </button>
                      )}
                    </div>
                  </th>
                ))}
                <th />
              </tr>
            </thead>
            <tbody>
              {data.labels.map((label, li) => (
                <tr key={li}>
                  <td className="px-1 py-0.5">
                    <input
                      type="text"
                      value={label}
                      onChange={(e) => updateLabel(li, e.target.value)}
                      className="w-16 bg-slate-800 text-white text-xs px-1 py-0.5 rounded border border-slate-700"
                    />
                  </td>
                  {data.datasets.map((ds, di) => (
                    <td key={di} className="px-1 py-0.5">
                      <input
                        type="number"
                        value={ds.values[li]}
                        onChange={(e) => updateValue(di, li, Number(e.target.value))}
                        className="w-14 bg-slate-800 text-white text-xs px-1 py-0.5 rounded border border-slate-700"
                      />
                    </td>
                  ))}
                  <td className="px-1">
                    {data.labels.length > 1 && (
                      <button onClick={() => removeLabel(li)} className="text-slate-500 hover:text-red-400">
                        <Trash2 size={10} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex gap-2">
          <button
            onClick={addLabel}
            className="flex items-center gap-1 px-2 py-1 rounded border border-slate-700 bg-slate-800 text-slate-300 text-xs hover:border-slate-500"
          >
            <Plus size={10} /> 行追加
          </button>
          <button
            onClick={addDataset}
            className="flex items-center gap-1 px-2 py-1 rounded border border-slate-700 bg-slate-800 text-slate-300 text-xs hover:border-slate-500"
          >
            <Plus size={10} /> 系列追加
          </button>
        </div>

        {/* Axis Labels */}
        <div className="flex gap-2 mt-3">
          <div className="flex-1">
            <label className="text-[10px] text-slate-500 mb-0.5 block">X軸ラベル</label>
            <input
              value={chart.axisLabelX || ''}
              onChange={e => onUpdateProps?.({ axisLabelX: e.target.value })}
              placeholder="X軸"
              className="w-full rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-100 outline-none"
            />
          </div>
          <div className="flex-1">
            <label className="text-[10px] text-slate-500 mb-0.5 block">Y軸ラベル</label>
            <input
              value={chart.axisLabelY || ''}
              onChange={e => onUpdateProps?.({ axisLabelY: e.target.value })}
              placeholder="Y軸"
              className="w-full rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-100 outline-none"
            />
          </div>
        </div>
        {/* Grid & Label Position */}
        <div className="flex gap-3 mt-2 items-center">
          <label className="flex items-center gap-1.5 text-xs text-slate-400">
            <input type="checkbox" checked={chart.showGridLines !== false} onChange={e => onUpdateProps?.({ showGridLines: e.target.checked })} className="accent-indigo-500" />
            グリッド線
          </label>
          <select
            value={chart.dataLabelPosition || 'none'}
            onChange={e => onUpdateProps?.({ dataLabelPosition: e.target.value })}
            className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-300 outline-none"
          >
            <option value="none">ラベルなし</option>
            <option value="above">上</option>
            <option value="center">中央</option>
            <option value="outside">外側</option>
          </select>
        </div>
        {/* Trend Line */}
        <div className="flex gap-2 mt-2 items-center">
          <div className="flex-1">
            <label className="text-[10px] text-slate-500 mb-0.5 block">トレンドライン</label>
            <select
              value={chart.trendLine || 'none'}
              onChange={e => onUpdateProps?.({ trendLine: e.target.value })}
              className="w-full rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-300 outline-none"
            >
              <option value="none">なし</option>
              <option value="linear">線形</option>
              <option value="exponential">指数</option>
              <option value="moving-average">移動平均</option>
            </select>
          </div>
          {chart.trendLine && chart.trendLine !== 'none' && (
            <div>
              <label className="text-[10px] text-slate-500 mb-0.5 block">色</label>
              <input
                type="color"
                value={chart.trendLineColor || '#f97316'}
                onChange={e => onUpdateProps?.({ trendLineColor: e.target.value })}
                className="w-8 h-7 bg-transparent cursor-pointer rounded border border-slate-700"
              />
            </div>
          )}
        </div>

        {/* アニメーション */}
        <div className="mt-3 border-t border-slate-700 pt-3">
          <label className="text-[10px] text-slate-500 mb-1 block font-medium">アニメーション</label>
          <select
            value={chart.chartAnimation || 'none'}
            onChange={e => onUpdateProps?.({ chartAnimation: e.target.value })}
            className="w-full rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-300 outline-none"
          >
            <option value="none">なし</option>
            <option value="grow">成長</option>
            <option value="fade">フェード</option>
            <option value="slide-up">スライド</option>
            <option value="cascade">カスケード</option>
          </select>
          {chart.chartAnimation && chart.chartAnimation !== 'none' && (
            <div className="mt-2">
              <label className="text-[10px] text-slate-500 mb-0.5 block">
                再生時間: {chart.chartAnimationDuration || 600}ms
              </label>
              <input
                type="range"
                min={300}
                max={2000}
                step={100}
                value={chart.chartAnimationDuration || 600}
                onChange={e => onUpdateProps?.({ chartAnimationDuration: Number(e.target.value) })}
                className="w-full accent-indigo-500"
              />
              <div className="flex justify-between text-[9px] text-slate-600">
                <span>300ms</span>
                <span>2000ms</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
