'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import type { DocumentMeta } from '@/types'
import { listDocuments } from '@/lib/storage/cloud-store'
import { FileText, Presentation, Table2, Link2, Search, ExternalLink } from 'lucide-react'

interface Props {
  open: boolean
  anchorRect?: { top: number; left: number } | null
  onSelect: (doc: DocumentMeta) => void
  onClose: () => void
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  doc: <FileText size={14} className="text-emerald-400" />,
  slides: <Presentation size={14} className="text-indigo-400" />,
  spreadsheet: <Table2 size={14} className="text-cyan-400" />,
}

export default function DocLinkPicker({ open, anchorRect, onSelect, onClose }: Props) {
  const [docs, setDocs] = useState<DocumentMeta[]>([])
  const [search, setSearch] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      listDocuments().then(setDocs)
      setSearch('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open, onClose])

  const filtered = useMemo(() => {
    if (!search.trim()) return docs
    const q = search.toLowerCase()
    return docs.filter((d) => d.title.toLowerCase().includes(q))
  }, [docs, search])

  useEffect(() => {
    setSelectedIndex(0)
  }, [search])

  const looksLikeUrl = search.includes('.') || search.startsWith('http')

  function insertExternalLink() {
    const url = search.startsWith('http') ? search : `https://${search}`
    const sel = window.getSelection()
    const text = sel?.toString() || url
    document.execCommand(
      'insertHTML',
      false,
      `<a href="${url}" style="color: #818cf8; text-decoration: underline;" target="_blank" rel="noopener noreferrer">${text}</a>&nbsp;`
    )
    onClose()
  }

  // When the external URL option is shown, it takes index 0 and shifts doc indices by 1
  const hasUrlOption = looksLikeUrl
  const totalItems = (hasUrlOption ? 1 : 0) + filtered.length

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((i) => Math.min(i + 1, totalItems - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (hasUrlOption && selectedIndex === 0) {
        insertExternalLink()
      } else {
        const docIndex = hasUrlOption ? selectedIndex - 1 : selectedIndex
        if (filtered[docIndex]) {
          onSelect(filtered[docIndex])
        }
      }
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  if (!open) return null

  const style: React.CSSProperties = anchorRect
    ? { position: 'fixed', top: anchorRect.top + 24, left: anchorRect.left, zIndex: 100 }
    : { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 100 }

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        ref={containerRef}
        className="w-80 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl shadow-black/40 overflow-hidden animate-scale-in"
        style={style}
      >
        <div className="p-2 border-b border-slate-800">
          <div className="relative">
            <Search size={13} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="ドキュメントを検索..."
              className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-7 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="max-h-60 overflow-y-auto py-1 custom-scrollbar">
          {hasUrlOption && (
            <button
              onClick={insertExternalLink}
              className={`w-full text-left px-3 py-2 flex items-center gap-2 transition-colors ${
                selectedIndex === 0 ? 'bg-indigo-500/15 text-white' : 'text-indigo-400 hover:bg-indigo-500/15'
              }`}
            >
              <ExternalLink size={14} />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium">外部リンクとして挿入</div>
                <div className="text-[10px] text-slate-500 truncate">
                  {search.startsWith('http') ? search : `https://${search}`}
                </div>
              </div>
            </button>
          )}
          {filtered.length === 0 && !hasUrlOption ? (
            <div className="px-3 py-4 text-center text-xs text-slate-500">ドキュメントが見つかりません</div>
          ) : (
            filtered.map((doc, i) => {
              const itemIndex = hasUrlOption ? i + 1 : i
              return (
                <button
                  key={doc.id}
                  onClick={() => onSelect(doc)}
                  className={`w-full text-left px-3 py-2 flex items-center gap-2 transition-colors ${
                    itemIndex === selectedIndex ? 'bg-indigo-500/15 text-white' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {TYPE_ICONS[doc.type] || <FileText size={14} className="text-slate-400" />}
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate">{doc.title}</div>
                    <div className="text-[10px] text-slate-500">
                      {doc.type === 'slides' ? 'スライド' : doc.type === 'spreadsheet' ? 'シート' : 'ドキュメント'}
                    </div>
                  </div>
                  <Link2 size={12} className="text-slate-600 flex-shrink-0" />
                </button>
              )
            })
          )}
        </div>

        <div className="px-3 py-1.5 border-t border-slate-800 text-[10px] text-slate-600">
          ↑↓ 移動 · Enter 選択 · Esc 閉じる
        </div>
      </div>
    </>
  )
}
