'use client'

import Link from 'next/link'
import { useState } from 'react'
import type { DocumentMeta } from '@/types'
import { formatDate } from '@/lib/utils'
import { Presentation, FileText, Table2, MoreVertical, Copy, Trash2, FolderInput, FolderX } from 'lucide-react'

interface Props {
  doc: DocumentMeta
  onDelete: (id: string) => void
  onDuplicate: (id: string) => void
  folders?: string[]
  currentFolder?: string | null
  onMoveToFolder?: (folder: string | null) => void
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

const TYPE_ACCENT: Record<string, string> = {
  slides: 'bg-indigo-500',
  doc: 'bg-emerald-500',
  spreadsheet: 'bg-cyan-500',
}

export default function DocumentCard({ doc, onDelete, onDuplicate, folders, currentFolder, onMoveToFolder }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [folderSubmenu, setFolderSubmenu] = useState(false)
  const href =
    doc.type === 'slides'
      ? `/slides/${doc.id}`
      : doc.type === 'spreadsheet'
        ? `/spreadsheets/${doc.id}`
        : `/docs/${doc.id}`
  const bgStyle = GRADIENT_PREVIEWS[doc.thumbnailTheme ?? 'dark-blue'] ?? GRADIENT_PREVIEWS['dark-blue']

  return (
    <div className="group relative bg-slate-800/90 border border-slate-700/80 hover:border-slate-500/80 rounded-xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/5 hover:-translate-y-1 hover:bg-slate-800/80">
      {/* Left edge type accent stripe */}
      <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${TYPE_ACCENT[doc.type] || 'bg-indigo-500'} opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10`} />

      <Link href={href}>
        <div className="h-32 w-full relative overflow-hidden" style={{ background: bgStyle }}>
          {/* Dot pattern overlay */}
          <div
            className="absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)',
              backgroundSize: '12px 12px',
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            {doc.type === 'slides' ? (
              <Presentation size={34} className="opacity-25 text-white group-hover:scale-110 transition-transform duration-300" />
            ) : doc.type === 'spreadsheet' ? (
              <Table2 size={34} className="opacity-25 text-white group-hover:scale-110 transition-transform duration-300" />
            ) : (
              <FileText size={34} className="opacity-25 text-white group-hover:scale-110 transition-transform duration-300" />
            )}
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-black/50 via-black/20 to-transparent" />
          <div className="absolute bottom-2 left-3 flex items-center gap-1.5">
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

      <div className="p-3.5 flex items-start justify-between gap-2">
        <Link href={href} className="flex-1 min-w-0">
          <div className="text-[0.9rem] font-semibold text-white truncate leading-snug">{doc.title}</div>
          <div className="text-xs text-slate-500 mt-1 font-medium">{formatDate(doc.updatedAt)}</div>
        </Link>

        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-700/80 text-slate-500 hover:text-white transition-all duration-200"
            aria-label="メニュー"
            aria-expanded={menuOpen}
          >
            <MoreVertical size={16} />
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div
                className="absolute right-0 bottom-8 z-20 bg-slate-800/95 backdrop-blur-md border border-slate-700/80 rounded-xl shadow-2xl shadow-black/40 py-1.5 w-38 text-sm animate-[menuPop_0.15s_ease-out]"
                role="menu"
              >
                <button
                  role="menuitem"
                  onClick={() => {
                    onDuplicate(doc.id)
                    setMenuOpen(false)
                  }}
                  className="w-full text-left px-3.5 py-2 text-slate-300 hover:bg-indigo-500/10 hover:text-white transition-all duration-150 flex items-center gap-2.5 rounded-lg mx-auto"
                >
                  <Copy size={13} /> 複製
                </button>
                {folders && folders.length > 0 && onMoveToFolder && (
                  <div className="relative">
                    <button
                      role="menuitem"
                      onClick={() => setFolderSubmenu(!folderSubmenu)}
                      className="w-full text-left px-3.5 py-2 text-slate-300 hover:bg-indigo-500/10 hover:text-white transition-all duration-150 flex items-center gap-2.5 rounded-lg mx-auto"
                    >
                      <FolderInput size={13} /> フォルダへ移動
                    </button>
                    {folderSubmenu && (
                      <div className="ml-2 border-l border-slate-700 pl-2 py-1">
                        {currentFolder && (
                          <button
                            onClick={() => { onMoveToFolder(null); setMenuOpen(false); setFolderSubmenu(false) }}
                            className="w-full text-left px-2 py-1 text-xs text-amber-400 hover:bg-amber-500/10 rounded flex items-center gap-1.5"
                          >
                            <FolderX size={11} /> フォルダから外す
                          </button>
                        )}
                        {folders.map((f) => (
                          <button
                            key={f}
                            onClick={() => { onMoveToFolder(f); setMenuOpen(false); setFolderSubmenu(false) }}
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
                <button
                  role="menuitem"
                  onClick={() => {
                    if (window.confirm(`「${doc.title}」を削除しますか？`)) {
                      onDelete(doc.id)
                    }
                    setMenuOpen(false)
                  }}
                  className="w-full text-left px-3.5 py-2 text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all duration-150 flex items-center gap-2.5 rounded-lg mx-auto"
                >
                  <Trash2 size={13} /> 削除
                </button>
              </div>
            </>
          )}
        </div>
      </div>

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
