'use client'

import { useState } from 'react'
import {
  X,
  ChevronRight,
  Check,
  Trash2,
  Reply,
  Send,
  Plus,
  Bookmark,
  ExternalLink,
  ChevronDown,
  Link,
} from 'lucide-react'
import type { Block } from '@/types'

interface UnifiedSidebarProps {
  open: boolean
  onClose: () => void
  // Tab: Outline
  blocks: Block[]
  // Tab: Comments
  comments: Array<{
    id: string
    text: string
    author: string
    createdAt: string
    resolved: boolean
    parentId?: string
  }>
  onAddComment: (text: string, parentId?: string) => void
  onResolveComment: (id: string) => void
  onDeleteComment: (id: string) => void
  // Tab: Bookmarks
  bookmarks: Array<{ id: string; name: string; blockId: string }>
  focusedBlockId: string | null
  onAddBookmark: (name: string, blockId: string) => void
  onDeleteBookmark: (id: string) => void
}

type TabId = 'outline' | 'comments' | 'bookmarks'

const tabs: { id: TabId; label: string; emoji: string }[] = [
  { id: 'outline', label: 'アウトライン', emoji: '\u{1F4CB}' },
  { id: 'comments', label: 'コメント', emoji: '\u{1F4AC}' },
  { id: 'bookmarks', label: 'ブックマーク', emoji: '\u{1F516}' },
]

