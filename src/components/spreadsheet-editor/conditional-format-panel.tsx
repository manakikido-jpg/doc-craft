'use client'

import { useState, useMemo } from 'react'
import { X } from 'lucide-react'
import { generateId } from '@/lib/utils'

export interface ConditionalFormatRule {
  id: string
  type:
    | 'greaterThan'
    | 'lessThan'
    | 'equalTo'
    | 'between'
    | 'textContains'
    | 'isEmpty'
    | 'isNotEmpty'
    | 'topN'
    | 'bottomN'
    | 'aboveAverage'
    | 'belowAverage'
    | 'duplicate'
    | 'unique'
  values: string[]
  style: { bgColor?: string; textColor?: string; bold?: boolean }
}

interface Props {
  open: boolean
  onClose: () => void
  onApply: (rule: ConditionalFormatRule) => void
  existingRules?: ConditionalFormatRule[]
}

type ExtendedRuleType = ConditionalFormatRule['type'] | 'colorScale' | 'dataBar'

const RULE_TYPES: { value: ExtendedRuleType; label: string; valueCount: number }[] = [
  { value: 'greaterThan', label: 'より大きい', valueCount: 1 },
  { value: 'lessThan', label: 'より小さい', valueCount: 1 },
  { value: 'equalTo', label: '等しい', valueCount: 1 },
  { value: 'between', label: '範囲内', valueCount: 2 },
  { value: 'textContains', label: 'テキストを含む', valueCount: 1 },
  { value: 'isEmpty', label: '空白', valueCount: 0 },
  { value: 'isNotEmpty', label: '空白でない', valueCount: 0 },
  { value: 'topN', label: '上位N件', valueCount: 1 },
  { value: 'bottomN', label: '下位N件', valueCount: 1 },
  { value: 'aboveAverage', label: '平均以上', valueCount: 0 },
  { value: 'belowAverage', label: '平均以下', valueCount: 0 },
  { value: 'duplicate', label: '重複する値', valueCount: 0 },
  { value: 'unique', label: '一意の値', valueCount: 0 },
  { value: 'colorScale', label: 'カラースケール', valueCount: 0 },
  { value: 'dataBar', label: 'データバー', valueCount: 0 },
]

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6',
  '#8b5cf6', '#ec4899', '#14b8a6', '#f43f5e', '#6366f1',
]

function matchesCondition(value: number, ruleType: ExtendedRuleType, v1: string, v2: string): boolean {
  const n1 = Number(v1)
  const n2 = Number(v2)
  switch (ruleType) {
    case 'greaterThan': return !isNaN(n1) && value > n1
    case 'lessThan': return !isNaN(n1) && value < n1
    case 'equalTo': return !isNaN(n1) && value === n1
    case 'between': return !isNaN(n1) && !isNaN(n2) && value >= n1 && value <= n2
    case 'aboveAverage': return value > 53.33
    case 'belowAverage': return value < 53.33
    case 'topN': case 'bottomN': case 'isEmpty': case 'isNotEmpty':
    case 'textContains': case 'duplicate': case 'unique':
      return true
    default: return false
  }
}

