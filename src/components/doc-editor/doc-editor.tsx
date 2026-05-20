'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { DocDocument, Block } from '@/types'
import { useDocument } from '@/hooks/use-document'
import { deleteDocument } from '@/lib/cloud-store'
import { exportDocToHTML, exportDocToPDF, downloadFile } from '@/lib/export-utils'
import { exportDocToDOCX } from '@/lib/docx-export'
import { fileToDataURL, isStorageNearLimit } from '@/lib/image-utils'
import DocToolbar from './doc-toolbar'
import BlockList from './block-list'
import AiDocPanel from './ai-doc-panel'
import AiProofreadPanel from './ai-proofread-panel'
import FormatToolbar from './format-toolbar'
import FindReplace from './find-replace'
import WordCount from './word-count'
import StylesGallery from './styles-gallery'
import PageSettingsModal from './page-settings-modal'
import ReadingMode from './reading-mode'
import DocOutlinePanel from './doc-outline-panel'
import WatermarkSettings from './watermark-settings'
import SpecialCharsModal from './special-chars-modal'
import BookmarkPanel from './bookmark-panel'
import GotoDialog from './goto-dialog'
import DocLinkPicker from './doc-link-picker'
import PdfAiPanel from '../shared/pdf-ai-panel'
import CommentPanel from '../shared/comment-panel'
import ShortcutsHelp from '../shared/shortcuts-help'
import ShareModal from '../shared/share-modal'
import VersionPanel from '../shared/version-panel'

interface Props {
  initialDoc: DocDocument
}

