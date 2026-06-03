'use client'

import { X } from 'lucide-react'

interface Props {
  currentStyle: string
  onSelect: (style: string) => void
  onClose: () => void
}

const WORDART_STYLES = [
  {
    value: 'none',
    label: 'Plain',
    css: {} as React.CSSProperties,
  },
  {
    value: 'outline',
    label: 'Outline',
    css: {
      color: 'transparent',
      WebkitTextStroke: '1.5px #60a5fa',
    } as React.CSSProperties,
  },
  {
    value: 'glow',
    label: 'Glow',
    css: {
      color: '#e2e8f0',
      textShadow: '0 0 8px #3b82f6, 0 0 16px #3b82f6, 0 0 24px #1d4ed8',
    } as React.CSSProperties,
  },
  {
    value: 'shadow3d',
    label: '3D Shadow',
    css: {
      color: '#e2e8f0',
      textShadow:
        '1px 1px 0 #475569, 2px 2px 0 #475569, 3px 3px 0 #475569, 4px 4px 6px rgba(0,0,0,0.4)',
    } as React.CSSProperties,
  },
] as const

export default function WordartStylePicker({ currentStyle, onSelect, onClose }: Props) {
  return (
    <div className="w-64 bg-slate-800 border border-slate-700 rounded-xl shadow-xl p-3 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-white text-sm font-medium">Text Effect</span>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white p-0.5 rounded hover:bg-slate-700 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 2x2 Grid */}
      <div className="grid grid-cols-2 gap-2">
        {WORDART_STYLES.map((style) => (
          <button
            key={style.value}
            onClick={() => onSelect(style.value)}
            className={`flex flex-col items-center justify-center gap-1.5 h-20 rounded-lg border-2 transition-all ${
              currentStyle === style.value
                ? 'border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/30'
                : 'border-slate-600 bg-slate-700/40 hover:border-slate-500'
            }`}
          >
            <span
              className="text-xl font-bold select-none"
              style={
                style.value === 'none'
                  ? { color: '#e2e8f0' }
                  : style.css
              }
            >
              ABC
            </span>
            <span className="text-[10px] text-slate-400">{style.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
