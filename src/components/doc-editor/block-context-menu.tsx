'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Copy,
  ArrowUp,
  ArrowDown,
  Trash2,
  Square,
  Type,
  Paintbrush,
  Columns2,
  AlignVerticalSpaceAround,
  Space,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Palette,
} from 'lucide-react'
import type { Block } from '@/types'

interface Props {
  block: Block
  position: { x: number; y: number }
  onClose: () => void
  onDuplicate: (id: string) => void
  onMoveUp: (id: string) => void
  onMoveDown: (id: string) => void
  onDelete: (id: string) => void
  onSetBorder: (id: string, style: string, color?: string, width?: number) => void
  onSetDropCap: (id: string, dropCap: boolean) => void
  onSetTextColor: (id: string, color: string) => void
  onSetBgColor: (id: string, color: string) => void
  onSetColumns: (id: string, columns: 1 | 2 | 3) => void
  onSetLineSpacing?: (id: string, spacing: number) => void
  onSetParagraphSpacing?: (id: string, spacing: 'compact' | 'normal' | 'wide') => void
  onSetAlign?: (id: string, align: 'left' | 'center' | 'right' | 'justify') => void
}

const BORDER_OPTIONS = [
  { value: 'none', label: 'なし' },
  { value: 'solid', label: '実線' },
  { value: 'dashed', label: '破線' },
  { value: 'dotted', label: '点線' },
  { value: 'double', label: '二重線' },
]

const BG_COLORS = [
  'transparent',
  'rgba(99,102,241,0.08)',
  'rgba(34,197,94,0.08)',
  'rgba(245,158,11,0.08)',
  'rgba(239,68,68,0.08)',
  'rgba(168,85,247,0.08)',
  'rgba(6,182,212,0.08)',
  'rgba(30,41,59,0.5)',
]

const LINE_SPACING_OPTIONS = [
  { value: 1, label: '1.0 行' },
  { value: 1.15, label: '1.15 行' },
  { value: 1.5, label: '1.5 行' },
  { value: 2, label: '2.0 行' },
]

const PARAGRAPH_SPACING_OPTIONS = [
  { value: 'compact' as const, label: 'コンパクト' },
  { value: 'normal' as const, label: '標準' },
  { value: 'wide' as const, label: '広い' },
]

const TEXT_COLOR_OPTIONS = [
  '#ffffff',
  '#94a3b8',
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#6366f1',
]