export default function DocEditor({ initialDoc }: Props) {
  const { state, dispatch, canUndo, canRedo } = useDocument()
  const [aiOpen, setAiOpen] = useState(false)
  const [proofreadOpen, setProofreadOpen] = useState(false)
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [versionsOpen, setVersionsOpen] = useState(false)
  const [findOpen, setFindOpen] = useState(false)
  const [pageSettingsOpen, setPageSettingsOpen] = useState(false)
  const [readingMode, setReadingMode] = useState(false)
  const [outlineOpen, setOutlineOpen] = useState(false)
  const [watermarkOpen, setWatermarkOpen] = useState(false)
  const [specialCharsOpen, setSpecialCharsOpen] = useState(false)
  const [bookmarksOpen, setBookmarksOpen] = useState(false)
  const [gotoOpen, setGotoOpen] = useState(false)
  const [docLinkOpen, setDocLinkOpen] = useState(false)
  const [docLinkAnchor, setDocLinkAnchor] = useState<{ top: number; left: number } | null>(null)
  const [pdfAiOpen, setPdfAiOpen] = useState(false)
  const [zoom, setZoom] = useState(100)
  const [pageLayout, setPageLayout] = useState(false)
  const [showFormattingMarks, setShowFormattingMarks] = useState(false)
  const [focusedBlockId, setFocusedBlockId] = useState<string | null>(null)
  const router = useRouter()
  const articleRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    dispatch({ type: 'LOAD', doc: initialDoc })
  }, [initialDoc.meta.id])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        dispatch({ type: 'UNDO' })
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
        e.preventDefault()
        dispatch({ type: 'REDO' })
      }
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault()
        setShortcutsOpen(true)
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault()
        setFindOpen(true)
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'h') {
        e.preventDefault()
        setFindOpen(true)
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'g') {
        e.preventDefault()
        setGotoOpen(true)
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        const sel = window.getSelection()
        if (sel && sel.rangeCount > 0) {
          const range = sel.getRangeAt(0)
          const rect = range.getBoundingClientRect()
          setDocLinkAnchor({ top: rect.bottom, left: rect.left })
        }
        setDocLinkOpen(true)
      }
      // Zoom shortcuts
      if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) {
        e.preventDefault()
        setZoom((z) => Math.min(200, z + 25))
      }
      if ((e.ctrlKey || e.metaKey) && e.key === '-') {
        e.preventDefault()
        setZoom((z) => Math.max(50, z - 25))
      }
      if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault()
        setZoom(100)
      }
      // F11 reading mode
      if (e.key === 'F11') {
        e.preventDefault()
        setReadingMode(true)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [dispatch])

  // Ctrl+scroll zoom
  useEffect(() => {
    function handleWheel(e: WheelEvent) {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        setZoom((z) => Math.min(200, Math.max(50, z + (e.deltaY > 0 ? -10 : 10))))
      }
    }
    window.addEventListener('wheel', handleWheel, { passive: false })
    return () => window.removeEventListener('wheel', handleWheel)
  }, [])

  // Clipboard image paste
  useEffect(() => {
    async function handlePaste(e: ClipboardEvent) {
      const items = e.clipboardData?.items
      if (!items) return
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault()
          const file = item.getAsFile()
          if (!file) return
          if (isStorageNearLimit()) {
            alert('ストレージの容量が不足しています。')
            return
          }
          const dataUrl = await fileToDataURL(file)
          const lastBlock = state.blocks[state.blocks.length - 1]
          if (lastBlock) {
            dispatch({ type: 'ADD_BLOCK', afterId: lastBlock.id, blockType: 'image' })
            // Wait for block to be added then set image data
            setTimeout(() => {
              const lastId = state.blocks[state.blocks.length - 1]?.id
              if (lastId) {
                dispatch({ type: 'UPDATE_BLOCK_DATA', id: lastId, data: { src: dataUrl, alt: 'Pasted image' } })
              }
            }, 100)
          }
          break
        }
      }
    }
    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [state.blocks, dispatch])

  // Drag and drop image into editor
  const [dragOver, setDragOver] = useState(false)

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (!file || !file.type.startsWith('image/')) return
    if (isStorageNearLimit()) {
      alert('ストレージの容量が不足しています。')
      return
    }
    const dataUrl = await fileToDataURL(file)
    const lastBlock = state.blocks[state.blocks.length - 1]
    if (lastBlock) {
      dispatch({ type: 'ADD_BLOCK', afterId: lastBlock.id, blockType: 'image' })
      setTimeout(() => {
        const blocks = state.blocks
        dispatch({
          type: 'UPDATE_BLOCK_DATA',
          id: blocks[blocks.length - 1]?.id || '',
          data: { src: dataUrl, alt: file.name },
        })
      }, 100)
    }
  }

  function handleExport() {
    const html = exportDocToHTML(state)
    downloadFile(html, `${state.meta.title || 'document'}.html`)
  }

  function handleExportPDF() {
    exportDocToPDF(state)
  }

  async function handleExportDOCX() {
    await exportDocToDOCX(state)
  }

  function handlePrint() {
    const prevTitle = document.title
    document.title = state.meta.title || 'document'
    window.print()
    document.title = prevTitle
  }

  async function handleDelete() {
    if (!window.confirm(`「${state.meta.title || '無題のドキュメント'}」を削除しますか？この操作は取り消せません。`))
      return
    await deleteDocument(state.meta.id)
    router.push('/dashboard')
  }

  function handleAIInsert(blocks: Block[], title: string) {
    dispatch({ type: 'SET_BLOCKS', blocks, title })
  }

  const focusedBlock = state.blocks.find((b) => b.id === focusedBlockId)

  // Page layout styles
  const pageStyle: React.CSSProperties = {}
  if (state.pageSettings) {
    const ps = state.pageSettings
    pageStyle.paddingTop = `${ps.marginTop}mm`
    pageStyle.paddingBottom = `${ps.marginBottom}mm`
    pageStyle.paddingLeft = `${ps.marginLeft}mm`
    pageStyle.paddingRight = `${ps.marginRight}mm`
  }

  // Page dimensions for page layout mode (mm to px at 96 DPI)
  const mmToPx = (mm: number) => mm * 96 / 25.4
  const pageSizes = { a4: { w: 210, h: 297 }, letter: { w: 216, h: 279 }, legal: { w: 216, h: 356 } }
  const ps = state.pageSettings || { size: 'a4' as const, orientation: 'portrait' as const, marginTop: 20, marginBottom: 20, marginLeft: 25, marginRight: 25 }
  const pageSize = pageSizes[ps.size] || pageSizes.a4
  const pageWidthMm = ps.orientation === 'landscape' ? pageSize.h : pageSize.w
  const pageHeightMm = ps.orientation === 'landscape' ? pageSize.w : pageSize.h
  const pageWidthPx = mmToPx(pageWidthMm)
  const pageHeightPx = mmToPx(pageHeightMm)

  if (!state.meta.id) return null

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <DocToolbar
        state={state}
        onTitleChange={(title) => dispatch({ type: 'SET_TITLE', title })}
        onExport={handleExport}
        onExportPDF={handleExportPDF}
        onExportDOCX={handleExportDOCX}
        onPrint={handlePrint}
        onAI={() => setAiOpen(true)}
        onDelete={handleDelete}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={() => dispatch({ type: 'UNDO' })}
        onRedo={() => dispatch({ type: 'REDO' })}
        onComments={() => setCommentsOpen(!commentsOpen)}
        onSaveVersion={() => dispatch({ type: 'SAVE_VERSION' })}
        onShare={() => setShareOpen(true)}
        onVersions={() => setVersionsOpen(true)}
        onShortcuts={() => setShortcutsOpen(true)}
        onFindReplace={() => setFindOpen(!findOpen)}
        onPageSettings={() => setPageSettingsOpen(true)}
        onReadingMode={() => setReadingMode(true)}
        pageLayout={pageLayout}
        onPageLayout={() => setPageLayout(!pageLayout)}
        onOutline={() => setOutlineOpen(!outlineOpen)}
        onWatermark={() => setWatermarkOpen(true)}
        onSpecialChars={() => setSpecialCharsOpen(true)}
        onBookmarks={() => setBookmarksOpen(!bookmarksOpen)}
        onProofread={() => setProofreadOpen(!proofreadOpen)}
        onPdfImport={() => setPdfAiOpen(true)}
      />

      {/* Styles gallery */}
      {focusedBlock &&
        focusedBlock.type !== 'divider' &&
        focusedBlock.type !== 'image' &&
        focusedBlock.type !== 'toc' &&
        focusedBlock.type !== 'page-break' &&
        focusedBlock.type !== 'math' &&
        focusedBlock.type !== 'drawing' &&
        focusedBlock.type !== 'signature' &&
        focusedBlock.type !== 'cover-page' && (
          <div className="border-b border-slate-800 bg-slate-950/80">
            <StylesGallery
              currentType={focusedBlock.type}
              onChangeType={(type) => dispatch({ type: 'CHANGE_TYPE', id: focusedBlock.id, newType: type })}
            />
          </div>
        )}

      <FormatToolbar
        containerRef={articleRef}
        showFormattingMarks={showFormattingMarks}
        onToggleFormattingMarks={() => setShowFormattingMarks(!showFormattingMarks)}
      />

      {findOpen && (
        <FindReplace
          blocks={state.blocks}
          onReplace={(blockId, search, replacement, all) =>
            dispatch({ type: 'REPLACE_IN_BLOCK', id: blockId, search, replacement, all })
          }
          onClose={() => setFindOpen(false)}
        />
      )}

      {/* Header preview (continuous mode only) */}
      {!pageLayout && state.headerFooter && (state.headerFooter.headerLeft || state.headerFooter.headerCenter) && (
        <div className="flex items-center justify-between px-8 py-1 text-xs text-slate-500 border-b border-slate-800/50 max-w-2xl mx-auto w-full">
          <span>{state.headerFooter.headerLeft || ''}</span>
          <span>{state.headerFooter.headerCenter || ''}</span>
          <span>{state.headerFooter.headerRight || ''}</span>
        </div>
      )}

      <div className="flex-1 flex">
        <div
          className={`flex-1 flex justify-center py-10 max-md:px-3 overflow-y-auto ${
            pageLayout ? 'bg-slate-800/50 px-4' : 'px-6'
          }`}
          onClick={() => setFocusedBlockId(null)}
        >
          {pageLayout ? (
            /* ── Page Layout Mode: A4-style paper view ── */
            <div
              className="flex flex-col items-center gap-8 pb-16"
              style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
            >
              <div
                className={`bg-white text-slate-900 shadow-2xl shadow-black/20 relative ${showFormattingMarks ? 'show-formatting-marks' : ''}`}
                style={{
                  width: pageWidthPx,
                  minHeight: pageHeightPx,
                  paddingTop: `${ps.marginTop}mm`,
                  paddingBottom: `${ps.marginBottom}mm`,
                  paddingLeft: `${ps.marginLeft}mm`,
                  paddingRight: `${ps.marginRight}mm`,
                }}
                ref={articleRef}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
              >
                {/* Watermark */}
                {state.watermark && state.watermark.text && (
                  <div className="absolute inset-0 pointer-events-none select-none overflow-hidden z-0" aria-hidden="true">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span style={{
                        fontSize: `${state.watermark.fontSize}px`,
                        opacity: state.watermark.opacity / 100,
                        transform: `rotate(${state.watermark.rotation}deg)`,
                        color: state.watermark.color,
                        fontWeight: 'bold',
                        whiteSpace: 'nowrap',
                      }}>
                        {state.watermark.text}
                      </span>
                    </div>
                  </div>
                )}

                {/* Page header */}
                {state.headerFooter && (state.headerFooter.headerLeft || state.headerFooter.headerCenter) && (
                  <div className="flex items-center justify-between mb-4 text-[10px] text-slate-400 border-b border-slate-200 pb-2">
                    <span>{state.headerFooter.headerLeft || ''}</span>
                    <span>{state.headerFooter.headerCenter || ''}</span>
                    <span>{state.headerFooter.headerRight || ''}</span>
                  </div>
                )}

                <h1 className="text-3xl font-bold text-slate-900 mb-6 relative z-10">
                  {state.meta.title || 'ドキュメント'}
                </h1>

                <div className="relative z-10 page-layout-content">
                  <BlockList
                    blocks={state.blocks}
                    onUpdate={(id, content) => dispatch({ type: 'UPDATE_BLOCK', id, content })}
                    onUpdateData={(id, data) => dispatch({ type: 'UPDATE_BLOCK_DATA', id, data })}
                    onAdd={(afterId, blockType) => dispatch({ type: 'ADD_BLOCK', afterId, blockType })}
                    onDelete={(id) => dispatch({ type: 'DELETE_BLOCK', id })}
                    onChangeType={(id, newType) => dispatch({ type: 'CHANGE_TYPE', id, newType })}
                    onReorder={(fromIndex, toIndex) => dispatch({ type: 'REORDER_BLOCKS', fromIndex, toIndex })}
                    onIndent={(id) => dispatch({ type: 'INDENT_BLOCK', id })}
                    onOutdent={(id) => dispatch({ type: 'OUTDENT_BLOCK', id })}
                    onToggleChecked={(id) => dispatch({ type: 'TOGGLE_CHECKED', id })}
                    onSetCalloutVariant={(id, variant) => dispatch({ type: 'SET_CALLOUT_VARIANT', id, variant })}
                    onFocusBlock={(id) => setFocusedBlockId(id)}
                    onDuplicate={(id) => dispatch({ type: 'DUPLICATE_BLOCK', id })}
                    onMoveUp={(id) => dispatch({ type: 'MOVE_BLOCK_UP', id })}
                    onMoveDown={(id) => dispatch({ type: 'MOVE_BLOCK_DOWN', id })}
                    onSetBorder={(id, style, color, width) =>
                      dispatch({ type: 'SET_BLOCK_BORDER', id, borderStyle: style, borderColor: color, borderWidth: width })
                    }
                    onSetDropCap={(id, dropCap) => dispatch({ type: 'SET_DROP_CAP', id, dropCap })}
                    onSetTextColor={(id, color) => dispatch({ type: 'SET_BLOCK_TEXT_COLOR', id, textColor: color })}
                    onSetBgColor={(id, color) => dispatch({ type: 'SET_BLOCK_BG_COLOR', id, bgColor: color })}
                    onSetColumns={(id, columns) => dispatch({ type: 'SET_BLOCK_COLUMNS', id, columns })}
                    onSetLineSpacing={(id, lineSpacing) => dispatch({ type: 'SET_LINE_SPACING', id, lineSpacing })}
                    onSetParagraphSpacing={(id, paragraphSpacing) =>
                      dispatch({ type: 'SET_PARAGRAPH_SPACING', id, paragraphSpacing })
                    }
                    onSetAlign={(id, align) => dispatch({ type: 'SET_BLOCK_ALIGN', id, align })}
                  />
                </div>

                <div
                  className="mt-4 min-h-[60px] cursor-text relative z-10"
                  onClick={() => {
                    const last = state.blocks[state.blocks.length - 1]
                    if (last && last.content !== '') {
                      dispatch({ type: 'ADD_BLOCK', afterId: last.id, blockType: 'paragraph' })
                    }
                  }}
                />

                {/* Page footer */}
                {state.headerFooter && (state.headerFooter.footerLeft || state.headerFooter.showPageNumbers) && (
                  <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-200 pt-2"
                    style={{ paddingLeft: `${ps.marginLeft}mm`, paddingRight: `${ps.marginRight}mm`, paddingBottom: `${ps.marginBottom}mm` }}
                  >
                    <span>{state.headerFooter.footerLeft || ''}</span>
                    <span>{state.headerFooter.footerCenter || ''}</span>
                    <span>{state.headerFooter.showPageNumbers ? '1' : state.headerFooter.footerRight || ''}</span>
                  </div>
                )}
              </div>

              {/* Page indicator */}
              <div className="text-xs text-slate-500 font-medium">
                {ps.size.toUpperCase()} {ps.orientation === 'landscape' ? '横' : '縦'} - {pageWidthMm}mm x {pageHeightMm}mm
              </div>
            </div>
          ) : (
            /* ── Continuous Mode: default scrolling editor ── */
            <article
              ref={articleRef}
              className={`w-full max-w-2xl pl-8 max-md:pl-2 relative ${dragOver ? 'ring-2 ring-indigo-500/50 ring-inset' : ''} ${showFormattingMarks ? 'show-formatting-marks' : ''}`}
              style={{ ...pageStyle, transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
              onDragOver={(e) => {
                e.preventDefault()
                setDragOver(true)
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              {/* Watermark overlay */}
              {state.watermark && state.watermark.text && (
                <div className="absolute inset-0 pointer-events-none select-none overflow-hidden z-0" aria-hidden="true">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span
                      style={{
                        fontSize: `${state.watermark.fontSize}px`,
                        opacity: state.watermark.opacity / 100,
                        transform: `rotate(${state.watermark.rotation}deg)`,
                        color: state.watermark.color,
                        fontWeight: 'bold',
                        whiteSpace: 'nowrap',
                        userSelect: 'none',
                      }}
                    >
                      {state.watermark.text}
                    </span>
                  </div>
                </div>
              )}

              <h1 className="text-4xl font-bold text-white mb-8 max-md:text-2xl relative z-10">
                {state.meta.title || 'ドキュメント'}
              </h1>

              <div className="relative z-10">
                <BlockList
                  blocks={state.blocks}
                  onUpdate={(id, content) => dispatch({ type: 'UPDATE_BLOCK', id, content })}
                  onUpdateData={(id, data) => dispatch({ type: 'UPDATE_BLOCK_DATA', id, data })}
                  onAdd={(afterId, blockType) => dispatch({ type: 'ADD_BLOCK', afterId, blockType })}
                  onDelete={(id) => dispatch({ type: 'DELETE_BLOCK', id })}
                  onChangeType={(id, newType) => dispatch({ type: 'CHANGE_TYPE', id, newType })}
                  onReorder={(fromIndex, toIndex) => dispatch({ type: 'REORDER_BLOCKS', fromIndex, toIndex })}
                  onIndent={(id) => dispatch({ type: 'INDENT_BLOCK', id })}
                  onOutdent={(id) => dispatch({ type: 'OUTDENT_BLOCK', id })}
                  onToggleChecked={(id) => dispatch({ type: 'TOGGLE_CHECKED', id })}
                  onSetCalloutVariant={(id, variant) => dispatch({ type: 'SET_CALLOUT_VARIANT', id, variant })}
                  onFocusBlock={(id) => setFocusedBlockId(id)}
                  onDuplicate={(id) => dispatch({ type: 'DUPLICATE_BLOCK', id })}
                  onMoveUp={(id) => dispatch({ type: 'MOVE_BLOCK_UP', id })}
                  onMoveDown={(id) => dispatch({ type: 'MOVE_BLOCK_DOWN', id })}
                  onSetBorder={(id, style, color, width) =>
                    dispatch({ type: 'SET_BLOCK_BORDER', id, borderStyle: style, borderColor: color, borderWidth: width })
                  }
                  onSetDropCap={(id, dropCap) => dispatch({ type: 'SET_DROP_CAP', id, dropCap })}
                  onSetTextColor={(id, color) => dispatch({ type: 'SET_BLOCK_TEXT_COLOR', id, textColor: color })}
                  onSetBgColor={(id, color) => dispatch({ type: 'SET_BLOCK_BG_COLOR', id, bgColor: color })}
                  onSetColumns={(id, columns) => dispatch({ type: 'SET_BLOCK_COLUMNS', id, columns })}
                  onSetLineSpacing={(id, lineSpacing) => dispatch({ type: 'SET_LINE_SPACING', id, lineSpacing })}
                  onSetParagraphSpacing={(id, paragraphSpacing) =>
                    dispatch({ type: 'SET_PARAGRAPH_SPACING', id, paragraphSpacing })
                  }
                  onSetAlign={(id, align) => dispatch({ type: 'SET_BLOCK_ALIGN', id, align })}
                />
              </div>

              <div
                className="mt-4 min-h-[100px] cursor-text relative z-10"
                onClick={() => {
                  const last = state.blocks[state.blocks.length - 1]
                  if (last && last.content !== '') {
                    dispatch({ type: 'ADD_BLOCK', afterId: last.id, blockType: 'paragraph' })
                  }
                }}
              />
            </article>
          )}
        </div>

        {commentsOpen && (
          <CommentPanel
            comments={state.comments || []}
            onAdd={(text, parentId) => dispatch({ type: 'ADD_COMMENT', text, parentId })}
            onResolve={(id) => dispatch({ type: 'RESOLVE_COMMENT', id })}
            onDelete={(id) => dispatch({ type: 'DELETE_COMMENT', id })}
            onClose={() => setCommentsOpen(false)}
          />
        )}

        {bookmarksOpen && (
          <BookmarkPanel
            bookmarks={state.bookmarks || []}
            blocks={state.blocks}
            focusedBlockId={focusedBlockId}
            onAdd={(name, blockId) => dispatch({ type: 'ADD_BOOKMARK', name, blockId })}
            onDelete={(id) => dispatch({ type: 'DELETE_BOOKMARK', id })}
            onClose={() => setBookmarksOpen(false)}
          />
        )}

        {outlineOpen && <DocOutlinePanel blocks={state.blocks} onClose={() => setOutlineOpen(false)} />}
      </div>

      {/* Footer preview (continuous mode only) */}
      {!pageLayout && state.headerFooter && (state.headerFooter.footerLeft || state.headerFooter.showPageNumbers) && (
        <div className="flex items-center justify-between px-8 py-1 text-xs text-slate-500 border-t border-slate-800/50 max-w-2xl mx-auto w-full">
          <span>{state.headerFooter.footerLeft || ''}</span>
          <span>{state.headerFooter.footerCenter || ''}</span>
          <span>{state.headerFooter.showPageNumbers ? '1' : state.headerFooter.footerRight || ''}</span>
        </div>
      )}

      {/* Word count status bar with zoom */}
      <WordCount blocks={state.blocks} zoom={zoom} onZoomChange={setZoom} />

      {aiOpen && <AiDocPanel onInsert={handleAIInsert} onClose={() => setAiOpen(false)} />}

      {proofreadOpen && <AiProofreadPanel blocks={state.blocks} onClose={() => setProofreadOpen(false)} />}

      {pageSettingsOpen && (
        <PageSettingsModal
          pageSettings={state.pageSettings}
          headerFooter={state.headerFooter}
          onSavePageSettings={(settings) => dispatch({ type: 'SET_PAGE_SETTINGS', pageSettings: settings })}
          onSaveHeaderFooter={(settings) => dispatch({ type: 'SET_HEADER_FOOTER', headerFooter: settings })}
          onClose={() => setPageSettingsOpen(false)}
        />
      )}

      {readingMode && <ReadingMode doc={state} onExit={() => setReadingMode(false)} />}

      {watermarkOpen && (
        <WatermarkSettings
          watermark={state.watermark}
          onUpdate={(watermark) => dispatch({ type: 'SET_WATERMARK', watermark })}
          onClose={() => setWatermarkOpen(false)}
        />
      )}

      {gotoOpen && (
        <GotoDialog blocks={state.blocks} bookmarks={state.bookmarks || []} onClose={() => setGotoOpen(false)} />
      )}

      {specialCharsOpen && (
        <SpecialCharsModal
          onInsert={(char) => {
            document.execCommand('insertText', false, char)
          }}
          onClose={() => setSpecialCharsOpen(false)}
        />
      )}

      <DocLinkPicker
        open={docLinkOpen}
        anchorRect={docLinkAnchor}
        onSelect={(linkedDoc) => {
          const href =
            linkedDoc.type === 'slides'
              ? `/slides/${linkedDoc.id}`
              : linkedDoc.type === 'spreadsheet'
                ? `/spreadsheets/${linkedDoc.id}`
                : `/docs/${linkedDoc.id}`
          // Insert a styled link into the current selection
          document.execCommand(
            'insertHTML',
            false,
            `<a href="${href}" style="color: #818cf8; text-decoration: underline; cursor: pointer;" data-doc-link="${linkedDoc.id}" title="${linkedDoc.type === 'slides' ? 'スライド' : linkedDoc.type === 'spreadsheet' ? 'シート' : 'ドキュメント'}: ${linkedDoc.title}">📄 ${linkedDoc.title}</a>&nbsp;`,
          )
          setDocLinkOpen(false)
          setDocLinkAnchor(null)
        }}
        onClose={() => {
          setDocLinkOpen(false)
          setDocLinkAnchor(null)
        }}
      />

      <ShortcutsHelp open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} context="doc" />
      <ShareModal doc={state} open={shareOpen} onClose={() => setShareOpen(false)} />
      {versionsOpen && (
        <VersionPanel
          versions={state.versions || []}
          onRestore={(id) => dispatch({ type: 'RESTORE_VERSION', versionId: id })}
          onClose={() => setVersionsOpen(false)}
          currentData={JSON.stringify({ blocks: state.blocks })}
        />
      )}
      <PdfAiPanel
        open={pdfAiOpen}
        onClose={() => setPdfAiOpen(false)}
        context="doc"
        onInsertBlocks={(blocks, title) => dispatch({ type: 'SET_BLOCKS', blocks, title })}
      />
    </div>
  )
}
