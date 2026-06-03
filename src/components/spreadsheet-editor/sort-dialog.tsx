'use client'
import { useState } from 'react'
import { colIndexToLetter } from '@/lib/formula-engine'
import { X, Plus, Trash2 } from 'lucide-react'

interface SortKey {
  col: number
  direction: 'asc' | 'desc'
}

interface Props {
  open: boolean
  colCount: number
  onClose: () => void
  onSort: (keys: SortKey[]) => void
}

export function SortDialog({ open, colCount, onClose, onSort }: Props) {
  const [keys, setKeys] = useState<SortKey[]>([{ col: 0, direction: 'asc' }])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-[400px] p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white">並べ替え</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={16} /></button>
        </div>

        <div className="space-y-2 mb-4">
          {keys.map((key, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-xs text-slate-400 w-16 shrink-0">
                {i === 0 ? '最優先' : `次に優先`}
              </span>
              <select
                value={key.col}
                onChange={(e) => {
                  const newKeys = [...keys]
                  newKeys[i] = { ...newKeys[i], col: parseInt(e.target.value) }
                  setKeys(newKeys)
                }}
                className="flex-1 h-7 bg-slate-700 border border-slate-600 rounded text-xs text-white px-2"
              >
                {Array.from({ length: colCount }, (_, c) => (
                  <option key={c} value={c}>列 {colIndexToLetter(c)}</option>
                ))}
              </select>
              <select
                value={key.direction}
                onChange={(e) => {
                  const newKeys = [...keys]
                  newKeys[i] = { ...newKeys[i], direction: e.target.value as 'asc' | 'desc' }
                  setKeys(newKeys)
                }}
                className="w-20 h-7 bg-slate-700 border border-slate-600 rounded text-xs text-white px-2"
              >
                <option value="asc">昇順</option>
                <option value="desc">降順</option>
              </select>
              {keys.length > 1 && (
                <button
                  onClick={() => setKeys(keys.filter((_, j) => j !== i))}
                  className="text-red-400 hover:text-red-300"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>

        {keys.length < 5 && (
          <button
            onClick={() => setKeys([...keys, { col: 0, direction: 'asc' }])}
            className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 mb-4"
          >
            <Plus size={12} /> レベルを追加
          </button>
        )}

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1.5 text-xs text-slate-400 hover:text-white rounded">
            キャンセル
          </button>
          <button
            onClick={() => { onSort(keys); onClose() }}
            className="px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white rounded"
          >
            並べ替え
          </button>
        </div>
      </div>
    </div>
  )
}