export default function BlockContextMenu({
  block,
  position,
  onClose,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  onDelete,
  onSetBorder,
  onSetDropCap,
  onSetTextColor,
  onSetBgColor,
  onSetColumns,
  onSetLineSpacing,
  onSetParagraphSpacing,
  onSetAlign,
}: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [submenu, setSubmenu] = useState<string | null>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [onClose])

  const isTextBlock = ['paragraph', 'h1', 'h2', 'h3', 'bullet', 'numbered', 'quote'].includes(block.type)

  const menuStyle: React.CSSProperties = {
    position: 'fixed',
    top: position.y,
    left: position.x,
    zIndex: 100,
  }

  // Adjust if menu would go off screen
  if (position.x + 200 > window.innerWidth) menuStyle.left = position.x - 200
  if (position.y + 300 > window.innerHeight) menuStyle.top = position.y - 200

  return (
    <div
      ref={ref}
      className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-1.5 w-52 text-sm animate-scale-in"
      style={menuStyle}
    >
      {/* Duplicate */}
      <button
        onClick={() => {
          onDuplicate(block.id)
          onClose()
        }}
        className="w-full flex items-center gap-2.5 px-3 py-1.5 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
      >
        <Copy size={13} /> ブロックを複製
      </button>

      {/* Move */}
      <button
        onClick={() => {
          onMoveUp(block.id)
          onClose()
        }}
        className="w-full flex items-center gap-2.5 px-3 py-1.5 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
      >
        <ArrowUp size={13} /> 上に移動
      </button>
      <button
        onClick={() => {
          onMoveDown(block.id)
          onClose()
        }}
        className="w-full flex items-center gap-2.5 px-3 py-1.5 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
      >
        <ArrowDown size={13} /> 下に移動
      </button>

      <div className="h-px bg-slate-800 my-1" />

      {/* Border */}
      {isTextBlock && (
        <div className="relative" onMouseEnter={() => setSubmenu('border')} onMouseLeave={() => setSubmenu(null)}>
          <button className="w-full flex items-center justify-between gap-2.5 px-3 py-1.5 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors">
            <span className="flex items-center gap-2.5">
              <Square size={13} /> 枠線
            </span>
            <span className="text-slate-600">▸</span>
          </button>
          {submenu === 'border' && (
            <div className="absolute left-full top-0 ml-1 bg-slate-900 border border-slate-700 rounded-lg shadow-xl py-1 w-28 z-50">
              {BORDER_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    onSetBorder(block.id, opt.value)
                    onClose()
                  }}
                  className={`w-full text-left px-3 py-1 text-xs transition-colors ${block.borderStyle === opt.value ? 'text-indigo-400' : 'text-slate-300 hover:text-white hover:bg-slate-800'}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Background color */}
      {isTextBlock && (
        <div className="relative" onMouseEnter={() => setSubmenu('bg')} onMouseLeave={() => setSubmenu(null)}>
          <button className="w-full flex items-center justify-between gap-2.5 px-3 py-1.5 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors">
            <span className="flex items-center gap-2.5">
              <Paintbrush size={13} /> 背景色
            </span>
            <span className="text-slate-600">▸</span>
          </button>
          {submenu === 'bg' && (
            <div className="absolute left-full top-0 ml-1 bg-slate-900 border border-slate-700 rounded-lg shadow-xl p-2 z-50">
              <div className="flex flex-wrap gap-1 w-20">
                {BG_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => {
                      onSetBgColor(block.id, c === 'transparent' ? '' : c)
                      onClose()
                    }}
                    className="w-5 h-5 rounded border border-slate-600 hover:scale-110 transition-transform"
                    style={{
                      background:
                        c === 'transparent' ? 'repeating-conic-gradient(#334155 0 25%,transparent 0 50%) 0/8px 8px' : c,
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Text color */}
      {isTextBlock && (
        <div className="relative" onMouseEnter={() => setSubmenu('textcolor')} onMouseLeave={() => setSubmenu(null)}>
          <button className="w-full flex items-center justify-between gap-2.5 px-3 py-1.5 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors">
            <span className="flex items-center gap-2.5">
              <Palette size={13} /> テキスト色
            </span>
            <span className="text-slate-600">▸</span>
          </button>
          {submenu === 'textcolor' && (
            <div className="absolute left-full top-0 ml-1 bg-slate-900 border border-slate-700 rounded-lg shadow-xl p-2 z-50">
              <div className="flex flex-wrap gap-1 w-[110px]">
                {TEXT_COLOR_OPTIONS.map((c) => (
                  <button
                    key={c}
                    onClick={() => {
                      onSetTextColor(block.id, c)
                      onClose()
                    }}
                    className="w-5 h-5 rounded border border-slate-600 hover:scale-110 transition-transform"
                    style={{ background: c }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Alignment */}
      {isTextBlock && onSetAlign && (
        <div className="relative" onMouseEnter={() => setSubmenu('align')} onMouseLeave={() => setSubmenu(null)}>
          <button className="w-full flex items-center justify-between gap-2.5 px-3 py-1.5 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors">
            <span className="flex items-center gap-2.5">
              <AlignLeft size={13} /> 配置
            </span>
            <span className="text-slate-600">▸</span>
          </button>
          {submenu === 'align' && (
            <div className="absolute left-full top-0 ml-1 bg-slate-900 border border-slate-700 rounded-lg shadow-xl py-1 w-28 z-50">
              {[
                { v: 'left' as const, l: '左揃え', I: AlignLeft },
                { v: 'center' as const, l: '中央揃え', I: AlignCenter },
                { v: 'right' as const, l: '右揃え', I: AlignRight },
                { v: 'justify' as const, l: '両端揃え', I: AlignJustify },
              ].map(({ v, l, I }) => (
                <button
                  key={v}
                  onClick={() => {
                    onSetAlign(block.id, v)
                    onClose()
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-1 text-xs transition-colors ${block.align === v ? 'text-indigo-400' : 'text-slate-300 hover:text-white hover:bg-slate-800'}`}
                >
                  <I size={11} /> {l}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Drop cap */}
      {block.type === 'paragraph' && (
        <button
          onClick={() => {
            onSetDropCap(block.id, !block.dropCap)
            onClose()
          }}
          className="w-full flex items-center gap-2.5 px-3 py-1.5 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <Type size={13} />
          ドロップキャップ {block.dropCap ? '✓' : ''}
        </button>
      )}

      {/* Line spacing */}
      {isTextBlock && onSetLineSpacing && (
        <div className="relative" onMouseEnter={() => setSubmenu('line')} onMouseLeave={() => setSubmenu(null)}>
          <button className="w-full flex items-center justify-between gap-2.5 px-3 py-1.5 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors">
            <span className="flex items-center gap-2.5">
              <AlignVerticalSpaceAround size={13} /> 行間
            </span>
            <span className="text-slate-600">▸</span>
          </button>
          {submenu === 'line' && (
            <div className="absolute left-full top-0 ml-1 bg-slate-900 border border-slate-700 rounded-lg shadow-xl py-1 w-24 z-50">
              {LINE_SPACING_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    onSetLineSpacing(block.id, opt.value)
                    onClose()
                  }}
                  className={`w-full text-left px-3 py-1 text-xs transition-colors ${block.lineSpacing === opt.value ? 'text-indigo-400' : 'text-slate-300 hover:text-white hover:bg-slate-800'}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Paragraph spacing */}
      {isTextBlock && onSetParagraphSpacing && (
        <div className="relative" onMouseEnter={() => setSubmenu('para')} onMouseLeave={() => setSubmenu(null)}>
          <button className="w-full flex items-center justify-between gap-2.5 px-3 py-1.5 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors">
            <span className="flex items-center gap-2.5">
              <Space size={13} /> 段落間隔
            </span>
            <span className="text-slate-600">▸</span>
          </button>
          {submenu === 'para' && (
            <div className="absolute left-full top-0 ml-1 bg-slate-900 border border-slate-700 rounded-lg shadow-xl py-1 w-28 z-50">
              {PARAGRAPH_SPACING_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    onSetParagraphSpacing(block.id, opt.value)
                    onClose()
                  }}
                  className={`w-full text-left px-3 py-1 text-xs transition-colors ${block.paragraphSpacing === opt.value ? 'text-indigo-400' : 'text-slate-300 hover:text-white hover:bg-slate-800'}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Columns */}
      {isTextBlock && (
        <div className="relative" onMouseEnter={() => setSubmenu('cols')} onMouseLeave={() => setSubmenu(null)}>
          <button className="w-full flex items-center justify-between gap-2.5 px-3 py-1.5 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors">
            <span className="flex items-center gap-2.5">
              <Columns2 size={13} /> 段組み
            </span>
            <span className="text-slate-600">▸</span>
          </button>
          {submenu === 'cols' && (
            <div className="absolute left-full top-0 ml-1 bg-slate-900 border border-slate-700 rounded-lg shadow-xl py-1 w-20 z-50">
              {([1, 2, 3] as const).map((n) => (
                <button
                  key={n}
                  onClick={() => {
                    onSetColumns(block.id, n)
                    onClose()
                  }}
                  className={`w-full text-left px-3 py-1 text-xs transition-colors ${block.columns === n ? 'text-indigo-400' : 'text-slate-300 hover:text-white hover:bg-slate-800'}`}
                >
                  {n === 1 ? '1段' : `${n}段`}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="h-px bg-slate-800 my-1" />

      {/* Delete */}
      <button
        onClick={() => {
          onDelete(block.id)
          onClose()
        }}
        className="w-full flex items-center gap-2.5 px-3 py-1.5 text-red-400 hover:bg-red-500/10 transition-colors"
      >
        <Trash2 size={13} /> ブロックを削除
      </button>
    </div>
  )
}
