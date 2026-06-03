'use client'

import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { MessageSquare, Check, Trash2, ChevronDown, ChevronRight, X, Reply, Send, Filter } from 'lucide-react'
import type { Comment } from '@/types'

interface Props {
  comments: Comment[]
  onAdd: (text: string, parentId?: string, mentions?: string[]) => void
  onResolve: (id: string) => void
  onDelete: (id: string) => void
  onClose: () => void
}

const TEAM_MEMBERS = [
  { name: '田中', color: '#3b82f6' },
  { name: '佐藤', color: '#22c55e' },
  { name: '鈴木', color: '#eab308' },
  { name: '高橋', color: '#8b5cf6' },
  { name: '渡辺', color: '#ec4899' },
]

function formatRelativeTime(iso: string): string {
  try {
    const now = Date.now()
    const then = new Date(iso).getTime()
    const diffMs = now - then
    if (diffMs < 0) return 'たった今'

    const seconds = Math.floor(diffMs / 1000)
    if (seconds < 60) return 'たった今'

    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}分前`

    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}時間前`

    const days = Math.floor(hours / 24)
    if (days < 7) return `${days}日前`

    const weeks = Math.floor(days / 7)
    if (weeks < 5) return `${weeks}週間前`

    const months = Math.floor(days / 30)
    if (months < 12) return `${months}ヶ月前`

    const years = Math.floor(days / 365)
    return `${years}年前`
  } catch {
    return ''
  }
}

/** Render comment text with styled @mentions */
function RichText({ text }: { text: string }) {
  const parts = text.split(/(@[一-龯぀-ゟ゠-ヿ\w]+)/g)
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('@')) {
          const memberName = part.slice(1)
          const member = TEAM_MEMBERS.find((m) => m.name === memberName)
          if (member) {
            return (
              <span
                key={i}
                className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-xs font-medium"
              >
                <span
                  className="w-3 h-3 rounded-full inline-block flex-shrink-0"
                  style={{ backgroundColor: member.color }}
                />
                {part}
              </span>
            )
          }
        }
        return <span key={i}>{part}</span>
      })}
    </>
  )
}

