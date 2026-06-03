'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { memo, useState, useEffect, useRef } from 'react'
import type { DocumentMeta } from '@/types'
import { formatDate, formatRelativeTime } from '@/lib/utils'
import { Presentation, FileText, Table2, Palette, MoreVertical, Copy, Trash2, FolderInput, FolderX, Star, RotateCcw, Tag, Plus, Check, Pin, Eye, CircleDot, Send, CheckCircle2, RotateCw, ExternalLink, Edit3, FolderOpen } from 'lucide-react'
import type { DocStatus } from '@/lib/activity-log'
import { useToast } from '@/components/shared/toast'

const TAG_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6']
function tagColor(tag: string) {
  let hash = 0
  for (let i = 0; i < tag.length; i++) hash = tag.charCodeAt(i) + ((hash << 5) - hash)
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length]
}

interface Props {
  doc: DocumentMeta
  onDelete: (id: string) => void
  onDuplicate: (id: string) => void
  folders?: string[]
  currentFolder?: string | null
  onMoveToFolder?: (folder: string | null) => void
  isFavorite?: boolean
  onToggleFavorite?: () => void
  isTrash?: boolean
  trashedAt?: string | null
  onRestore?: (id: string) => void
  onPermanentDelete?: (id: string) => void
  contentMatches?: string[]
  tags?: string[]
  allTags?: string[]
  onSetTags?: (tags: string[]) => void
  // Bulk select
  isSelected?: boolean
  onSelect?: (id: string, selected: boolean) => void
  selectMode?: boolean
  // Pin
  isPinned?: boolean
  onTogglePin?: (id: string) => void
  // List view mode
  listView?: boolean
  // Drag reorder
  draggableReorder?: boolean
  onDragReorderStart?: (e: React.DragEvent, id: string) => void
  onDragReorderOver?: (e: React.DragEvent, id: string) => void
  onDragReorderDrop?: (e: React.DragEvent, id: string) => void
  dragOverReorderId?: string | null
  // Document status
  docStatus?: DocStatus
  onStatusChange?: (id: string, status: DocStatus, comment?: string) => void
  // Content snippet for thumbnail preview
  contentSnippet?: string
}

/** Shows remaining time before auto-deletion */
function TrashCountdown({ deletedAt }: { deletedAt: string }) {
  const [remaining, setRemaining] = useState('')

  useEffect(() => {
    function update() {
      const elapsed = Date.now() - new Date(deletedAt).getTime()
      const left = Math.max(0, 24 * 60 * 60 * 1000 - elapsed)
      if (left <= 0) {
        setRemaining('まもなく削除')
        return
      }
      const hours = Math.floor(left / (60 * 60 * 1000))
      const mins = Math.floor((left % (60 * 60 * 1000)) / (60 * 1000))
      if (hours > 0) {
        setRemaining(`あと${hours}時間${mins}分で削除`)
      } else {
        setRemaining(`あと${mins}分で削除`)
      }
    }
    update()
    const timer = setInterval(update, 60 * 1000) // update every minute
    return () => clearInterval(timer)
  }, [deletedAt])

  const elapsed = Date.now() - new Date(deletedAt).getTime()
  const left = Math.max(0, 24 * 60 * 60 * 1000 - elapsed)
  const isUrgent = left < 2 * 60 * 60 * 1000 // < 2 hours

  return (
    <div className={`text-[10px] mt-1 flex items-center gap-1 ${isUrgent ? 'text-red-400' : 'text-amber-500/70'}`}>
      <Trash2 size={10} />
      <span>{remaining}</span>
    </div>
  )
}

const GRADIENT_PREVIEWS: Record<string, string> = {
  'dark-blue': 'linear-gradient(135deg, #0f172a, #1e3a5f)',
  'violet-slate': 'linear-gradient(135deg, #1e1b4b, #4c1d95)',
  emerald: 'linear-gradient(135deg, #064e3b, #065f46)',
  amber: 'linear-gradient(135deg, #451a03, #92400e)',
  'rose-pink': 'linear-gradient(135deg, #4c0519, #9f1239)',
  'white-clean': 'linear-gradient(135deg, #f8fafc, #e2e8f0)',
  midnight: '#0a0a0a',
  ocean: 'linear-gradient(135deg, #0c4a6e, #0369a1)',
}

/** Type-specific thumbnail gradients so cards are visually distinguishable */
const TYPE_THUMBNAIL_BG: Record<string, string> = {
  slides: 'linear-gradient(135deg, #5b21b6, #7c3aed, #a78bfa)',
  doc: 'linear-gradient(135deg, #065f46, #059669, #34d399)',
  spreadsheet: 'linear-gradient(135deg, #1e40af, #3b82f6, #60a5fa)',
  design: 'linear-gradient(135deg, #9f1239, #e11d48, #fb7185)',
}

const TYPE_ACCENT: Record<string, string> = {
  slides: 'bg-indigo-500',
  doc: 'bg-emerald-500',
  spreadsheet: 'bg-cyan-500',
  design: 'bg-pink-500',
}


