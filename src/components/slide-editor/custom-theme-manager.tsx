'use client'

import { useState, useEffect } from 'react'
import { X, Plus, Trash2, Check } from 'lucide-react'
import { getCustomThemes, saveCustomTheme, deleteCustomTheme, type CustomThemeEntry } from '@/lib/custom-themes'
import type { SlideTheme } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  currentTheme: Partial<SlideTheme>
  onApply: (theme: Partial<SlideTheme>) => void
}

export default function CustomThemeManager({ open, onClose, currentTheme, onApply }: Props) {
  const [themes, setThemes] = useState<CustomThemeEntry[]>([])
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) setThemes(getCustomThemes())
  }, [open])

  if (!open) return null

  function handleSave() {
    if (!newName.trim()) return
    const entry = saveCustomTheme(newName.trim(), currentTheme)
    setThemes(prev => [...prev, entry])
    setNewName('')
    setSaving(false)
  }

  function handleDelete(id: string) {
    deleteCustomTheme(id)
    setThemes(prev => prev.filter(t => t.id !== id))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="w-[480px] max-h-[80vh] flex flex-col rounded-lg border border-slate-700 bg-slate-900 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-700 px-5 py-3">
          <h2 className="text-lg font-semibold text-slate-100">カスタムテーマ</h2>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* Save current as custom */}
          {saving ? (
            <div className="flex items-center gap-2 p-3 rounded-lg border border-indigo-500/30 bg-slate-800/50">
              <input
                autoFocus
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSave()}
                placeholder="テーマ名を入力..."
                className="flex-1 bg-transparent text-sm text-slate-100 outline-none placeholder-slate-500"
              />
              <button onClick={handleSave} className="rounded px-3 py-1 text-xs bg-indigo-600 text-white hover:bg-indigo-500">保存</button>
              <button onClick={() => setSaving(false)} className="text-xs text-slate-400 hover:text-slate-200">取消</button>
            </div>
          ) : (
            <button
              onClick={() => setSaving(true)}
              className="w-full flex items-center gap-2 p-3 rounded-lg border border-dashed border-slate-600 text-sm text-slate-400 hover:bg-slate-800 hover:text-slate-200 hover:border-slate-500 transition"
            >
              <Plus size={16} /> 現在のテーマを保存
            </button>
          )}

          {/* Saved themes */}
          {themes.length === 0 && !saving && (
            <p className="text-center text-sm text-slate-500 py-6">保存されたカスタムテーマはありません</p>
          )}
          {themes.map(entry => (
            <div key={entry.id} className="flex items-center gap-3 p-3 rounded-lg border border-slate-700 hover:bg-slate-800/50 group">
              {/* Preview swatch */}
              <div
                className="w-12 h-8 rounded border border-slate-600 flex-shrink-0"
                style={{ background: entry.theme.background || '#0f172a' }}
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm text-slate-200 truncate">{entry.name}</div>
                <div className="text-[10px] text-slate-500">{new Date(entry.createdAt).toLocaleDateString('ja-JP')}</div>
              </div>
              <button
                onClick={() => { onApply(entry.theme); onClose() }}
                className="rounded px-2 py-1 text-xs text-indigo-400 hover:bg-indigo-600/20 opacity-0 group-hover:opacity-100 transition"
              >
                <Check size={14} />
              </button>
              <button
                onClick={() => handleDelete(entry.id)}
                className="rounded p-1 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