/** Text input with @mention dropdown */
function MentionInput({
  value,
  onChange,
  onSubmit,
  placeholder,
  autoFocus,
  multiline,
}: {
  value: string
  onChange: (val: string) => void
  onSubmit: () => void
  placeholder: string
  autoFocus?: boolean
  multiline?: boolean
}) {
  const [mentionQuery, setMentionQuery] = useState('')
  const [showMentions, setShowMentions] = useState(false)
  const [mentionIndex, setMentionIndex] = useState(0)
  const [cursorPos, setCursorPos] = useState(0)
  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement>(null)

  const filteredMembers = useMemo(() => {
    if (!mentionQuery) return TEAM_MEMBERS
    return TEAM_MEMBERS.filter((m) => m.name.includes(mentionQuery))
  }, [mentionQuery])

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
      const newVal = e.target.value
      const pos = e.target.selectionStart || 0
      onChange(newVal)
      setCursorPos(pos)

      // Check if we're in an @mention context
      const textBeforeCursor = newVal.slice(0, pos)
      const atMatch = textBeforeCursor.match(/@([一-龯぀-ゟ゠-ヿ\w]*)$/)
      if (atMatch) {
        setMentionQuery(atMatch[1])
        setShowMentions(true)
        setMentionIndex(0)
      } else {
        setShowMentions(false)
      }
    },
    [onChange],
  )

  const insertMention = useCallback(
    (memberName: string) => {
      const textBeforeCursor = value.slice(0, cursorPos)
      const atPos = textBeforeCursor.lastIndexOf('@')
      const before = value.slice(0, atPos)
      const after = value.slice(cursorPos)
      const newVal = `${before}@${memberName} ${after}`
      onChange(newVal)
      setShowMentions(false)
      // Focus back
      setTimeout(() => inputRef.current?.focus(), 0)
    },
    [value, cursorPos, onChange],
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (showMentions && filteredMembers.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault()
          setMentionIndex((i) => (i + 1) % filteredMembers.length)
          return
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault()
          setMentionIndex((i) => (i - 1 + filteredMembers.length) % filteredMembers.length)
          return
        }
        if (e.key === 'Enter' || e.key === 'Tab') {
          e.preventDefault()
          insertMention(filteredMembers[mentionIndex].name)
          return
        }
        if (e.key === 'Escape') {
          e.preventDefault()
          setShowMentions(false)
          return
        }
      }

      if (multiline) {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
          e.preventDefault()
          onSubmit()
        }
      } else {
        if (e.key === 'Enter') {
          e.preventDefault()
          onSubmit()
        }
      }
      if (e.key === 'Escape' && !showMentions) {
        // parent handles escape
      }
    },
    [showMentions, filteredMembers, mentionIndex, insertMention, onSubmit, multiline],
  )

  const Tag = multiline ? 'textarea' : 'input'

  return (
    <div className="relative">
      <Tag
        ref={inputRef as React.RefObject<HTMLTextAreaElement & HTMLInputElement>}
        autoFocus={autoFocus}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={multiline ? 2 : undefined}
        className={`w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none ${
          multiline ? 'resize-none' : ''
        }`}
      />
      {showMentions && filteredMembers.length > 0 && (
        <div className="absolute bottom-full left-0 mb-1 w-full bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 py-1 animate-slide-up">
          <div className="px-2 py-1 text-[10px] text-slate-500 uppercase tracking-wider">メンバー</div>
          {filteredMembers.map((member, i) => (
            <button
              key={member.name}
              onClick={() => insertMention(member.name)}
              className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left transition-colors ${
                i === mentionIndex ? 'bg-indigo-500/20 text-white' : 'text-slate-300 hover:bg-slate-700'
              }`}
            >
              <span
                className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                style={{ backgroundColor: member.color }}
              >
                {member.name.charAt(0)}
              </span>
              <span>{member.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function CommentPanel({ comments, onAdd, onResolve, onDelete, onClose }: Props) {
  const [input, setInput] = useState('')
  const [unresolvedOnly, setUnresolvedOnly] = useState(true)
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [replyInput, setReplyInput] = useState('')
  const [collapsedThreads, setCollapsedThreads] = useState<Set<string>>(new Set())

  // Mark as opened for notification system
  useEffect(() => {
    try {
      localStorage.setItem('doccraft-unread-comments', '0')
      window.dispatchEvent(new Event('doccraft-comments-read'))
    } catch (e) { console.warn('Failed to reset unread comments in localStorage:', e) }
  }, [])

  // Group comments into threads
  const { rootComments, repliesByParent, unresolvedCount, resolvedCount } = useMemo(() => {
    const roots: Comment[] = []
    const replies: Record<string, Comment[]> = {}
    let unresolved = 0
    let resolved = 0

    for (const c of comments) {
      if (c.parentId) {
        if (!replies[c.parentId]) replies[c.parentId] = []
        replies[c.parentId].push(c)
      } else {
        roots.push(c)
        if (c.resolved) resolved++
        else unresolved++
      }
    }

    // Sort replies by time
    for (const key of Object.keys(replies)) {
      replies[key].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    }

    return { rootComments: roots, repliesByParent: replies, unresolvedCount: unresolved, resolvedCount: resolved }
  }, [comments])

  const displayed = unresolvedOnly ? rootComments.filter((c) => !c.resolved) : rootComments

  function extractMentions(text: string): string[] {
    const matches = text.match(/@([一-龯぀-ゟ゠-ヿ\w]+)/g)
    if (!matches) return []
    return matches.map((m) => m.slice(1)).filter((name) => TEAM_MEMBERS.some((tm) => tm.name === name))
  }

  function handleSubmit() {
    if (!input.trim()) return
    const mentions = extractMentions(input)
    onAdd(input.trim(), undefined, mentions.length > 0 ? mentions : undefined)
    // Increment unread for notification
    try {
      const current = parseInt(localStorage.getItem('doccraft-unread-comments') || '0', 10)
      localStorage.setItem('doccraft-unread-comments', String(current + 1))
      window.dispatchEvent(new Event('doccraft-comment-added'))
    } catch (e) { console.warn('Failed to update unread comments in localStorage:', e) }
    setInput('')
  }

  function handleReply(parentId: string) {
    if (!replyInput.trim()) return
    const mentions = extractMentions(replyInput)
    onAdd(replyInput.trim(), parentId, mentions.length > 0 ? mentions : undefined)
    try {
      const current = parseInt(localStorage.getItem('doccraft-unread-comments') || '0', 10)
      localStorage.setItem('doccraft-unread-comments', String(current + 1))
      window.dispatchEvent(new Event('doccraft-comment-added'))
    } catch (e) { console.warn('Failed to update unread comments in localStorage:', e) }
    setReplyInput('')
    setReplyTo(null)
  }

  function toggleCollapsed(id: string) {
    setCollapsedThreads((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <aside className="w-72 border-l border-slate-800 bg-slate-950 flex flex-col flex-shrink-0 no-print max-md:fixed max-md:inset-y-0 max-md:right-0 max-md:z-40 max-md:w-80 max-md:shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
        <h3 className="text-sm font-semibold text-white flex items-center gap-1.5">
          <MessageSquare size={14} className="text-slate-400" /> コメント ({unresolvedCount})
        </h3>
        <button
          onClick={onClose}
          className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          aria-label="閉じる"
        >
          <X size={16} />
        </button>
      </div>

      {/* Filter toggle */}
      <div className="px-4 py-2 border-b border-slate-800/50 flex items-center justify-between">
        <button
          onClick={() => setUnresolvedOnly(!unresolvedOnly)}
          className={`text-xs flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors ${
            unresolvedOnly
              ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30'
              : 'text-slate-500 hover:text-slate-300 border border-transparent'
          }`}
        >
          <Filter size={10} />
          未解決のみ
        </button>
        {resolvedCount > 0 && (
          <span className="text-[10px] text-slate-600">
            解決済み {resolvedCount}件
          </span>
        )}
      </div>

      {/* Comments list */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {displayed.length === 0 && (
          <p className="text-slate-500 text-xs text-center py-8">
            {unresolvedOnly ? '未解決のコメントはありません' : 'コメントはありません'}
          </p>
        )}

        {displayed.map((c) => {
          const replies = repliesByParent[c.id] || []
          const isCollapsed = collapsedThreads.has(c.id)

          return (
            <div
              key={c.id}
              className={`rounded-lg border text-sm transition-all ${
                c.resolved
                  ? 'border-slate-800/60 bg-slate-900/30'
                  : 'border-slate-700 bg-slate-800/50'
              }`}
            >
              {/* Root comment */}
              <div className="p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`text-xs font-medium ${c.resolved ? 'text-slate-500' : 'text-indigo-400'}`}>
                    {c.author}
                  </span>
                  <span className="text-[10px] text-slate-500" title={c.createdAt}>
                    {formatRelativeTime(c.createdAt)}
                  </span>
                </div>
                <p
                  className={`text-sm leading-relaxed ${
                    c.resolved ? 'text-slate-500 line-through decoration-slate-600' : 'text-slate-300'
                  }`}
                >
                  <RichText text={c.text} />
                </p>
                {c.mentions && c.mentions.length > 0 && (
                  <div className="flex items-center gap-1 mt-1">
                    {c.mentions.map((name) => {
                      const member = TEAM_MEMBERS.find((m) => m.name === name)
                      return (
                        <span
                          key={name}
                          className="w-4 h-4 rounded-full inline-flex items-center justify-center text-[8px] font-bold text-white"
                          style={{ backgroundColor: member?.color || '#6366f1' }}
                          title={`${name} にメンション`}
                        >
                          {name.charAt(0)}
                        </span>
                      )
                    })}
                  </div>
                )}
                <div className="flex items-center gap-2 mt-2">
                  {!c.resolved && (
                    <>
                      <button
                        onClick={() => onResolve(c.id)}
                        className="text-[10px] text-emerald-400 hover:text-emerald-300 flex items-center gap-0.5"
                      >
                        <Check size={10} /> 解決
                      </button>
                      <button
                        onClick={() => {
                          setReplyTo(replyTo === c.id ? null : c.id)
                          setReplyInput('')
                        }}
                        className="text-[10px] text-slate-400 hover:text-indigo-400 flex items-center gap-0.5"
                      >
                        <Reply size={10} /> 返信
                      </button>
                    </>
                  )}
                  {replies.length > 0 && (
                    <button
                      onClick={() => toggleCollapsed(c.id)}
                      className="text-[10px] text-slate-500 hover:text-slate-300 flex items-center gap-0.5 ml-1"
                    >
                      {isCollapsed ? <ChevronRight size={10} /> : <ChevronDown size={10} />}
                      {replies.length}件の返信
                    </button>
                  )}
                  <button
                    onClick={() => onDelete(c.id)}
                    className="text-[10px] text-slate-500 hover:text-red-400 flex items-center gap-0.5 ml-auto"
                  >
                    <Trash2 size={10} />
                  </button>
                </div>
              </div>

              {/* Threaded replies */}
              {replies.length > 0 && !isCollapsed && (
                <div className="border-t border-slate-700/50 ml-3 border-l-2 border-l-indigo-500/20 bg-slate-900/30">
                  {replies.map((r) => (
                    <div key={r.id} className="px-3 py-2 border-b border-slate-800/40 last:border-b-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[10px] font-medium text-cyan-400">{r.author}</span>
                        <span className="text-[9px] text-slate-600" title={r.createdAt}>
                          {formatRelativeTime(r.createdAt)}
                        </span>
                      </div>
                      <p className="text-slate-400 text-xs leading-relaxed">
                        <RichText text={r.text} />
                      </p>
                      <button
                        onClick={() => onDelete(r.id)}
                        className="text-[9px] text-slate-600 hover:text-red-400 mt-1 flex items-center gap-0.5"
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
                  <div className="flex gap-1 items-end">
                    <div className="flex-1">
                      <MentionInput
                        value={replyInput}
                        onChange={setReplyInput}
                        onSubmit={() => handleReply(c.id)}
                        placeholder="返信... (@でメンション)"
                        autoFocus
                      />
                    </div>
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

      {/* New comment input */}
      <div className="p-4 border-t border-slate-800">
        <MentionInput
          value={input}
          onChange={setInput}
          onSubmit={handleSubmit}
          placeholder="コメントを追加... (@でメンション)"
          multiline
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