const TYPE_HOVER_GRADIENT: Record<string, string> = {
  slides: 'rgba(99,102,241,0.12)',
  doc: 'rgba(16,185,129,0.12)',
  spreadsheet: 'rgba(6,182,212,0.12)',
  design: 'rgba(236,72,153,0.12)',
}

const TYPE_BADGE: Record<string, { label: string; bg: string; text: string }> = {
  slides: { label: 'スライド', bg: 'bg-indigo-500/15', text: 'text-indigo-300' },
  doc: { label: 'ドキュメント', bg: 'bg-emerald-500/15', text: 'text-emerald-300' },
  spreadsheet: { label: '表計算', bg: 'bg-cyan-500/15', text: 'text-cyan-300' },
  design: { label: 'デザイン', bg: 'bg-pink-500/15', text: 'text-pink-300' },
}

const STATUS_BADGE: Record<DocStatus, { bg: string; text: string; dot: string }> = {
  '下書き': { bg: 'bg-slate-500/15', text: 'text-slate-300', dot: 'bg-slate-400' },
  'レビュー中': { bg: 'bg-amber-500/15', text: 'text-amber-300', dot: 'bg-amber-400' },
  '承認済み': { bg: 'bg-emerald-500/15', text: 'text-emerald-300', dot: 'bg-emerald-400' },
  '公開': { bg: 'bg-blue-500/15', text: 'text-blue-300', dot: 'bg-blue-400' },
}

const ALL_STATUSES: DocStatus[] = ['下書き', 'レビュー中', '承認済み', '公開']

