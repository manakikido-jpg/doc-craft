'use client'

import { useState } from 'react'
import { X, Droplets } from 'lucide-react'

interface WatermarkConfig {
  enabled: boolean
  text: string
  fontSize: number
  color: string
  opacity: number
  rotation: number
  position: 'center' | 'diagonal' | 'bottom-right'
}

interface Props {
  open: boolean
  onClose: () => void
  config: WatermarkConfig
  onUpdate: (config: WatermarkConfig) => void
}

const DEFAULT_CONFIG: WatermarkConfig = {
  enabled: false,
  text: 'CONFIDENTIAL',
  fontSize: 48,
  color: '#94a3b8',
  opacity: 15,
  rotation: -30,
  position: 'diagonal',
}

export default function WatermarkSettings({ open, onClose, config: initial, onUpdate }: Props) {
  const [config, setConfig] = useState<WatermarkConfig>({ ...DEFAULT_CONFIG, ...initial })

  if (!open) return null

  function update(partial: Partial<WatermarkConfig>) {
    const next = { ...config, ...partial }
    setConfig(next)
    onUpdate(next)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="w-[420px] rounded-lg border border-slate-700 bg-slate-900 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-700 px-5 py-3">
          <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <Droplets size={18} /> 透かし設定
          </h2>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Enable toggle */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-200">透かしを表示</span>
            <button
              onClick={() => update({ enabled: !config.enabled })}
              className={`w-10 h-5 rounded-full transition relative ${config.enabled ? 'bg-indigo-600' : 'bg-slate-700'}`}
            >
              <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${config.enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>

          {config.enabled && (
            <>
              {/* Text */}
              <div>
                <label className="text-xs text-slate-400 mb-1 block">テキスト</label>
                <input
                  value={config.text}
                  onChange={e => update({ text: e.target.value })}
                  className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-100 outline-none focus:border-indigo-500"
                />
              </div>

              {/* Position */}
              <div>
                <label className="text-xs text-slate-400 mb-1 block">配置</label>
                <div className="flex gap-2">
                  {([
                    { key: 'center', label: '中央' },
                    { key: 'diagonal', label: '斜め' },
                    { key: 'bottom-right', label: '右下' },
                  ] as const).map(p => (
                    <button
                      key={p.key}
                      onClick={() => update({ position: p.key, rotation: p.key === 'diagonal' ? -30 : 0 })}
                      className={`flex-1 px-2 py-1.5 rounded text-xs transition ${
                        config.position === p.key ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Font size */}
              <div className="flex items-center gap-3">
                <label className="text-xs text-slate-400 w-16">サイズ</label>
                <input type="range" min={16} max={96} value={config.fontSize} onChange={e => update({ fontSize: Number(e.target.value) })} className="flex-1 accent-indigo-500" />
                <span className="text-xs text-slate-300 w-10 text-right">{config.fontSize}px</span>
              </div>

              {/* Opacity */}
              <div className="flex items-center gap-3">
                <label className="text-xs text-slate-400 w-16">透明度</label>
                <input type="range" min={5} max={50} value={config.opacity} onChange={e => update({ opacity: Number(e.target.value) })} className="flex-1 accent-indigo-500" />
                <span className="text-xs text-slate-300 w-10 text-right">{config.opacity}%</span>
              </div>

              {/* Color */}
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-400">色</label>
                <input type="color" value={config.color} onChange={e => update({ color: e.target.value })} className="h-6 w-6 rounded border border-slate-700 bg-transparent cursor-pointer" />
              </div>

              {/* Preview */}
              <div className="relative h-24 rounded-lg border border-slate-700 bg-slate-800 overflow-hidden flex items-center justify-center">
                <div
                  style={{
                    fontSize: config.fontSize * 0.4,
                    color: config.color,
                    opacity: config.opacity / 100,
                    transform: `rotate(${config.rotation}deg)`,
                    whiteSpace: 'nowrap',
                    position: config.position === 'bottom-right' ? 'absolute' : undefined,
                    bottom: config.position === 'bottom-right' ? 8 : undefined,
                    right: config.position === 'bottom-right' ? 8 : undefined,
                  }}
                >
                  {config.text}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-700 px-5 py-3">
          <button onClick={onClose} className="rounded-lg px-4 py-1.5 text-sm text-slate-400 hover:bg-slate-800">閉じる</button>
        </div>
      </div>
    </div>
  )
}