function formatTime(iso: string) {
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('ja-JP', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

function scrollToBlock(id: string) {
  const el = document.querySelector(`[data-block-id="${id}"]`)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    el.classList.add('ring-2', 'ring-indigo-500/50')
    setTimeout(() => el.classList.remove('ring-2', 'ring-indigo-500/50'), 1500)
  }
}

export default function UnifiedSidebar({
  open,
  onClose,
  blocks,
  comments,
  onAddComment,
  onResolveComment,
  onDeleteComment,
  bookmarks,
  focusedBlockId,
  onAddBookmark,
  onDeleteBookmark,
}: UnifiedSidebarProps) {
  const [activeTab, setActiveTab] = useState<TabId>('outline')
  const [commentInput, setCommentInput] = useState('')
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [replyInput, setReplyInput] = useState('')
  const [showResolved, setShowResolved] = useState(false)
  const [bookmarkName, setBookmarkName] = useState('')
  const [mentionDropdown, setMentionDropdown] = useState(false)
  const [mentionFilter, setMentionFilter] = useState('')

  // Hardcoded example users for @mention
  const MENTION_USERS = [
    '田中太郎', '鈴木花子', '佐藤一郎', '高橋美咲',
    '山田健太', '伊藤さくら', '渡辺大輔', '中村愛',
  ]

  if (!open) return null

  // --- Outline helpers ---
  const headings = blocks.filter(
    (b) => b.type === 'h1' || b.type === 'h2' || b.type === 'h3' || b.type === 'h4' || b.type === 'h5' || b.type === 'h6'
  )

  // --- Comment helpers ---
  const topLevel = comments.filter((c) => !c.parentId)
  const active = topLevel.filter((c) => !c.resolved)
  const resolved = topLevel.filter((c) => c.resolved)
  const displayed = showResolved ? topLevel : active

  function getReplies(parentId: string) {
    return comments.filter((c) => c.parentId === parentId)
  }

  function handleAddComment() {
    if (!commentInput.trim()) return
    onAddComment(commentInput.trim())
    setCommentInput('')
  }

  function handleReply(parentId: string) {
    if (!replyInput.trim()) return
    onAddComment(replyInput.trim(), parentId)
    setReplyInput('')
    setReplyTo(null)
  }

  // --- Bookmark helpers ---
  function handleAddBookmark() {
    const name = bookmarkName.trim()
    if (!name) return
    const blockId = focusedBlockId || blocks[0]?.id
    if (!blockId) return
    onAddBookmark(name, blockId)
    setBookmarkName('')
  }

  function getBlockPreview(blockId: string): string {
    const block = blocks.find((b) => b.id === blockId)
    if (!block) return '(削除されたブロック)'
    const text = block.content.replace(/<[^>]*>/g, '').trim()
    return text.length > 30 ? text.slice(0, 30) + '...' : text || `[${block.type}]`
  }

  return (
    <aside className="w-80 border-l border-slate-800 bg-slate-900 flex flex-col flex-shrink-0 h-full animate-in slide-in-from-right duration-200 no-print">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-800">
        <span className="text-sm font-medium text-white">サイドバー</span>
        <button
          onClick={onClose}
          className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          aria-label="閉じる"
        >
          <X size={16} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2 text-xs font-medium transition-colors relative ${
              activeTab === tab.id
                ? 'text-indigo-400'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <span className="mr-1">{tab.emoji}</span>
            {tab.label}
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-indigo-500 rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {/* ====== Outline Tab ====== */}
        {activeTab === 'outline' && (
          <div className="p-3">
            {headings.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-8">
                見出しがありません
              </p>
            ) : (
              <div className="space-y-0.5">
                {headings.map((h) => (
                  <button
                    key={h.id}
                    onClick={() => scrollToBlock(h.id)}
                    className={`w-full text-left text-xs py-1.5 px-2 rounded hover:bg-slate-800 transition-colors flex items-center gap-1.5 ${
                      h.type === 'h1'
                        ? 'text-white font-medium'
                        : h.type === 'h2'
                          ? 'text-slate-300 pl-5'
                          : h.type === 'h3'
                            ? 'text-slate-400 pl-9'
                            : h.type === 'h4'
                              ? 'text-slate-400 pl-[3.25rem]'
                              : h.type === 'h5'
                                ? 'text-slate-500 pl-[4rem]'
                                : 'text-slate-500 pl-[4.75rem]'
                    }`}
                  >
                    <ChevronRight
                      size={10}
                      className="flex-shrink-0 text-slate-600"
                    />
                    <span className="truncate">
                      {h.content.replace(/<[^>]*>/g, '').trim() || '(空の見出し)'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ====== Comments Tab ====== */}
        {activeTab === 'comments' && (
          <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
              {resolved.length > 0 && (
                <button
                  onClick={() => setShowResolved(!showResolved)}
                  className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1"
                >
                  {showResolved ? (
                    <ChevronDown size={12} />
                  ) : (
                    <ChevronRight size={12} />
                  )}
                  解決済み ({resolved.length})
                </button>
              )}

              {displayed.length === 0 && (
                <p className="text-slate-500 text-xs text-center py-8">
                  コメントはありません
                </p>
              )}

              {displayed.map((c) => {
                const replies = getReplies(c.id)
                return (
                  <div
                    key={c.id}
                    className={`rounded-lg border text-sm ${
                      c.resolved
                        ? 'border-slate-800 bg-slate-900/50 opacity-60'
                        : 'border-slate-700 bg-slate-800/50'
                    }`}
                  >
                    <div className="p-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-medium text-indigo-400">
                          {c.author}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {formatTime(c.createdAt)}
                        </span>
                      </div>
                      <p className="text-slate-300 text-sm leading-relaxed">
                        {c.text.split(/(@\S+)/g).map((part, pi) =>
                          part.startsWith('@') ? (
                            <span key={pi} className="text-blue-400 font-bold">{part}</span>
                          ) : (
                            <span key={pi}>{part}</span>
                          )
                        )}
                      </p>
                      <div className="flex gap-2 mt-2">
                        {!c.resolved && (
                          <>
                            <button
                              onClick={() => onResolveComment(c.id)}
                              className="text-[10px] text-emerald-400 hover:text-emerald-300 flex items-center gap-0.5"
                            >
                              <Check size={10} /> 解決
                            </button>
                            <button
                              onClick={() =>
                                setReplyTo(replyTo === c.id ? null : c.id)
                              }
                              className="text-[10px] text-slate-400 hover:text-indigo-400 flex items-center gap-0.5"
                            >
                              <Reply size={10} /> 返信
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => onDeleteComment(c.id)}
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
                          <div
                            key={r.id}
                            className="p-2 border-b border-slate-800/50 last:border-b-0"
                          >
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="text-[10px] font-medium text-cyan-400">
                                {r.author}
                              </span>
                              <span className="text-[9px] text-slate-600">
                                {formatTime(r.createdAt)}
                              </span>
                            </div>
                            <p className="text-slate-400 text-xs leading-relaxed">
                              {r.text}
                            </p>
                            <button
                              onClick={() => onDeleteComment(r.id)}
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

            {/* Add comment input with @mention support */}
            <div className="p-3 border-t border-slate-800 relative">
              <textarea
                value={commentInput}
                onChange={(e) => {
                  const val = e.target.value
                  setCommentInput(val)
                  // Check for @ trigger
                  const lastAt = val.lastIndexOf('@')
                  if (lastAt !== -1 && (lastAt === 0 || val[lastAt - 1] === ' ')) {
                    const filter = val.slice(lastAt + 1)
                    if (!filter.includes(' ')) {
                      setMentionDropdown(true)
                      setMentionFilter(filter)
                      return
                    }
                  }
                  setMentionDropdown(false)
                }}
                placeholder="コメントを追加... (@でメンション)"
                rows={2}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none resize-none"
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setMentionDropdown(false)
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault()
                    handleAddComment()
                  }
                }}
              />
              {/* @mention dropdown */}
              {mentionDropdown && (
                <div className="absolute bottom-full mb-1 left-3 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 py-1 w-48 max-h-40 overflow-y-auto">
                  <div className="px-2 py-1 text-[9px] text-slate-500 font-medium">ユーザーを選択</div>
                  {MENTION_USERS
                    .filter(u => u.toLowerCase().includes(mentionFilter.toLowerCase()))
                    .map(user => (
                      <button
                        key={user}
                        onClick={() => {
                          const lastAt = commentInput.lastIndexOf('@')
                          const before = commentInput.slice(0, lastAt)
                          setCommentInput(`${before}@${user} `)
                          setMentionDropdown(false)
                        }}
                        className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700 hover:text-indigo-400 transition-colors"
                      >
                        @{user}
                      </button>
                    ))
                  }
                  {MENTION_USERS.filter(u => u.toLowerCase().includes(mentionFilter.toLowerCase())).length === 0 && (
                    <div className="px-3 py-1.5 text-xs text-slate-500">該当なし</div>
                  )}
                </div>
              )}
              <button
                onClick={handleAddComment}
                disabled={!commentInput.trim()}
                className="w-full mt-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-medium py-2 rounded-lg transition-all active:scale-[0.98]"
              >
                コメントを追加 (Ctrl+Enter)
              </button>
            </div>
          </div>
        )}

        {/* ====== Bookmarks Tab ====== */}
        {activeTab === 'bookmarks' && (
          <div className="flex flex-col h-full">
            {/* Add bookmark input */}
            <div className="flex items-center gap-1 p-3 border-b border-slate-800">
              <input
                type="text"
                value={bookmarkName}
                onChange={(e) => setBookmarkName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddBookmark()}
                className="flex-1 px-2 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                placeholder="ブックマーク名..."
              />
              <button
                onClick={handleAddBookmark}
                className="w-7 h-7 flex items-center justify-center rounded bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
                title="ブックマークを追加"
              >
                <Plus size={14} />
              </button>
            </div>

            {focusedBlockId && (
              <div className="px-3 py-1.5 text-[10px] text-slate-500 border-b border-slate-800/50">
                現在のブロックにブックマークを追加
              </div>
            )}

            {/* Bookmark list */}
            <div className="flex-1 overflow-y-auto">
              {bookmarks.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-8">
                  ブックマークがありません
                </p>
              ) : (
                <div className="py-1">
                  {bookmarks.map((bm) => (
                    <div
                      key={bm.id}
                      className="flex items-center gap-2 px-3 py-2 hover:bg-slate-800/50 group"
                    >
                      <Bookmark
                        size={12}
                        className="text-indigo-400 flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-white truncate">
                          {bm.name}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate">
                          {getBlockPreview(bm.blockId)}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          // Insert internal link to this bookmark at cursor position
                          const linkHtml = `<a href="#bookmark-${bm.id}" data-bookmark-id="${bm.blockId}" class="text-indigo-400 underline cursor-pointer" onclick="(function(e){e.preventDefault();var el=document.querySelector('[data-block-id=&quot;${bm.blockId}&quot;]');if(el){el.scrollIntoView({behavior:'smooth',block:'center'});el.classList.add('ring-2','ring-indigo-500/50');setTimeout(function(){el.classList.remove('ring-2','ring-indigo-500/50')},1500)}})(event)">${bm.name}</a>&nbsp;`
                          document.execCommand('insertHTML', false, linkHtml)
                        }}
                        className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-500 hover:text-cyan-400 transition-all"
                        title="リンクを挿入"
                      >
                        <Link size={12} />
                      </button>
                      <button
                        onClick={() => scrollToBlock(bm.blockId)}
                        className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-500 hover:text-indigo-400 transition-all"
                        title="ジャンプ"
                      >
                        <ExternalLink size={12} />
                      </button>
                      <button
                        onClick={() => onDeleteBookmark(bm.id)}
                        className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-500 hover:text-red-400 transition-all"
                        title="削除"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
