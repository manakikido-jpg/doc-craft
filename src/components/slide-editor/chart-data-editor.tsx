'use client'

import { useState } from 'react'
import type { SlideChartElement } from '@/types'
import { X, Plus, Trash2 } from 'lucide-react'

interface Props {
  chart: SlideChartElement
  onUpdate: (data: SlideChartElement['data']) => void
  onClose: () => void
}

export default function ChartDataEditor({ chart, onUpdate, onClose }: Props) {
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
      </div>
    </div>
  )
}
