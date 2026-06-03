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
  if (typeof document === 'undefined') return html.replace(/<[^>]*>/g, '')
  const tmp = document.createElement('div')
  tmp.innerHTML = html
  return tmp.textContent || ''
}

/** Simple word-level diff between two strings */
function wordDiff(oldText: string, newText: string): { type: 'same' | 'added' | 'removed'; text: string }[] {
  const oldWords = oldText.split(/(\s+)/)
  const newWords = newText.split(/(\s+)/)

  // LCS-based diff
  const m = oldWords.length
  const n = newWords.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldWords[i - 1] === newWords[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
      }
    }
  }

  // Backtrack
  const result: { type: 'same' | 'added' | 'removed'; text: string }[] = []
  let i = m, j = n
  const temp: typeof result = []

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldWords[i - 1] === newWords[j - 1]) {
      temp.push({ type: 'same', text: oldWords[i - 1] })
      i--
      j--
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      temp.push({ type: 'added', text: newWords[j - 1] })
      j--
    } else {
      temp.push({ type: 'removed', text: oldWords[i - 1] })
      i--
    }
  }

  temp.reverse()

  // Merge consecutive same-type entries
  for (const entry of temp) {
    if (result.length > 0 && result[result.length - 1].type === entry.type) {
      result[result.length - 1].text += entry.text
    } else {
      result.push({ ...entry })
    }
  }

  return result
}

interface DiffLine {
  type: 'same' | 'added' | 'removed' | 'modified'
  oldText?: string
  newText?: string
  diff?: { type: 'same' | 'added' | 'removed'; text: string }[]
}

function computeBlockDiff(oldBlocks: Block[], newBlocks: Block[]): DiffLine[] {
  const result: DiffLine[] = []
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
        result.push({
          type: 'modified',
          oldText,
          newText,
          diff: wordDiff(oldText, newText),
        })
      }
    }
  }
  return result
}

export default function VersionDiffModal({ currentBlocks, versions, onClose }: Props) {
  const [selectedId, setSelectedId] = useState(versions[versions.length - 1]?.id || '')

  const oldBlocks = useMemo(() => {
    const ver = versions.find(v => v.id === selectedId)
    if (!ver) return []
    try {
      return JSON.parse(ver.data).blocks as Block[]
    } catch {
      return []
    }
  }, [selectedId, versions])

  const diff = useMemo(() => computeBlockDiff(oldBlocks, currentBlocks), [oldBlocks, currentBlocks])

  const stats = useMemo(() => {
    let added = 0, removed = 0, modified = 0
    diff.forEach(d => {
      if (d.type === 'added') added++
      if (d.type === 'removed') removed++
      if (d.type === 'modified') modified++
    })
    return { added, removed, modified }
  }, [diff])

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-[900px] max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
          <h2 className="text-sm font-medium text-white">バージョン差分表示</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={16} /></button>
        </div>

        {/* Controls */}
        <div className="px-4 py-2 border-b border-slate-800 flex items-center gap-3">
          <label className="text-xs text-slate-400">比較対象:</label>
          <select
            value={selectedId}
            onChange={e => setSelectedId(e.target.value)}
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
            <span className="text-red-400">-{stats.removed} 削除</span>
            <span className="text-yellow-400">~{stats.modified} 変更</span>
          </div>
        </div>

        {/* Side-by-side diff view */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 divide-x divide-slate-700">
            {/* Left: old version */}
            <div className="p-4">
              <div className="text-[10px] text-slate-500 font-medium mb-2 uppercase tracking-wider">以前のバージョン</div>
              <div className="space-y-1">
                {diff.map((d, i) => (
                  <div key={i} className={`px-2 py-1 rounded text-xs ${
                    d.type === 'removed' ? 'bg-red-500/10 text-red-300' :
                    d.type === 'modified' ? 'bg-yellow-500/5' :
                    d.type === 'added' ? 'opacity-30' :
                    'text-slate-400'
                  }`}>
                    {d.type === 'added' ? (
                      <span className="text-slate-600 italic">(なし)</span>
                    ) : d.type === 'modified' && d.diff ? (
                      <span>
                        {d.diff.map((part, pi) => (
                          <span key={pi} className={
                            part.type === 'removed' ? 'bg-red-500/30 text-red-300 line-through' :
                            part.type === 'added' ? 'hidden' :
                            'text-slate-300'
                          }>
                            {part.text}
                          </span>
                        ))}
                      </span>
                    ) : (
                      d.oldText || d.newText || ''
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Right: new version */}
            <div className="p-4">
              <div className="text-[10px] text-slate-500 font-medium mb-2 uppercase tracking-wider">現在のバージョン</div>
              <div className="space-y-1">
                {diff.map((d, i) => (
                  <div key={i} className={`px-2 py-1 rounded text-xs ${
                    d.type === 'added' ? 'bg-green-500/10 text-green-300' :
                    d.type === 'modified' ? 'bg-yellow-500/5' :
                    d.type === 'removed' ? 'opacity-30' :
                    'text-slate-400'
                  }`}>
                    {d.type === 'removed' ? (
                      <span className="text-slate-600 italic">(削除済み)</span>
                    ) : d.type === 'modified' && d.diff ? (
                      <span>
                        {d.diff.map((part, pi) => (
                          <span key={pi} className={
                            part.type === 'added' ? 'bg-green-500/30 text-green-300' :
                            part.type === 'removed' ? 'hidden' :
                            'text-slate-300'
                          }>
                            {part.text}
                          </span>
                        ))}
                      </span>
                    ) : (
                      d.newText || d.oldText || ''
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
