'use client'

import { useState, useRef, useEffect } from 'react'
import type { Comment } from '@/types'
import { X, Send, Check, MessageSquare } from 'lucide-react'
import SlideCommentAnchor from './slide-comment-anchor'

interface CommentWithPosition extends Comment {
  posX?: number
  posY?: number
}

function parseCommentPosition(comment: Comment): { x: number; y: number } | null {
  if (!comment.blockId || !comment.blockId.startsWith('pos:')) return null
  const parts = comment.blockId.split(':')
  if (parts.length !== 3) return null
  const x = parseFloat(parts[1])
  const y = parseFloat(parts[2])
  if (isNaN(x) || isNaN(y)) return null
  return { x, y }
}

function makePositionBlockId(x: number, y: number): string {
  return `pos:${x.toFixed(1)}:${y.toFixed(1)}`
}

interface Props {
  comments: Comment[]
  slideId: string
  onAdd: (text: string, slideId: string, parentId?: string, blockId?: string) => void
  onResolve: (id: string) => void
  onDelete: (id: string) => void
  isAddingMode: boolean
  onToggleAddMode: () => void
}

interface BubbleGroup {
  key: string
  x: number
  y: number
  comments: Comment[]
}

export default function SlideCommentBubble({
  comments,
  slideId,
  onAdd,
  onResolve,
  onDelete,
  isAddingMode,
  onToggleAddMode,
}: Props) {
  const [activeBubble, setActiveBubble] = useState<string | null>(null)
  const [newText, setNewText] = useState('')
  const [pendingPos, setPendingPos] = useState<{ x: number; y: number } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Group comments by position (within a 3% radius)
  const slideComments = comments.filter(
    (c) => c.slideId === slideId && !c.parentId && c.blockId?.startsWith('pos:')
  )

  const groups: BubbleGroup[] = []
  for (const comment of slideComments) {
    const pos = parseCommentPosition(comment)
    if (!pos) continue

    const existingGroup = groups.find(
      (g) => Math.abs(g.x - pos.x) < 3 && Math.abs(g.y - pos.y) < 3
    )
    if (existingGroup) {
      existingGroup.comments.push(comment)
    } else {
      groups.push({
        key: `${pos.x.toFixed(0)}-${pos.y.toFixed(0)}`,
        x: pos.x,
        y: pos.y,
        comments: [comment],
      })
    }
  }

  // Add replies to their groups
  const replies = comments.filter(
    (c) => c.slideId === slideId && c.parentId
  )
  for (const reply of replies) {
    const parentGroup = groups.find((g) =>
      g.comments.some((gc) => gc.id === reply.parentId)
    )
    if (parentGroup) {
      parentGroup.comments.push(reply)
    }
  }

  useEffect(() => {
    if (pendingPos && inputRef.current) {
      inputRef.current.focus()
    }
  }, [pendingPos])

  function handleCanvasClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!isAddingMode) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    setPendingPos({ x, y })
    onToggleAddMode()
  }

  function handleSubmitNew() {
    if (!newText.trim() || !pendingPos) return
    const blockId = makePositionBlockId(pendingPos.x, pendingPos.y)
    onAdd(newText.trim(), slideId, undefined, blockId)
    setNewText('')
    setPendingPos(null)
  }

  function handleReply(parentId: string, text: string, groupKey: string) {
    if (!text.trim()) return
    const group = groups.find((g) => g.key === groupKey)
    if (!group) return
    const blockId = makePositionBlockId(group.x, group.y)
    onAdd(text.trim(), slideId, parentId, blockId)
  }

  return (
    <>
      {/* Click overlay for adding mode */}
      {isAddingMode && (
        <div
          className="absolute inset-0 z-[15] cursor-crosshair"
          onClick={handleCanvasClick}
          title="Click to place a comment"
        >
          <div className="absolute top-2 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-amber-500/90 text-white text-xs rounded-full shadow-lg pointer-events-none">
            Click on the slide to add a comment
          </div>
        </div>
      )}

      {/* Existing comment anchors */}
      {groups.map((group, idx) => (
        <SlideCommentAnchor
          key={group.key}
          x={group.x}
          y={group.y}
          count={group.comments.filter((c) => !c.resolved).length || group.comments.length}
          onClick={() => setActiveBubble(activeBubble === group.key ? null : group.key)}
          isActive={activeBubble === group.key}
        />
      ))}

      {/* Expanded comment bubble */}
      {activeBubble && (() => {
        const group = groups.find((g) => g.key === activeBubble)
        if (!group) return null
        return (
          <CommentBubbleExpanded
            group={group}
            onClose={() => setActiveBubble(null)}
            onResolve={onResolve}
            onDelete={onDelete}
            onReply={(parentId, text) => handleReply(parentId, text, group.key)}
          />
        )
      })()}

      {/* New comment input at pending position */}
      {pendingPos && (
        <div
          className="absolute z-30 bg-slate-800 border border-slate-600 rounded-lg shadow-xl p-3 w-56"
          style={{
            left: `${Math.min(pendingPos.x, 70)}%`,
            top: `${Math.min(pendingPos.y, 70)}%`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-medium">New Comment</span>
            <button
              onClick={() => setPendingPos(null)}
              className="text-slate-500 hover:text-white"
            >
              <X size={14} />
            </button>
          </div>
          <input
            ref={inputRef}
            type="text"
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSubmitNew()
              if (e.key === 'Escape') setPendingPos(null)
            }}
            placeholder="Type your comment..."
            className="w-full px-2 py-1.5 bg-slate-700 border border-slate-600 rounded text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
          <button
            onClick={handleSubmitNew}
            disabled={!newText.trim()}
            className="mt-2 w-full flex items-center justify-center gap-1 px-2 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs rounded transition-colors"
          >
            <Send size={12} />
            Add
          </button>
        </div>
      )}
    </>
  )
}

