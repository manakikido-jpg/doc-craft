'use client'

import { useState, useEffect } from 'react'
import { getVersions, deleteVersion, labelVersion, type VersionEntry } from '@/lib/version-history'
import { X, RotateCcw, Trash2, Tag, Clock } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
  docId: string
  onRestore: (versionId: string) => void
}

export default function VersionHistoryPanel({ open, onClose, docId, onRestore }: Props) {
  const [versions, setVersions] = useState<VersionEntry[]>([])
  const [editingLabel, setEditingLabel] = useState<string | null>(null)
  const [labelText, setLabelText] = useState('')

  useEffect(() => {
    if (open) setVersions(getVersions(docId))
  }, [open, docId])

  if (!open) return null

  function handleDelete(vId: string) {
    deleteVersion(docId, vId)
    setVersions(getVersions(docId))
  }

  function handleLabel(vId: string) {
    labelVersion(docId, vId, labelText)
    setVersions(getVersions(docId))
    setEditingLabel(null)
    setLabelText('')
  }

  function formatTime(iso: string) {
    const d = new Date(iso)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    if (diff < 60000) return 'たった今'
    if (diff < 3600000) return `${Math.floor(diff/60000)}分前`
    if (diff < 86400000) return `${Math.floor(diff/3600000)}時間前`
    return d.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="fixed right-0 top-0 bottom-0 w-80 bg-slate-900 border-l border-slate-700 shadow-2xl z-50 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-slate-700">
        <div className="flex items-center gap-2 text-white font-semibold text-sm">
          <Clock size={16} />
          バージョン履歴
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-white">
          <X size={18} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {versions.length === 0 ? (
          <p className="text-slate-500 text-xs text-center p-8">まだバージョンがありません</p>
        ) : (
          versions.map((v, i) => (
            <div key={v.id} className={`p-3 border-b border-slate-800 hover:bg-slate-800/50 ${i === 0 ? 'bg-slate-800/30' : ''}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-400">{formatTime(v.timestamp)}</span>
                {i === 0 && <span className="text-[10px] bg-indigo-600 text-white px-1.5 py-0.5 rounded">最新</span>}
              </div>
              {v.label && (
                <div className="text-xs text-indigo-400 font-medium mb-1 flex items-center gap-1">
                  <Tag size={10} />
                  {v.label}
                </div>
              )}
              <div className="text-xs text-slate-300 truncate mb-2">{v.title}</div>
              <div className="flex items-center gap-1">
                {i > 0 && (
                  <button
                    onClick={() => onRestore(v.id)}
                    className="text-[10px] px-2 py-0.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white"
                  >
                    復元
                  </button>
                )}
                <button
                  onClick={() => { setEditingLabel(v.id); setLabelText(v.label || '') }}
                  className="text-[10px] px-2 py-0.5 rounded text-slate-400 hover:bg-slate-700 hover:text-white"
                >
                  ラベル
                </button>
                <button
                  onClick={() => handleDelete(v.id)}
                  className="text-[10px] px-2 py-0.5 rounded text-red-400 hover:bg-slate-700"
                >
                  削除
                </button>
              </div>
              {editingLabel === v.id && (
                <div className="mt-2 flex gap-1">
                  <input
                    value={labelText}
                    onChange={e => setLabelText(e.target.value)}
                    className="flex-1 text-xs bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white"
                    placeholder="ラベル名..."
                    autoFocus
                    onKeyDown={e => { if (e.key === 'Enter') handleLabel(v.id) }}
                  />
                  <button onClick={() => handleLabel(v.id)} className="text-xs bg-indigo-600 text-white px-2 rounded">OK</button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
