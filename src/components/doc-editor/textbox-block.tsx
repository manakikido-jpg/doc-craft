'use client'

import { useRef, useEffect, useState } from 'react'

interface Props {
  content: string
  data?: Record<string, string>
  onUpdate: (content: string) => void
  onUpdateData?: (data: Record<string, string>) => void
}

const _BORDER_STYLES = [
  { value: 'solid', label: '実線' },
  { value: 'dashed', label: '破線' },
  { value: 'dotted', label: '点線' },
  { value: 'double', label: '二重線' },
  { value: 'none', label: 'なし' },
]

const PRESETS = [
  { label: '標準', border: '1px solid #475569', bg: 'transparent', radius: '8px', shadow: 'none', padding: '16px' },
  {
    label: 'カード',
    border: '1px solid #334155',
    bg: 'rgba(30,41,59,0.5)',
    radius: '12px',
    shadow: '0 4px 12px rgba(0,0,0,0.3)',
    padding: '20px',
  },
  {
    label: 'アクセント',
    border: '2px solid #6366f1',
    bg: 'rgba(99,102,241,0.05)',
    radius: '8px',
    shadow: 'none',
    padding: '16px',
  },
  {
    label: '警告',
    border: '2px solid #f59e0b',
    bg: 'rgba(245,158,11,0.05)',
    radius: '8px',
    shadow: 'none',
    padding: '16px',
  },
  {
    label: '成功',
    border: '2px solid #22c55e',
    bg: 'rgba(34,197,94,0.05)',
    radius: '8px',
    shadow: 'none',
    padding: '16px',
  },
  {
    label: 'エレガント',
    border: 'none',
    bg: 'linear-gradient(135deg,rgba(99,102,241,0.1),rgba(168,85,247,0.1))',
    radius: '16px',
    shadow: '0 8px 32px rgba(0,0,0,0.2)',
    padding: '24px',
  },
  {
    label: '引用風',
    border: 'none',
    bg: 'transparent',
    radius: '0',
    shadow: 'none',
    padding: '16px 16px 16px 24px',
    extra: 'borderLeft:4px solid #6366f1',
  },
  {
    label: 'メモ',
    border: '1px dashed #94a3b8',
    bg: 'rgba(241,245,249,0.05)',
    radius: '8px',
    shadow: 'none',
    padding: '16px',
  },
]

export default function TextboxBlock({ content, data, onUpdate, onUpdateData }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [showPresets, setShowPresets] = useState(false)

  const border = data?.border || '1px solid #475569'
  const bg = data?.bg || 'transparent'
  const radius = data?.radius || '8px'
  const shadow = data?.shadow || 'none'
  const padding = data?.padding || '16px'
  const textAlign = data?.textAlign || 'left'

  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== content) {
      ref.current.innerHTML = content
    }
  }, [content])

  function applyPreset(preset: (typeof PRESETS)[number]) {
    const result: Record<string, string> = {
      border: preset.border,
      bg: preset.bg,
      radius: preset.radius,
      shadow: preset.shadow,
      padding: preset.padding,
    }
    if (preset.extra) result.extra = preset.extra
    onUpdateData?.(result)
    setShowPresets(false)
  }

  const extraStyle: React.CSSProperties = {}
  if (data?.extra) {
    data.extra.split(';').forEach((s) => {
      const [k, v] = s.split(':')
      if (k && v) (extraStyle as Record<string, string>)[k.trim()] = v.trim()
    })
  }

  return (
    <div className="my-3 group relative">
      {/* Preset selector */}
      <div className="absolute -top-7 left-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 z-10">
        <div className="relative">
          <button
            onClick={() => setShowPresets(!showPresets)}
            className="text-[10px] px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            スタイル ▾
          </button>
          {showPresets && (
            <div className="absolute top-full mt-1 left-0 bg-slate-900 border border-slate-700 rounded-lg shadow-xl py-1 z-50 w-32">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    applyPreset(p)
                  }}
                  className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={() =>
            onUpdateData?.({ textAlign: textAlign === 'center' ? 'right' : textAlign === 'right' ? 'left' : 'center' })
          }
          className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400 hover:text-white transition-colors"
        >
          {textAlign === 'center' ? '中央' : textAlign === 'right' ? '右' : '左'}
        </button>
      </div>

      <div
        style={{
          border,
          background: bg,
          borderRadius: radius,
          boxShadow: shadow,
          padding,
          textAlign: textAlign as 'left' | 'center' | 'right',
          ...extraStyle,
        }}
      >
        <div
          ref={ref}
          contentEditable
          suppressContentEditableWarning
          className="focus:outline-none text-slate-300 text-base leading-7 min-h-[2em]"
          data-placeholder="テキストボックスに入力..."
          onBlur={(e) => onUpdate(e.currentTarget.innerHTML)}
        />
      </div>
    </div>
  )
}
