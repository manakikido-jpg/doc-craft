'use client'

import { useState, useRef } from 'react'
import { X, CheckCheck } from 'lucide-react'

interface MoreTransitionsProps {
  open: boolean
  onClose: () => void
  currentTransition: string | undefined
  onSelectTransition: (transition: string) => void
  currentDuration: number | undefined
  onSetDuration: (ms: number) => void
}

const TRANSITIONS = [
  { key: 'none', label: 'なし' },
  { key: 'fade', label: 'フェード' },
  { key: 'slide-left', label: 'スライド（左）' },
  { key: 'slide-up', label: 'スライド（上）' },
  { key: 'zoom', label: 'ズーム' },
  { key: 'dissolve', label: 'ディゾルブ' },
  { key: 'wipe-left', label: 'ワイプ（左）' },
  { key: 'wipe-up', label: 'ワイプ（上）' },
  { key: 'flip', label: 'フリップ' },
  { key: 'cube', label: 'キューブ' },
] as const

function getPreviewStyle(
  transition: string,
  active: boolean,
): React.CSSProperties {
  const base: React.CSSProperties = { transition: 'all 400ms ease-in-out' }
  if (!active) return { ...base }

  switch (transition) {
    case 'fade':
      return { ...base, opacity: 0 }
    case 'slide-left':
      return { ...base, transform: 'translateX(-100%)' }
    case 'slide-up':
      return { ...base, transform: 'translateY(-100%)' }
    case 'zoom':
      return { ...base, transform: 'scale(0.3)', opacity: 0 }
    case 'dissolve':
      return { ...base, opacity: 0, filter: 'blur(4px)' }
    case 'wipe-left':
      return { ...base, clipPath: 'inset(0 100% 0 0)' }
    case 'wipe-up':
      return { ...base, clipPath: 'inset(100% 0 0 0)' }
    case 'flip':
      return { ...base, transform: 'perspective(200px) rotateY(90deg)' }
    case 'cube':
      return { ...base, transform: 'perspective(200px) rotateY(-90deg)', transformOrigin: 'right center' }
    default:
      return base
  }
}

function TransitionCard({
  tKey,
  label,
  selected,
  onSelect,
}: {
  tKey: string
  label: string
  selected: boolean
  onSelect: () => void
}) {
  const [animating, setAnimating] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleMouseEnter() {
    if (tKey === 'none') return
    setAnimating(true)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setAnimating(false), 450)
  }

  function handleMouseLeave() {
    setAnimating(false)
    if (timerRef.current) clearTimeout(timerRef.current)
  }

  return (
    <button
      onClick={onSelect}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`flex flex-col items-center gap-1.5 rounded-lg border p-3 transition-colors ${
        selected
          ? 'border-indigo-500 bg-indigo-600/20'
          : 'border-slate-600 bg-slate-700/50 hover:border-slate-500 hover:bg-slate-700'
      }`}
    >
      {/* Preview square */}
      <div className="relative h-10 w-14 overflow-hidden rounded bg-slate-900">
        <div
          className="absolute inset-0 rounded bg-indigo-500"
          style={getPreviewStyle(tKey, animating)}
        />
      </div>
      <span className="text-xs text-slate-300">{label}</span>
    </button>
  )
}

export default function MoreTransitions({
  open,
  onClose,
  currentTransition,
  onSelectTransition,
  currentDuration,
  onSetDuration,
}: MoreTransitionsProps) {
  if (!open) return null

  const duration = currentDuration ?? 500
  const selected = currentTransition ?? 'none'

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="w-full max-w-xl rounded-xl bg-slate-800 p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">画面切り替え効果</h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-700 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* Transition grid */}
        <div className="grid grid-cols-5 gap-2">
          {TRANSITIONS.map((t) => (
            <TransitionCard
              key={t.key}
              tKey={t.key}
              label={t.label}
              selected={selected === t.key}
              onSelect={() => onSelectTransition(t.key)}
            />
          ))}
        </div>

        {/* Duration slider */}
        <div className="mt-6 border-t border-slate-700 pt-4">
          <div className="flex items-center justify-between">
            <label className="text-sm text-slate-300">
              再生時間: <span className="font-medium text-white">{duration}ms</span>
            </label>
          </div>
          <input
            type="range"
            min={100}
            max={2000}
            step={100}
            value={duration}
            onChange={(e) => onSetDuration(Number(e.target.value))}
            className="mt-2 w-full accent-indigo-500"
          />
          <div className="mt-1 flex justify-between text-[10px] text-slate-500">
            <span>100ms</span>
            <span>1000ms</span>
            <span>2000ms</span>
          </div>
        </div>

        {/* Apply to all */}
        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
          >
            <CheckCheck size={16} />
            すべてのスライドに適用
          </button>
        </div>
      </div>
    </div>
  )
}
