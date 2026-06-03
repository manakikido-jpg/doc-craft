'use client'

import { useState, useMemo } from 'react'
import { X } from 'lucide-react'
import type { Block } from '@/types'

interface Props {
  currentBlocks: Block[]
  versions: { id: string; title: string; timestamp: string; data: string }[]
  onClose: () => void
}

function stripHtml(html: string): string {
  const tmp = document.createElement('div')
  tmp.innerHTML = html
  return tmp.textContent || ''
}

function computeDiff(oldBlocks: Block[], newBlocks: Block[]): { type: 'added' | 'removed' | 'modified' | 'same'; oldText?: string; newText?: string }[] {
  const result: { type: 'added' | 'removed' | 'modified' | 'same'; oldText?: string; newText?: string }[] = []
  const maxLen = Math.max(oldBlocks.length, newBlocks.length)
  for (let i = 0; i < maxLen; i++) {
    const oldB = oldBlocks[i]
    const newB = newBlocks[i]
    if (!oldB && newB) {
      result.push({ type: 'added', newText: stripHtml(newB.content) })
    } else if (oldB && !newB) {
      result.push({ type: 'removed', oldText: stripHtml(oldB.content) })
    } else if (oldB && newB) {
      const oldText = stripHtml(oldB.content)
      const newText = stripHtml(newB.content)
      if (oldText === newText && oldB.type === newB.type) {
        result.push({ type: 'same', oldText, newText })
      } else {
        result.push({ type: 'modified', oldText, newText })
      }
    }
  }
  return result
}

export default function VersionCompareModal({ currentBlocks, versions, onClose }: Props) {
  const [selectedVersionId, setSelectedVersionId] = useState(versions[versions.length - 1]?.id || '')

  const oldBlocks = useMemo(() => {
    const ver = versions.find(v => v.id === selectedVersionId)
    if (!ver) return []
    try {
      return JSON.parse(ver.data).blocks as Block[]
    } catch { return [] }
  }, [selectedVersionId, versions])

  const diff = useMemo(() => computeDiff(oldBlocks, currentBlocks), [oldBlocks, currentBlocks])

  const stats = useMemo(() => {
    let added = 0, removed = 0, modified = 0
    diff.forEach(d => { if (d.type === 'added') added++; if (d.type === 'removed') removed++; if (d.type === 'modified') modified++ })
    return { added, removed, modified }
  }, [diff])

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-[700px] max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
          <h2 className="text-sm font-medium text-white">文書の比較</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={16} /></button>
        </div>

        <div className="px-4 py-2 border-b border-slate-800 flex items-center gap-3">
          <label className="text-xs text-slate-400">比較対象:</label>
          <select
            value={selectedVersionId}
            onChange={e => setSelectedVersionId(e.target.value)}
            className="text-xs bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white focus:outline-none"
          >
            {versions.map(v => (
              <option key={v.id} value={v.id}>
                {v.title} ({new Date(v.timestamp).toLocaleString('ja-JP')})
              </option>
            ))}
          </select>
          <div className="ml-auto flex items-center gap-3 text-[10px]">
            <span className="text-green-400">+{stats.added} 追加</span>
            <span className="text-red-400">−{stats.removed} 削除</span>
            <span className="text-yellow-400">~{stats.modified} 変更</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          {diff.length === 0 && <p className="text-xs text-slate-500">比較するバージョンを選択してください</p>}
          {diff.map((d, i) => (
            <div key={i} className={`px-3 py-1.5 rounded text-xs font-mono ${
              d.type === 'added' ? 'bg-green-500/10 text-green-300 border-l-2 border-green-500' :
              d.type === 'removed' ? 'bg-red-500/10 text-red-300 border-l-2 border-red-500 line-through' :
              d.type === 'modified' ? 'bg-yellow-500/10 text-yellow-300 border-l-2 border-yellow-500' :
              'text-slate-500'
            }`}>
              {d.type === 'removed' ? d.oldText || '(空)' :
               d.type === 'modified' ? (
                <div>
                  <div className="line-through text-red-400/60">{d.oldText || '(空)'}</div>
                  <div className="text-green-300">{d.newText || '(空)'}</div>
                </div>
               ) : (d.newText || d.oldText || '(空)')}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
