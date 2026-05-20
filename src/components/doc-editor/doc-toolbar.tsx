'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import type { DocDocument } from '@/types'
import {
  ArrowLeft,
  Undo2,
  Redo2,
  Save,
  History,
  MessageSquare,
  Share2,
  Keyboard,
  Sparkles,
  Download,
  Printer,
  Trash2,
  Search,
  FileText,
  BookOpen,
  PanelRight,
  Droplets,
  Sun,
  Moon,
  Omega,
  BookmarkIcon,
  FileDown,
  ChevronDown,
  SpellCheck,
  LayoutTemplate,
} from 'lucide-react'
import { t } from '@/lib/i18n'
import { useTheme } from '@/lib/theme-context'

interface Props {
  state: DocDocument
  onTitleChange: (title: string) => void
  onExport: () => void
  onExportPDF?: () => void
  onExportDOCX?: () => void
  onPrint?: () => void
  onAI: () => void
  onDelete: () => void
  canUndo?: boolean
  canRedo?: boolean
  onUndo?: () => void
  onRedo?: () => void
  onComments?: () => void
  onSaveVersion?: () => void
  onShare?: () => void
  onVersions?: () => void
  onShortcuts?: () => void
  onFindReplace?: () => void
  onPageSettings?: () => void
  onReadingMode?: () => void
  pageLayout?: boolean
  onPageLayout?: () => void
  onOutline?: () => void
  onWatermark?: () => void
  onSpecialChars?: () => void
  onBookmarks?: () => void
  onProofread?: () => void
  onPdfImport?: () => void
}

