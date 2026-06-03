'use client'

import { Minus, Plus, X } from 'lucide-react'

interface Props {
  bulletType: string
  indentLevel: number
  onChangeBullet: (type: string) => void
  onChangeIndent: (level: number) => void
  onClose: () => void
}

const BULLET_STYLES = [
  { value: 'none', label: 'None', preview: 'Aa' },
  { value: 'disc', label: 'Disc', preview: '●' },
  { value: 'circle', label: 'Circle', preview: '○' },
  { value: 'square', label: 'Square', preview: '■' },
] as const

const NUMBERED_STYLES = [
  { value: 'decimal', label: 'Decimal', preview: '1.' },
  { value: 'alpha', label: 'Alpha', preview: 'a.' },
  { value: 'roman', label: 'Roman', preview: 'i.' },
] as const

function getPreviewText(type: string): string {
  switch (type) {
    case 'disc':
      return '● Item one\n● Item two\n● Item three'
    case 'circle':
      return '○ Item one\n○ Item two\n○ Item three'
    case 'square':
      return '■ Item one\n■ Item two\n■ Item three'
    case 'decimal':
      return '1. Item one\n2. Item two\n3. Item three'
    case 'alpha':
      return 'a. Item one\nb. Item two\nc. Item three'
    case 'roman':
      return 'i. Item one\nii. Item two\niii. Item three'
    default:
      return 'Item one\nItem two\nItem three'
  }
}

export default function TextBulletPanel({
  bulletType,
  indentLevel,
  onChangeBullet,
  onChangeIndent,
  onClose,
}: Props) {
  return (
    <div className="w-64 bg-slate-800 border border-slate-700 rounded-xl shadow-xl p-3 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-white text-sm font-medium">List Style</span>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white p-0.5 rounded hover:bg-slate-700 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Bullet styles */}
      <div>
        <span className="text-slate-400 text-xs mb-1.5 block">Bullets</span>
        <div className="grid grid-cols-4 gap-1.5">
          {BULLET_STYLES.map((style) => (
            <button
              key={style.value}
              onClick={() => onChangeBullet(style.value)}
              className={`flex items-center justify-center h-9 rounded-lg border text-sm transition-all ${
                bulletType === style.value
                  ? 'border-blue-500 bg-blue-500/20 text-white ring-1 ring-blue-500/30'
                  : 'border-slate-600 bg-slate-700/50 text-slate-300 hover:border-slate-500'
              }`}
              title={style.label}
            >
              {style.preview}
            </button>
          ))}
        </div>
      </div>

      {/* Numbered styles */}
      <div>
        <span className="text-slate-400 text-xs mb-1.5 block">Numbered</span>
        <div className="grid grid-cols-3 gap-1.5">
          {NUMBERED_STYLES.map((style) => (
            <button
              key={style.value}
              onClick={() => onChangeBullet(style.value)}
              className={`flex items-center justify-center h-9 rounded-lg border text-sm transition-all ${
                bulletType === style.value
                  ? 'border-blue-500 bg-blue-500/20 text-white ring-1 ring-blue-500/30'
                  : 'border-slate-600 bg-slate-700/50 text-slate-300 hover:border-slate-500'
              }`}
              title={style.label}
            >
              {style.preview}
            </button>
          ))}
        </div>
      </div>

      {/* Indent level */}
      <div>
        <span className="text-slate-400 text-xs mb-1.5 block">
          Indent Level: {indentLevel}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onChangeIndent(Math.max(0, indentLevel - 1))}
            disabled={indentLevel === 0}
            className="p-1.5 rounded-lg border border-slate-600 bg-slate-700/50 text-slate-300 hover:border-slate-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all"
              style={{ width: `${(indentLevel / 5) * 100}%` }}
            />
          </div>
          <button
            onClick={() => onChangeIndent(Math.min(5, indentLevel + 1))}
            disabled={indentLevel === 5}
            className="p-1.5 rounded-lg border border-slate-600 bg-slate-700/50 text-slate-300 hover:border-slate-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Preview */}
      <div>
        <span className="text-slate-400 text-xs mb-1.5 block">Preview</span>
        <div
          className="bg-slate-900 rounded-lg border border-slate-700 p-2.5 text-xs text-slate-300 whitespace-pre-line leading-relaxed"
          style={{ paddingLeft: `${indentLevel * 12 + 10}px` }}
        >
          {getPreviewText(bulletType)}
        </div>
      </div>
    </div>
  )
}
