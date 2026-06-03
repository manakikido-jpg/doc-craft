'use client'

import { X } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
  currentEasing?: string
  currentDelay?: number
  currentDuration?: number
  onUpdate: (props: { easing?: string; delay?: number; duration?: number }) => void
}

const EASINGS = [
  { value: 'linear', label: 'リニア', desc: '等速', curve: 'M0,100 L100,0' },
  { value: 'ease', label: '自然', desc: '自然な加減速', curve: 'M0,100 C30,100 70,0 100,0' },
  { value: 'ease-in', label: '加速', desc: 'ゆっくり→速く', curve: 'M0,100 C60,100 100,0 100,0' },
  { value: 'ease-out', label: '減速', desc: '速く→ゆっくり', curve: 'M0,100 C0,100 40,0 100,0' },
  { value: 'ease-in-out', label: '加減速', desc: 'なめらか', curve: 'M0,100 C40,100 60,0 100,0' },
  { value: 'bounce', label: 'バウンス', desc: '跳ねる', curve: 'M0,100 C20,100 40,0 50,20 S60,0 70,10 S80,0 100,0' },
]

export default function AnimationEasingPicker({ open, onClose, currentEasing, currentDelay, currentDuration, onUpdate }: Props) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="w-[460px] rounded-lg border border-slate-700 bg-slate-900 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-700 px-5 py-3">
          <h2 className="text-base font-semibold text-slate-100">アニメーション設定</h2>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Easing curves */}
          <div>
            <label className="text-xs text-slate-400 mb-2 block">イージング（加速曲線）</label>
            <div className="grid grid-cols-3 gap-2">
              {EASINGS.map(e => (
                <button
                  key={e.value}
                  onClick={() => onUpdate({ easing: e.value })}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition hover:bg-slate-800 ${
                    (currentEasing || 'ease') === e.value
                      ? 'border-indigo-500 bg-slate-800/50'
                      : 'border-slate-700'
                  }`}
                >
                  <svg viewBox="0 0 100 100" className="w-10 h-10">
                    <rect width="100" height="100" fill="none" stroke="#334155" strokeWidth="1" rx="4" />
                    <path d={e.curve} fill="none" stroke={currentEasing === e.value ? '#6366f1' : '#94a3b8'} strokeWidth="3" />
                  </svg>
                  <span className="text-xs text-slate-300">{e.label}</span>
                  <span className="text-[10px] text-slate-500">{e.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="text-xs text-slate-400 mb-1 block">再生時間</label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={100}
                max={3000}
                step={100}
                value={currentDuration || 500}
                onChange={e => onUpdate({ duration: Number(e.target.value) })}
                className="flex-1 accent-indigo-500"
              />
              <span className="text-sm text-slate-300 w-16 text-right font-mono">{((currentDuration || 500) / 1000).toFixed(1)}s</span>
            </div>
          </div>

          {/* Delay */}
          <div>
            <label className="text-xs text-slate-400 mb-1 block">遅延</label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={0}
                max={5000}
                step={100}
                value={currentDelay || 0}
                onChange={e => onUpdate({ delay: Number(e.target.value) })}
                className="flex-1 accent-indigo-500"
              />
              <span className="text-sm text-slate-300 w-16 text-right font-mono">{((currentDelay || 0) / 1000).toFixed(1)}s</span>
            </div>
          </div>

          {/* Preview button */}
          <button
            onClick={() => {
              // Trigger a CSS animation preview on the parent
              const previewEl = document.querySelector('[data-animation-preview]')
              if (previewEl) {
                previewEl.classList.remove('animate-preview')
                void (previewEl as HTMLElement).offsetWidth // force reflow
                previewEl.classList.add('animate-preview')
              }
            }}
            className="w-full py-2 rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-sm text-indigo-300 hover:bg-indigo-600/30 transition"
          >
            ▶ プレビュー再生
          </button>
        </div>
      </div>
    </div>
  )
}
