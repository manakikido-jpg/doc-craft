'use client'

import type { Block } from '@/types'
import { X, FileText, ChevronRight } from 'lucide-react'

interface Props {
  blocks: Block[]
  onClose: () => void
}

export default function DocOutlinePanel({ blocks, onClose }: Props) {
  const headings = blocks.filter((b) => b.type === 'h1' || b.type === 'h2' || b.type === 'h3')
  const footnotes = blocks.filter((b) => b.type === 'footnote')
  const images = blocks.filter((b) => b.type === 'image' && b.data?.src)
  const tables = blocks.filter((b) => b.type === 'table')

  function scrollToBlock(id: string) {
    const el = document.querySelector(`[data-block-id="${id}"]`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  return (
    <div className="w-64 bg-slate-900 border-l border-slate-800 flex-shrink-0 overflow-y-auto h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
        <div className="flex items-center gap-2 text-white text-sm font-medium">
          <FileText size={14} />
          ドキュメント構成
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-white">
          <X size={16} />
        </button>
      </div>

      {/* Headings */}
      <div className="px-4 py-3 border-b border-slate-800">
        <p className="text-xs text-slate-500 font-medium mb-2 uppercase tracking-wider">見出し</p>
        {headings.length === 0 ? (
          <p className="text-xs text-slate-600">見出しなし</p>
        ) : (
          <div className="space-y-0.5">
            {headings.map((h) => (
              <button
                key={h.id}
                onClick={() => scrollToBlock(h.id)}
                className={`w-full text-left text-xs py-1 px-1 rounded hover:bg-slate-800 transition-colors flex items-center gap-1 ${
                  h.type === 'h1'
                    ? 'text-white font-medium'
                    : h.type === 'h2'
                      ? 'text-slate-300 pl-3'
                      : 'text-slate-400 pl-6'
                }`}
              >
                <ChevronRight size={10} className="flex-shrink-0 text-slate-600" />
                <span className="truncate">{h.content || '(空の見出し)'}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="px-4 py-3 border-b border-slate-800">
        <p className="text-xs text-slate-500 font-medium mb-2 uppercase tracking-wider">要素数</p>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-slate-800/50 rounded p-2 text-center">
            <div className="text-lg font-bold text-white">{blocks.length}</div>
            <div className="text-[10px] text-slate-500">ブロック</div>
          </div>
          <div className="bg-slate-800/50 rounded p-2 text-center">
            <div className="text-lg font-bold text-white">{headings.length}</div>
            <div className="text-[10px] text-slate-500">見出し</div>
          </div>
          <div className="bg-slate-800/50 rounded p-2 text-center">
            <div className="text-lg font-bold text-white">{images.length}</div>
            <div className="text-[10px] text-slate-500">画像</div>
          </div>
          <div className="bg-slate-800/50 rounded p-2 text-center">
            <div className="text-lg font-bold text-white">{tables.length}</div>
            <div className="text-[10px] text-slate-500">テーブル</div>
          </div>
        </div>
      </div>

      {/* Footnotes */}
      {footnotes.length > 0 && (
        <div className="px-4 py-3">
          <p className="text-xs text-slate-500 font-medium mb-2 uppercase tracking-wider">脚注 ({footnotes.length})</p>
          <div className="space-y-1">
            {footnotes.map((f, i) => (
              <button
                key={f.id}
                onClick={() => scrollToBlock(f.id)}
                className="w-full text-left text-xs text-slate-400 py-1 px-1 rounded hover:bg-slate-800 transition-colors truncate"
              >
                <span className="text-indigo-400 mr-1">[{i + 1}]</span>
                {f.content || '(空の脚注)'}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
