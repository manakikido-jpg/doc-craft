'use client'

import { useState } from 'react'
import { X } from 'lucide-react'

interface PaddingValues {
  top: number
  right: number
  bottom: number
  left: number
}

interface Props {
  padding: PaddingValues
  onUpdate: (padding: PaddingValues) => void
  onClose: () => void
}

const PRESETS = [
  { label: 'None', value: 0 },
  { label: 'S', value: 8 },
  { label: 'M', value: 16 },
  { label: 'L', value: 24 },
] as const

export default function TextPaddingPanel({ padding, onUpdate, onClose }: Props) {
  const [equalMode, setEqualMode] = useState(
    padding.top === padding.right &&
      padding.right === padding.bottom &&
      padding.bottom === padding.left
  )

  const handleChange = (side: keyof PaddingValues, value: number) => {
    const clamped = Math.max(0, Math.min(100, value))
    if (equalMode) {
      onUpdate({ top: clamped, right: clamped, bottom: clamped, left: clamped })
    } else {
      onUpdate({ ...padding, [side]: clamped })
    }
  }

  const applyPreset = (value: number) => {
    onUpdate({ top: value, right: value, bottom: value, left: value })
  }

  const toggleEqualMode = () => {
    const next = !equalMode
    setEqualMode(next)
    if (next) {
      onUpdate({ top: padding.top, right: padding.top, bottom: padding.top, left: padding.top })
    }
  }

  return (
    <div className="w-64 bg-slate-800 border border-slate-700 rounded-xl shadow-xl p-3 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-white text-sm font-medium">Text Padding</span>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white p-0.5 rounded hover:bg-slate-700 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Visual diagram */}
      <div className="flex items-center justify-center">
        <div className="relative w-36 h-28 border-2 border-dashed border-slate-500 rounded-lg flex items-center justify-center">
          {/* Top */}
          <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] text-blue-400">
            {padding.top}px
          </span>
          {/* Right */}
          <span className="absolute top-1/2 -right-7 -translate-y-1/2 text-[10px] text-blue-400">
            {padding.right}px
          </span>
          {/* Bottom */}
          <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] text-blue-400">
            {padding.bottom}px
          </span>
          {/* Left */}
          <span className="absolute top-1/2 -left-7 -translate-y-1/2 text-[10px] text-blue-400">
            {padding.left}px
          </span>
          {/* Inner box */}
          <div
            className="bg-blue-500/15 border border-blue-500/40 rounded"
            style={{
              width: `${Math.max(20, 120 - padding.left - padding.right)}px`,
              height: `${Math.max(12, 96 - padding.top - padding.bottom)}px`,
            }}
          />
        </div>
      </div>

      {/* Inputs */}
      <div className="grid grid-cols-2 gap-2">
        {(['top', 'right', 'bottom', 'left'] as const).map((side) => (
          <div key={side} className="flex flex-col gap-0.5">
            <label className="text-slate-400 text-[10px] uppercase tracking-wider">
              {side}
            </label>
            <input
              type="number"
              min={0}
              max={100}
              value={padding[side]}
              onChange={(e) => handleChange(side, parseInt(e.target.value) || 0)}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-2 py-1 text-white text-sm outline-none focus:border-blue-500 transition-colors"
            />
          </div>
        ))}
      </div>

      {/* Equal toggle */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={equalMode}
          onChange={toggleEqualMode}
          className="w-3.5 h-3.5 rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
        />
        <span className="text-slate-300 text-xs">Equal padding</span>
      </label>

      {/* Presets */}
      <div>
        <span className="text-slate-400 text-xs mb-1.5 block">Presets</span>
        <div className="flex gap-1.5">
          {PRESETS.map((preset) => (
            <button
              key={preset.label}
              onClick={() => applyPreset(preset.value)}
              className={`flex-1 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                padding.top === preset.value &&
                padding.right === preset.value &&
                padding.bottom === preset.value &&
                padding.left === preset.value
                  ? 'border-blue-500 bg-blue-500/20 text-white'
                  : 'border-slate-600 bg-slate-700/50 text-slate-300 hover:border-slate-500'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
