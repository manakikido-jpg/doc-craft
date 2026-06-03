'use client'

import { useState } from 'react'
import { X, AlignVerticalJustifyStart, AlignVerticalJustifyCenter, AlignVerticalJustifyEnd, AlignLeft, AlignCenter, AlignRight } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
  textContent?: string
  textColor?: string
  textFontSize?: number
  textAlign?: 'left' | 'center' | 'right'
  textVertical?: 'top' | 'middle' | 'bottom'
  cornerRadius?: number
  onUpdate: (props: {
    textContent?: string
    textColor?: string
    textFontSize?: number
    textAlign?: string
    textVertical?: string
    cornerRadius?: number
  }) => void
}

export default function ShapeTextEditor({ open, onClose, textContent, textColor, textFontSize, textAlign, textVertical, cornerRadius, onUpdate }: Props) {
  const [text, setText] = useState(textContent || '')

  if (!open) return null

  return (
    <div className="fixed right-4 top-32 z-50 w-56 rounded-lg border border-slate-700 bg-slate-900 shadow-2xl">
      <div className="flex items-center justify-between border-b border-slate-700 px-3 py-2">
        <h3 className="text-xs font-semibold text-slate-200">図形テキスト</h3>
        <button onClick={onClose} className="rounded p-0.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200">
          <X size={14} />
        </button>
      </div>

      <div className="p-3 space-y-3">
        {/* Text input */}
        <div>
          <label className="text-[10px] text-slate-500 mb-1 block">テキスト</label>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            onBlur={() => onUpdate({ textContent: text })}
            rows={2}
            placeholder="テキストを入力..."
            className="w-full rounded border border-slate-700 bg-slate-800 px-2 py-1.5 text-xs text-slate-100 outline-none focus:border-indigo-500 resize-none"
          />
        </div>

        {/* Font size */}
        <div>
          <label className="text-[10px] text-slate-500 mb-1 block">フォントサイズ</label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={8}
              max={48}
              value={textFontSize || 16}
              onChange={e => onUpdate({ textFontSize: Number(e.target.value) })}
              className="flex-1 accent-indigo-500"
            />
            <span className="text-xs text-slate-300 w-8 text-right">{textFontSize || 16}px</span>
          </div>
        </div>

        {/* Text color */}
        <div>
          <label className="text-[10px] text-slate-500 mb-1 block">文字色</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={textColor || '#ffffff'}
              onChange={e => onUpdate({ textColor: e.target.value })}
              className="h-6 w-6 rounded border border-slate-700 bg-transparent cursor-pointer"
            />
            <span className="text-[10px] text-slate-500 font-mono">{textColor || '#ffffff'}</span>
          </div>
        </div>

        {/* Horizontal alignment */}
        <div>
          <label className="text-[10px] text-slate-500 mb-1 block">水平位置</label>
          <div className="flex gap-1">
            {(['left', 'center', 'right'] as const).map(a => (
              <button
                key={a}
                onClick={() => onUpdate({ textAlign: a })}
                className={`flex-1 p-1.5 rounded transition ${
                  (textAlign || 'center') === a ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {a === 'left' && <AlignLeft size={13} className="mx-auto" />}
                {a === 'center' && <AlignCenter size={13} className="mx-auto" />}
                {a === 'right' && <AlignRight size={13} className="mx-auto" />}
              </button>
            ))}
          </div>
        </div>

        {/* Vertical alignment */}
        <div>
          <label className="text-[10px] text-slate-500 mb-1 block">垂直位置</label>
          <div className="flex gap-1">
            {([
              { key: 'top', label: '上' },
              { key: 'middle', label: '中央' },
              { key: 'bottom', label: '下' },
            ] as const).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => onUpdate({ textVertical: key })}
                className={`flex-1 p-1.5 rounded text-[10px] transition ${
                  (textVertical || 'middle') === key ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Corner radius (for rect shapes) */}
        {cornerRadius !== undefined && (
          <div>
            <label className="text-[10px] text-slate-500 mb-1 block">角丸</label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={0}
                max={50}
                value={cornerRadius}
                onChange={e => onUpdate({ cornerRadius: Number(e.target.value) })}
                className="flex-1 accent-indigo-500"
              />
              <span className="text-xs text-slate-300 w-8 text-right">{cornerRadius}px</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
