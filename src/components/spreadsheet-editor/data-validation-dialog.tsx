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

type UIType = DataValidation['type'] | 'chip'

const TYPES: { value: UIType; label: string }[] = [
  { value: 'number', label: '数値' },
  { value: 'text', label: 'テキスト' },
  { value: 'list', label: 'リスト' },
  { value: 'date', label: '日付' },
  { value: 'chip', label: 'チップ' },
]

const CHIP_PRESET_COLORS = [
  { name: 'red', value: '#ef4444' },
  { name: 'orange', value: '#f97316' },
  { name: 'yellow', value: '#eab308' },
  { name: 'green', value: '#22c55e' },
  { name: 'cyan', value: '#06b6d4' },
  { name: 'blue', value: '#3b82f6' },
  { name: 'purple', value: '#8b5cf6' },
  { name: 'gray', value: '#6b7280' },
]

interface ChipOption {
  label: string
  color: string
}

  function parseChipsFromList(listVals?: string[]): ChipOption[] {
    if (!listVals) return [{ label: '', color: CHIP_PRESET_COLORS[0].value }]
    const chips: ChipOption[] = []
    for (const v of listVals) {
      const colonIdx = v.lastIndexOf(':')
      if (colonIdx > 0) {
        chips.push({ label: v.slice(0, colonIdx), color: v.slice(colonIdx + 1) })
      } else {
        chips.push({ label: v, color: CHIP_PRESET_COLORS[0].value })
      }
    }
    return chips.length > 0 ? chips : [{ label: '', color: CHIP_PRESET_COLORS[0].value }]
  }

export function DataValidationDialog({ onApply, onRemove, onClose, existing }: Props) {
  // Detect if existing validation is a chip type (list values with color encoding)
  const isExistingChip = existing?.type === 'list' && existing.listValues?.some((v) => v.includes(':'))
  const [type, setType] = useState<UIType>(isExistingChip ? 'chip' : (existing?.type ?? 'number'))
  const [min, setMin] = useState(existing?.min?.toString() ?? '')
  const [max, setMax] = useState(existing?.max?.toString() ?? '')
  const [listValues, setListValues] = useState(existing?.listValues?.join(', ') ?? '')
  const [errorMessage, setErrorMessage] = useState(existing?.errorMessage ?? '')
  const [rejectInput, setRejectInput] = useState(existing?.rejectInput ?? false)
  const [chipOptions, setChipOptions] = useState<ChipOption[]>(() => isExistingChip ? parseChipsFromList(existing?.listValues) : [{ label: '', color: CHIP_PRESET_COLORS[0].value }])

  const handleApply = () => {
    const actualType: DataValidation['type'] = type === 'chip' ? 'list' : type
    const validation: DataValidation = { type: actualType, errorMessage: errorMessage || undefined, rejectInput: rejectInput || undefined }
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
    } else if (type === 'chip') {
      validation.listValues = chipOptions
        .filter((c) => c.label.trim())
        .map((c) => `${c.label.trim()}:${c.color}`)
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
              onChange={(e) => setType(e.target.value as UIType)}
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

          {/* Chip options */}
          {type === 'chip' && (
            <div>
              <label className="text-xs text-slate-400 block mb-1">チップオプション</label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {chipOptions.map((chip, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={chip.label}
                      onChange={(e) => {
                        const updated = [...chipOptions]
                        updated[idx] = { ...updated[idx], label: e.target.value }
                        setChipOptions(updated)
                      }}
                      placeholder={`オプション ${idx + 1}`}
                      className="flex-1 h-7 bg-slate-700 border border-slate-600 rounded text-xs text-white px-2 outline-none focus:border-indigo-500"
                    />
                    <div className="flex gap-0.5">
                      {CHIP_PRESET_COLORS.map((pc) => (
                        <button
                          key={pc.name}
                          type="button"
                          onClick={() => {
                            const updated = [...chipOptions]
                            updated[idx] = { ...updated[idx], color: pc.value }
                            setChipOptions(updated)
                          }}
                          className={`w-4 h-4 rounded-full border ${chip.color === pc.value ? 'border-white ring-1 ring-white' : 'border-slate-600'}`}
                          style={{ backgroundColor: pc.value }}
                          title={pc.name}
                        />
                      ))}
                    </div>
                    {chipOptions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setChipOptions(chipOptions.filter((_, i) => i !== idx))}
                        className="text-slate-500 hover:text-red-400 text-xs px-1"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {chipOptions.length < 8 && (
                <button
                  type="button"
                  onClick={() => setChipOptions([...chipOptions, { label: '', color: CHIP_PRESET_COLORS[chipOptions.length % CHIP_PRESET_COLORS.length].value }])}
                  className="mt-2 text-xs text-indigo-400 hover:text-indigo-300"
                >
                  ＋ オプション追加
                </button>
              )}
              {/* Chip preview */}
              {chipOptions.some((c) => c.label.trim()) && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {chipOptions.filter((c) => c.label.trim()).map((c, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium text-white"
                      style={{ backgroundColor: c.color }}
                    >
                      {c.label}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Reject input toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={rejectInput}
              onChange={(e) => setRejectInput(e.target.checked)}
              className="accent-indigo-500"
            />
            <span className="text-xs text-white">無効な値を拒否する</span>
          </label>

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
