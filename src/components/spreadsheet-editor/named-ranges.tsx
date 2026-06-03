'use client'

import { useState } from 'react'
import { X, Plus, Trash2, Navigation } from 'lucide-react'

export interface NamedRange {
  name: string
  range: string // e.g., "Sheet1!A1:B10"
  sheetId: string
}

interface Props {
  open: boolean
  onClose: () => void
  namedRanges: NamedRange[]
  onAdd: (name: string, range: string) => void
  onDelete: (name: string) => void
  onNavigate: (range: string) => void
}

export default function NamedRangesManager({ open, onClose, namedRanges, onAdd, onDelete, onNavigate }: Props) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newRange, setNewRange] = useState('')
  const [error, setError] = useState('')

  if (!open) return null

  const handleAdd = () => {
    const trimmedName = newName.trim()
    const trimmedRange = newRange.trim()

    if (!trimmedName) {
      setError('名前を入力してください')
      return
    }
    if (!trimmedRange) {
      setError('範囲を入力してください')
      return
    }
    if (namedRanges.some((nr) => nr.name === trimmedName)) {
      setError('この名前は既に使われています')
      return
    }
    // Basic validation: should look like A1:B10 or Sheet1!A1:B10
    const rangePattern = /^([A-Za-z0-9_]+!)?[A-Z]+\d+(:[A-Z]+\d+)?$/i
    if (!rangePattern.test(trimmedRange)) {
      setError('無効な範囲形式です (例: A1:B10)')
      return
    }

    onAdd(trimmedName, trimmedRange.toUpperCase())
    setNewName('')
    setNewRange('')
    setShowAddForm(false)
    setError('')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-[400px] max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-700">
          <h3 className="text-sm font-semibold text-white">名前付き範囲</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {namedRanges.length === 0 && !showAddForm && (
            <p className="text-xs text-slate-500 text-center py-6">
              名前付き範囲がありません
            </p>
          )}

          {namedRanges.map((nr) => (
            <div
              key={nr.name}
              className="flex items-center gap-2 px-3 py-2 bg-slate-800 rounded-lg hover:bg-slate-750 group"
            >
              <div className="flex-1 min-w-0">
                <div className="text-xs text-white font-medium truncate">{nr.name}</div>
                <div className="text-[10px] text-slate-400 truncate">{nr.range}</div>
              </div>
              <button
                onClick={() => onNavigate(nr.range)}
                className="w-6 h-6 flex items-center justify-center text-slate-500 hover:text-indigo-400 transition-colors opacity-0 group-hover:opacity-100"
                title="移動"
              >
                <Navigation size={12} />
              </button>
              <button
                onClick={() => onDelete(nr.name)}
                className="w-6 h-6 flex items-center justify-center text-slate-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                title="削除"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}

          {/* Add form */}
          {showAddForm && (
            <div className="p-3 bg-slate-800 rounded-lg space-y-2 border border-slate-600">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">名前</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => { setNewName(e.target.value); setError('') }}
                  placeholder="例: 売上データ"
                  className="w-full h-7 px-2 text-xs bg-slate-900 text-white border border-slate-600 rounded outline-none focus:border-indigo-500"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAdd()
                    if (e.key === 'Escape') { setShowAddForm(false); setError('') }
                  }}
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">範囲</label>
                <input
                  type="text"
                  value={newRange}
                  onChange={(e) => { setNewRange(e.target.value); setError('') }}
                  placeholder="例: A1:B10"
                  className="w-full h-7 px-2 text-xs bg-slate-900 text-white border border-slate-600 rounded outline-none focus:border-indigo-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAdd()
                    if (e.key === 'Escape') { setShowAddForm(false); setError('') }
                  }}
                />
              </div>
              {error && <p className="text-[10px] text-red-400">{error}</p>}
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => { setShowAddForm(false); setError('') }}
                  className="px-3 py-1 text-xs text-slate-400 hover:text-white rounded hover:bg-slate-700"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleAdd}
                  className="px-3 py-1 text-xs text-white bg-indigo-600 hover:bg-indigo-500 rounded"
                >
                  追加
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-700">
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-indigo-400 hover:text-indigo-300 hover:bg-slate-800 rounded transition-colors"
            disabled={showAddForm}
          >
            <Plus size={12} />
            新しい範囲を追加
          </button>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs text-slate-400 hover:text-white rounded hover:bg-slate-700 transition-colors"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  )
}
