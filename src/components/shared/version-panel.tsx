'use client'

import { useState, useMemo } from 'react'
import { History, RotateCcw, X, Eye, ChevronLeft } from 'lucide-react'
import type { VersionSnapshot } from '@/types'
import { useToast } from '@/components/shared/toast'

interface Props {
  versions: VersionSnapshot[]
  onRestore: (versionId: string) => void
  onClose: () => void
  currentData?: string
}

function computeDiff(oldText: string, newText: string): { type: 'same' | 'add' | 'remove'; text: string }[] {
  const oldLines = oldText.split('\n')
  const newLines = newText.split('\n')
  const result: { type: 'same' | 'add' | 'remove'; text: string }[] = []
  let oi = 0,
    ni = 0
  while (oi < oldLines.length || ni < newLines.length) {
    if (oi < oldLines.length && ni < newLines.length && oldLines[oi] === newLines[ni]) {
      result.push({ type: 'same', text: oldLines[oi] })
      oi++
      ni++
    } else if (ni < newLines.length && (oi >= oldLines.length || !oldLines.slice(oi).includes(newLines[ni]))) {
      result.push({ type: 'add', text: newLines[ni] })
      ni++
    } else {
      result.push({ type: 'remove', text: oldLines[oi] })
      oi++
    }
  }
  return result
}

function extractText(data: string): string {
  try {
    const parsed = JSON.parse(data)
    const blocks = parsed.blocks || parsed.slides || []
    if (Array.isArray(blocks)) {
      return blocks
        .map((b: { content?: string; elements?: { content?: string }[] }) => {
          if (b.content) return b.content
          if (b.elements) return b.elements.map((e) => e.content || '').join('\n')
          return ''
        })
        .filter(Boolean)
        .join('\n')
    }
  } catch (e) { console.warn('Failed to extract version preview text:', e) }
  return data
}

export default function VersionPanel({ versions, onRestore, onClose, currentData }: Props) {
  const { confirm } = useToast()
  const [diffView, setDiffView] = useState<string | null>(null)

  function formatTime(iso: string) {
    try {
      const d = new Date(iso)
      return d.toLocaleDateString('ja-JP', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    } catch {
      return ''
    }
  }

  const diffResult = useMemo(() => {
    if (!diffView) return null
    const ver = versions.find((v) => v.id === diffView)
    if (!ver) return null
    const oldText = extractText(ver.data)
    const newText = currentData ? extractText(currentData) : ''
    return computeDiff(oldText, newText)
  }, [diffView, versions, currentData])

  if (diffView && diffResult) {
    const ver = versions.find((v) => v.id === diffView)
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />
        <div className="relative bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg mx-4 shadow-2xl overflow-hidden animate-scale-in">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
            <button
              onClick={() => setDiffView(null)}
              className="text-slate-400 hover:text-white flex items-center gap-1 text-xs"
            >
              <ChevronLeft size={14} /> 戻る
            </button>
            <h3 className="text-sm font-semibold text-white">差分: {ver?.title} → 現在</h3>
            <button
              onClick={onClose}
              className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto p-4 font-mono text-xs space-y-0.5">
            {diffResult.map((line, i) => (
              <div
                key={i}
                className={`px-2 py-0.5 rounded ${
                  line.type === 'add'
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : line.type === 'remove'
                      ? 'bg-red-500/10 text-red-400 line-through'
                      : 'text-slate-500'
                }`}
              >
                <span className="inline-block w-4 text-slate-600 select-none">
                  {line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' '}
                </span>
                {line.text || ' '}
              </div>
            ))}
            {diffResult.length === 0 && <p className="text-slate-500 text-center py-8">変更なし</p>}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm mx-4 shadow-2xl overflow-hidden animate-scale-in">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <h3 className="text-sm font-semibold text-white flex items-center gap-1.5">
            <History size={15} className="text-slate-400" /> バージョン履歴
          </h3>
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="閉じる"
          >
            <X size={16} />
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto p-4 space-y-2">
          {versions.length === 0 ? (
            <p className="text-slate-500 text-xs text-center py-8">
              バージョンはありません。
              <br />
              ツールバーの保存ボタンでスナップショットを作成できます。
            </p>
          ) : (
            [...versions].reverse().map((ver) => (
              <div
                key={ver.id}
                className="flex items-center justify-between p-3 rounded-lg border border-slate-700 bg-slate-800/50 hover:bg-slate-800 transition-colors"
              >
                <div>
                  <div className="text-sm text-white font-medium">{ver.title}</div>
                  <div className="text-xs text-slate-400">{formatTime(ver.timestamp)}</div>
                </div>
                <div className="flex items-center gap-1">
                  {currentData && (
                    <button
                      onClick={() => setDiffView(ver.id)}
                      className="text-xs text-slate-400 hover:text-cyan-400 px-1.5 py-1 rounded hover:bg-cyan-500/10 transition-colors flex items-center gap-0.5"
                      title="差分を表示"
                    >
                      <Eye size={11} />
                    </button>
                  )}
                  <button
                    onClick={async () => {
                      if (await confirm('このバージョンに復元しますか？現在の変更は失われます。')) {
                        onRestore(ver.id)
                        onClose()
                      }
                    }}
                    className="text-xs text-indigo-400 hover:text-indigo-300 px-2 py-1 rounded hover:bg-indigo-500/10 transition-colors flex items-center gap-1"
                  >
                    <RotateCcw size={11} /> 復元
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