export default function ConditionalFormatPanel({ open, onClose, onApply, existingRules }: Props) {
  const [ruleType, setRuleType] = useState<ExtendedRuleType>('greaterThan')
  const [value1, setValue1] = useState('')
  const [value2, setValue2] = useState('')
  const [bgColor, setBgColor] = useState('#fecaca')
  const [textColor, setTextColor] = useState('#991b1b')
  const [bold, setBold] = useState(false)
  const [colorScaleMin, setColorScaleMin] = useState('#22c55e')
  const [colorScaleMax, setColorScaleMax] = useState('#ef4444')

  const currentRuleInfo = useMemo(() => RULE_TYPES.find((r) => r.value === ruleType), [ruleType])

  if (!open) return null

  const handleApply = () => {
    const values: string[] = []
    if (currentRuleInfo && currentRuleInfo.valueCount >= 1) values.push(value1)
    if (currentRuleInfo && currentRuleInfo.valueCount >= 2) values.push(value2)

    // For colorScale/dataBar, fall back to greaterThan as the stored type
    const storedType: ConditionalFormatRule['type'] = (ruleType === 'colorScale' || ruleType === 'dataBar') ? 'greaterThan' : ruleType

    const rule: ConditionalFormatRule = {
      id: generateId(),
      type: storedType,
      values,
      style: { bgColor, textColor, bold: bold || undefined },
    }
    onApply(rule)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-[420px] max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-700">
          <h3 className="text-sm font-semibold text-white">条件付き書式</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Rule type selector */}
          <div>
            <label className="text-xs text-slate-400 block mb-1.5">条件の種類</label>
            <select
              value={ruleType}
              onChange={(e) => setRuleType(e.target.value as ExtendedRuleType)}
              className="w-full h-8 px-2 text-xs bg-slate-800 text-white border border-slate-600 rounded outline-none focus:border-indigo-500"
            >
              {RULE_TYPES.map((rt) => (
                <option key={rt.value} value={rt.value}>
                  {rt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Value inputs */}
          {currentRuleInfo && currentRuleInfo.valueCount >= 1 && (
            <div>
              <label className="text-xs text-slate-400 block mb-1.5">
                {ruleType === 'between' ? '最小値' : ruleType === 'topN' || ruleType === 'bottomN' ? '件数' : '値'}
              </label>
              <input
                type="text"
                value={value1}
                onChange={(e) => setValue1(e.target.value)}
                className="w-full h-8 px-2 text-xs bg-slate-800 text-white border border-slate-600 rounded outline-none focus:border-indigo-500"
                placeholder="値を入力..."
              />
            </div>
          )}
          {currentRuleInfo && currentRuleInfo.valueCount >= 2 && (
            <div>
              <label className="text-xs text-slate-400 block mb-1.5">最大値</label>
              <input
                type="text"
                value={value2}
                onChange={(e) => setValue2(e.target.value)}
                className="w-full h-8 px-2 text-xs bg-slate-800 text-white border border-slate-600 rounded outline-none focus:border-indigo-500"
                placeholder="値を入力..."
              />
            </div>
          )}

          {/* Color scale options */}
          {ruleType === 'colorScale' && (
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs text-slate-400 block mb-1.5">最小色</label>
                <input
                  type="color"
                  value={colorScaleMin}
                  onChange={(e) => setColorScaleMin(e.target.value)}
                  className="w-full h-8 rounded border border-slate-600 cursor-pointer bg-transparent"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-slate-400 block mb-1.5">最大色</label>
                <input
                  type="color"
                  value={colorScaleMax}
                  onChange={(e) => setColorScaleMax(e.target.value)}
                  className="w-full h-8 rounded border border-slate-600 cursor-pointer bg-transparent"
                />
              </div>
            </div>
          )}

          {/* Style settings */}
          <div className="space-y-3" style={{ display: ruleType === 'colorScale' ? 'none' : undefined }}>
            <p className="text-xs text-slate-400 font-medium">書式設定</p>

            {/* Background color */}
            <div className="flex items-center gap-3">
              <label className="text-xs text-slate-400 w-20 shrink-0">背景色</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="w-6 h-6 rounded border border-slate-600 cursor-pointer bg-transparent"
                />
                {PRESET_COLORS.slice(0, 6).map((c) => (
                  <button
                    key={c}
                    onClick={() => setBgColor(c + '40')}
                    className={`w-5 h-5 rounded-full border ${bgColor === c + '40' ? 'border-white' : 'border-slate-600'}`}
                    style={{ backgroundColor: c + '40' }}
                  />
                ))}
              </div>
            </div>

            {/* Text color */}
            <div className="flex items-center gap-3">
              <label className="text-xs text-slate-400 w-20 shrink-0">文字色</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                  className="w-6 h-6 rounded border border-slate-600 cursor-pointer bg-transparent"
                />
                {PRESET_COLORS.slice(0, 6).map((c) => (
                  <button
                    key={c}
                    onClick={() => setTextColor(c)}
                    className={`w-5 h-5 rounded-full border ${textColor === c ? 'border-white' : 'border-slate-600'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            {/* Bold */}
            <div className="flex items-center gap-3">
              <label className="text-xs text-slate-400 w-20 shrink-0">太字</label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={bold}
                  onChange={(e) => setBold(e.target.checked)}
                  className="w-3.5 h-3.5 accent-indigo-500"
                />
                <span className="text-xs text-slate-300">太字にする</span>
              </label>
            </div>
          </div>

          {/* Preview */}
          <div>
            <p className="text-xs text-slate-400 mb-1.5">プレビュー</p>
            {ruleType === 'colorScale' ? (
              <div
                className="h-[60px] rounded border border-slate-600 flex items-center px-2"
              >
                <div
                  className="w-full h-6 rounded"
                  style={{
                    background: `linear-gradient(to right, ${colorScaleMin}, ${colorScaleMax})`,
                  }}
                />
              </div>
            ) : ruleType === 'dataBar' ? (
              <div className="h-[60px] rounded border border-slate-600 flex flex-col justify-center gap-1 px-2">
                {[30, 50, 80].map((pct) => (
                  <div key={pct} className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-500 w-6 text-right">{pct}</span>
                    <div className="flex-1 h-3 bg-slate-800 rounded overflow-hidden">
                      <div
                        className="h-full rounded"
                        style={{ width: `${pct}%`, backgroundColor: bgColor }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-[60px] rounded border border-slate-600 flex items-center justify-center gap-2 px-2">
                {[30, 50, 80].map((val) => {
                  const matches = matchesCondition(val, ruleType, value1, value2)
                  return (
                    <div
                      key={val}
                      className="flex-1 h-8 flex items-center justify-center rounded text-xs border border-slate-700"
                      style={matches ? {
                        backgroundColor: bgColor,
                        color: textColor,
                        fontWeight: bold ? 'bold' : 'normal',
                      } : {
                        backgroundColor: 'transparent',
                        color: '#94a3b8',
                      }}
                    >
                      {val}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Existing rules */}
          {existingRules && existingRules.length > 0 && (
            <div>
              <p className="text-xs text-slate-400 mb-1.5">適用済みルール ({existingRules.length})</p>
              <div className="space-y-1 max-h-28 overflow-y-auto">
                {existingRules.map((rule) => {
                  const info = RULE_TYPES.find((r) => r.value === rule.type)
                  return (
                    <div
                      key={rule.id}
                      className="flex items-center gap-2 px-2 py-1 bg-slate-800 rounded text-xs text-slate-300"
                    >
                      <div
                        className="w-3 h-3 rounded-sm shrink-0"
                        style={{ backgroundColor: rule.style.bgColor }}
                      />
                      <span className="truncate">
                        {info?.label || rule.type}
                        {rule.values.length > 0 && `: ${rule.values.join(' ~ ')}`}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-700">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs text-slate-400 hover:text-white rounded hover:bg-slate-700 transition-colors"
          >
            キャンセル
          </button>
          <button
            onClick={handleApply}
            className="px-4 py-1.5 text-xs text-white bg-indigo-600 hover:bg-indigo-500 rounded transition-colors"
          >
            適用
          </button>
        </div>
      </div>
    </div>
  )
}
