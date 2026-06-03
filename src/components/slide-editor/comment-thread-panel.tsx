'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { X, MessageCircle, Send, Reply, CheckCircle, Filter } from 'lucide-react'
import type { Comment, Slide } from '@/types'

type FilterMode = 'all' | 'unresolved' | 'mine'

interface Props {
  comments: Comment[]
  slides: Slide[]
  activeSlideId: string
  onAdd: (text: string, slideId?: string, parentId?: string) => void
  onResolve: (id: string) => void
  onDelete: (id: string) => void
  onClose: () => void
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'たった今'
  if (diffMin < 60) return `${diffMin}分前`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}時間前`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay < 7) return `${diffDay}日前`
  return d.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })
}

function CommentBubble({
  comment,
  replies,
  onReply,
  onResolve,
  depth,
}: {
  comment: Comment
  replies: Comment[]
  onReply: (parentId: string) => void
  onResolve: (id: string) => void
  depth: number
}) {
  const isRoot = depth === 0

  return (
    <div className={`${depth > 0 ? 'ml-4 border-l border-slate-700 pl-3' : ''}`}>
      <div className={`rounded-lg p-2.5 ${comment.resolved ? 'opacity-50' : ''} ${isRoot ? 'bg-slate-800/60' : 'bg-slate-800/30'}`}>
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center text-[10px] text-white font-medium">
              {comment.author.charAt(0)}
            </div>
            <span className="text-xs font-medium text-slate-200">{comment.author}</span>
            <span className="text-[10px] text-slate-500">{formatTimestamp(comment.createdAt)}</span>
          </div>
          {isRoot && !comment.resolved && (
            <button
              onClick={() => onResolve(comment.id)}
              className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-emerald-400 transition-colors"
              title="解決済みにする"
            >
              <CheckCircle size={12} />
            </button>
          )}
          {comment.resolved && (
            <span className="text-[10px] text-emerald-500 flex items-center gap-0.5">
              <CheckCircle size={10} />
              解決済み
            </span>
          )}
        </div>
        <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap break-words">
          {comment.text}
        </p>
        {isRoot && !comment.resolved && (
          <button
            onClick={() => onReply(comment.id)}
            className="mt-1.5 flex items-center gap-1 text-[10px] text-slate-500 hover:text-indigo-400 transition-colors"
          >
            <Reply size={10} />
            返信
          </button>
        )}
      </div>

      {replies.length > 0 && (
        <div className="mt-1 space-y-1">
          {replies.map((reply) => (
            <CommentBubble
              key={reply.id}
              comment={reply}
              replies={[]}
              onReply={onReply}
              onResolve={onResolve}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function CommentThreadPanel({
  comments,
  slides,
  activeSlideId,
  onAdd,
  onResolve,
  onDelete,
  onClose,
}: Props) {
  const [filter, setFilter] = useState<FilterMode>('all')
  const [inputText, setInputText] = useState('')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [filterMenuOpen, setFilterMenuOpen] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const currentAuthor = 'ユーザー'

  // Focus input when replying
  useEffect(() => {
    if (replyingTo && inputRef.current) {
      inputRef.current.focus()
    }
  }, [replyingTo])

  // Group comments: root comments (no parentId) and their replies
  const { rootComments, repliesByParent } = useMemo(() => {
    const roots: Comment[] = []
    const byParent: Record<string, Comment[]> = {}
    for (const c of comments) {
      if (!c.parentId) {
        roots.push(c)
      } else {
        if (!byParent[c.parentId]) byParent[c.parentId] = []
        byParent[c.parentId].push(c)
      }
    }
    // Sort roots by creation time (newest first within each slide)
    roots.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    // Sort replies by creation time (oldest first)
    for (const key of Object.keys(byParent)) {
      byParent[key].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    }
    return { rootComments: roots, repliesByParent: byParent }
  }, [comments])

  // Apply filter
  const filteredRoots = useMemo(() => {
    let filtered = rootComments
    if (filter === 'unresolved') {
      filtered = filtered.filter((c) => !c.resolved)
    } else if (filter === 'mine') {
      filtered = filtered.filter((c) => c.author === currentAuthor)
    }
    return filtered
  }, [rootComments, filter, currentAuthor])

  // Group by slide
  const groupedBySlide = useMemo(() => {
    const groups: { slideId: string; slideLabel: string; comments: Comment[] }[] = []
    const slideMap = new Map<string, Comment[]>()

    for (const c of filteredRoots) {
      const sid = c.slideId || 'unknown'
      if (!slideMap.has(sid)) slideMap.set(sid, [])
      slideMap.get(sid)!.push(c)
    }

    // Order slides by their position
    for (const slide of slides) {
      const slideComments = slideMap.get(slide.id)
      if (slideComments && slideComments.length > 0) {
        const idx = slides.findIndex((s) => s.id === slide.id)
        groups.push({
          slideId: slide.id,
          slideLabel: `スライド ${idx + 1}`,
          comments: slideComments,
        })
      }
    }

    // Include comments with unknown slideId
    const unknownComments = slideMap.get('unknown')
    if (unknownComments && unknownComments.length > 0) {
      groups.push({ slideId: 'unknown', slideLabel: '未割り当て', comments: unknownComments })
    }

    return groups
  }, [filteredRoots, slides])

  function handleSend() {
    const text = inputText.trim()
    if (!text) return
    if (replyingTo) {
      // Find the root comment's slideId for the reply
      const rootComment = comments.find((c) => c.id === replyingTo)
      onAdd(text, rootComment?.slideId || activeSlideId, replyingTo)
    } else {
      onAdd(text, activeSlideId)
    }
    setInputText('')
    setReplyingTo(null)
    // Scroll to bottom after sending
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight
      }
    }, 100)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const filterLabels: Record<FilterMode, string> = {
    all: 'すべて',
    unresolved: '未解決',
    mine: '自分のみ',
  }

  const unresolvedCount = rootComments.filter((c) => !c.resolved).length

  return (
    <div className="w-72 flex flex-col bg-slate-900 border-l border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <MessageCircle size={14} className="text-indigo-400" />
          <span className="text-xs font-semibold text-slate-200">コメント</span>
          {unresolvedCount > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-indigo-600 text-white">
              {unresolvedCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {/* Filter dropdown */}
          <div className="relative">
            <button
              onClick={() => setFilterMenuOpen(!filterMenuOpen)}
              className={`p-1 rounded hover:bg-slate-800 transition-colors ${filter !== 'all' ? 'text-indigo-400' : 'text-slate-400'}`}
              title="フィルター"
            >
              <Filter size={13} />
            </button>
            {filterMenuOpen && (
              <div className="absolute right-0 top-full mt-1 w-28 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 py-1">
                {(['all', 'unresolved', 'mine'] as FilterMode[]).map((mode) => (
                  <button
                    key={mode}
                    className={`w-full text-left px-3 py-1.5 text-[11px] transition-colors ${
                      filter === mode
                        ? 'text-indigo-400 bg-slate-700/50'
                        : 'text-slate-300 hover:bg-slate-700/30'
                    }`}
                    onClick={() => {
                      setFilter(mode)
                      setFilterMenuOpen(false)
                    }}
                  >
                    {filterLabels[mode]}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Comments list */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-2 space-y-3">
        {groupedBySlide.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-500">
            <MessageCircle size={28} className="mb-2 opacity-40" />
            <p className="text-xs">コメントはまだありません</p>
            <p className="text-[10px] mt-1">下のテキスト欄から追加できます</p>
          </div>
        ) : (
          groupedBySlide.map((group) => (
            <div key={group.slideId}>
              <div className="flex items-center gap-1.5 mb-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${group.slideId === activeSlideId ? 'bg-indigo-500' : 'bg-slate-600'}`} />
                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                  {group.slideLabel}
                </span>
              </div>
              <div className="space-y-1.5">
                {group.comments.map((comment) => (
                  <CommentBubble
                    key={comment.id}
                    comment={comment}
                    replies={repliesByParent[comment.id] || []}
                    onReply={(parentId) => setReplyingTo(parentId)}
                    onResolve={onResolve}
                    depth={0}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Input area */}
      <div className="border-t border-slate-700 p-2">
        {replyingTo && (
          <div className="flex items-center justify-between mb-1.5 px-1">
            <span className="text-[10px] text-indigo-400 flex items-center gap-1">
              <Reply size={10} />
              返信中...
            </span>
            <button
              onClick={() => setReplyingTo(null)}
              className="text-[10px] text-slate-500 hover:text-slate-300"
            >
              キャンセル
            </button>
          </div>
        )}
        <div className="flex gap-1.5">
          <textarea
            ref={inputRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={replyingTo ? '返信を入力...' : 'コメントを入力...'}
            className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 placeholder-slate-500 resize-none focus:outline-none focus:border-indigo-500/50 transition-colors"
            rows={2}
          />
          <button
            onClick={handleSend}
            disabled={!inputText.trim()}
            className="self-end p-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white transition-colors"
            title="送信"
          >
            <Send size={13} />
          </button>
        </div>
      </div>
    </div>
  )
}
