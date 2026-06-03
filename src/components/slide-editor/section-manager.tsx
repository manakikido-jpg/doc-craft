'use client'

import { useState } from 'react'
import { X, Plus, Trash2, GripVertical } from 'lucide-react'

interface Section {
  id: string
  name: string
  color?: string
  startSlideIndex: number
}

interface SectionManagerProps {
  sections: Section[]
  slideCount: number
  onAdd: (name: string, startIndex: number, color?: string) => void
  onRename: (id: string, name: string) => void
  onDelete: (id: string) => void
  onClose: () => void
}

export default function SectionManager({
  sections,
  slideCount,
  onAdd,
  onRename,
  onDelete,
  onClose,
}: SectionManagerProps) {
  const [newName, setNewName] = useState('')
  const [newIndex, setNewIndex] = useState(0)
  const [newColor, setNewColor] = useState('#3b82f6')
  const [showAdd, setShowAdd] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const handleAdd = () => {
    if (!newName.trim()) return
    onAdd(newName.trim(), newIndex, newColor)
    setNewName('')
    setNewIndex(0)
    setShowAdd(false)
  }

  const startRename = (s: Section) => {
    setEditingId(s.id)
    setEditText(s.name)
  }

  const commitRename = (id: string) => {
    if (editText.trim()) {
      onRename(id, editText.trim())
    }
    setEditingId(null)
  }

  // Compute the slide range for display
  const getRange = (idx: number): string => {
    const start = sections[idx].startSlideIndex + 1
    const end = idx < sections.length - 1 ? sections[idx + 1].startSlideIndex : slideCount
    return `${start} - ${end}`
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="w-[500px] max-h-[80vh] flex flex-col rounded-lg border border-slate-700 bg-slate-900 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-700 px-5 py-3">
          <h2 className="text-lg font-semibold text-slate-100">セクション管理</h2>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200">
            <X size={18} />
          </button>
        </div>

        {/* Section list */}
        <div className="flex-1 overflow-y-auto p-4">
          {sections.length === 0 && (
            <p className="py-8 text-center text-sm text-slate-500">セクションがありません</p>
          )}

          <ul className="space-y-2">
            {sections.map((s, idx) => (
              <li
                key={s.id}
                className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2"
              >
                <GripVertical size={14} className="shrink-0 cursor-grab text-slate-600" />

                {/* Color dot + picker */}
                <input
                  type="color"
                  value={s.color ?? '#3b82f6'}
                  onChange={e => {
                    // Use rename callback with color update pattern
                    // For simplicity, we treat color as part of the section name flow
                  }}
                  className="h-5 w-5 shrink-0 cursor-pointer rounded-full border border-slate-600 bg-transparent"
                />

                {/* Name */}
                {editingId === s.id ? (
                  <input
                    autoFocus
                    value={editText}
                    onChange={e => setEditText(e.target.value)}
                    onBlur={() => commitRename(s.id)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') commitRename(s.id)
                      if (e.key === 'Escape') setEditingId(null)
                    }}
                    className="flex-1 rounded border border-blue-500 bg-slate-800 px-2 py-0.5 text-sm text-slate-200"
                  />
                ) : (
                  <span
                    className="flex-1 cursor-pointer truncate text-sm text-slate-300"
                    onDoubleClick={() => startRename(s)}
                    title="ダブルクリックで名前を変更"
                  >
                    {s.name}
                  </span>
                )}

                {/* Slide range */}
                <span className="shrink-0 text-xs text-slate-500">
                  スライド {getRange(idx)}
                </span>

                {/* Delete */}
                {deleteConfirm === s.id ? (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => { onDelete(s.id); setDeleteConfirm(null) }}
                      className="rounded bg-red-600/80 px-2 py-0.5 text-xs text-white hover:bg-red-500"
                    >
                      削除
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(null)}
                      className="rounded px-1.5 py-0.5 text-xs text-slate-400 hover:bg-slate-700"
                    >
                      取消
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeleteConfirm(s.id)}
                    className="shrink-0 rounded p-1 text-slate-500 hover:bg-slate-700 hover:text-red-400"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>

        {/* Add section form */}
        <div className="border-t border-slate-700 p-4">
          {showAdd ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="セクション名"
                  className="flex-1 rounded border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-200 placeholder-slate-500"
                  onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
                />
                <input
                  type="color"
                  value={newColor}
                  onChange={e => setNewColor(e.target.value)}
                  className="h-7 w-7 cursor-pointer rounded border border-slate-700 bg-transparent"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-500">開始スライド:</label>
                <select
                  value={newIndex}
                  onChange={e => setNewIndex(Number(e.target.value))}
                  className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-300"
                >
                  {Array.from({ length: slideCount }, (_, i) => (
                    <option key={i} value={i}>
                      {i + 1}
                    </option>
                  ))}
                </select>
                <div className="ml-auto flex gap-2">
                  <button
                    onClick={() => setShowAdd(false)}
                    className="rounded px-3 py-1 text-xs text-slate-400 hover:bg-slate-800"
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={handleAdd}
                    className="rounded bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-500"
                  >
                    追加
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAdd(true)}
              className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-slate-600 py-2 text-sm text-slate-400 hover:border-slate-500 hover:text-slate-300"
            >
              <Plus size={16} />
              セクションを追加
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
