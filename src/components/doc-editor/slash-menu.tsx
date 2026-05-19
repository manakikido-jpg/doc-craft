'use client'

import { useEffect, useRef } from 'react'
import {
  ImageIcon,
  Globe,
  Table,
  Minus,
  List,
  FileText,
  AlertCircle,
  CheckSquare,
  Hash,
  Calculator,
  Pencil,
  TextSelect,
  Columns2,
  PenTool,
  BookOpen,
} from 'lucide-react'
import type { BlockType } from '@/types'

const BLOCK_OPTIONS: { type: BlockType; label: string; desc: string; icon: React.ReactNode }[] = [
  { type: 'h1', label: '見出し 1', desc: 'H1 大見出し', icon: 'H1' },
  { type: 'h2', label: '見出し 2', desc: 'H2 中見出し', icon: 'H2' },
  { type: 'h3', label: '見出し 3', desc: 'H3 小見出し', icon: 'H3' },
  { type: 'paragraph', label: '段落', desc: '通常のテキスト', icon: '¶' },
  { type: 'bullet', label: '箇条書き', desc: '箇条書きリスト', icon: '•' },
  { type: 'numbered', label: '番号付きリスト', desc: '番号付きリスト', icon: '1.' },
  { type: 'quote', label: '引用', desc: '引用テキスト', icon: '"' },
  { type: 'divider', label: '区切り線', desc: '水平線', icon: <Minus size={14} /> },
  { type: 'image', label: '画像', desc: '画像をアップロード', icon: <ImageIcon size={14} /> },
  { type: 'code', label: 'コードブロック', desc: 'コードを表示', icon: '</>' },
  { type: 'table', label: 'テーブル', desc: '表を作成', icon: <Table size={14} /> },
  { type: 'embed', label: '埋め込み', desc: 'YouTube, Figma等', icon: <Globe size={14} /> },
  { type: 'toc', label: '目次', desc: '見出しから自動生成', icon: <List size={14} /> },
  { type: 'page-break', label: '改ページ', desc: 'ページ区切り', icon: <FileText size={14} /> },
  { type: 'callout', label: 'コールアウト', desc: '注意書き・補足', icon: <AlertCircle size={14} /> },
  { type: 'checklist', label: 'チェックリスト', desc: 'ToDo管理', icon: <CheckSquare size={14} /> },
  { type: 'footnote', label: '脚注', desc: '注釈・参照', icon: <Hash size={14} /> },
  { type: 'math', label: '数式', desc: 'LaTeX風の数式', icon: <Calculator size={14} /> },
  { type: 'drawing', label: '描画', desc: '線・矢印・図形・手書き', icon: <Pencil size={14} /> },
  { type: 'textbox', label: 'テキストボックス', desc: '装飾付きテキスト枠', icon: <TextSelect size={14} /> },
  { type: 'columns', label: '段組み', desc: '2段・3段レイアウト', icon: <Columns2 size={14} /> },
  { type: 'signature', label: '署名欄', desc: '署名・捺印用', icon: <PenTool size={14} /> },
  { type: 'cover-page', label: '表紙', desc: 'テンプレート表紙', icon: <BookOpen size={14} /> },
]

interface Props {
  onSelect: (type: BlockType) => void
  onClose: () => void
  position: { top: number; left: number }
}

export default function SlashMenu({ onSelect, onClose, position }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  return (
    <div
      ref={ref}
      className="fixed z-50 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-1 w-56 text-sm max-h-80 overflow-y-auto animate-slide-up"
      style={{ top: position.top, left: position.left }}
    >
      <div className="px-3 py-1 text-slate-500 text-xs font-medium">ブロックを挿入</div>
      {BLOCK_OPTIONS.map((opt) => (
        <button
          key={opt.type}
          onMouseDown={(e) => {
            e.preventDefault()
            onSelect(opt.type)
          }}
          className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
        >
          <span className="w-7 h-7 rounded-md bg-slate-800 flex items-center justify-center text-xs font-mono text-slate-400 flex-shrink-0">
            {opt.icon}
          </span>
          <div className="text-left">
            <div className="text-sm text-white leading-tight">{opt.label}</div>
            <div className="text-xs text-slate-500 leading-tight">{opt.desc}</div>
          </div>
        </button>
      ))}
    </div>
  )
}
