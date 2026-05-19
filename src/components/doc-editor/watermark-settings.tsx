'use client'

import type { WatermarkSettings } from '@/types'
import { X } from 'lucide-react'

interface Props {
  watermark?: WatermarkSettings
  onUpdate: (watermark: WatermarkSettings | undefined) => void
  onClose: () => void
}

const PRESETS = [
  { label: '社外秘', text: '社外秘' },
  { label: 'CONFIDENTIAL', text: 'CONFIDENTIAL' },
  { label: 'DRAFT', text: 'DRAFT' },
  { label: 'サンプル', text: 'サンプル' },
  { label: 'コピー禁止', text: 'コピー禁止' },
]

export default function WatermarkSettings({ watermark, onUpdate, onClose }: Props) {
  const wm = watermark || { text: '', opacity: 8, fontSize: 64, rotation: -30, color: '#94a3b8' }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-96 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white text-sm font-medium">透かし設定</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Presets */}
          <div>
            <label className="text-xs text-slate-400 block mb-1.5">プリセット</label>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((p) => (
                <button
                  key={p.text}
                  onClick={() => onUpdate({ ...wm, text: p.text })}
                  className={`px-2 py-1 text-xs rounded border transition-colors ${
                    wm.text === p.text
                      ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400'
                      : 'border-slate-700 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Text */}
          <div>
            <label className="text-xs text-slate-400 block mb-1">テキスト</label>
            <input
              type="text"
              value={wm.text}
              onChange={(e) => onUpdate({ ...wm, text: e.target.value })}
              placeholder="透かしテキスト"
              className="w-full bg-slate-800 text-white text-sm px-3 py-2 rounded-lg border border-slate-700 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          {/* Opacity */}
          <div>
            <label className="text-xs text-slate-400 block mb-1">不透明度: {wm.opacity}%</label>
            <input
              type="range"
              min={2}
              max={30}
              value={wm.opacity}
              onChange={(e) => onUpdate({ ...wm, opacity: Number(e.target.value) })}
              className="w-full accent-indigo-500"
            />
          </div>

          {/* Size */}
          <div>
            <label className="text-xs text-slate-400 block mb-1">サイズ: {wm.fontSize}px</label>
            <input
              type="range"
              min={24}
              max={120}
              value={wm.fontSize}
              onChange={(e) => onUpdate({ ...wm, fontSize: Number(e.target.value) })}
              className="w-full accent-indigo-500"
            />
          </div>

          {/* Rotation */}
          <div>
            <label className="text-xs text-slate-400 block mb-1">角度: {wm.rotation}°</label>
            <input
              type="range"
              min={-90}
              max={90}
              value={wm.rotation}
              onChange={(e) => onUpdate({ ...wm, rotation: Number(e.target.value) })}
              className="w-full accent-indigo-500"
            />
          </div>

          {/* Color */}
          <div className="flex items-center gap-3">
            <label className="text-xs text-slate-400">色:</label>
            <input
              type="color"
              value={wm.color}
              onChange={(e) => onUpdate({ ...wm, color: e.target.value })}
              className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
            />
          </div>

          {/* Preview */}
          <div className="relative bg-white rounded-lg h-24 overflow-hidden flex items-center justify-center">
            {wm.text && (
              <span
                style={{
                  fontSize: `${Math.min(wm.fontSize, 40)}px`,
                  opacity: wm.opacity / 100,
                  transform: `rotate(${wm.rotation}deg)`,
                  color: wm.color,
                  fontWeight: 'bold',
                  userSelect: 'none',
                }}
              >
                {wm.text}
              </span>
            )}
            <span className="text-xs text-slate-400 absolute bottom-1 right-2">プレビュー</span>
          </div>
        </div>

        <div className="flex justify-between mt-6">
          <button
            onClick={() => {
              onUpdate(undefined)
              onClose()
            }}
            className="px-4 py-1.5 rounded-lg border border-slate-700 text-slate-400 hover:text-white text-sm transition-colors"
          >
            透かしを削除
          </button>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm transition-colors"
          >
            完了
          </button>
        </div>
      </div>
    </div>
  )
}