function DocumentCard({
  doc,
  onDelete,
  onDuplicate,
  folders,
  currentFolder,
  onMoveToFolder,
  isFavorite,
  onToggleFavorite,
  isTrash,
  trashedAt,
  onRestore,
  onPermanentDelete,
  contentMatches,
  tags = [],
  allTags = [],
  onSetTags,
  isSelected,
  onSelect,
  selectMode,
  isPinned,
  onTogglePin,
  listView,
  draggableReorder,
  onDragReorderStart,
  onDragReorderOver,
  onDragReorderDrop,
  dragOverReorderId,
  docStatus = '下書き',
  onStatusChange,
  contentSnippet,
}: Props) {
  const { confirm } = useToast()
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [folderSubmenu, setFolderSubmenu] = useState(false)
  const [tagMenuOpen, setTagMenuOpen] = useState(false)
  const [newTagInput, setNewTagInput] = useState('')
  const [showPreview, setShowPreview] = useState(false)
  const [statusMenuOpen, setStatusMenuOpen] = useState(false)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [rejectComment, setRejectComment] = useState('')
  // Context menu state (#25)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const href =
    doc.type === 'slides'
      ? `/slides/${doc.id}`
      : doc.type === 'spreadsheet'
        ? `/spreadsheets/${doc.id}`
        : doc.type === 'design'
          ? `/designs/${doc.id}`
          : `/docs/${doc.id}`
  const userBgStyle = GRADIENT_PREVIEWS[doc.thumbnailTheme ?? 'dark-blue'] ?? GRADIENT_PREVIEWS['dark-blue']
  // Use type-specific gradient for the thumbnail so each doc type is visually distinct
  const bgStyle = TYPE_THUMBNAIL_BG[doc.type] || userBgStyle
  const badge = TYPE_BADGE[doc.type] || TYPE_BADGE['doc']
  const hoverGradientColor = TYPE_HOVER_GRADIENT[doc.type] || TYPE_HOVER_GRADIENT['slides']

  function handleToggleTag(tag: string) {
    if (!onSetTags) return
    if (tags.includes(tag)) {
      onSetTags(tags.filter((t) => t !== tag))
    } else {
      onSetTags([...tags, tag])
    }
  }

  function handleAddNewTag() {
    const name = newTagInput.trim()
    if (!name || !onSetTags) return
    if (!tags.includes(name)) {
      onSetTags([...tags, name])
    }
    setNewTagInput('')
  }

  const visibleTags = tags.slice(0, 2)
  const overflowCount = tags.length - 2

  const accentColor = doc.type === 'slides' ? 'rgba(139,92,246,0.5)' : doc.type === 'spreadsheet' ? 'rgba(59,130,246,0.5)' : doc.type === 'design' ? 'rgba(236,72,153,0.5)' : 'rgba(16,185,129,0.5)'

  function handleMouseEnter() {
    if (listView || isTrash) return
    previewTimer.current = setTimeout(() => setShowPreview(true), 600)
    // Apply type-specific border glow
    if (cardRef.current) {
      cardRef.current.style.borderColor = accentColor
      cardRef.current.style.boxShadow = `0 20px 40px -12px rgba(0,0,0,0.5), 0 0 15px ${accentColor}`
    }
  }
  function handleMouseLeave() {
    if (previewTimer.current) clearTimeout(previewTimer.current)
    setShowPreview(false)
    // Remove glow
    if (cardRef.current) {
      cardRef.current.style.borderColor = ''
      cardRef.current.style.boxShadow = ''
    }
  }

  // ── List view rendering ──
  if (listView && !isTrash) {
    return (
      <div
        ref={cardRef}
        role="article"
        aria-label={doc.title}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            router.push(href)
          }
        }}
        draggable={draggableReorder || !isTrash}
        onDragStart={(e) => {
          if (draggableReorder && onDragReorderStart) {
            onDragReorderStart(e, doc.id)
          } else {
            e.dataTransfer.setData('text/doccraft-id', doc.id)
            e.dataTransfer.effectAllowed = 'move'
          }
        }}
        onDragOver={draggableReorder && onDragReorderOver ? (e) => onDragReorderOver(e, doc.id) : undefined}
        onDrop={draggableReorder && onDragReorderDrop ? (e) => onDragReorderDrop(e, doc.id) : undefined}
        className={`group flex items-center gap-3 px-3 py-2.5 theme-bg-secondary border rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
          isSelected ? 'border-indigo-500/60 bg-indigo-500/5' : dragOverReorderId === doc.id ? 'border-indigo-400/60 bg-indigo-500/10' : 'theme-border-primary'
        }`}
      >
        {/* Checkbox */}
        {(selectMode || onSelect) && (
          <button
            onClick={(e) => { e.preventDefault(); onSelect?.(doc.id, !isSelected) }}
            className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-all ${
              isSelected ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-slate-600 hover:border-indigo-400'
            } ${selectMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
          >
            {isSelected && <Check size={12} />}
          </button>
        )}
        {/* Pin */}
        {isPinned && (
          <Pin size={12} className="text-amber-400 flex-shrink-0" />
        )}
        {/* Name */}
        <Link href={href} className="flex-1 min-w-0 flex items-center gap-2">
          <span className="text-sm theme-text-primary truncate font-medium">{doc.title}</span>
        </Link>
        {/* Type badge */}
        <span className={`shrink-0 text-[9px] px-1.5 py-0.5 rounded-full font-medium ${badge.bg} ${badge.text}`}>
          {badge.label}
        </span>
        {/* Status badge */}
        {!isTrash && (
          <span className={`shrink-0 text-[9px] px-1.5 py-0.5 rounded-full font-medium flex items-center gap-1 ${STATUS_BADGE[docStatus].bg} ${STATUS_BADGE[docStatus].text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${STATUS_BADGE[docStatus].dot}`} />
            {docStatus}
          </span>
        )}
        {/* Updated */}
        <span className="text-[11px] text-slate-400 shrink-0 w-28 text-right" title={formatDate(doc.updatedAt)}>{formatRelativeTime(doc.updatedAt)}</span>
        {/* Tags */}
        <div className="flex items-center gap-1 shrink-0 w-28">
          {visibleTags.map((tag) => (
            <span
              key={tag}
              className="inline-block px-1.5 py-px rounded-full text-[8px] font-medium leading-tight"
              style={{ backgroundColor: tagColor(tag) + '18', color: tagColor(tag) }}
            >
              {tag}
            </span>
          ))}
          {overflowCount > 0 && <span className="text-[8px] text-slate-500">+{overflowCount}</span>}
        </div>
        {/* Actions */}
        <div className="flex items-center gap-0.5 shrink-0">
          {onTogglePin && (
            <button
              onClick={(e) => { e.preventDefault(); onTogglePin(doc.id) }}
              className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all ${
                isPinned ? 'text-amber-400 hover:bg-amber-500/15' : 'text-slate-500 hover:text-white hover:bg-slate-700/80 opacity-0 group-hover:opacity-100'
              }`}
              title={isPinned ? 'ピン留め解除' : 'ピン留め'}
            >
              <Pin size={13} />
            </button>
          )}
          <button
            onClick={() => onDuplicate(doc.id)}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-700/80 text-slate-500 hover:text-white opacity-0 group-hover:opacity-100 transition-all"
            title="複製"
          >
            <Copy size={13} />
          </button>
          <button
            onClick={async () => {
              if (await confirm(`「${doc.title}」を削除しますか？`)) onDelete(doc.id)
            }}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-500/15 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
            title="削除"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={cardRef}
      role="article"
      aria-label={doc.title}
      tabIndex={0}
      onKeyDown={(e) => {
        if (!isTrash && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault()
          router.push(href)
        }
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onContextMenu={(e) => {
        if (isTrash) return
        e.preventDefault()
        e.stopPropagation()
        setContextMenu({ x: e.clientX, y: e.clientY })
      }}
      draggable={draggableReorder || !isTrash}
      onDragStart={(e) => {
        if (draggableReorder && onDragReorderStart) {
          onDragReorderStart(e, doc.id)
        } else {
          e.dataTransfer.setData('text/doccraft-id', doc.id)
          e.dataTransfer.effectAllowed = 'move'
        }
      }}
      onDragOver={draggableReorder && onDragReorderOver ? (e) => onDragReorderOver(e, doc.id) : undefined}
      onDrop={draggableReorder && onDragReorderDrop ? (e) => onDragReorderDrop(e, doc.id) : undefined}
      className={`group relative border rounded-xl overflow-hidden transition-all duration-300 hover:shadow-2xl hover:scale-[1.03] hover:-translate-y-1.5 will-change-transform cursor-grab active:cursor-grabbing focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
        isSelected ? 'border-indigo-500/60 ring-1 ring-indigo-500/30' : dragOverReorderId === doc.id ? 'border-indigo-400/60' : 'theme-border-primary'
      }`}
      style={{ backgroundColor: 'var(--bg-surface)' }}
>

      {/* Bulk select checkbox */}
      {(selectMode || onSelect) && !isTrash && (
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onSelect?.(doc.id, !isSelected) }}
          className={`absolute top-2 left-2 z-20 w-6 h-6 rounded-md border flex items-center justify-center transition-all duration-200 ${
            isSelected ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-slate-500/60 bg-black/30 hover:bg-black/50 hover:border-indigo-400'
          } ${selectMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
        >
          {isSelected && <Check size={14} />}
        </button>
      )}
      {/* Left edge type accent stripe - always visible faint, full on hover */}
      <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${TYPE_ACCENT[doc.type] || 'bg-indigo-500'} opacity-30 group-hover:opacity-100 transition-opacity duration-300 z-10`} />

      {/* Bottom glow effect on hover */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10"
        style={{ background: `linear-gradient(90deg, transparent, ${hoverGradientColor.replace('0.12', '0.6')}, transparent)` }}
      />

      {isTrash ? (
        <div className="h-36 w-full relative overflow-hidden opacity-50" style={{ background: bgStyle }}>
          <div
            className="absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)',
              backgroundSize: '12px 12px',
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-black/20 flex items-center justify-center">
              {doc.type === 'slides' ? (
                <Presentation size={38} className="opacity-25 text-white" />
              ) : doc.type === 'spreadsheet' ? (
                <Table2 size={38} className="opacity-25 text-white" />
              ) : doc.type === 'design' ? (
                <Palette size={38} className="opacity-25 text-white" />
              ) : (
                <FileText size={38} className="opacity-25 text-white" />
              )}
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-black/50 via-black/20 to-transparent" />
          <div className="absolute bottom-2 left-3 flex items-center gap-1.5">
            {doc.type === 'slides' ? (
              <Presentation size={10} className="text-white/70" />
            ) : doc.type === 'spreadsheet' ? (
              <Table2 size={10} className="text-white/70" />
            ) : doc.type === 'design' ? (
              <Palette size={10} className="text-white/70" />
            ) : (
              <FileText size={10} className="text-white/70" />
            )}
            <span className="text-white/70 text-[10px] font-medium tracking-wide uppercase">
              {doc.type === 'slides' ? 'Slides' : doc.type === 'spreadsheet' ? 'Sheet' : doc.type === 'design' ? 'Design' : 'Doc'}
            </span>
          </div>
        </div>
      ) : (
        <Link href={href}>
          <div className="h-36 w-full relative overflow-hidden" style={{ background: bgStyle }}>
            {/* Dot pattern overlay */}
            <div
              className="absolute inset-0 opacity-[0.07]"
              style={{
                backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)',
                backgroundSize: '12px 12px',
              }}
            />
            {/* Animated gradient overlay on hover */}
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              style={{ background: `linear-gradient(to top, ${hoverGradientColor}, transparent 60%)` }}
            />
            {/* Favorite star */}
            {!isTrash && onToggleFavorite && (
              <button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onToggleFavorite()
                }}
                className={`absolute top-2 right-2 z-10 w-7 h-7 flex items-center justify-center rounded-lg transition-all duration-200 ${
                  isFavorite ? 'text-yellow-400 bg-black/30 hover:bg-black/50' : 'text-white/40 bg-black/20 hover:bg-black/40 hover:text-white/70 opacity-0 group-hover:opacity-100'
                }`}
                aria-label={isFavorite ? 'お気に入り解除' : 'お気に入りに追加'}
              >
                <Star size={14} fill={isFavorite ? 'currentColor' : 'none'} />
              </button>
            )}
            <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-black/50 via-black/20 to-transparent" />
            {/* Content-aware thumbnail overlay (#1) */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {doc.type === 'spreadsheet' ? (
                /* Mini grid for spreadsheets */
                <div className="w-[70%] h-[65%] rounded bg-black/20 backdrop-blur-sm p-1.5 flex flex-col gap-px">
                  {Array.from({ length: 4 }).map((_, row) => (
                    <div key={row} className="flex gap-px flex-1">
                      {Array.from({ length: 3 }).map((_, col) => (
                        <div
                          key={col}
                          className={`flex-1 rounded-sm flex items-center justify-center text-[7px] font-mono ${
                            row === 0 ? 'bg-white/15 text-white/70 font-semibold' : 'bg-white/8 text-white/40'
                          }`}
                        >
                          {row === 0 ? ['A', 'B', 'C'][col] : row === 1 && col === 0 ? '1' : ''}
                        </div>
                      ))}
                    </div>
                  ))}
                  <div className="text-[7px] text-white/30 text-center mt-0.5">表計算</div>
                </div>
              ) : doc.type === 'doc' && contentSnippet ? (
                /* Document content snippet */
                <div className="w-[70%] h-[65%] rounded bg-black/20 backdrop-blur-sm p-2 flex flex-col gap-1">
                  <div className="w-8 h-0.5 bg-white/30 rounded" />
                  <p className="text-[8px] text-white/50 leading-tight line-clamp-3 font-sans">
                    {contentSnippet.slice(0, 60)}
                  </p>
                  <div className="flex gap-1 mt-auto">
                    <div className="w-full h-0.5 bg-white/15 rounded" />
                  </div>
                  <div className="w-3/4 h-0.5 bg-white/10 rounded" />
                </div>
              ) : doc.type === 'slides' ? (
                /* Simplified slide layout */
                <div className="w-[70%] h-[65%] rounded bg-black/20 backdrop-blur-sm p-2 flex flex-col justify-between">
                  <div>
                    <div className="w-2/3 h-1 bg-white/30 rounded mb-1" />
                    <div className="w-1/2 h-0.5 bg-white/15 rounded" />
                  </div>
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-sm bg-white/15" />
                    <div className="flex-1 space-y-0.5">
                      <div className="w-full h-0.5 bg-white/15 rounded" />
                      <div className="w-3/4 h-0.5 bg-white/10 rounded" />
                      <div className="w-1/2 h-0.5 bg-white/10 rounded" />
                    </div>
                  </div>
                  <div className="flex justify-center gap-0.5">
                    <div className="w-1 h-1 rounded-full bg-white/40" />
                    <div className="w-1 h-1 rounded-full bg-white/15" />
                    <div className="w-1 h-1 rounded-full bg-white/15" />
                  </div>
                </div>
              ) : doc.type === 'design' ? (
                /* Design canvas preview */
                <div className="w-[70%] h-[65%] rounded bg-black/20 backdrop-blur-sm p-2 flex flex-col items-center justify-center gap-1">
                  <Palette size={24} className="text-white/40" />
                  <div className="text-[7px] text-white/30 text-center">デザイン</div>
                </div>
              ) : (
                /* Fallback: type icon */
                <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-sm">
                  <FileText size={28} className="text-white/60" />
                </div>
              )}
            </div>
          </div>
        </Link>
      )}

      <div className="p-3.5">
        {isTrash ? (
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="text-[0.9rem] font-semibold text-white truncate leading-snug opacity-60">{doc.title}</div>
              <div className="text-xs text-slate-500 mt-1 font-medium">更新: {formatDate(doc.updatedAt)}</div>
              {trashedAt && (
                <TrashCountdown deletedAt={trashedAt} />
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => onRestore?.(doc.id)}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-emerald-500/15 text-slate-500 hover:text-emerald-400 transition-all duration-200"
                aria-label="復元"
                title="復元"
              >
                <RotateCcw size={14} />
              </button>
              <button
                onClick={async () => {
                  if (await confirm(`「${doc.title}」を完全に削除しますか？この操作は取り消せません。`)) {
                    onPermanentDelete?.(doc.id)
                  }
                }}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-500/15 text-slate-500 hover:text-red-400 transition-all duration-200"
                aria-label="完全に削除"
                title="完全に削除"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-2">
              <Link href={href} className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                  <div className="text-[0.9rem] font-semibold theme-text-primary truncate leading-snug">{doc.title}</div>
                  <span className={`shrink-0 text-[9px] px-1.5 py-0.5 rounded-full font-medium ${badge.bg} ${badge.text}`}>
                    {badge.label}
                  </span>
                  <span className={`shrink-0 text-[9px] px-1.5 py-0.5 rounded-full font-medium flex items-center gap-1 ${STATUS_BADGE[docStatus].bg} ${STATUS_BADGE[docStatus].text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${STATUS_BADGE[docStatus].dot}`} />
                    {docStatus}
                  </span>
                </div>
                {/* Tags inline below title */}
                {tags.length > 0 && (
                  <div className="flex items-center gap-1 mb-1">
                    {visibleTags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-block px-1.5 py-px rounded-full text-[8px] font-medium leading-tight"
                        style={{
                          backgroundColor: tagColor(tag) + '18',
                          color: tagColor(tag),
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                    {overflowCount > 0 && (
                      <span className="text-[8px] text-slate-500 font-medium">+{overflowCount}</span>
                    )}
                  </div>
                )}
                <div className="text-[11px] theme-text-secondary font-medium" title={formatDate(doc.updatedAt)}>更新: {formatRelativeTime(doc.updatedAt)}</div>
              </Link>

              <div className="flex items-center gap-0.5">
                {/* Tag button */}
                {onSetTags && (
                  <div className="relative">
                    <button
                      onClick={() => setTagMenuOpen(!tagMenuOpen)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-700/80 text-slate-500 hover:text-white transition-all duration-200"
                      aria-label="タグ管理"
                      title="タグ管理"
                    >
                      <Tag size={14} />
                    </button>

                    {tagMenuOpen && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setTagMenuOpen(false)} />
                        <div className="absolute right-0 bottom-8 z-20 bg-slate-800/95 backdrop-blur-md border border-slate-700/80 rounded-xl shadow-2xl shadow-black/40 py-2 w-44 text-sm animate-[menuPop_0.15s_ease-out]">
                          <div className="px-3 pb-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">タグ</div>
                          {allTags.map((tag) => (
                            <button
                              key={tag}
                              onClick={() => handleToggleTag(tag)}
                              className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-700/50 transition-all duration-150 flex items-center gap-2"
                            >
                              <span
                                className="w-3.5 h-3.5 rounded flex items-center justify-center border"
                                style={{
                                  borderColor: tagColor(tag),
                                  backgroundColor: tags.includes(tag) ? tagColor(tag) : 'transparent',
                                }}
                              >
                                {tags.includes(tag) && <Check size={9} className="text-white" />}
                              </span>
                              <span style={{ color: tagColor(tag) }}>{tag}</span>
                            </button>
                          ))}
                          <div className="border-t border-slate-700 mt-1.5 pt-1.5 px-2">
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                value={newTagInput}
                                onChange={(e) => setNewTagInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddNewTag()}
                                placeholder="新しいタグ"
                                className="flex-1 bg-slate-700/50 border border-slate-600 rounded px-2 py-1 text-[10px] text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                                onClick={(e) => e.stopPropagation()}
                              />
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleAddNewTag()
                                }}
                                className="text-indigo-400 hover:text-indigo-300 p-1"
                              >
                                <Plus size={12} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Menu button - always visible but faint, full on hover */}
                <div className="relative">
                  <button
                    onClick={() => setMenuOpen(!menuOpen)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-700/80 text-slate-500 opacity-40 hover:opacity-100 hover:text-white transition-all duration-200"
                    aria-label="メニュー"
                    aria-expanded={menuOpen}
                  >
                    <MoreVertical size={16} />
                  </button>

                  {menuOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                      <div
                        className="absolute right-0 bottom-8 z-20 bg-slate-800/95 backdrop-blur-md border border-slate-700/80 rounded-xl shadow-2xl shadow-black/40 py-2 w-40 text-sm animate-[menuPop_0.15s_ease-out]"
                        role="menu"
                      >
                        <button
                          role="menuitem"
                          onClick={() => {
                            onDuplicate(doc.id)
                            setMenuOpen(false)
                          }}
                          className="w-full text-left px-4 py-2.5 text-slate-300 hover:bg-indigo-500/10 hover:text-white transition-all duration-150 flex items-center gap-2.5 rounded-lg mx-auto"
                        >
                          <Copy size={13} /> 複製
                        </button>
                        {folders && folders.length > 0 && onMoveToFolder && (
                          <div className="relative">
                            <button
                              role="menuitem"
                              onClick={() => setFolderSubmenu(!folderSubmenu)}
                              className="w-full text-left px-4 py-2.5 text-slate-300 hover:bg-indigo-500/10 hover:text-white transition-all duration-150 flex items-center gap-2.5 rounded-lg mx-auto"
                            >
                              <FolderInput size={13} /> フォルダへ移動
                            </button>
                            {folderSubmenu && (
                              <div className="ml-2 border-l border-slate-700 pl-2 py-1">
                                {currentFolder && (
                                  <button
                                    onClick={() => {
                                      onMoveToFolder(null)
                                      setMenuOpen(false)
                                      setFolderSubmenu(false)
                                    }}
                                    className="w-full text-left px-2 py-1 text-xs text-amber-400 hover:bg-amber-500/10 rounded flex items-center gap-1.5"
                                  >
                                    <FolderX size={11} /> フォルダから外す
                                  </button>
                                )}
                                {folders.map((f) => (
                                  <button
                                    key={f}
                                    onClick={() => {
                                      onMoveToFolder(f)
                                      setMenuOpen(false)
                                      setFolderSubmenu(false)
                                    }}
                                    className={`w-full text-left px-2 py-1 text-xs rounded flex items-center gap-1.5 ${
                                      currentFolder === f ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                                    }`}
                                  >
                                    <FolderInput size={11} /> {f}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                        {/* Status change submenu */}
                        {onStatusChange && (
                          <>
                            <div className="border-t border-slate-700/60 my-1" />
                            <div className="px-3 py-1 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">ステータス変更</div>
                            {ALL_STATUSES.map((s) => (
                              <button
                                key={s}
                                role="menuitem"
                                onClick={() => {
                                  onStatusChange(doc.id, s)
                                  setMenuOpen(false)
                                }}
                                className={`w-full text-left px-4 py-2 transition-all duration-150 flex items-center gap-2.5 rounded-lg mx-auto text-xs ${
                                  docStatus === s ? `${STATUS_BADGE[s].text} ${STATUS_BADGE[s].bg} font-medium` : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                                }`}
                              >
                                <span className={`w-2 h-2 rounded-full ${STATUS_BADGE[s].dot}`} />
                                {s}
                                {docStatus === s && <Check size={11} className="ml-auto" />}
                              </button>
                            ))}
                            <div className="border-t border-slate-700/60 my-1" />
                          </>
                        )}
                        <button
                          role="menuitem"
                          onClick={async () => {
                            if (await confirm(`「${doc.title}」を削除しますか？`)) {
                              onDelete(doc.id)
                            }
                            setMenuOpen(false)
                          }}
                          className="w-full text-left px-4 py-2.5 text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all duration-150 flex items-center gap-2.5 rounded-lg mx-auto"
                        >
                          <Trash2 size={13} /> 削除
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Workflow buttons */}
            {onStatusChange && !isTrash && (
              <>
                {docStatus === '下書き' && (
                  <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); onStatusChange(doc.id, 'レビュー中') }}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-medium text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 rounded-lg transition-colors w-full justify-center"
                    >
                      <Send size={10} /> レビュー依頼
                    </button>
                  </div>
                )}
                {docStatus === 'レビュー中' && (
                  <div className="mt-2 flex items-center gap-1.5">
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); onStatusChange(doc.id, '承認済み') }}
                      className="flex-1 flex items-center gap-1 px-2 py-1.5 text-[10px] font-medium text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-lg transition-colors justify-center"
                    >
                      <CheckCircle2 size={10} /> 承認
                    </button>
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setRejectDialogOpen(true) }}
                      className="flex-1 flex items-center gap-1 px-2 py-1.5 text-[10px] font-medium text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors justify-center"
                    >
                      <RotateCw size={10} /> 差し戻し
                    </button>
                  </div>
                )}
              </>
            )}

            {/* Reject dialog */}
            {rejectDialogOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setRejectDialogOpen(false)} />
                <div className="absolute left-3 right-3 bottom-full mb-2 z-40 bg-slate-800/95 backdrop-blur-md border border-slate-700/80 rounded-xl shadow-2xl shadow-black/40 p-3 animate-[menuPop_0.15s_ease-out]">
                  <p className="text-[11px] text-slate-300 mb-2 font-medium">差し戻しコメント（任意）</p>
                  <input
                    type="text"
                    value={rejectComment}
                    onChange={(e) => setRejectComment(e.target.value)}
                    placeholder="理由を入力..."
                    className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-2.5 py-1.5 text-[11px] text-white placeholder-slate-500 focus:outline-none focus:border-red-500 mb-2"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  />
                  <div className="flex gap-1.5">
                    <button
                      onClick={(e) => {
                        e.preventDefault(); e.stopPropagation()
                        onStatusChange?.(doc.id, '下書き', rejectComment || undefined)
                        setRejectDialogOpen(false)
                        setRejectComment('')
                      }}
                      className="flex-1 px-2 py-1.5 text-[10px] font-medium text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors"
                    >
                      差し戻す
                    </button>
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setRejectDialogOpen(false); setRejectComment('') }}
                      className="flex-1 px-2 py-1.5 text-[10px] font-medium text-slate-400 bg-slate-700/50 hover:bg-slate-700/80 rounded-lg transition-colors"
                    >
                      キャンセル
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Content search matches */}
            {contentMatches && contentMatches.length > 0 && (
              <div className="mt-1.5 space-y-0.5">
                {contentMatches.map((m, i) => (
                  <p key={i} className="text-[10px] text-slate-500 truncate">
                    {m}
                  </p>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Pin badge */}
      {isPinned && !isTrash && (
        <div className="absolute top-2 right-10 z-10 w-6 h-6 flex items-center justify-center rounded-lg bg-amber-500/20 text-amber-400">
          <Pin size={11} />
        </div>
      )}

      {/* Pin button on hover */}
      {onTogglePin && !isTrash && !isPinned && (
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onTogglePin(doc.id) }}
          className="absolute top-2 right-10 z-10 w-6 h-6 flex items-center justify-center rounded-lg bg-black/20 hover:bg-black/40 text-white/40 hover:text-amber-400 opacity-0 group-hover:opacity-100 transition-all duration-200"
          title="ピン留め"
        >
          <Pin size={11} />
        </button>
      )}
      {onTogglePin && !isTrash && isPinned && (
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onTogglePin(doc.id) }}
          className="absolute top-2 right-10 z-10 w-6 h-6 flex items-center justify-center rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 transition-all duration-200"
          title="ピン留め解除"
        >
          <Pin size={11} />
        </button>
      )}

      {/* Right-click context menu (#25) */}
      {contextMenu && !isTrash && (
        <>
          <div className="fixed inset-0 z-[60]" onClick={() => setContextMenu(null)} onContextMenu={(e) => { e.preventDefault(); setContextMenu(null) }} />
          <div
            className="fixed z-[70] bg-slate-800/95 backdrop-blur-md border border-slate-700/80 rounded-xl shadow-2xl shadow-black/50 py-1.5 w-48 text-sm animate-context-menu"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <button
              onClick={() => { router.push(href); setContextMenu(null) }}
              className="w-full text-left px-4 py-2 text-slate-300 hover:bg-indigo-500/10 hover:text-white transition-all flex items-center gap-2.5 text-xs"
            >
              <ExternalLink size={13} /> 開く
            </button>
            <button
              onClick={() => {
                const newTitle = window.prompt('新しい名前', doc.title)
                if (newTitle && newTitle !== doc.title) {
                  // Name change would require a rename handler; for now just close
                }
                setContextMenu(null)
              }}
              className="w-full text-left px-4 py-2 text-slate-300 hover:bg-indigo-500/10 hover:text-white transition-all flex items-center gap-2.5 text-xs"
            >
              <Edit3 size={13} /> 名前を変更
            </button>
            <button
              onClick={() => { onDuplicate(doc.id); setContextMenu(null) }}
              className="w-full text-left px-4 py-2 text-slate-300 hover:bg-indigo-500/10 hover:text-white transition-all flex items-center gap-2.5 text-xs"
            >
              <Copy size={13} /> 複製
            </button>
            <div className="h-px bg-slate-700/60 my-1" />
            <button
              onClick={() => { onToggleFavorite?.(); setContextMenu(null) }}
              className="w-full text-left px-4 py-2 text-slate-300 hover:bg-indigo-500/10 hover:text-white transition-all flex items-center gap-2.5 text-xs"
            >
              <Star size={13} fill={isFavorite ? 'currentColor' : 'none'} className={isFavorite ? 'text-yellow-400' : ''} />
              {isFavorite ? 'お気に入り解除' : 'お気に入りに追加'}
            </button>
            {folders && folders.length > 0 && onMoveToFolder && (
              <>
                <div className="h-px bg-slate-700/60 my-1" />
                <div className="px-3 py-1 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">フォルダに移動</div>
                {currentFolder && (
                  <button
                    onClick={() => { onMoveToFolder(null); setContextMenu(null) }}
                    className="w-full text-left px-4 py-1.5 text-amber-400 hover:bg-amber-500/10 transition-all flex items-center gap-2.5 text-xs"
                  >
                    <FolderX size={12} /> フォルダから外す
                  </button>
                )}
                {folders.map((f) => (
                  <button
                    key={f}
                    onClick={() => { onMoveToFolder(f); setContextMenu(null) }}
                    className={`w-full text-left px-4 py-1.5 transition-all flex items-center gap-2.5 text-xs ${
                      currentFolder === f ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                    }`}
                  >
                    <FolderOpen size={12} /> {f}
                  </button>
                ))}
              </>
            )}
            <div className="h-px bg-slate-700/60 my-1" />
            <button
              onClick={async () => {
                setContextMenu(null)
                if (await confirm(`「${doc.title}」をゴミ箱に移動しますか？`)) {
                  onDelete(doc.id)
                }
              }}
              className="w-full text-left px-4 py-2 text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all flex items-center gap-2.5 text-xs"
            >
              <Trash2 size={13} /> ゴミ箱に移動
            </button>
          </div>
        </>
      )}

      {/* Document preview tooltip */}
      {showPreview && !isTrash && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-50 w-72 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-xl shadow-2xl shadow-black/50 overflow-hidden animate-[menuPop_0.15s_ease-out] pointer-events-auto">
          {/* Larger thumbnail */}
          <div className="h-40 w-full relative overflow-hidden" style={{ background: bgStyle }}>
            <div
              className="absolute inset-0 opacity-[0.07]"
              style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)', backgroundSize: '12px 12px' }}
            />
            <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/60 to-transparent" />
          </div>
          <div className="p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-sm font-semibold text-white truncate">{doc.title}</span>
              <span className={`shrink-0 text-[9px] px-1.5 py-0.5 rounded-full font-medium ${badge.bg} ${badge.text}`}>
                {badge.label}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mb-2">更新: {formatDate(doc.updatedAt)}</p>
            {tags.length > 0 && (
              <div className="flex items-center gap-1 mb-2">
                {tags.map((tag) => (
                  <span key={tag} className="inline-block px-1.5 py-px rounded-full text-[8px] font-medium" style={{ backgroundColor: tagColor(tag) + '18', color: tagColor(tag) }}>
                    {tag}
                  </span>
                ))}
              </div>
            )}
            <div className="flex items-center gap-1.5 pt-2 border-t border-slate-700/50">
              <Link
                href={href}
                className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-[10px] font-medium text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 rounded-lg transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <Eye size={10} /> 開く
              </Link>
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDuplicate(doc.id); setShowPreview(false) }}
                className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-[10px] font-medium text-slate-300 bg-slate-700/50 hover:bg-slate-700/80 rounded-lg transition-colors"
              >
                <Copy size={10} /> 複製
              </button>
              <button
                onClick={async (e) => {
                  e.preventDefault(); e.stopPropagation()
                  if (await confirm(`「${doc.title}」を削除しますか？`)) onDelete(doc.id)
                  setShowPreview(false)
                }}
                className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-[10px] font-medium text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors"
              >
                <Trash2 size={10} /> 削除
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes menuPop {
          from {
            opacity: 0;
            transform: scale(0.92) translateY(4px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </div>
  )
}

export default memo(DocumentCard)
