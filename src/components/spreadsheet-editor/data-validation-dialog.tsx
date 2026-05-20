'use client'

import { useState } from 'react'
import type { DataValidation } from '@/types'
import { X } from 'lucide-react'

interface Props {
  onApply: (validation: DataValidation) => void
  onRemove: () => void
  onClose: () => void
  existing?: DataValidation
}

const TYPES: { value: DataValidation['type']; label: string }[] = [
  { value: 'number', label: '数値' },
  { value: 'text', label: 'テキスト' },
  { value: 'list', label: 'リスト' },
  { value: 'date', label: '日付' },
]

export function DataValidationDialog({ onApply, onRemove, onClose, existing }: Props) {
  const [type, setType] = useState<DataValidation['type']>(existing?.type ?? 'number')
  const [min, setMin] = useState(existing?.min?.toString() ?? '')
  const [max, setMax] = useState(existing?.max?.toString() ?? '')
  const [listValues, setListValues] = useState(existing?.listValues?.join(', ') ?? '')
  const [errorMessage, setErrorMessage] = useState(existing?.errorMessage ?? '')

  const handleApply = () => {
    const validation: DataValidation = { type, errorMessage: errorMessage || undefined }
    if (type === 'number') {
      if (min) validation.min = Number(min)
      if (max) validation.max = Number(max)
    } else if (type === 'text') {
      if (max) validation.max = Number(max)
    } else if (type === 'list') {
      validation.listValues = listValues.split(',').map((v) => v.trim()).filter(Boolean)
    } else if (type === 'date') {
      if (min) validation.min = Number(min)
      if (max) validation.max = Number(max)
    }
    onApply(validation)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="データ入力規則"
        className="bg-slate-800 border border-slate-600 rounded-lg shadow-xl p-4 w-96"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-white">データ入力規則</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3">
          {/* Type selector */}
          <div>
            <label className="text-xs text-slate-400 block mb-1">種類</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as DataValidation['type'])}
              className="w-full h-8 bg-slate-700 border border-slate-600 rounded text-xs text-white px-2 outline-none focus:border-indigo-500"
            >
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Number options */}
          {type === 'number' && (
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-xs text-slate-400 block mb-1">最小値</label>
                <input
                  type="number"
                  value={min}
                  onChange={(e) => setMin(e.target.value)}
                  placeholder="なし"
                  className="w-full h-8 bg-slate-700 border border-slate-600 rounded text-xs text-white px-2 outline-none focus:border-indigo-500"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-slate-400 block mb-1">最大値</label>
                <input
                  type="number"
                  value={max}
                  onChange={(e) => setMax(e.target.value)}
                  placeholder="なし"
                  className="w-full h-8 bg-slate-700 border border-slate-600 rounded text-xs text-white px-2 outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          )}

          {/* Text options */}
          {type === 'text' && (
            <div>
              <label className="text-xs text-slate-400 block mb-1">最大文字数</label>
              <input
                type="number"
                value={max}
                onChange={(e) => setMax(e.target.value)}
                placeholder="なし"
                className="w-full h-8 bg-slate-700 border border-slate-600 rounded text-xs text-white px-2 outline-none focus:border-indigo-500"
              />
            </div>
          )}

          {/* List options */}
          {type === 'list' && (
            <div>
              <label className="text-xs text-slate-400 block mb-1">選択肢（カンマ区切り）</label>
              <input
                type="text"
                value={listValues}
                onChange={(e) => setListValues(e.target.value)}
                placeholder="項目1, 項目2, 項目3"
                className="w-full h-8 bg-slate-700 border border-slate-600 rounded text-xs text-white px-2 outline-none focus:border-indigo-500"
              />
            </div>
          )}

          {/* Date options */}
          {type === 'date' && (
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-xs text-slate-400 block mb-1">開始日 (YYYYMMDD)</label>
                <input
                  type="number"
                  value={min}
                  onChange={(e) => setMin(e.target.value)}
                  placeholder="例: 20240101"
                  className="w-full h-8 bg-slate-700 border border-slate-600 rounded text-xs text-white px-2 outline-none focus:border-indigo-500"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-slate-400 block mb-1">終了日 (YYYYMMDD)</label>
                <input
                  type="number"
                  value={max}
                  onChange={(e) => setMax(e.target.value)}
                  placeholder="例: 20251231"
                  className="w-full h-8 bg-slate-700 border border-slate-600 rounded text-xs text-white px-2 outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          )}

          {/* Error message */}
          <div>
            <label className="text-xs text-slate-400 block mb-1">エラーメッセージ</label>
            <input
              type="text"
              value={errorMessage}
              onChange={(e) => setErrorMessage(e.target.value)}
              placeholder="入力値が無効です"
              className="w-full h-8 bg-slate-700 border border-slate-600 rounded text-xs text-white px-2 outline-none focus:border-indigo-500"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={handleApply}
              className="flex-1 h-8 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs transition-colors"
            >
              適用
            </button>
            <button
              onClick={onRemove}
              className="flex-1 h-8 bg-slate-700 hover:bg-red-600 text-slate-300 hover:text-white rounded text-xs transition-colors"
            >
              削除
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
