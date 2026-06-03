'use client'

import { useState } from 'react'
import { X, Hash } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
  currentFormat: SlideNumberConfig
  onApply: (config: SlideNumberConfig) => void
}

export interface SlideNumberConfig {
  show: boolean
  format: 'number' | 'number-total' | 'roman' | 'alpha'
  position: 'bottom-right' | 'bottom-center' | 'bottom-left' | 'top-right' | 'top-center'
  startFrom: number
  fontSize: number
  color: string
  hideOnTitleSlide?: boolean
}

const DEFAULT_CONFIG: SlideNumberConfig = {
  show: true,
  format: 'number-total',
  position: 'bottom-right',
  startFrom: 1,
  fontSize: 10,
  color: '#94a3b8',
}

export default function SlideNumberFormat({ open, onClose, currentFormat, onApply }: Props) {
  const [config, setConfig] = useState<SlideNumberConfig>(currentFormat || DEFAULT_CONFIG)

  if (!open) return null

  function formatPreview(slideNum: number, total: number): string {
    const num = slideNum + config.startFrom - 1
    switch (config.format) {
      case 'number': return `${num}`
      case 'number-total': return `${num} / ${total}`
      case 'roman': {
        const romans = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']
        return romans[num - 1] || `${num}`
      }
      case 'alpha': return String.fromCharCode(64 + num)
      default: return `${num}`
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="w-[420px] rounded-lg border border-slate-700 bg-slate-900 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-700 px-5 py-3">
          <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <Hash size={18} /> スライド番号
          </h2>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Show toggle */}
          <label className="flex items-center justify-between">
            <span className="text-sm text-slate-300">スライド番号を表示</span>
            <button
              onClick={() => setConfig(c => ({ ...c, show: !c.show }))}
              className={`w-10 h-5 rounded-full transition relative ${config.show ? 'bg-indigo-600' : 'bg-slate-700'}`}
            >
              <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${config.show ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </label>

          {config.show && (
            <>
              {/* Format */}
              <div>
                <label className="text-xs text-slate-400 mb-1 block">形式</label>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { key: 'number', label: '数字 (1, 2, 3)' },
                    { key: 'number-total', label: '数字/合計 (1/10)' },
                    { key: 'roman', label: 'ローマ数字 (I, II)' },
                    { key: 'alpha', label: 'アルファベット (A, B)' },
                  ] as const).map(f => (
                    <button
                      key={f.key}
                      onClick={() => setConfig(c => ({ ...c, format: f.key }))}
                      className={`px-3 py-1.5 rounded text-xs text-left transition ${
                        config.format === f.key
                          ? 'bg-indigo-600/20 border border-indigo-500 text-indigo-300'
                          : 'bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Position */}
              <div>
                <label className="text-xs text-slate-400 mb-1 block">位置</label>
                <div className="flex gap-2">
                  {([
                    { key: 'bottom-left', label: '左下' },
                    { key: 'bottom-center', label: '中央下' },
                    { key: 'bottom-right', label: '右下' },
                    { key: 'top-right', label: '右上' },
                    { key: 'top-center', label: '中央上' },
                  ] as const).map(p => (
                    <button
                      key={p.key}
                      onClick={() => setConfig(c => ({ ...c, position: p.key }))}
                      className={`px-2 py-1 rounded text-[10px] transition ${
                        config.position === p.key
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Start from */}
              <div className="flex items-center gap-3">
                <label className="text-xs text-slate-400">開始番号</label>
                <input
                  type="number"
                  min={0}
                  max={99}
                  value={config.startFrom}
                  onChange={e => setConfig(c => ({ ...c, startFrom: parseInt(e.target.value) || 1 }))}
                  className="w-16 rounded border border-slate-700 bg-slate-800 px-2 py-1 text-sm text-slate-100 outline-none focus:border-indigo-500"
                />
              </div>

              {/* Font size */}
              <div className="flex items-center gap-3">
                <label className="text-xs text-slate-400">フォントサイズ</label>
                <input
                  type="range"
                  min={8}
                  max={18}
                  value={config.fontSize}
                  onChange={e => setConfig(c => ({ ...c, fontSize: Number(e.target.value) }))}
                  className="flex-1 accent-indigo-500"
                />
                <span className="text-xs text-slate-300 w-8">{config.fontSize}px</span>
              </div>

              {/* Color */}
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-400">色</label>
                <input
                  type="color"
                  value={config.color}
                  onChange={e => setConfig(c => ({ ...c, color: e.target.value }))}
                  className="h-7 w-7 rounded border border-slate-700 bg-transparent cursor-pointer"
                />
                <span className="text-xs text-slate-500 font-mono">{config.color}</span>
              </div>

              {/* Hide on title slide */}
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={config.hideOnTitleSlide ?? false}
                  onChange={e => setConfig(c => ({ ...c, hideOnTitleSlide: e.target.checked }))}
                  className="rounded border-slate-600 bg-slate-800 text-indigo-500 focus:ring-indigo-500"
                />
                <span className="text-sm text-slate-300">タイトルスライドで非表示</span>
              </label>

              {/* Preview */}
              <div className="rounded-lg border border-slate-700 bg-slate-800 p-3 text-center">
                <span className="text-xs text-slate-500">プレビュー: </span>
                <span style={{ fontSize: config.fontSize, color: config.color }}>
                  {formatPreview(3, 10)}
                </span>
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-700 px-5 py-3">
          <button onClick={onClose} className="rounded-lg px-4 py-1.5 text-sm text-slate-400 hover:bg-slate-800 hover:text-slate-200">
            キャンセル
          </button>
          <button
            onClick={() => { onApply(config); onClose() }}
            className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm text-white hover:bg-indigo-500"
          >
            適用
          </button>
        </div>
      </div>
    </div>
  )
}