function CommentBubbleExpanded({
  group,
  onClose,
  onResolve,
  onDelete,
  onReply,
}: {
  group: BubbleGroup
  onClose: () => void
  onResolve: (id: string) => void
  onDelete: (id: string) => void
  onReply: (parentId: string, text: string) => void
}) {
  const [replyText, setReplyText] = useState('')
  const rootComments = group.comments.filter((c) => !c.parentId)
  const firstRoot = rootComments[0]

  return (
    <div
      className="absolute z-30 bg-slate-800 border border-slate-600 rounded-lg shadow-2xl w-64 max-h-72 flex flex-col overflow-hidden"
      style={{
        left: `${Math.min(group.x + 2, 65)}%`,
        top: `${Math.min(group.y + 2, 55)}%`,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700 flex-shrink-0">
        <span className="text-xs text-white font-medium flex items-center gap-1">
          <MessageSquare size={12} />
          Comments ({group.comments.filter(c => !c.resolved).length})
        </span>
        <button onClick={onClose} className="text-slate-400 hover:text-white">
          <X size={14} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {group.comments.map((comment) => (
          <div
            key={comment.id}
            className={`p-2 rounded text-xs ${
              comment.resolved
                ? 'bg-slate-700/50 opacity-60'
                : comment.parentId
                ? 'bg-slate-700/80 ml-3 border-l-2 border-indigo-500/40'
                : 'bg-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-slate-400 font-medium">{comment.author}</span>
              <div className="flex items-center gap-1">
                {!comment.resolved && (
                  <button
                    onClick={() => onResolve(comment.id)}
                    className="text-green-400/60 hover:text-green-400"
                    title="Resolve"
                  >
                    <Check size={12} />
                  </button>
                )}
                <button
                  onClick={() => onDelete(comment.id)}
                  className="text-red-400/60 hover:text-red-400"
                  title="Delete"
                >
                  <X size={12} />
                </button>
              </div>
            </div>
            <p className="text-slate-300 break-words">{comment.text}</p>
            <span className="text-[10px] text-slate-500 mt-1 block">
              {new Date(comment.createdAt).toLocaleString('ja-JP', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
        ))}
      </div>
      {/* Reply input */}
      {firstRoot && (
        <div className="flex items-center gap-1 p-2 border-t border-slate-700 flex-shrink-0">
          <input
            type="text"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && replyText.trim()) {
                onReply(firstRoot.id, replyText)
                setReplyText('')
              }
            }}
            placeholder="Reply..."
            className="flex-1 px-2 py-1 bg-slate-700 border border-slate-600 rounded text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
          <button
            onClick={() => {
              if (replyText.trim()) {
                onReply(firstRoot.id, replyText)
                setReplyText('')
              }
            }}
            disabled={!replyText.trim()}
            className="p-1 text-indigo-400 hover:text-indigo-300 disabled:opacity-30"
          >
            <Send size={14} />
          </button>
        </div>
      )}
    </div>
  )
}
