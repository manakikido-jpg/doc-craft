'use client'

import { useState } from 'react'
import { X, Monitor, Tablet, FileText, Settings2 } from 'lucide-react'

interface SlideSizeProps {
  currentSize?: { width: number; height: number; preset: string }
  onApply: (size: { width: number; height: number; preset: '16:9' | '4:3' | 'a4' | 'custom' }) => void
  onClose: () => void
}

const PRESETS = [
  { key: '16:9' as const, label: '16:9 ワイド', w: 960, h: 540, icon: Monitor },
  { key: '4:3' as const, label: '4:3 標準', w: 960, h: 720, icon: Tablet },
  { key: 'a4' as const, label: 'A4 縦', w: 960, h: 1358, icon: FileText },
  { key: 'custom' as const, label: 'カスタム', w: 0, h: 0, icon: Settings2 },
] as const

export default function SlideSizeModal({ currentSize, onApply, onClose }: SlideSizeProps) {
  const initPreset = (currentSize?.preset as '16:9' | '4:3' | 'a4' | 'custom') ?? '16:9'
  const [selected, setSelected] = useState<'16:9' | '4:3' | 'a4' | 'custom'>(initPreset)
  const [customW, setCustomW] = useState(currentSize?.width ?? 960)
  const [customH, setCustomH] = useState(currentSize?.height ?? 540)

  const activeW = selected === 'custom' ? customW : PRESETS.find(p => p.key === selected)!.w
  const activeH = selected === 'custom' ? customH : PRESETS.find(p => p.key === selected)!.h

  const previewScale = Math.min(180 / activeW, 120 / activeH)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="w-[480px] rounded-lg border border-slate-700 bg-slate-900 p-6 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-100">スライドサイズ</h2>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200">
            <X size={18} />
          </button>
        </div>

        {/* Preset buttons */}
        <div className="mb-5 grid grid-cols-4 gap-2">
          {PRESETS.map(p => {
            const Icon = p.icon
            return (
              <button
                key={p.key}
                onClick={() => setSelected(p.key)}
                className={`flex flex-col items-center gap-1 rounded-lg border p-3 text-xs transition ${
                  selected === p.key
                    ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                    : 'border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-300'
                }`}
              >
                <Icon size={20} />
                <span>{p.label}</span>
              </button>
            )
          })}
        </div>

        {/* Custom inputs */}
        {selected === 'custom' && (
          <div className="mb-5 flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-slate-400">
              W
              <input
                type="number"
                min={100}
                max={3840}
                value={customW}
                onChange={e => setCustomW(Number(e.target.value))}
                className="w-24 rounded border border-slate-700 bg-slate-800 px-2 py-1 text-slate-200"
              />
            </label>
            <span className="text-slate-500">×</span>
            <label className="flex items-center gap-2 text-sm text-slate-400">
              H
              <input
                type="number"
                min={100}
                max={3840}
                value={customH}
                onChange={e => setCustomH(Number(e.target.value))}
                className="w-24 rounded border border-slate-700 bg-slate-800 px-2 py-1 text-slate-200"
              />
            </label>
          </div>
        )}

        {/* Preview */}
        <div className="mb-5 flex items-center justify-center rounded-lg border border-slate-700 bg-slate-800 p-4">
          <div
            className="rounded border border-slate-600 bg-slate-700"
            style={{ width: activeW * previewScale, height: activeH * previewScale }}
          />
          <span className="ml-4 text-xs text-slate-500">
            {activeW} × {activeH} px
          </span>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
          >
            キャンセル
          </button>
          <button
            onClick={() => onApply({ width: activeW, height: activeH, preset: selected })}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-500"
          >
            適用
          </button>
        </div>
      </div>
    </div>
  )
}
