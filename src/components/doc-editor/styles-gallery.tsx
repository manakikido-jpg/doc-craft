'use client'

import type { BlockType } from '@/types'

interface Props {
  currentType: BlockType
  onChangeType: (type: BlockType) => void
}

const STYLES: { type: BlockType; label: string; preview: string }[] = [
  { type: 'paragraph', label: '標準', preview: 'text-sm text-slate-300' },
  { type: 'h1', label: '見出し 1', preview: 'text-lg font-bold text-white' },
  { type: 'h2', label: '見出し 2', preview: 'text-base font-semibold text-white' },
  { type: 'h3', label: '見出し 3', preview: 'text-sm font-medium text-white' },
  { type: 'quote', label: '引用', preview: 'text-sm italic text-slate-400 border-l-2 border-indigo-500 pl-2' },
  { type: 'bullet', label: '箇条書き', preview: 'text-sm text-slate-300' },
  { type: 'numbered', label: '番号付き', preview: 'text-sm text-slate-300' },
  { type: 'code', label: 'コード', preview: 'text-sm font-mono text-emerald-400' },
  { type: 'callout', label: 'コールアウト', preview: 'text-sm text-blue-400' },
  { type: 'checklist', label: 'チェック', preview: 'text-sm text-slate-300' },
  { type: 'footnote', label: '脚注', preview: 'text-xs text-slate-400' },
]

export default function StylesGallery({ currentType, onChangeType }: Props) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto py-1 px-2 no-scrollbar">
      {STYLES.map((s) => (
        <button
          key={s.type}
          onClick={() => onChangeType(s.type)}
          className={`flex-shrink-0 px-2.5 py-1 rounded border text-xs transition-colors ${
            currentType === s.type
              ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400'
              : 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-white'
          }`}
        >
          <span className={s.preview}>{s.label}</span>
        </button>
      ))}
    </div>
  )
}
