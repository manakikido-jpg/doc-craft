'use client'

import { useState } from 'react'
import { X, RotateCcw } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
  onApply: (gradient: string) => void
}

type GradientType = 'linear' | 'radial'

interface GradientState {
  color1: string
  color2: string
  angle: number
  type: GradientType
}

const PRESETS: { label: string; color1: string; color2: string; angle: number; type: GradientType }[] = [
  { label: 'サンセット', color1: '#fa709a', color2: '#fee140', angle: 135, type: 'linear' },
  { label: 'オーシャン', color1: '#4facfe', color2: '#00f2fe', angle: 135, type: 'linear' },
  { label: 'フォレスト', color1: '#43e97b', color2: '#38f9d7', angle: 135, type: 'linear' },
  { label: 'ナイト', color1: '#0f172a', color2: '#1e3a5f', angle: 135, type: 'linear' },
  { label: 'ラベンダー', color1: '#a18cd1', color2: '#fbc2eb', angle: 135, type: 'linear' },
  { label: 'フレイム', color1: '#f83600', color2: '#f9d423', angle: 45, type: 'linear' },
  { label: 'ミッドナイト', color1: '#1e1b4b', color2: '#4c1d95', angle: 180, type: 'radial' },
  { label: 'コーラル', color1: '#ff9a9e', color2: '#fad0c4', angle: 135, type: 'linear' },
]

function buildGradient(state: GradientState): string {
  if (state.type === 'radial') {
    return `radial-gradient(circle, ${state.color1} 0%, ${state.color2} 100%)`
  }
  return `linear-gradient(${state.angle}deg, ${state.color1} 0%, ${state.color2} 100%)`
}

export default function BackgroundGradientEditor({ open, onClose, onApply }: Props) {
  const [state, setState] = useState<GradientState>({
    color1: '#667eea',
    color2: '#764ba2',
    angle: 135,
    type: 'linear',
  })

  if (!open) return null

  const gradientCSS = buildGradient(state)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="w-[480px] max-h-[85vh] flex flex-col rounded-lg border border-slate-700 bg-slate-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-700 px-5 py-3">
          <h2 className="text-lg font-semibold text-slate-100">グラデーション編集</h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Live preview */}
          <div
            className="h-32 w-full rounded-lg border border-slate-700"
            style={{ background: gradientCSS }}
          />

          {/* Gradient type toggle */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400 w-16">タイプ</span>
            <div className="flex rounded-lg border border-slate-700 overflow-hidden">
              {(['linear', 'radial'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setState((s) => ({ ...s, type: t }))}
                  className={`px-4 py-1.5 text-sm transition ${
                    state.type === t
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {t === 'linear' ? 'リニア' : 'ラジアル'}
                </button>
              ))}
            </div>
          </div>

          {/* Color pickers */}
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-slate-400">
              カラー1
              <input
                type="color"
                value={state.color1}
                onChange={(e) => setState((s) => ({ ...s, color1: e.target.value }))}
                className="h-9 w-9 cursor-pointer rounded border border-slate-700 bg-transparent"
              />
              <span className="text-xs text-slate-500 font-mono">{state.color1}</span>
            </label>
            <button
              onClick={() =>
                setState((s) => ({ ...s, color1: s.color2, color2: s.color1 }))
              }
              className="rounded p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              title="色を入れ替え"
            >
              <RotateCcw size={16} />
            </button>
            <label className="flex items-center gap-2 text-sm text-slate-400">
              カラー2
              <input
                type="color"
                value={state.color2}
                onChange={(e) => setState((s) => ({ ...s, color2: e.target.value }))}
                className="h-9 w-9 cursor-pointer rounded border border-slate-700 bg-transparent"
              />
              <span className="text-xs text-slate-500 font-mono">{state.color2}</span>
            </label>
          </div>

          {/* Angle slider (only for linear) */}
          {state.type === 'linear' && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-400 w-16">角度</span>
              <input
                type="range"
                min={0}
                max={360}
                value={state.angle}
                onChange={(e) =>
                  setState((s) => ({ ...s, angle: Number(e.target.value) }))
                }
                className="flex-1 accent-indigo-500"
              />
              <span className="text-sm text-slate-300 w-10 text-right font-mono">
                {state.angle}°
              </span>
            </div>
          )}

          {/* Presets */}
          <div>
            <p className="text-xs text-slate-500 mb-2">プリセット</p>
            <div className="grid grid-cols-4 gap-2">
              {PRESETS.map((preset) => {
                const previewGrad = buildGradient({
                  color1: preset.color1,
                  color2: preset.color2,
                  angle: preset.angle,
                  type: preset.type,
                })
                return (
                  <button
                    key={preset.label}
                    onClick={() =>
                      setState({
                        color1: preset.color1,
                        color2: preset.color2,
                        angle: preset.angle,
                        type: preset.type,
                      })
                    }
                    className="flex flex-col items-center gap-1 group"
                  >
                    <div
                      className="h-10 w-full rounded-md border border-slate-700 transition group-hover:scale-105"
                      style={{ background: previewGrad }}
                    />
                    <span className="text-[10px] text-slate-500 group-hover:text-slate-300">
                      {preset.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-700 px-5 py-3">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-1.5 text-sm text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition"
          >
            キャンセル
          </button>
          <button
            onClick={() => {
              onApply(gradientCSS)
              onClose()
            }}
            className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm text-white hover:bg-indigo-500 transition"
          >
            適用
          </button>
        </div>
      </div>
    </div>
  )
}
