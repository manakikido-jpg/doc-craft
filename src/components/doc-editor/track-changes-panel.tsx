'use client'

import { Check, X, CheckCheck, XCircle, GitCompare } from 'lucide-react'
import type { TrackChange } from '@/types'

interface Props {
  changes: TrackChange[]
  enabled: boolean
  onToggle: () => void
  onAccept: (id: string) => void
  onReject: (id: string) => void
  onAcceptAll: () => void
  onRejectAll: () => void
}

function formatDate(ts: string) {
  const d = new Date(ts)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${m}/${day} ${h}:${min}`
}

function truncate(s: string, len: number) {
  if (!s) return '(空)'
  // Strip HTML
  const tmp = typeof document !== 'undefined' ? (() => { const d = document.createElement('div'); d.innerHTML = s; return d.textContent || '' })() : s.replace(/<[^>]*>/g, '')
  return tmp.length > len ? tmp.slice(0, len) + '…' : tmp
}

export default function TrackChangesPanel({ changes, enabled, onToggle, onAccept, onReject, onAcceptAll, onRejectAll }: Props) {
  const pending = changes.filter((c) => !c.accepted)
  const accepted = changes.filter((c) => c.accepted)

  return (
    <div className="h-full flex flex-col bg-slate-900 border-l border-slate-800 w-72">
      <div className="p-3 border-b border-slate-800 flex items-center justify-between">
        <h3 className="text-sm font-medium text-white flex items-center gap-1.5">
          <GitCompare size={14} />
          変更履歴
        </h3>
        <button
          onClick={onToggle}
          className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
            enabled
              ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
              : 'border-slate-700 text-slate-500 hover:text-slate-300'
          }`}
        >
          {enabled ? '追跡中' : '追跡オフ'}
        </button>
      </div>

      {pending.length > 0 && (
        <div className="p-2 border-b border-slate-800 flex gap-2">
          <button
            onClick={onAcceptAll}
            className="flex-1 text-[10px] py-1 rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 flex items-center justify-center gap-1"
          >
            <CheckCheck size={10} /> すべて承認
          </button>
          <button
            onClick={onRejectAll}
            className="flex-1 text-[10px] py-1 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 flex items-center justify-center gap-1"
          >
            <XCircle size={10} /> すべて却下
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {pending.length === 0 && accepted.length === 0 && (
          <div className="p-4 text-center text-slate-500 text-xs">
            {enabled ? '変更を追跡中です。編集すると変更履歴が記録されます。' : '変更履歴はありません。「追跡」をオンにすると変更が記録されます。'}
          </div>
        )}

        {pending.length > 0 && (
          <div className="p-2">
            <div className="text-[10px] text-slate-500 mb-1.5 font-medium">未処理 ({pending.length})</div>
            {pending.map((c) => (
              <div key={c.id} className="mb-2 p-2 bg-slate-800/50 rounded-lg border border-slate-700/50">
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                    c.type === 'insert' ? 'bg-emerald-500/10 text-emerald-400' :
                    c.type === 'delete' ? 'bg-red-500/10 text-red-400' :
                    'bg-blue-500/10 text-blue-400'
                  }`}>
                    {c.type === 'insert' ? '挿入' : c.type === 'delete' ? '削除' : '変更'}
                  </span>
                  <span className="text-[9px] text-slate-600">{formatDate(c.timestamp)}</span>
                </div>
                {c.type === 'modify' && c.oldContent && (
                  <div className="text-[10px] text-red-400/60 line-through mb-0.5">{truncate(c.oldContent, 40)}</div>
                )}
                {c.newContent && (
                  <div className="text-[10px] text-slate-300 mb-1.5">{truncate(c.newContent, 40)}</div>
                )}
                <div className="flex gap-1.5">
                  <button
                    onClick={() => onAccept(c.id)}
                    className="flex-1 text-[10px] py-0.5 rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 flex items-center justify-center gap-0.5"
                  >
                    <Check size={10} /> 承認
                  </button>
                  <button
                    onClick={() => onReject(c.id)}
                    className="flex-1 text-[10px] py-0.5 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 flex items-center justify-center gap-0.5"
                  >
                    <X size={10} /> 却下
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {accepted.length > 0 && (
          <div className="p-2">
            <div className="text-[10px] text-slate-500 mb-1.5 font-medium">承認済み ({accepted.length})</div>
            {accepted.slice(-10).map((c) => (
              <div key={c.id} className="mb-1 p-1.5 rounded text-[10px] text-slate-600">
                <span className={c.type === 'insert' ? 'text-emerald-600' : c.type === 'delete' ? 'text-red-600' : 'text-blue-600'}>
                  {c.type === 'insert' ? '挿入' : c.type === 'delete' ? '削除' : '変更'}
                </span>
                {' '}{truncate(c.newContent || c.oldContent || '', 30)} — {formatDate(c.timestamp)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
