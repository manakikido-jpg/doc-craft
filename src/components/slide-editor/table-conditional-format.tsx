'use client'

import { useState } from 'react'

export interface TableConditionalRule {
  column: number
  condition: 'greater-than' | 'less-than' | 'equals' | 'contains' | 'empty'
  value: string
  bgColor: string
  textColor: string
}

interface Props {
  open: boolean
  onClose: () => void
  onApply: (rule: TableConditionalRule) => void
  columnCount?: number
  columnHeaders?: string[]
}

const CONDITIONS: { value: TableConditionalRule['condition']; label: string }[] = [
  { value: 'greater-than', label: 'より大きい' },
  { value: 'less-than', label: 'より小さい' },
  { value: 'equals', label: '等しい' },
  { value: 'contains', label: '含む' },
  { value: 'empty', label: '空' },
]

export default function TableConditionalFormat({ open, onClose, onApply, columnCount = 3, columnHeaders }: Props) {
  const [column, setColumn] = useState(0)
  const [condition, setCondition] = useState<TableConditionalRule['condition']>('greater-than')
  const [value, setValue] = useState('')
  const [bgColor, setBgColor] = useState('#22c55e')
  const [textColor, setTextColor] = useState('#ffffff')

  if (!open) return null

  const columnOptions = Array.from({ length: columnCount }, (_, i) => {
    const label = columnHeaders?.[i] || `列 ${i + 1}`
    return { index: i, label }
  })

  const conditionLabel = CONDITIONS.find((c) => c.value === condition)?.label || ''

  function handleApply() {
    onApply({ column, condition, value, bgColor, textColor })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-5 w-96"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white">条件付き書式</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors text-lg leading-none"
          >
            &times;
          </button>
        </div>

        {/* Column selector */}
        <div className="mb-3">
          <label className="block text-xs text-slate-400 mb-1">対象列</label>
          <select
            value={column}
            onChange={(e) => setColumn(Number(e.target.value))}
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
          >
            {columnOptions.map((opt) => (
              <option key={opt.index} value={opt.index}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Condition selector */}
        <div className="mb-3">
          <label className="block text-xs text-slate-400 mb-1">条件</label>
          <select
            value={condition}
            onChange={(e) => setCondition(e.target.value as TableConditionalRule['condition'])}
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
          >
            {CONDITIONS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        {/* Value input (hidden for 'empty' condition) */}
        {condition !== 'empty' && (
          <div className="mb-3">
            <label className="block text-xs text-slate-400 mb-1">値</label>
            <input
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="比較する値を入力..."
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        )}

        {/* Color pickers */}
        <div className="flex gap-4 mb-4">
          <div className="flex-1">
            <label className="block text-xs text-slate-400 mb-1">背景色</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value)}
                className="w-8 h-8 rounded border border-slate-600 bg-transparent cursor-pointer"
              />
              <input
                type="text"
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value)}
                className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-2 py-1 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
          <div className="flex-1">
            <label className="block text-xs text-slate-400 mb-1">文字色</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={textColor}
                onChange={(e) => setTextColor(e.target.value)}
                className="w-8 h-8 rounded border border-slate-600 bg-transparent cursor-pointer"
              />
              <input
                type="text"
                value={textColor}
                onChange={(e) => setTextColor(e.target.value)}
                className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-2 py-1 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="mb-4">
          <label className="block text-xs text-slate-400 mb-1">プレビュー</label>
          <div className="border border-slate-600 rounded-lg p-3 bg-slate-900">
            <div className="text-xs text-slate-400 mb-2">
              列 {columnOptions[column]?.label} が「{conditionLabel}」
              {condition !== 'empty' && value ? ` ${value}` : ''}の場合:
            </div>
            <div
              className="rounded px-3 py-2 text-sm font-medium"
              style={{ backgroundColor: bgColor, color: textColor }}
            >
              サンプルセル値
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-slate-300 bg-slate-700 hover:bg-slate-600 transition-colors"
          >
            キャンセル
          </button>
          <button
            onClick={handleApply}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 transition-colors"
          >
            適用
          </button>
        </div>
      </div>
    </div>
  )
}