export default function DocToolbar({
  state,
  onTitleChange,
  onExport,
  onExportPDF,
  onExportDOCX,
  onPrint,
  onAI,
  onDelete,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onComments,
  onSaveVersion,
  onShare,
  onVersions,
  onShortcuts,
  onFindReplace,
  onPageSettings,
  onReadingMode,
  pageLayout,
  onPageLayout,
  onOutline,
  onWatermark,
  onSpecialChars,
  onBookmarks,
  onProofread,
  onPdfImport,
}: Props) {
  const commentCount = (state.comments || []).filter((c) => !c.resolved && !c.parentId).length
  const { theme, toggleTheme } = useTheme()
  const [exportOpen, setExportOpen] = useState(false)
  const exportRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false)
      }
    }
    if (exportOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [exportOpen])

  return (
    <header className="sticky top-0 z-10 flex items-center gap-2 px-4 py-2.5 border-b border-slate-800 bg-slate-950 no-print max-md:px-2">
      <Link
        href="/dashboard"
        className="text-slate-400 hover:text-white transition-colors text-sm flex items-center gap-1 flex-shrink-0"
      >
        <ArrowLeft size={14} />
        <span className="max-md:hidden">{t('nav.back').slice(2)}</span>
      </Link>

      <div className="w-px h-5 bg-slate-800 flex-shrink-0" />

      <input
        type="text"
        value={state.meta.title}
        onChange={(e) => onTitleChange(e.target.value)}
        className="flex-1 bg-transparent text-white text-sm font-medium placeholder-slate-500 focus:outline-none min-w-0"
        placeholder={t('editor.untitledDoc')}
      />

      <div className="flex items-center gap-1.5 flex-shrink-0">
        {onUndo && (
          <div className="flex items-center gap-0.5">
            <button
              onClick={onUndo}
              disabled={!canUndo}
              className="w-7 h-7 flex items-center justify-center rounded text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 transition-colors"
              title="元に戻す (Ctrl+Z)"
              aria-label="元に戻す"
            >
              <Undo2 size={15} />
            </button>
            <button
              onClick={onRedo}
              disabled={!canRedo}
              className="w-7 h-7 flex items-center justify-center rounded text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 transition-colors"
              title="やり直し (Ctrl+Y)"
              aria-label="やり直し"
            >
              <Redo2 size={15} />
            </button>
          </div>
        )}

        <span className="text-slate-500 text-xs hidden lg:block">{t('editor.autoSaved')}</span>

        <div className="w-px h-5 bg-slate-800" />

        {onSaveVersion && (
          <button
            onClick={onSaveVersion}
            className="w-7 h-7 flex items-center justify-center rounded border border-slate-700 hover:border-slate-500 bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title="バージョンを保存"
            aria-label="バージョンを保存"
          >
            <Save size={14} />
          </button>
        )}

        {onVersions && (
          <button
            onClick={onVersions}
            className="w-7 h-7 flex items-center justify-center rounded border border-slate-700 hover:border-slate-500 bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title="バージョン履歴"
            aria-label="バージョン履歴"
          >
            <History size={14} />
          </button>
        )}

        {onComments && (
          <button
            onClick={onComments}
            className="w-7 h-7 flex items-center justify-center rounded border border-slate-700 hover:border-slate-500 bg-slate-800 text-slate-400 hover:text-white transition-colors relative"
            title="コメント"
            aria-label="コメント"
          >
            <MessageSquare size={14} />
            {commentCount > 0 && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-indigo-500 text-white text-[9px] rounded-full flex items-center justify-center">
                {commentCount}
              </span>
            )}
          </button>
        )}

        {onShare && (
          <button
            onClick={onShare}
            className="w-7 h-7 flex items-center justify-center rounded border border-slate-700 hover:border-slate-500 bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title="共有"
            aria-label="共有"
          >
            <Share2 size={14} />
          </button>
        )}

        {onShortcuts && (
          <button
            onClick={onShortcuts}
            className="w-7 h-7 flex items-center justify-center rounded border border-slate-700 hover:border-slate-500 bg-slate-800 text-slate-400 hover:text-white transition-colors max-md:hidden"
            title="ショートカット (Ctrl+/)"
            aria-label="ショートカット"
          >
            <Keyboard size={14} />
          </button>
        )}

        {onFindReplace && (
          <button
            onClick={onFindReplace}
            className="w-7 h-7 flex items-center justify-center rounded border border-slate-700 hover:border-slate-500 bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title="検索・置換 (Ctrl+F)"
            aria-label="検索・置換"
          >
            <Search size={14} />
          </button>
        )}

        {onPageSettings && (
          <button
            onClick={onPageSettings}
            className="w-7 h-7 flex items-center justify-center rounded border border-slate-700 hover:border-slate-500 bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title="ページ設定"
            aria-label="ページ設定"
          >
            <FileText size={14} />
          </button>
        )}

        {onPageLayout && (
          <button
            onClick={onPageLayout}
            className={`w-7 h-7 flex items-center justify-center rounded border transition-colors ${
              pageLayout
                ? 'border-indigo-500 bg-indigo-600/20 text-indigo-400'
                : 'border-slate-700 hover:border-slate-500 bg-slate-800 text-slate-400 hover:text-white'
            }`}
            title="ページレイアウト"
            aria-label="ページレイアウト"
          >
            <LayoutTemplate size={14} />
          </button>
        )}

        {onReadingMode && (
          <button
            onClick={onReadingMode}
            className="w-7 h-7 flex items-center justify-center rounded border border-slate-700 hover:border-slate-500 bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title="閲覧モード"
            aria-label="閲覧モード"
          >
            <BookOpen size={14} />
          </button>
        )}

        {onOutline && (
          <button
            onClick={onOutline}
            className="w-7 h-7 flex items-center justify-center rounded border border-slate-700 hover:border-slate-500 bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title="ドキュメント構成"
            aria-label="ドキュメント構成"
          >
            <PanelRight size={14} />
          </button>
        )}

        {onWatermark && (
          <button
            onClick={onWatermark}
            className="w-7 h-7 flex items-center justify-center rounded border border-slate-700 hover:border-slate-500 bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title="透かし設定"
            aria-label="透かし設定"
          >
            <Droplets size={14} />
          </button>
        )}

        {onSpecialChars && (
          <button
            onClick={onSpecialChars}
            className="w-7 h-7 flex items-center justify-center rounded border border-slate-700 hover:border-slate-500 bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title="特殊文字の挿入"
            aria-label="特殊文字の挿入"
          >
            <Omega size={14} />
          </button>
        )}

        {onBookmarks && (
          <button
            onClick={onBookmarks}
            className="w-7 h-7 flex items-center justify-center rounded border border-slate-700 hover:border-slate-500 bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title="ブックマーク"
            aria-label="ブックマーク"
          >
            <BookmarkIcon size={14} />
          </button>
        )}

        <button
          onClick={toggleTheme}
          className="w-7 h-7 flex items-center justify-center rounded border border-slate-700 hover:border-slate-500 bg-slate-800 text-slate-400 hover:text-white transition-colors"
          title={theme === 'dark' ? 'ライトモード' : 'ダークモード'}
          aria-label="テーマ切替"
        >
          {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
        </button>

        <div className="w-px h-5 bg-slate-800" />

        <button
          onClick={onAI}
          className="flex items-center gap-1 px-2.5 py-1 rounded border border-slate-700 hover:border-indigo-500 bg-slate-800 hover:bg-indigo-500/10 text-slate-300 hover:text-indigo-400 text-xs transition-all active:scale-95"
        >
          <Sparkles size={13} /> <span className="max-md:hidden">{t('editor.aiGenerate').replace('✨ ', '')}</span>
        </button>

        {onPdfImport && (
          <button
            onClick={onPdfImport}
            className="flex items-center gap-1 px-2.5 py-1 rounded border border-slate-700 hover:border-rose-500 bg-slate-800 hover:bg-rose-500/10 text-slate-300 hover:text-rose-400 text-xs transition-all active:scale-95"
            title="PDFを読み込んでAI処理"
          >
            <FileDown size={13} /> <span className="max-md:hidden">PDF取込</span>
          </button>
        )}

        {onProofread && (
          <button
            onClick={onProofread}
            className="w-7 h-7 flex items-center justify-center rounded border border-slate-700 hover:border-indigo-500 bg-slate-800 hover:bg-indigo-500/10 text-slate-400 hover:text-indigo-400 transition-colors"
            title="AI文章校正"
            aria-label="AI文章校正"
          >
            <SpellCheck size={14} />
          </button>
        )}

        <div className="relative" ref={exportRef}>
          <button
            onClick={() => setExportOpen(!exportOpen)}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-all active:scale-95"
            title="エクスポート"
          >
            <FileDown size={14} />
            <span className="max-md:hidden">{t('editor.export')}</span>
            <ChevronDown size={12} />
          </button>
          {exportOpen && (
            <div className="absolute right-0 top-full mt-1 w-40 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 py-1">
              <button
                onClick={() => { onExport(); setExportOpen(false) }}
                className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
              >
                HTML (.html)
              </button>
              {onExportPDF && (
                <button
                  onClick={() => { onExportPDF(); setExportOpen(false) }}
                  className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                >
                  PDF (.pdf)
                </button>
              )}
              {onExportDOCX && (
                <button
                  onClick={() => { onExportDOCX(); setExportOpen(false) }}
                  className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                >
                  Word (.docx)
                </button>
              )}
            </div>
          )}
        </div>

        {onPrint && (
          <button
            onClick={onPrint}
            className="w-7 h-7 flex items-center justify-center rounded border border-slate-700 hover:border-slate-500 bg-slate-800 text-slate-400 hover:text-white transition-colors max-md:hidden"
            title="印刷"
            aria-label="印刷"
          >
            <Printer size={14} />
          </button>
        )}

        <button
          onClick={onDelete}
          className="w-7 h-7 flex items-center justify-center rounded border border-slate-700 hover:border-red-500 bg-slate-800 hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-colors"
          title="削除"
          aria-label="削除"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </header>
  )
}
