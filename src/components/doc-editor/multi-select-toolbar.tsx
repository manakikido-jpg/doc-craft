'use client'

import { useState, useRef, useEffect } from 'react'
import { Trash2, ArrowUp, ArrowDown, ChevronDown } from 'lucide-react'
import type { BlockType } from '@/types'

const TYPE_OPTIONS: { type: BlockType; label: string }[] = [
  { type: 'paragraph', label: '段落' },
  { type: 'h1', label: '見出し 1' },
  { type: 'h2', label: '見出し 2' },
  { type: 'h3', label: '見出し 3' },
  { type: 'bullet', label: '箇条書き' },
  { type: 'numbered', label: '番号付き' },
  { type: 'quote', label: '引用' },
  { type: 'checklist', label: 'チェック' },
]

interface Props {
  count: number
  onDelete: () => void
  onChangeType: (type: BlockType) => void
  onMoveUp: () => void
  onMoveDown: () => void
}

export default function MultiSelectToolbar({ count, onDelete, onChangeType, onMoveUp, onMoveDown }: Props) {
  const [typeOpen, setTypeOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!typeOpen) return
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setTypeOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [typeOpen])

  return (
    <div className="fixed bottom-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl px-4 py-2 animate-slide-up">
      <span className="text-xs text-slate-400 mr-2">{count}個選択中</span>

      <button
        onClick={onDelete}
        className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
        title="選択を削除"
      >
        <Trash2 size={12} />
        削除
      </button>

      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setTypeOpen(!typeOpen)}
          className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
          title="タイプを変更"
        >
          タイプ変更
          <ChevronDown size={10} />
        </button>
        {typeOpen && (
          <div className="absolute bottom-full mb-1 left-0 bg-slate-900 border border-slate-700 rounded-lg shadow-xl py-1 w-32 z-50">
            {TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.type}
                onClick={() => {
                  onChangeType(opt.type)
                  setTypeOpen(false)
                }}
                className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={onMoveUp}
        className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
        title="上に移動"
      >
        <ArrowUp size={12} />
      </button>

      <button
        onClick={onMoveDown}
        className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
        title="下に移動"
      >
        <ArrowDown size={12} />
      </button>
    </div>
  )
}
