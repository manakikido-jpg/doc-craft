'use client'
import { useState, useMemo } from 'react'
import { colIndexToLetter } from '@/lib/formula-engine'
import { X } from 'lucide-react'

interface Props {
  open: boolean
  colCount: number
  rowCount: number
  onClose: () => void
  onRemove: (cols: number[], startRow: number, endRow: number) => number
}

export function RemoveDuplicatesDialog({ open, colCount, rowCount, onClose, onRemove }: Props) {
  const [selectedCols, setSelectedCols] = useState<boolean[]>(() =>
    Array.from({ length: colCount }, () => true)
  )
  const [removedCount, setRemovedCount] = useState<number | null>(null)

  if (!open) return null

  const toggleCol = (i: number) => {
    const next = [...selectedCols]
    next[i] = !next[i]
    setSelectedCols(next)
  }

  const selectAll = () => setSelectedCols(Array.from({ length: colCount }, () => true))
  const selectNone = () => setSelectedCols(Array.from({ length: colCount }, () => false))

  const handleRemove = () => {
    const cols = selectedCols.reduce<number[]>((acc, v, i) => {
      if (v) acc.push(i)
      return acc
    }, [])
    if (cols.length === 0) return
    const count = onRemove(cols, 0, rowCount - 1)
    setRemovedCount(count)
  }

  const handleClose = () => {
    setRemovedCount(null)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-[360px] p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white">重複の削除</h3>
          <button onClick={handleClose} className="text-slate-400 hover:text-white"><X size={16} /></button>
        </div>

        {removedCount !== null ? (
          <div className="text-center py-4">
            <p className="text-sm text-white mb-1">
              {removedCount > 0
                ? `${removedCount} 件の重複行を削除しました。`
                : '重複する行は見つかりませんでした。'}
            </p>
            <button
              onClick={handleClose}
              className="mt-3 px-4 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white rounded"
            >
              OK
            </button>
          </div>
        ) : (
          <>
            <p className="text-xs text-slate-400 mb-2">比較する列を選択してください:</p>
            <div className="flex gap-2 mb-2">
              <button onClick={selectAll} className="text-xs text-indigo-400 hover:text-indigo-300">全選択</button>
              <button onClick={selectNone} className="text-xs text-indigo-400 hover:text-indigo-300">全解除</button>
            </div>
            <div className="max-h-48 overflow-y-auto space-y-1 mb-4 border border-slate-700 rounded p-2">
              {Array.from({ length: colCount }, (_, i) => (
                <label key={i} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedCols[i]}
                    onChange={() => toggleCol(i)}
                    className="accent-indigo-500"
                  />
                  <span className="text-xs text-white">列 {colIndexToLetter(i)}</span>
                </label>
              ))}
            </div>

            <div className="flex justify-end gap-2">
              <button onClick={handleClose} className="px-3 py-1.5 text-xs text-slate-400 hover:text-white rounded">
                キャンセル
              </button>
              <button
                onClick={handleRemove}
                className="px-3 py-1.5 text-xs bg-red-600 hover:bg-red-500 text-white rounded"
              >
                削除
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
