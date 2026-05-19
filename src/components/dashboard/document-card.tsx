'use client'

import Link from 'next/link'
import { useState } from 'react'
import type { DocumentMeta } from '@/types'
import { formatDate } from '@/lib/utils'
import { Presentation, FileText, Table2, MoreVertical, Copy, Trash2 } from 'lucide-react'

interface Props {
  doc: DocumentMeta
  onDelete: (id: string) => void
  onDuplicate: (id: string) => void
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

export default function DocumentCard({ doc, onDelete, onDuplicate }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const href =
    doc.type === 'slides'
      ? `/slides/${doc.id}`
      : doc.type === 'spreadsheet'
        ? `/spreadsheets/${doc.id}`
        : `/docs/${doc.id}`
  const bgStyle = GRADIENT_PREVIEWS[doc.thumbnailTheme ?? 'dark-blue'] ?? GRADIENT_PREVIEWS['dark-blue']

  return (
    <div className="group relative bg-slate-800 border border-slate-700 hover:border-slate-500 rounded-xl overflow-hidden transition-all duration-200 hover:shadow-xl hover:shadow-indigo-500/10 hover:-translate-y-0.5">
      <Link href={href}>
        <div className="h-32 w-full relative overflow-hidden" style={{ background: bgStyle }}>
          <div className="absolute inset-0 flex items-center justify-center">
            {doc.type === 'slides' ? (
              <Presentation size={32} className="opacity-30 text-white" />
            ) : doc.type === 'spreadsheet' ? (
              <Table2 size={32} className="opacity-30 text-white" />
            ) : (
              <FileText size={32} className="opacity-30 text-white" />
            )}
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-black/40 to-transparent" />
          <div className="absolute bottom-2 left-3 flex items-center gap-1">
            {doc.type === 'slides' ? (
              <Presentation size={10} className="text-white/70" />
            ) : doc.type === 'spreadsheet' ? (
              <Table2 size={10} className="text-white/70" />
            ) : (
              <FileText size={10} className="text-white/70" />
            )}
            <span className="text-white/70 text-[10px] font-medium tracking-wide uppercase">
              {doc.type === 'slides' ? 'Slides' : doc.type === 'spreadsheet' ? 'Sheet' : 'Doc'}
            </span>
          </div>
        </div>
      </Link>

      <div className="p-3 flex items-start justify-between gap-2">
        <Link href={href} className="flex-1 min-w-0">
          <div className="text-sm font-medium text-white truncate">{doc.title}</div>
          <div className="text-xs text-slate-400 mt-0.5">{formatDate(doc.updatedAt)}</div>
        </Link>

        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
            aria-label="メニュー"
            aria-expanded={menuOpen}
          >
            <MoreVertical size={16} />
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div
                className="absolute right-0 bottom-8 z-20 bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-1 w-36 text-sm animate-slide-up"
                role="menu"
              >
                <button
                  role="menuitem"
                  onClick={() => {
                    onDuplicate(doc.id)
                    setMenuOpen(false)
                  }}
                  className="w-full text-left px-3 py-2 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors flex items-center gap-2"
                >
                  <Copy size={13} /> 複製
                </button>
                <button
                  role="menuitem"
                  onClick={() => {
                    if (window.confirm(`「${doc.title}」を削除しますか？`)) {
                      onDelete(doc.id)
                    }
                    setMenuOpen(false)
                  }}
                  className="w-full text-left px-3 py-2 text-red-400 hover:bg-slate-700 hover:text-red-300 transition-colors flex items-center gap-2"
                >
                  <Trash2 size={13} /> 削除
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
