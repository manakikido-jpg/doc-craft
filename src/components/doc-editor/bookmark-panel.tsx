'use client'

import { useState } from 'react'
import { X, Plus, Bookmark, Trash2, ExternalLink } from 'lucide-react'
import type { Bookmark as BookmarkType, Block } from '@/types'

interface Props {
  bookmarks: BookmarkType[]
  blocks: Block[]
  focusedBlockId?: string | null
  onAdd: (name: string, blockId: string) => void
  onDelete: (id: string) => void
  onClose: () => void
}

export default function BookmarkPanel({ bookmarks, blocks, focusedBlockId, onAdd, onDelete, onClose }: Props) {
  const [newName, setNewName] = useState('')

  function handleAdd() {
    const name = newName.trim()
    if (!name) return
    const blockId = focusedBlockId || blocks[0]?.id
    if (!blockId) return
    if (bookmarks.some((b) => b.name === name)) {
      alert('同じ名前のブックマークが既に存在します。')
      return
    }
    onAdd(name, blockId)
    setNewName('')
  }

  function handleJump(blockId: string) {
    const el = document.querySelector(`[data-block-id="${blockId}"]`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      // Flash highlight
      el.classList.add('ring-2', 'ring-indigo-500/50')
      setTimeout(() => el.classList.remove('ring-2', 'ring-indigo-500/50'), 1500)
    }
  }

  function getBlockPreview(blockId: string): string {
    const block = blocks.find((b) => b.id === blockId)
    if (!block) return '(削除されたブロック)'
    const text = block.content.replace(/<[^>]*>/g, '').trim()
    return text.length > 30 ? text.slice(0, 30) + '...' : text || `[${block.type}]`
  }

  return (
    <div className="w-64 border-l border-slate-800 bg-slate-950 flex flex-col flex-shrink-0">
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800">
        <h3 className="text-sm font-medium text-white flex items-center gap-1.5">
          <Bookmark size={14} className="text-indigo-400" />
          ブックマーク
        </h3>
        <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
          <X size={14} />
        </button>
      </div>

      {/* Add bookmark */}
      <div className="flex items-center gap-1 p-2 border-b border-slate-800">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          className="flex-1 px-2 py-1 text-xs bg-slate-900 border border-slate-700 rounded text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          placeholder="ブックマーク名..."
        />
        <button
          onClick={handleAdd}
          className="w-6 h-6 flex items-center justify-center rounded bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
          title="追加"
        >
          <Plus size={12} />
        </button>
      </div>

      {focusedBlockId && (
        <div className="px-3 py-1 text-[10px] text-slate-500 border-b border-slate-800/50">
          現在のブロックにブックマークを追加
        </div>
      )}

      {/* Bookmark list */}
      <div className="flex-1 overflow-y-auto">
        {bookmarks.length === 0 ? (
          <div className="text-xs text-slate-500 p-3 text-center">ブックマークがありません</div>
        ) : (
          <div className="py-1">
            {bookmarks.map((bm) => (
              <div key={bm.id} className="flex items-center gap-1 px-3 py-1.5 hover:bg-slate-900/50 group">
                <Bookmark size={10} className="text-indigo-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-white truncate">{bm.name}</div>
                  <div className="text-[10px] text-slate-500 truncate">{getBlockPreview(bm.blockId)}</div>
                </div>
                <button
                  onClick={() => handleJump(bm.blockId)}
                  className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-500 hover:text-indigo-400 transition-all"
                  title="ジャンプ"
                >
                  <ExternalLink size={10} />
                </button>
                <button
                  onClick={() => onDelete(bm.id)}
                  className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-500 hover:text-red-400 transition-all"
                  title="削除"
                >
                  <Trash2 size={10} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
