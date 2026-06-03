'use client'

import { useState, useRef } from 'react'
import { X, Upload, FileText, BarChart3 } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
  onImport: (data: { labels: string[]; datasets: { label: string; values: number[]; color: string }[] }) => void
}

const COLORS = ['#6366f1', '#f97316', '#22c55e', '#eab308', '#ec4899', '#06b6d4', '#8b5cf6', '#ef4444']

function parseCSV(text: string): string[][] {
  return text.trim().split('\n').map(line =>
    line.split(/[,\t;]/).map(cell => cell.trim().replace(/^["']|["']$/g, ''))
  )
}

export default function CsvChartImport({ open, onClose, onImport }: Props) {
  const [csvText, setCsvText] = useState('')
  const [hasHeader, setHasHeader] = useState(true)
  const [preview, setPreview] = useState<string[][] | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  if (!open) return null

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      setCsvText(text)
      setPreview(parseCSV(text))
    }
    reader.readAsText(file)
  }

  function handleTextChange(text: string) {
    setCsvText(text)
    if (text.trim()) setPreview(parseCSV(text))
    else setPreview(null)
  }

  function handleImport() {
    if (!preview || preview.length < 2) return

    const startRow = hasHeader ? 1 : 0
    const labels = preview.slice(startRow).map(row => row[0] || '')

    const numCols = Math.max(...preview.map(r => r.length))
    const datasets = []

    for (let col = 1; col < numCols; col++) {
      datasets.push({
        label: hasHeader ? (preview[0][col] || `データ${col}`) : `データ${col}`,
        values: preview.slice(startRow).map(row => {
          const val = parseFloat(row[col] || '0')
          return isNaN(val) ? 0 : val
        }),
        color: COLORS[(col - 1) % COLORS.length],
      })
    }

    if (datasets.length === 0) {
      // Single column: use values as data
      datasets.push({
        label: 'データ',
        values: preview.slice(startRow).map(row => {
          const val = parseFloat(row[0] || '0')
          return isNaN(val) ? 0 : val
        }),
        color: COLORS[0],
      })
    }

    onImport({ labels, datasets })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="w-[520px] max-h-[80vh] flex flex-col rounded-lg border border-slate-700 bg-slate-900 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-700 px-5 py-3">
          <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <BarChart3 size={18} /> CSVデータ取込
          </h2>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* File upload */}
          <div>
            <input ref={fileRef} type="file" accept=".csv,.tsv,.txt" onChange={handleFile} className="hidden" />
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-lg border-2 border-dashed border-slate-600 text-sm text-slate-400 hover:border-indigo-500 hover:text-indigo-300 transition"
            >
              <Upload size={16} /> CSVファイルを選択
            </button>
          </div>

          {/* Text input */}
          <div>
            <label className="text-xs text-slate-400 mb-1 block">または直接入力（カンマ/タブ区切り）</label>
            <textarea
              value={csvText}
              onChange={e => handleTextChange(e.target.value)}
              rows={5}
              placeholder={"カテゴリ,値1,値2\n東京,100,80\n大阪,85,70\n名古屋,60,55"}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-100 font-mono outline-none focus:border-indigo-500 resize-none"
            />
          </div>

          {/* Header toggle */}
          <label className="flex items-center gap-2 text-sm text-slate-400">
            <input
              type="checkbox"
              checked={hasHeader}
              onChange={e => setHasHeader(e.target.checked)}
              className="accent-indigo-500"
            />
            1行目をヘッダーとして使用
          </label>

          {/* Preview */}
          {preview && preview.length > 0 && (
            <div>
              <label className="text-xs text-slate-500 mb-1 block">プレビュー ({preview.length}行)</label>
              <div className="max-h-40 overflow-auto rounded-lg border border-slate-700">
                <table className="w-full text-xs">
                  <tbody>
                    {preview.slice(0, 10).map((row, ri) => (
                      <tr key={ri} className={ri === 0 && hasHeader ? 'bg-slate-800 font-medium' : 'hover:bg-slate-800/50'}>
                        {row.map((cell, ci) => (
                          <td key={ci} className="px-2 py-1 border-b border-slate-800 text-slate-300">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {preview.length > 10 && (
                  <div className="text-center text-[10px] text-slate-500 py-1">...他 {preview.length - 10} 行</div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-700 px-5 py-3">
          <button onClick={onClose} className="rounded-lg px-4 py-1.5 text-sm text-slate-400 hover:bg-slate-800 hover:text-slate-200">
            キャンセル
          </button>
          <button
            onClick={handleImport}
            disabled={!preview || preview.length < 2}
            className={`rounded-lg px-4 py-1.5 text-sm text-white transition ${
              preview && preview.length >= 2 ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-slate-700 text-slate-500 cursor-not-allowed'
            }`}
          >
            チャートに取込
          </button>
        </div>
      </div>
    </div>
  )
}
