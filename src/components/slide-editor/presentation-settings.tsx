'use client'

import { useState } from 'react'
import { X, Play, RotateCw, SkipForward, Monitor } from 'lucide-react'

interface PresentationConfig {
  loop: boolean
  autoPlay: boolean
  autoPlayInterval: number  // seconds
  showControls: boolean
  startFromCurrent: boolean
  penColor: string
  penWidth: number
}

interface Props {
  open: boolean
  onClose: () => void
  config: PresentationConfig
  onUpdate: (config: PresentationConfig) => void
  onStartPresentation: () => void
}

const DEFAULT_CONFIG: PresentationConfig = {
  loop: false,
  autoPlay: false,
  autoPlayInterval: 5,
  showControls: true,
  startFromCurrent: true,
  penColor: '#ef4444',
  penWidth: 3,
}

export default function PresentationSettings({ open, onClose, config: initialConfig, onUpdate, onStartPresentation }: Props) {
  const [config, setConfig] = useState<PresentationConfig>({ ...DEFAULT_CONFIG, ...initialConfig })

  if (!open) return null

  function update(partial: Partial<PresentationConfig>) {
    const next = { ...config, ...partial }
    setConfig(next)
    onUpdate(next)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="w-[440px] rounded-lg border border-slate-700 bg-slate-900 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-700 px-5 py-3">
          <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <Monitor size={18} /> プレゼンテーション設定
          </h2>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Start position */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-200">開始位置</div>
              <div className="text-[10px] text-slate-500">現在のスライドから開始</div>
            </div>
            <button
              onClick={() => update({ startFromCurrent: !config.startFromCurrent })}
              className={`w-10 h-5 rounded-full transition relative ${config.startFromCurrent ? 'bg-indigo-600' : 'bg-slate-700'}`}
            >
              <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${config.startFromCurrent ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>

          {/* Loop */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-200 flex items-center gap-1.5">
                <RotateCw size={14} /> ループ再生
              </div>
              <div className="text-[10px] text-slate-500">最後のスライドの後に最初に戻る</div>
            </div>
            <button
              onClick={() => update({ loop: !config.loop })}
              className={`w-10 h-5 rounded-full transition relative ${config.loop ? 'bg-indigo-600' : 'bg-slate-700'}`}
            >
              <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${config.loop ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>

          {/* Auto play */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-200 flex items-center gap-1.5">
                <SkipForward size={14} /> 自動再生
              </div>
              <div className="text-[10px] text-slate-500">一定間隔で自動的に進む</div>
            </div>
            <button
              onClick={() => update({ autoPlay: !config.autoPlay })}
              className={`w-10 h-5 rounded-full transition relative ${config.autoPlay ? 'bg-indigo-600' : 'bg-slate-700'}`}
            >
              <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${config.autoPlay ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>

          {config.autoPlay && (
            <div className="ml-6 flex items-center gap-3">
              <label className="text-xs text-slate-400">間隔</label>
              <input
                type="range"
                min={2}
                max={30}
                value={config.autoPlayInterval}
                onChange={e => update({ autoPlayInterval: Number(e.target.value) })}
                className="flex-1 accent-indigo-500"
              />
              <span className="text-xs text-slate-300 w-8 text-right">{config.autoPlayInterval}秒</span>
            </div>
          )}

          {/* Pen settings */}
          <div className="pt-3 border-t border-slate-800">
            <div className="text-sm text-slate-200 mb-2">ペン設定</div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-400">色</label>
                <input
                  type="color"
                  value={config.penColor}
                  onChange={e => update({ penColor: e.target.value })}
                  className="h-6 w-6 rounded border border-slate-700 bg-transparent cursor-pointer"
                />
              </div>
              <div className="flex items-center gap-2 flex-1">
                <label className="text-xs text-slate-400">太さ</label>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={config.penWidth}
                  onChange={e => update({ penWidth: Number(e.target.value) })}
                  className="flex-1 accent-indigo-500"
                />
                <span className="text-xs text-slate-300 w-6">{config.penWidth}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-700 px-5 py-3">
          <button onClick={onClose} className="rounded-lg px-4 py-1.5 text-sm text-slate-400 hover:bg-slate-800 hover:text-slate-200">
            閉じる
          </button>
          <button
            onClick={() => { onStartPresentation(); onClose() }}
            className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm text-white hover:bg-indigo-500 flex items-center gap-1.5"
          >
            <Play size={14} /> プレゼン開始
          </button>
        </div>
      </div>
    </div>
  )
}
