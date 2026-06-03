'use client'

import { X, Pen, Highlighter, Eraser } from 'lucide-react'

interface PenColorPickerProps {
  color: string
  strokeWidth: number
  tool: 'pen' | 'highlighter' | 'eraser'
  onColorChange: (color: string) => void
  onWidthChange: (width: number) => void
  onToolChange: (tool: 'pen' | 'highlighter' | 'eraser') => void
  onClose: () => void
}

const COLORS = [
  '#ef4444', '#3b82f6', '#22c55e', '#000000',
  '#ffffff', '#eab308', '#a855f7', '#f97316',
]

const TOOLS = [
  { key: 'pen' as const, label: 'ペン', Icon: Pen },
  { key: 'highlighter' as const, label: 'マーカー', Icon: Highlighter },
  { key: 'eraser' as const, label: '消しゴム', Icon: Eraser },
]

export default function PenColorPicker({
  color,
  strokeWidth,
  tool,
  onColorChange,
  onWidthChange,
  onToolChange,
  onClose,
}: PenColorPickerProps) {
  return (
    <div className="w-48 bg-slate-900/95 border border-slate-700 rounded-xl shadow-xl p-3 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-white text-xs font-medium">ペンツール</span>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white p-0.5 rounded hover:bg-slate-700 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Tool buttons */}
      <div className="flex gap-1">
        {TOOLS.map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => onToolChange(key)}
            className={`flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-lg text-[10px] transition-all ${
              tool === key
                ? 'bg-indigo-500/20 text-indigo-300 ring-1 ring-indigo-500'
                : 'bg-slate-700/40 text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
            title={label}
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Color swatches */}
      {tool !== 'eraser' && (
        <div className="grid grid-cols-4 gap-1.5">
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => onColorChange(c)}
              className={`w-8 h-8 rounded-full border-2 transition-all ${
                color === c ? 'border-white scale-110' : 'border-slate-600 hover:border-slate-400'
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      )}

      {/* Width slider */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-slate-400">太さ</span>
          <span className="text-[10px] text-slate-400">{strokeWidth}px</span>
        </div>
        <input
          type="range"
          min={1}
          max={10}
          value={strokeWidth}
          onChange={(e) => onWidthChange(Number(e.target.value))}
          className="w-full h-1 accent-indigo-500"
        />
      </div>

      {/* Preview line */}
      <div className="flex items-center justify-center h-6 bg-slate-800 rounded">
        <svg width="100%" height="100%" className="overflow-visible">
          <line
            x1="16"
            y1="12"
            x2="176"
            y2="12"
            stroke={tool === 'eraser' ? '#94a3b8' : color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            opacity={tool === 'highlighter' ? 0.4 : 1}
          />
        </svg>
      </div>
    </div>
  )
}
