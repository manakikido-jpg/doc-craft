'use client'

import { useState } from 'react'
import { X } from 'lucide-react'

export type PasteMode = 'all' | 'values' | 'formats' | 'formulas' | 'transpose' | 'columnWidths'
export type PasteOperation = 'none' | 'add' | 'subtract' | 'multiply' | 'divide'

export interface PasteSpecialOptions {
  mode: PasteMode
  operation: PasteOperation
  transpose: boolean
}

interface Props {
  onPaste: (mode: PasteMode, options?: PasteSpecialOptions) => void
  onClose: () => void
}

const PASTE_OPTIONS: { mode: PasteMode; label: string; description: string }[] = [
  { mode: 'all', label: 'すべて', description: '値、書式、数式をすべて貼り付け' },
  { mode: 'values', label: '値のみ', description: '計算結果の値のみ貼り付け（数式なし）' },
  { mode: 'formulas', label: '数式のみ', description: '数式/値を貼り付け（書式なし）' },
  { mode: 'formats', label: '書式のみ', description: 'セルの書式のみ貼り付け' },
  { mode: 'columnWidths', label: '列幅', description: 'コピー元の列幅のみ貼り付け' },
]

const OPERATIONS: { value: PasteOperation; label: string }[] = [
  { value: 'none', label: 'なし' },
  { value: 'add', label: '加算' },
  { value: 'subtract', label: '減算' },
  { value: 'multiply', label: '乗算' },
  { value: 'divide', label: '除算' },
]

export function PasteSpecialDialog({ onPaste, onClose }: Props) {
  const [selected, setSelected] = useState<PasteMode>('all')
  const [operation, setOperation] = useState<PasteOperation>('none')
  const [transpose, setTranspose] = useState(false)

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-96">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
          <h3 className="text-sm font-semibold text-white">形式を選択して貼り付け</h3>
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-white hover:bg-slate-700"
          >
            <X size={14} />
          </button>
        </div>
        <div className="p-4 space-y-4">
          {/* Paste mode */}
          <div>
            <div className="text-xs text-slate-400 font-medium mb-2">貼り付けの内容</div>
            <div className="space-y-1.5">
              {PASTE_OPTIONS.map((opt) => (
                <label
                  key={opt.mode}
                  className={`flex items-start gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                    selected === opt.mode
                      ? 'bg-indigo-600/20 border border-indigo-500/50'
                      : 'hover:bg-slate-700/50 border border-transparent'
                  }`}
                >
                  <input
                    type="radio"
                    name="paste-mode"
                    checked={selected === opt.mode}
                    onChange={() => setSelected(opt.mode)}
                    className="mt-0.5 accent-indigo-500"
                  />
                  <div>
                    <div className="text-sm text-white font-medium">{opt.label}</div>
                    <div className="text-[10px] text-slate-400">{opt.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Operation */}
          <div>
            <div className="text-xs text-slate-400 font-medium mb-2">演算</div>
            <div className="flex flex-wrap gap-1.5">
              {OPERATIONS.map((op) => (
                <button
                  key={op.value}
                  onClick={() => setOperation(op.value)}
                  className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                    operation === op.value
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white'
                  }`}
                >
                  {op.label}
                </button>
              ))}
            </div>
            <div className="text-[10px] text-slate-500 mt-1">
              演算を選択すると、クリップボードの値と貼り付け先の値で計算します
            </div>
          </div>

          {/* Transpose */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={transpose}
              onChange={(e) => setTranspose(e.target.checked)}
              className="accent-indigo-500"
            />
            <span className="text-sm text-white">転置（行と列を入れ替え）</span>
          </label>
        </div>

        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-slate-700">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition-colors"
          >
            キャンセル
          </button>
          <button
            onClick={() => onPaste(selected, { mode: selected, operation, transpose })}
            className="px-4 py-1.5 text-xs text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors"
          >
            貼り付け
          </button>
        </div>
      </div>
    </>
  )
}
