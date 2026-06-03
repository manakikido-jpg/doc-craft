'use client'

import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { X } from 'lucide-react'
import type { Block } from '@/types'

interface Props {
  currentBlocks: Block[]
  currentTitle: string
  versions: { id: string; title: string; timestamp: string; data: string }[]
  onClose: () => void
}

function stripHtml(html: string): string {
  if (typeof document === 'undefined') return html.replace(/<[^>]*>/g, '')
  const tmp = document.createElement('div')
  tmp.innerHTML = html
  return tmp.textContent || ''
}

interface DiffBlock {
  type: 'same' | 'added' | 'removed' | 'changed'
  blockType: string
  leftContent: string
  rightContent: string
}

function computeDocDiff(oldBlocks: Block[], newBlocks: Block[]): DiffBlock[] {
  const result: DiffBlock[] = []
  const maxLen = Math.max(oldBlocks.length, newBlocks.length)

  for (let i = 0; i < maxLen; i++) {
    const oldB = oldBlocks[i]
    const newB = newBlocks[i]

    if (!oldB && newB) {
      result.push({
        type: 'added',
        blockType: newB.type,
        leftContent: '',
        rightContent: stripHtml(newB.content),
      })
    } else if (oldB && !newB) {
      result.push({
        type: 'removed',
        blockType: oldB.type,
        leftContent: stripHtml(oldB.content),
        rightContent: '',
      })
    } else if (oldB && newB) {
      const oldText = stripHtml(oldB.content)
      const newText = stripHtml(newB.content)
      if (oldText === newText && oldB.type === newB.type) {
        result.push({
          type: 'same',
          blockType: newB.type,
          leftContent: oldText,
          rightContent: newText,
        })
      } else {
        result.push({
          type: 'changed',
          blockType: newB.type,
          leftContent: oldText,
          rightContent: newText,
        })
      }
    }
  }

  return result
}

export default function DocumentCompare({ currentBlocks, currentTitle, versions, onClose }: Props) {
  const [selectedId, setSelectedId] = useState(versions[versions.length - 1]?.id || '')
  const leftRef = useRef<HTMLDivElement>(null)
  const rightRef = useRef<HTMLDivElement>(null)
  const [syncScroll, setSyncScroll] = useState(true)
  const scrolling = useRef(false)

  const oldBlocks = useMemo(() => {
    const ver = versions.find(v => v.id === selectedId)
    if (!ver) return []
    try {
      return JSON.parse(ver.data).blocks as Block[]
    } catch {
      return []
    }
  }, [selectedId, versions])

  const selectedVersion = versions.find(v => v.id === selectedId)

  const diff = useMemo(() => computeDocDiff(oldBlocks, currentBlocks), [oldBlocks, currentBlocks])

  const stats = useMemo(() => {
    let added = 0, removed = 0, changed = 0
    diff.forEach(d => {
      if (d.type === 'added') added++
      if (d.type === 'removed') removed++
      if (d.type === 'changed') changed++
    })
    return { added, removed, changed }
  }, [diff])

  // Sync scrolling
  const handleScroll = useCallback((source: 'left' | 'right') => {
    if (!syncScroll || scrolling.current) return
    scrolling.current = true
    const from = source === 'left' ? leftRef.current : rightRef.current
    const to = source === 'left' ? rightRef.current : leftRef.current
    if (from && to) {
      const ratio = from.scrollTop / (from.scrollHeight - from.clientHeight || 1)
      to.scrollTop = ratio * (to.scrollHeight - to.clientHeight)
    }
    requestAnimationFrame(() => { scrolling.current = false })
  }, [syncScroll])

  useEffect(() => {
    const left = leftRef.current
    const right = rightRef.current
    const onLeft = () => handleScroll('left')
    const onRight = () => handleScroll('right')
    left?.addEventListener('scroll', onLeft)
    right?.addEventListener('scroll', onRight)
    return () => {
      left?.removeEventListener('scroll', onLeft)
      right?.removeEventListener('scroll', onRight)
    }
  }, [handleScroll])

  const getBlockTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      h1: 'H1', h2: 'H2', h3: 'H3', paragraph: '段落',
      bullet: '箇条書き', numbered: '番号', quote: '引用',
      code: 'コード', divider: '区切り', image: '画像',
    }
    return labels[type] || type
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-[1000px] max-w-[95vw] max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
          <h2 className="text-sm font-medium text-white">文書の比較</h2>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-[10px] text-slate-400 cursor-pointer">
              <input
                type="checkbox"
                checked={syncScroll}
                onChange={e => setSyncScroll(e.target.checked)}
                className="accent-indigo-500 w-3 h-3"
              />
              同期スクロール
            </label>
            <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={16} /></button>
          </div>
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
            <span className="text-yellow-400">~{stats.changed} 変更</span>
          </div>
        </div>

        {/* Side-by-side view */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left panel: old version */}
          <div className="flex-1 flex flex-col border-r border-slate-700">
            <div className="px-3 py-1.5 bg-slate-800/50 border-b border-slate-800 text-[10px] text-slate-400 font-medium">
              {selectedVersion?.title || '(バージョン)'} - {selectedVersion ? new Date(selectedVersion.timestamp).toLocaleString('ja-JP') : ''}
            </div>
            <div ref={leftRef} className="flex-1 overflow-y-auto p-4 space-y-1">
              {diff.map((d, i) => (
                <div key={i} className={`flex items-start gap-2 px-2 py-1.5 rounded text-xs ${
                  d.type === 'removed' ? 'bg-red-500/10 border-l-2 border-red-500' :
                  d.type === 'changed' ? 'bg-yellow-500/5 border-l-2 border-yellow-500' :
                  d.type === 'added' ? 'opacity-20' :
                  ''
                }`}>
                  <span className="text-[8px] text-slate-600 font-mono w-6 flex-shrink-0 text-right mt-0.5">
                    {d.leftContent ? getBlockTypeLabel(d.blockType) : ''}
                  </span>
                  <span className={`flex-1 ${
                    d.type === 'removed' ? 'text-red-300 line-through' :
                    d.type === 'changed' ? 'text-yellow-300' :
                    d.type === 'added' ? 'text-slate-600' :
                    'text-slate-400'
                  }`}>
                    {d.leftContent || (d.type === 'added' ? '(なし)' : '')}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Right panel: current version */}
          <div className="flex-1 flex flex-col">
            <div className="px-3 py-1.5 bg-slate-800/50 border-b border-slate-800 text-[10px] text-slate-400 font-medium">
              {currentTitle || '現在のバージョン'} - 現在
            </div>
            <div ref={rightRef} className="flex-1 overflow-y-auto p-4 space-y-1">
              {diff.map((d, i) => (
                <div key={i} className={`flex items-start gap-2 px-2 py-1.5 rounded text-xs ${
                  d.type === 'added' ? 'bg-green-500/10 border-l-2 border-green-500' :
                  d.type === 'changed' ? 'bg-yellow-500/5 border-l-2 border-yellow-500' :
                  d.type === 'removed' ? 'opacity-20' :
                  ''
                }`}>
                  <span className="text-[8px] text-slate-600 font-mono w-6 flex-shrink-0 text-right mt-0.5">
                    {d.rightContent ? getBlockTypeLabel(d.blockType) : ''}
                  </span>
                  <span className={`flex-1 ${
                    d.type === 'added' ? 'text-green-300' :
                    d.type === 'changed' ? 'text-green-300' :
                    d.type === 'removed' ? 'text-slate-600' :
                    'text-slate-400'
                  }`}>
                    {d.rightContent || (d.type === 'removed' ? '(削除済み)' : '')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
