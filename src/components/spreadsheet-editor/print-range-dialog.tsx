'use client'

import { useState, useCallback } from 'react'
import { X, Printer } from 'lucide-react'
import { colLetterToIndex, colIndexToLetter } from '@/lib/formula-engine'

export interface PrintRange {
  startRow: number
  startCol: number
  endRow: number
  endCol: number
}

interface Props {
  open: boolean
  currentRange: PrintRange | null
  onApply: (range: PrintRange | null) => void
  onClose: () => void
}

export default function PrintRangeDialog({ open, currentRange, onApply, onClose }: Props) {
  const [rangeInput, setRangeInput] = useState(() => {
    if (!currentRange) return ''
    const start = `${colIndexToLetter(currentRange.startCol)}${currentRange.startRow + 1}`
    const end = `${colIndexToLetter(currentRange.endCol)}${currentRange.endRow + 1}`
    return `${start}:${end}`
  })
  const [error, setError] = useState<string | null>(null)

  const parseRangeInput = useCallback((input: string): PrintRange | null => {
    const trimmed = input.trim().toUpperCase()
    if (!trimmed) return null

    const match = trimmed.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/)
    if (!match) return null

    const startCol = colLetterToIndex(match[1])
    const startRow = parseInt(match[2], 10) - 1
    const endCol = colLetterToIndex(match[3])
    const endRow = parseInt(match[4], 10) - 1

    if (startRow < 0 || endRow < 0 || startCol < 0 || endCol < 0) return null
    if (startRow > endRow || startCol > endCol) return null

    return { startRow, startCol, endRow, endCol }
  }, [])

  const handleApply = useCallback(() => {
    if (!rangeInput.trim()) {
      onApply(null)
      onClose()
      return
    }

    const parsed = parseRangeInput(rangeInput)
    if (!parsed) {
      setError('範囲の形式が正しくありません。例: A1:H20')
      return
    }

    setError(null)
    onApply(parsed)
    onClose()
  }, [rangeInput, parseRangeInput, onApply, onClose])

  const handleClear = useCallback(() => {
    setRangeInput('')
    onApply(null)
    onClose()
  }, [onApply, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md mx-4 shadow-2xl animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between p-5 pb-3 border-b border-slate-800">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Printer size={18} className="text-sky-400" />
            印刷範囲の設定
          </h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <div>
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1 block">
              印刷範囲 (例: A1:H20)
            </label>
            <input
              type="text"
              value={rangeInput}
              onChange={(e) => {
                setRangeInput(e.target.value.toUpperCase())
                setError(null)
              }}
              placeholder="A1:H20"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono outline-none placeholder-slate-500 focus:border-sky-500"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleApply()
              }}
              autoFocus
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 text-xs text-red-400">
              {error}
            </div>
          )}

          <div className="text-xs text-slate-500">
            <p>印刷範囲を指定すると、印刷時にその範囲のみ出力されます。</p>
            <p className="mt-1">グリッド上に青い破線枠が表示されます。</p>
            <p className="mt-1">空欄にすると印刷範囲がクリアされます。</p>
          </div>

          {currentRange && (
            <div className="bg-sky-500/10 border border-sky-500/30 rounded-lg px-3 py-2 text-xs text-sky-400">
              現在の印刷範囲: {colIndexToLetter(currentRange.startCol)}{currentRange.startRow + 1}:{colIndexToLetter(currentRange.endCol)}{currentRange.endRow + 1}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={handleClear}
            className="px-4 py-2 text-sm text-red-400 hover:text-red-300 rounded-lg hover:bg-red-500/10 transition-colors"
          >
            クリア
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              キャンセル
            </button>
            <button
              onClick={handleApply}
              className="flex items-center gap-1.5 px-4 py-2 text-sm bg-sky-600 hover:bg-sky-500 text-white rounded-lg transition-colors"
            >
              <Printer size={14} />
              適用
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
