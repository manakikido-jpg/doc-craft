'use client'

import { useState } from 'react'
import { MessageSquare, Check, Trash2, ChevronDown, ChevronRight, X, Reply, Send } from 'lucide-react'
import type { Comment } from '@/types'

interface Props {
  comments: Comment[]
  onAdd: (text: string, parentId?: string) => void
  onResolve: (id: string) => void
  onDelete: (id: string) => void
  onClose: () => void
}

export default function CommentPanel({ comments, onAdd, onResolve, onDelete, onClose }: Props) {
  const [input, setInput] = useState('')
  const [showResolved, setShowResolved] = useState(false)
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [replyInput, setReplyInput] = useState('')

  // Top-level comments (no parentId)
  const topLevel = comments.filter((c) => !c.parentId)
  const active = topLevel.filter((c) => !c.resolved)
  const resolved = topLevel.filter((c) => c.resolved)
  const displayed = showResolved ? topLevel : active

  // Get replies for a comment
  function getReplies(parentId: string) {
    return comments.filter((c) => c.parentId === parentId)
  }

  function handleSubmit() {
    if (!input.trim()) return
    onAdd(input.trim())
    setInput('')
  }

  function handleReply(parentId: string) {
    if (!replyInput.trim()) return
    onAdd(replyInput.trim(), parentId)
    setReplyInput('')
    setReplyTo(null)
  }

  function formatTime(iso: string) {
    try {
      const d = new Date(iso)
      return d.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    } catch {
      return ''
    }
  }

  return (
    <aside className="w-72 border-l border-slate-800 bg-slate-950 flex flex-col flex-shrink-0 no-print">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
        <h3 className="text-sm font-semibold text-white flex items-center gap-1.5">
          <MessageSquare size={14} className="text-slate-400" /> コメント ({active.length})
        </h3>
        <button
          onClick={onClose}
          className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          aria-label="閉じる"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {resolved.length > 0 && (
          <button
            onClick={() => setShowResolved(!showResolved)}
            className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1"
          >
            {showResolved ? <ChevronDown size={12} /> : <ChevronRight size={12} />} 解決済み ({resolved.length})
          </button>
        )}

        {displayed.length === 0 && <p className="text-slate-500 text-xs text-center py-8">コメントはありません</p>}

        {displayed.map((c) => {
          const replies = getReplies(c.id)
          return (
            <div
              key={c.id}
              className={`rounded-lg border text-sm ${
                c.resolved ? 'border-slate-800 bg-slate-900/50 opacity-60' : 'border-slate-700 bg-slate-800/50'
              }`}
            >
              <div className="p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-indigo-400">{c.author}</span>
                  <span className="text-[10px] text-slate-500">{formatTime(c.createdAt)}</span>
                </div>
                <p className="text-slate-300 text-sm leading-relaxed">{c.text}</p>
                <div className="flex gap-2 mt-2">
                  {!c.resolved && (
                    <>
                      <button
                        onClick={() => onResolve(c.id)}
                        className="text-[10px] text-emerald-400 hover:text-emerald-300 flex items-center gap-0.5"
                      >
                        <Check size={10} /> 解決
                      </button>
                      <button
                        onClick={() => setReplyTo(replyTo === c.id ? null : c.id)}
                        className="text-[10px] text-slate-400 hover:text-indigo-400 flex items-center gap-0.5"
                      >
                        <Reply size={10} /> 返信
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => onDelete(c.id)}
                    className="text-[10px] text-slate-500 hover:text-red-400 flex items-center gap-0.5 ml-auto"
                  >
                    <Trash2 size={10} />
                  </button>
                </div>
              </div>

              {/* Replies */}
              {replies.length > 0 && (
                <div className="border-t border-slate-700/50 pl-4 bg-slate-900/30">
                  {replies.map((r) => (
                    <div key={r.id} className="p-2 border-b border-slate-800/50 last:border-b-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[10px] font-medium text-cyan-400">{r.author}</span>
                        <span className="text-[9px] text-slate-600">{formatTime(r.createdAt)}</span>
                      </div>
                      <p className="text-slate-400 text-xs leading-relaxed">{r.text}</p>
                      <button
                        onClick={() => onDelete(r.id)}
                        className="text-[9px] text-slate-600 hover:text-red-400 mt-0.5 flex items-center gap-0.5"
                      >
                        <Trash2 size={8} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Reply input */}
              {replyTo === c.id && (
                <div className="border-t border-slate-700/50 p-2 bg-slate-900/30">
                  <div className="flex gap-1">
                    <input
                      autoFocus
                      value={replyInput}
                      onChange={(e) => setReplyInput(e.target.value)}
                      placeholder="返信..."
                      className="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleReply(c.id)
                        }
                      }}
                    />
                    <button
                      onClick={() => handleReply(c.id)}
                      disabled={!replyInput.trim()}
                      className="p-1 text-indigo-400 hover:text-indigo-300 disabled:opacity-30"
                    >
                      <Send size={12} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="p-4 border-t border-slate-800">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="コメントを追加..."
          rows={2}
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none resize-none"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
              e.preventDefault()
              handleSubmit()
            }
          }}
        />
        <button
          onClick={handleSubmit}
          disabled={!input.trim()}
          className="w-full mt-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-medium py-2 rounded-lg transition-all active:scale-[0.98]"
        >
          追加 (Ctrl+Enter)
        </button>
      </div>
    </aside>
  )
}
