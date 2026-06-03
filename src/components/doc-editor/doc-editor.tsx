'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { DocDocument, Block, BlockType } from '@/types'
import { getBrandSettings, type BrandSettings } from '@/lib/themes'
import { useDocument } from '@/hooks/use-document'
import { useDocEditorState } from '@/hooks/use-doc-editor-state'
import { deleteDocument } from '@/lib/storage/cloud-store'
import { exportDocToHTML, exportDocToPDF, exportDocToMarkdown, exportDocToText, downloadFile } from '@/lib/export/export-utils'
import { exportDocToDOCX } from '@/lib/export/docx-export'
import { fileToDataURL, isStorageNearLimit } from '@/lib/image-utils'
import { Clipboard, ClipboardPaste, Type } from 'lucide-react'
import { useToast } from '@/components/shared/toast'
import RibbonToolbar from './ribbon-toolbar'
import BlockList from './block-list'
import AiDocPanel from './ai-doc-panel'
import AiProofreadPanel from './ai-proofread-panel'
import AiTextToolsPanel from './ai-text-tools-panel'
import FindReplace from './find-replace'
import WordCount from './word-count'
import PageSettingsModal from './page-settings-modal'
import ReadingMode from './reading-mode'
import WatermarkSettings from './watermark-settings'
import SpecialCharsModal from './special-chars-modal'
import TrackChangesPanel from './track-changes-panel'
import GotoDialog from './goto-dialog'
import DocLinkPicker from './doc-link-picker'
import MailMergeModal from './mail-merge-modal'
import VersionCompareModal from './version-compare-modal'
import FloatingToolbar from './floating-toolbar'
import ShortcutsHint from './shortcuts-hint'
import PageHeaderFooter from './page-header-footer'
import PageRuler from './page-ruler'
import MultiSelectToolbar from './multi-select-toolbar'
import TemplatesModal from './templates-modal'
import CommandPalette from './command-palette'
import WelcomeScreen from './welcome-screen'
import UnifiedSidebar from './unified-sidebar'
import FigureTocModal from './figure-toc-modal'
import CrossReferenceModal from './cross-reference-modal'
import BibliographyPanel from './bibliography-panel'
import IndexGeneratorModal from './index-generator-modal'
import DocxImport from './docx-import'
import VersionDiffModal from './version-diff-modal'
import DocumentCompare from './document-compare'
import VoiceInput from './voice-input'
import WordCountGoal from './word-count-goal'
import PdfAiPanel from '../shared/pdf-ai-panel'
import ShortcutsHelp from '../shared/shortcuts-help'
import ShareModal from '../shared/share-modal'
import VersionPanel from '../shared/version-panel'
import VersionHistoryPanel from '../shared/version-history-panel'
import { saveVersion, getVersionData } from '@/lib/version-history'

interface Props {
  initialDoc: DocDocument
}

export default function DocEditor({ initialDoc }: Props) {
  const { state, dispatch, canUndo, canRedo } = useDocument()
  const { addToast, confirm } = useToast()
  const { dialogs, findReplace, navigation, display, save, clipboard } = useDocEditorState()

  // Destructure for convenience
  const {
    aiOpen, setAiOpen, proofreadOpen, setProofreadOpen, aiTextToolsOpen, setAiTextToolsOpen,
    commentsOpen, setCommentsOpen, commandPaletteOpen, setCommandPaletteOpen,
    sidebarOpen, setSidebarOpen, shortcutsOpen, setShortcutsOpen,
    shareOpen, setShareOpen, versionsOpen, setVersionsOpen,
    pageSettingsOpen, setPageSettingsOpen, readingMode, setReadingMode,
    watermarkOpen, setWatermarkOpen, specialCharsOpen, setSpecialCharsOpen,
    trackChangesOpen, setTrackChangesOpen, mailMergeOpen, setMailMergeOpen,
    templatesOpen, setTemplatesOpen, gotoOpen, setGotoOpen,
    docLinkOpen, setDocLinkOpen, pdfAiOpen, setPdfAiOpen,
    versionHistoryOpen, setVersionHistoryOpen, compareOpen, setCompareOpen,
    figureTocOpen, setFigureTocOpen, crossRefOpen, setCrossRefOpen,
    bibliographyOpen, setBibliographyOpen, indexGenOpen, setIndexGenOpen,
    docxImportOpen, setDocxImportOpen, versionDiffOpen, setVersionDiffOpen,
    docCompareOpen, setDocCompareOpen, clipHistoryOpen, setClipHistoryOpen,
  } = dialogs
  const { findOpen, setFindOpen } = findReplace
  const {
    focusedBlockId, setFocusedBlockId, selectedBlockIds, setSelectedBlockIds,
    outlinePanelOpen, setOutlinePanelOpen, focusMode, setFocusMode,
    docLinkAnchor, setDocLinkAnchor,
  } = navigation
  const {
    zoom, setZoom, pageLayout, setPageLayout,
    showFormattingMarks, setShowFormattingMarks, showLineNumbers, setShowLineNumbers,
    spellCheckEnabled, setSpellCheckEnabled, pageCount, setPageCount,
    dragOver, setDragOver,
  } = display
  const { saveStatus, setSaveStatus, saveFlash, setSaveFlash } = save
  const {
    clipboardHistory, setClipboardHistory, pasteOptionsPos, setPasteOptionsPos,
    pasteOptionsTimer, lastPasteData,
  } = clipboard

  const router = useRouter()
  const articleRef = useRef<HTMLDivElement>(null)

  // Brand settings
  const [brandSettings, setBrandSettingsState] = useState<BrandSettings | null>(null)
  useEffect(() => {
    setBrandSettingsState(getBrandSettings())
  }, [])

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
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        setSaveFlash(true)
        setTimeout(() => setSaveFlash(false), 2000)
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
        // Ctrl+K opens command palette (Ctrl+Shift+K for doc link)
        if (e.shiftKey) {
          const sel = window.getSelection()
          if (sel && sel.rangeCount > 0) {
            const range = sel.getRangeAt(0)
            const rect = range.getBoundingClientRect()
            setDocLinkAnchor({ top: rect.bottom, left: rect.left })
          }
          setDocLinkOpen(true)
        } else {
          setCommandPaletteOpen(true)
        }
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
      // Ctrl+D duplicate block
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault()
        if (focusedBlockId) {
          dispatch({ type: 'DUPLICATE_BLOCK', id: focusedBlockId })
        }
      }
      // Ctrl+Shift+V paste as plain text
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'V') {
        e.preventDefault()
        navigator.clipboard.readText().then((text) => {
          document.execCommand('insertText', false, text)
        }).catch(() => {})
      }
      // Shift+F3: cycle text case (lowercase → UPPERCASE → Title Case)
      if (e.shiftKey && e.key === 'F3') {
        e.preventDefault()
        const sel = window.getSelection()
        if (sel && !sel.isCollapsed && sel.rangeCount > 0) {
          const text = sel.toString()
          let transformed: string
          if (text === text.toLowerCase()) {
            transformed = text.toUpperCase()
          } else if (text === text.toUpperCase()) {
            transformed = text.replace(/\b\w/g, (c) => c.toUpperCase()).replace(/\B\w/g, (c) => c.toLowerCase())
          } else {
            transformed = text.toLowerCase()
          }
          document.execCommand('insertText', false, transformed)
        }
      }
      // Ctrl+Shift+1/2/3 for headings
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === '1') {
        e.preventDefault()
        if (focusedBlockId) dispatch({ type: 'CHANGE_TYPE', id: focusedBlockId, newType: 'h1' })
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === '2') {
        e.preventDefault()
        if (focusedBlockId) dispatch({ type: 'CHANGE_TYPE', id: focusedBlockId, newType: 'h2' })
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === '3') {
        e.preventDefault()
        if (focusedBlockId) dispatch({ type: 'CHANGE_TYPE', id: focusedBlockId, newType: 'h3' })
      }
      // Ctrl+Shift+L for bullet list
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'L') {
        e.preventDefault()
        if (focusedBlockId) dispatch({ type: 'CHANGE_TYPE', id: focusedBlockId, newType: 'bullet' })
      }
      // Ctrl+Shift+N for numbered list
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'N') {
        e.preventDefault()
        if (focusedBlockId) dispatch({ type: 'CHANGE_TYPE', id: focusedBlockId, newType: 'numbered' })
      }
      // Ctrl+Shift+0 for paragraph (reset)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === '0') {
        e.preventDefault()
        if (focusedBlockId) dispatch({ type: 'CHANGE_TYPE', id: focusedBlockId, newType: 'paragraph' })
      }
      // Ctrl+Shift+Q for quote
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'Q') {
        e.preventDefault()
        if (focusedBlockId) dispatch({ type: 'CHANGE_TYPE', id: focusedBlockId, newType: 'quote' })
      }
      // Ctrl+Shift+Space for non-breaking space
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === ' ') {
        e.preventDefault()
        document.execCommand('insertHTML', false, '&nbsp;')
      }
      // Ctrl+Shift+F focus mode
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'F') {
        e.preventDefault()
        setFocusMode((f) => !f)
      }
      // Ctrl+Shift+H: clipboard history
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'H') {
        e.preventDefault()
        setClipHistoryOpen(prev => !prev)
      }
      // Ctrl+A: select all blocks
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        // Only intercept if not focused in a specific text input
        const active = document.activeElement
        if (active?.getAttribute('contenteditable') === 'true') {
          // Let first Ctrl+A select within block, second Ctrl+A selects all blocks
          const sel = window.getSelection()
          const el = active as HTMLElement
          const textLen = el.textContent?.length || 0
          const selectedLen = sel?.toString().length || 0
          if (selectedLen >= textLen && textLen > 0) {
            e.preventDefault()
            setSelectedBlockIds(state.blocks.map(b => b.id))
          }
          // First Ctrl+A: let browser handle (selects text in block)
        } else {
          e.preventDefault()
          setSelectedBlockIds(state.blocks.map(b => b.id))
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [dispatch, focusedBlockId, state.blocks])

  // Clipboard history: track copy/cut events
  useEffect(() => {
    function handleCopy() {
      setTimeout(() => {
        const text = window.getSelection()?.toString()
        if (text) {
          setClipboardHistory(prev => [text, ...prev.filter(t => t !== text)].slice(0, 5))
        }
      }, 0)
    }
    document.addEventListener('copy', handleCopy)
    document.addEventListener('cut', handleCopy)
    return () => {
      document.removeEventListener('copy', handleCopy)
      document.removeEventListener('cut', handleCopy)
    }
  }, [])

  // Save status indicator
  useEffect(() => {
    if (!state.meta.id) return
    setSaveStatus('saving')
    const timer = setTimeout(() => setSaveStatus('saved'), 1200)
    return () => clearTimeout(timer)
  }, [state.blocks, state.meta.title])

  // Listen for cloud store errors
  useEffect(() => {
    function handleCloudError(e: Event) {
      const detail = (e as CustomEvent).detail
      addToast(`保存エラー: ${detail.operation}`, 'error', 5000)
      setSaveStatus('error')
    }
    window.addEventListener('cloudstore:error', handleCloudError)
    return () => window.removeEventListener('cloudstore:error', handleCloudError)
  }, [addToast])

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
            addToast('ストレージの容量が不足しています。', 'warning')
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

  // Paste options popup: show after paste, auto-dismiss after 5 seconds
  useEffect(() => {
    function handlePasteOptions(e: ClipboardEvent) {
      // Don't show paste options for image pastes
      const items = e.clipboardData?.items
      if (items) {
        for (const item of items) {
          if (item.type.startsWith('image/')) return
        }
      }
      const html = e.clipboardData?.getData('text/html') || ''
      const text = e.clipboardData?.getData('text/plain') || ''
      if (!html && !text) return
      lastPasteData.current = { html, text }
      // Get position near paste location
      const sel = window.getSelection()
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0)
        const rect = range.getBoundingClientRect()
        setPasteOptionsPos({ x: rect.left, y: rect.bottom + 8 })
        // Auto-dismiss after 5 seconds
        if (pasteOptionsTimer.current) clearTimeout(pasteOptionsTimer.current)
        pasteOptionsTimer.current = setTimeout(() => setPasteOptionsPos(null), 5000)
      }
    }
    window.addEventListener('paste', handlePasteOptions)
    return () => {
      window.removeEventListener('paste', handlePasteOptions)
      if (pasteOptionsTimer.current) clearTimeout(pasteOptionsTimer.current)
    }
  }, [])

  // Dismiss paste options on any keydown or click
  useEffect(() => {
    if (!pasteOptionsPos) return
    function dismiss() { setPasteOptionsPos(null) }
    window.addEventListener('keydown', dismiss, { once: true })
    window.addEventListener('mousedown', dismiss, { once: true })
    return () => {
      window.removeEventListener('keydown', dismiss)
      window.removeEventListener('mousedown', dismiss)
    }
  }, [pasteOptionsPos])

  // Auto-save version snapshots to localStorage every 5 minutes
  const lastVersionSave = useRef(Date.now())
  useEffect(() => {
    if (!state.meta.id || state.blocks.length === 0) return
    if (Date.now() - lastVersionSave.current > 300000) {
      saveVersion(state.meta.id, state.meta.title || '無題', JSON.stringify({ blocks: state.blocks }))
      lastVersionSave.current = Date.now()
    }
  }, [state.blocks, state.meta.id, state.meta.title])

  const handleRestoreVersion = useCallback((versionId: string) => {
    const data = getVersionData(versionId)
    if (!data) return
    try {
      const parsed = JSON.parse(data)
      if (parsed.blocks) {
        dispatch({ type: 'SET_BLOCKS', blocks: parsed.blocks, title: state.meta.title })
      }
    } catch { /* ignore parse errors */ }
    setVersionHistoryOpen(false)
  }, [dispatch, state.meta.title])

  // Drag and drop image into editor
  async function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (!file || !file.type.startsWith('image/')) return
    if (isStorageNearLimit()) {
      addToast('ストレージの容量が不足しています。', 'warning')
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

  async function handleExportPDF() {
    addToast('PDF生成中...', 'info', 3000)
    try {
      await exportDocToPDF(state)
      addToast('PDFをダウンロードしました', 'success')
    } catch {
      addToast('PDF生成に失敗しました', 'error')
    }
  }

  async function handleExportDOCX() {
    await exportDocToDOCX(state)
  }

  function handleExportMarkdown() {
    const md = exportDocToMarkdown(state)
    downloadFile(md, `${state.meta.title || 'document'}.md`, 'text/markdown')
  }

  function handleExportText() {
    const txt = exportDocToText(state)
    downloadFile(txt, `${state.meta.title || 'document'}.txt`, 'text/plain')
  }

  function handlePrint() {
    const prevTitle = document.title
    document.title = state.meta.title || 'document'
    window.print()
    document.title = prevTitle
  }

  async function handleDelete() {
    if (!(await confirm(`「${state.meta.title || '無題のドキュメント'}」を削除しますか？この操作は取り消せません。`)))
      return
    await deleteDocument(state.meta.id)
    router.push('/dashboard')
  }

  function handleAIInsert(blocks: Block[], title: string) {
    dispatch({ type: 'SET_BLOCKS', blocks, title })
  }

  function handleReplaceBlocks(blockIds: string[], newBlocks: Block[]) {
    const firstIdx = state.blocks.findIndex(b => blockIds.includes(b.id))
    if (firstIdx === -1) return
    const filtered = state.blocks.filter(b => !blockIds.includes(b.id))
    const updatedBlocks = [
      ...filtered.slice(0, firstIdx),
      ...newBlocks,
      ...filtered.slice(firstIdx),
    ]
    dispatch({ type: 'SET_BLOCKS', blocks: updatedBlocks })
  }

  function handleInsertBlocksAfter(afterBlockId: string, newBlocks: Block[]) {
    const idx = state.blocks.findIndex(b => b.id === afterBlockId)
    if (idx === -1) return
    const updatedBlocks = [
      ...state.blocks.slice(0, idx + 1),
      ...newBlocks,
      ...state.blocks.slice(idx + 1),
    ]
    dispatch({ type: 'SET_BLOCKS', blocks: updatedBlocks })
  }

  const handleSelectBlock = useCallback((id: string, e: React.MouseEvent) => {
    if (e.shiftKey && focusedBlockId) {
      // Range select from focusedBlockId to id
      const startIdx = state.blocks.findIndex((b) => b.id === focusedBlockId)
      const endIdx = state.blocks.findIndex((b) => b.id === id)
      if (startIdx !== -1 && endIdx !== -1) {
        const min = Math.min(startIdx, endIdx)
        const max = Math.max(startIdx, endIdx)
        const ids = state.blocks.slice(min, max + 1).map((b) => b.id)
        setSelectedBlockIds(ids)
      }
    } else if (e.ctrlKey || e.metaKey) {
      // Toggle individual
      setSelectedBlockIds((prev) =>
        prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
      )
    }
  }, [focusedBlockId, state.blocks])

  // Multi-select keyboard shortcuts
  useEffect(() => {
    function handleKeyForSelection(e: KeyboardEvent) {
      if (selectedBlockIds.length === 0) return
      if (e.key === 'Escape') {
        setSelectedBlockIds([])
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (document.activeElement?.getAttribute('contenteditable') === 'true') return
        if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return
        e.preventDefault()
        selectedBlockIds.forEach((id) => dispatch({ type: 'DELETE_BLOCK', id }))
        setSelectedBlockIds([])
      }
    }
    window.addEventListener('keydown', handleKeyForSelection)
    return () => window.removeEventListener('keydown', handleKeyForSelection)
  }, [selectedBlockIds, dispatch])

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

  // Page count calculation for page layout mode
  useEffect(() => {
    if (!pageLayout || !articleRef.current) return
    const computePages = () => {
      const el = articleRef.current
      if (!el) return
      const contentH = el.scrollHeight
      const usableH = pageHeightPx - mmToPx(ps.marginTop) - mmToPx(ps.marginBottom)
      const pages = Math.max(1, Math.ceil(contentH / usableH))
      setPageCount(pages)
    }
    computePages()
    const observer = new ResizeObserver(computePages)
    observer.observe(articleRef.current)
    return () => observer.disconnect()
  }, [pageLayout, state.blocks, pageHeightPx, ps.marginTop, ps.marginBottom])

  // Track changes wrapper for block updates
  const handleBlockUpdate = useCallback((id: string, content: string) => {
    if (state.trackChangesEnabled) {
      const block = state.blocks.find((b) => b.id === id)
      if (block && block.content !== content) {
        dispatch({
          type: 'ADD_TRACK_CHANGE',
          change: { blockId: id, type: 'modify', oldContent: block.content, newContent: content, author: 'ユーザー' },
        })
      }
    }
    dispatch({ type: 'UPDATE_BLOCK', id, content })
  }, [state.trackChangesEnabled, state.blocks, dispatch])

  const handleBlockAdd = useCallback((afterId: string, blockType: BlockType) => {
    if (state.trackChangesEnabled) {
      dispatch({
        type: 'ADD_TRACK_CHANGE',
        change: { blockId: afterId, type: 'insert', newContent: `[${blockType}]`, author: 'ユーザー' },
      })
    }
    dispatch({ type: 'ADD_BLOCK', afterId, blockType })
  }, [state.trackChangesEnabled, dispatch])

  const handleBlockDelete = useCallback((id: string) => {
    if (state.trackChangesEnabled) {
      const block = state.blocks.find((b) => b.id === id)
      if (block) {
        dispatch({
          type: 'ADD_TRACK_CHANGE',
          change: { blockId: id, type: 'delete', oldContent: block.content || '', author: 'ユーザー' },
        })
      }
    }
    dispatch({ type: 'DELETE_BLOCK', id })
  }, [state.trackChangesEnabled, state.blocks, dispatch])

  function handleVoiceTranscript(text: string) {
    // Insert transcribed text at cursor position
    document.execCommand('insertText', false, text)
  }

  function handleDocxImport(blocks: Block[], title: string) {
    dispatch({ type: 'SET_BLOCKS', blocks, title })
    setDocxImportOpen(false)
    addToast('DOCX ファイルをインポートしました', 'success')
  }

  function handleAiSummary() {
    // Collect all text content from blocks
    const textBlocks = state.blocks.filter(
      (b) => b.content && (b.type === 'paragraph' || b.type === 'h1' || b.type === 'h2' || b.type === 'h3' || b.type === 'h4' || b.type === 'h5' || b.type === 'h6' || b.type === 'bullet' || b.type === 'numbered' || b.type === 'quote')
    )
    if (textBlocks.length === 0) {
      addToast('要約するテキストがありません', 'warning')
      return
    }
    // Mock AI summary: take first sentence of each paragraph-type block
    const sentences: string[] = []
    for (const block of textBlocks) {
      const plainText = block.content
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .trim()
      if (!plainText) continue
      // Extract first sentence (ending with period, exclamation, question mark, or Japanese punctuation)
      const match = plainText.match(/^(.+?[。．.！!？?])/)
      if (match) {
        sentences.push(match[1])
      } else if (plainText.length > 0) {
        // If no sentence ending found, take first 80 chars
        sentences.push(plainText.length > 80 ? plainText.slice(0, 80) + '...' : plainText)
      }
      if (sentences.length >= 5) break // limit to 5 bullet points
    }
    if (sentences.length === 0) {
      addToast('要約するテキストが見つかりません', 'warning')
      return
    }
    // Build summary content as bullet points with robot icon label
    const summaryContent = sentences.map((s) => `• ${s}`).join('\n')
    const summaryBlock: Block = {
      id: `summary-${Date.now()}`,
      type: 'callout',
      content: `\u{1F916} <strong>AI要約</strong>\n${summaryContent}`,
      calloutVariant: 'info',
    }
    // Insert at the top of the document
    const updatedBlocks = [summaryBlock, ...state.blocks]
    dispatch({ type: 'SET_BLOCKS', blocks: updatedBlocks })
    addToast('AI要約を挿入しました', 'success')
  }

  function handleInsertOrUpdateToc() {
    // Check if a TOC block already exists
    const existingToc = state.blocks.find(b => b.type === 'toc')
    if (existingToc) {
      // Force re-render of the existing TOC block
      dispatch({ type: 'UPDATE_BLOCK', id: existingToc.id, content: `updated-${Date.now()}` })
      addToast('目次を更新しました', 'success')
    } else {
      // Insert a new TOC block at the focused position or at the beginning
      const afterId = focusedBlockId || state.blocks[0]?.id
      if (afterId) {
        dispatch({ type: 'ADD_BLOCK', afterId: focusedBlockId || '__before_first__', blockType: 'toc' })
        addToast('目次を挿入しました', 'success')
      }
    }
  }

  if (!state.meta.id) return null

  return (
    <div
      id="main-content"
      data-editor-shell
      className="min-h-screen bg-slate-950 flex flex-col"
      style={{ '--brand-color': brandSettings?.primaryColor || '#6366f1' } as React.CSSProperties}
    >
      {/* Dynamic @page CSS based on page settings */}
      {state.pageSettings && (
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            @page {
              size: ${state.pageSettings.size === 'a4' ? '210mm 297mm' : state.pageSettings.size === 'letter' ? '216mm 279mm' : '216mm 356mm'} ${state.pageSettings.orientation === 'landscape' ? 'landscape' : 'portrait'};
              margin: ${state.pageSettings.marginTop}mm ${state.pageSettings.marginRight}mm ${state.pageSettings.marginBottom}mm ${state.pageSettings.marginLeft}mm;
            }
          }
        `}} />
      )}
      <RibbonToolbar
        state={state}
        saveStatus={saveStatus}
        onTitleChange={(title) => dispatch({ type: 'SET_TITLE', title })}
        onExport={handleExport}
        onExportPDF={handleExportPDF}
        onExportDOCX={handleExportDOCX}
        onExportMarkdown={handleExportMarkdown}
        onExportText={handleExportText}
        onPrint={handlePrint}
        onAI={() => setAiOpen(true)}
        onDelete={handleDelete}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={() => dispatch({ type: 'UNDO' })}
        onRedo={() => dispatch({ type: 'REDO' })}
        onComments={() => setSidebarOpen(true)}
        onSaveVersion={() => dispatch({ type: 'SAVE_VERSION' })}
        onShare={() => setShareOpen(true)}
        onVersions={() => setVersionsOpen(true)}
        onVersionHistory={() => setVersionHistoryOpen(true)}
        onShortcuts={() => setShortcutsOpen(true)}
        onFindReplace={() => setFindOpen(!findOpen)}
        onPageSettings={() => setPageSettingsOpen(true)}
        onReadingMode={() => setReadingMode(true)}
        pageLayout={pageLayout}
        onPageLayout={() => setPageLayout(!pageLayout)}
        onOutline={() => setOutlinePanelOpen(!outlinePanelOpen)}
        onWatermark={() => setWatermarkOpen(true)}
        onSpecialChars={() => setSpecialCharsOpen(true)}
        onBookmarks={() => setSidebarOpen(true)}
        onProofread={() => setProofreadOpen(!proofreadOpen)}
        onPdfImport={() => setPdfAiOpen(true)}
        onAiTextTools={() => setAiTextToolsOpen(!aiTextToolsOpen)}
        onAiSummary={handleAiSummary}
        onTrackChanges={() => setTrackChangesOpen(!trackChangesOpen)}
        onCompare={() => setCompareOpen(true)}
        onMailMerge={() => setMailMergeOpen(true)}
        onTemplates={() => setTemplatesOpen(true)}
        onInsertToc={handleInsertOrUpdateToc}
        onFigureToc={() => setFigureTocOpen(true)}
        onCrossReference={() => setCrossRefOpen(true)}
        onBibliography={() => setBibliographyOpen(true)}
        onIndexGenerator={() => setIndexGenOpen(true)}
        focusMode={focusMode}
        onFocusMode={() => setFocusMode(!focusMode)}
        showLineNumbers={showLineNumbers}
        onToggleLineNumbers={() => setShowLineNumbers(!showLineNumbers)}
        onDocxImport={() => setDocxImportOpen(true)}
        onVersionDiff={() => setVersionDiffOpen(true)}
        onDocCompare={() => setDocCompareOpen(true)}
        onSpellCheck={() => setSpellCheckEnabled(!spellCheckEnabled)}
        spellCheckEnabled={spellCheckEnabled}
        containerRef={articleRef}
        showFormattingMarks={showFormattingMarks}
        onToggleFormattingMarks={() => setShowFormattingMarks(!showFormattingMarks)}
        currentBlockType={focusedBlock?.type || 'paragraph'}
        onChangeBlockType={(type) => {
          if (focusedBlock) dispatch({ type: 'CHANGE_TYPE', id: focusedBlock.id, newType: type })
        }}
        onBatchChangeBlockType={(type) => {
          if (!focusedBlock) return
          const idx = state.blocks.findIndex((b) => b.id === focusedBlock.id)
          if (idx === -1) return
          const currentType = focusedBlock.type
          let start = idx, end = idx
          while (start > 0 && state.blocks[start - 1].type === currentType) start--
          while (end < state.blocks.length - 1 && state.blocks[end + 1].type === currentType) end++
          for (let i = start; i <= end; i++) {
            dispatch({ type: 'CHANGE_TYPE', id: state.blocks[i].id, newType: type })
          }
        }}
      />

      {/* Floating toolbar on text selection */}
      <FloatingToolbar containerRef={articleRef} />

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

      {/* Ctrl+S save feedback */}
      {saveFlash && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white text-sm px-4 py-2 rounded-lg shadow-lg animate-scale-in">
          保存しました
        </div>
      )}

      <div className="flex-1 flex">
        {/* Outline panel / heading navigation sidebar */}
        {outlinePanelOpen && (
          <div className="w-[200px] flex-shrink-0 bg-slate-900 border-r border-slate-800 overflow-y-auto no-print">
            <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800">
              <span className="text-xs font-medium text-slate-400">目次</span>
              <button
                onClick={() => setOutlinePanelOpen(false)}
                className="text-slate-500 hover:text-white text-xs transition-colors"
                title="閉じる"
                aria-label="目次パネルを閉じる"
              >
                ✕
              </button>
            </div>
            <div className="p-2">
              {(() => {
                const headings = state.blocks.filter(
                  (b) => b.type === 'h1' || b.type === 'h2' || b.type === 'h3' || b.type === 'h4' || b.type === 'h5' || b.type === 'h6'
                )
                if (headings.length === 0) {
                  return (
                    <p className="text-xs text-slate-500 px-2 py-4 text-center">
                      見出しがありません
                    </p>
                  )
                }
                return (
                  <ul className="space-y-0.5">
                    {headings.map((h) => {
                      const text = h.content?.replace(/<[^>]*>/g, '').trim() || '(空の見出し)'
                      const indent = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].indexOf(h.type)
                      return (
                        <li key={h.id}>
                          <button
                            onClick={() => {
                              const el = document.querySelector(`[data-block-id="${h.id}"]`)
                              if (el) {
                                el.scrollIntoView({ behavior: 'smooth', block: 'center' })
                                el.classList.add('ring-2', 'ring-indigo-500/50')
                                setTimeout(() => el.classList.remove('ring-2', 'ring-indigo-500/50'), 1500)
                              }
                            }}
                            className={`w-full text-left text-xs py-1 px-2 rounded hover:bg-slate-800 hover:text-indigo-400 transition-colors truncate ${
                              h.type === 'h1'
                                ? 'text-slate-200 font-medium'
                                : h.type === 'h2'
                                  ? 'text-slate-300'
                                  : 'text-slate-400'
                            }`}
                            style={{ paddingLeft: `${indent * 12 + 8}px` }}
                            title={text}
                          >
                            {text}
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )
              })()}
            </div>
          </div>
        )}

        <div
          className={`flex-1 flex justify-center py-10 max-md:px-3 overflow-y-auto print-content ${
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
              {/* Page Ruler */}
              <PageRuler
                pageWidthPx={pageWidthPx}
                marginLeftMm={ps.marginLeft}
                marginRightMm={ps.marginRight}
                onMarginChange={(left, right) => {
                  dispatch({
                    type: 'SET_PAGE_SETTINGS',
                    pageSettings: { ...ps, marginLeft: left, marginRight: right },
                  })
                }}
              />

              <div
                className={`bg-white text-slate-900 shadow-2xl shadow-black/20 relative ${showFormattingMarks ? 'show-formatting-marks' : ''} ${focusMode ? 'focus-mode' : ''}`}
                style={{
                  width: pageWidthPx,
                  minHeight: pageHeightPx,
                  paddingTop: `${ps.marginTop}mm`,
                  paddingBottom: `${ps.marginBottom}mm`,
                  paddingLeft: `${ps.marginLeft}mm`,
                  paddingRight: `${ps.marginRight}mm`,
                  ...(state.pageBorder ? {
                    border: `${state.pageBorder.width}px ${state.pageBorder.style} ${state.pageBorder.color}`,
                  } : {}),
                }}
                ref={articleRef}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
              >
                {/* Watermark */}
                {state.watermark && state.watermark.text && (
                  <div className="absolute inset-0 pointer-events-none select-none overflow-hidden z-0 print-include" aria-hidden="true">
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
                <div className="mb-4 relative z-10">
                  <PageHeaderFooter
                    position="header"
                    settings={state.headerFooter}
                    onSave={(headerFooter) => dispatch({ type: 'SET_HEADER_FOOTER', headerFooter })}
                    pageNumber={1}
                    totalPages={pageCount}
                    title={state.meta.title || ''}
                    isFirstPage={true}
                  />
                </div>

                {/* Company logo (title is shown in the breadcrumb and as H1 in the body) */}
                {brandSettings?.logoUrl && (
                  <div className="flex items-center gap-3 mb-6 relative z-10">
                    <img src={brandSettings.logoUrl} alt={brandSettings.companyName || 'Logo'} className="w-8 h-8 rounded object-contain" />
                  </div>
                )}

                <div className="relative z-10 page-layout-content">
                  <BlockList
                    blocks={state.blocks}
                    onUpdate={handleBlockUpdate}
                    onUpdateData={(id, data) => dispatch({ type: 'UPDATE_BLOCK_DATA', id, data })}
                    onAdd={handleBlockAdd}
                    onDelete={handleBlockDelete}
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
                    onSetTextIndent={(id, textIndent) => dispatch({ type: 'SET_TEXT_INDENT', id, textIndent })}
                    selectedBlockIds={selectedBlockIds}
                    onSelectBlock={handleSelectBlock}
                    showLineNumbers={showLineNumbers}
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

                {/* Endnotes section (when footnote position is 'end') */}
                {state.footnotePosition === 'end' && state.blocks.some(b => b.type === 'footnote') && (
                  <div className="mt-8 pt-4 border-t border-slate-300 relative z-10">
                    <h3 className="text-sm font-semibold text-slate-500 mb-2">注釈</h3>
                    <div className="space-y-1">
                      {state.blocks.filter(b => b.type === 'footnote').map((b, i) => (
                        <div key={b.id} className="text-xs text-slate-500">
                          <span className="text-indigo-600 mr-1">[{i + 1}]</span>
                          <span dangerouslySetInnerHTML={{ __html: b.content }} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Page footer */}
                <div className="absolute bottom-0 left-0 right-0 relative z-10"
                  style={{ paddingLeft: `${ps.marginLeft}mm`, paddingRight: `${ps.marginRight}mm`, paddingBottom: `${ps.marginBottom}mm` }}
                >
                  <PageHeaderFooter
                    position="footer"
                    settings={state.headerFooter}
                    onSave={(headerFooter) => dispatch({ type: 'SET_HEADER_FOOTER', headerFooter })}
                    pageNumber={1}
                    totalPages={pageCount}
                    title={state.meta.title || ''}
                    isFirstPage={true}
                  />
                  {/* Page number preview */}
                  <div className="text-center text-xs text-slate-400 font-mono mt-1">
                    ページ 1 / {pageCount}
                  </div>
                </div>
              </div>

              {/* Additional pages with page numbers */}
              {pageCount > 1 && Array.from({ length: pageCount - 1 }, (_, i) => (
                <div
                  key={`page-${i + 2}`}
                  className="bg-white text-slate-900 shadow-2xl shadow-black/20 relative"
                  style={{
                    width: pageWidthPx,
                    minHeight: pageHeightPx,
                    paddingTop: `${ps.marginTop}mm`,
                    paddingBottom: `${ps.marginBottom}mm`,
                    paddingLeft: `${ps.marginLeft}mm`,
                    paddingRight: `${ps.marginRight}mm`,
                  }}
                >
                  {/* Page number at bottom-center */}
                  <div className="absolute bottom-4 left-0 right-0 text-center text-xs text-slate-400 font-mono">
                    ページ {i + 2} / {pageCount}
                  </div>
                </div>
              ))}

              {/* First page number overlay */}
              {pageCount >= 1 && (
                <div className="absolute bottom-0 right-0 pointer-events-none" style={{ width: pageWidthPx }}>
                  {/* Page number shown on first page */}
                </div>
              )}

              {/* Page indicator */}
              <div className="text-xs text-slate-500 font-medium">
                {ps.size.toUpperCase()} {ps.orientation === 'landscape' ? '横' : '縦'} - {pageWidthMm}mm × {pageHeightMm}mm — {pageCount}ページ
              </div>
            </div>
          ) : (
            /* ── Continuous Mode: default scrolling editor ── */
            <article
              ref={articleRef}
              className={`w-full max-w-2xl pl-8 max-md:pl-2 relative ${dragOver ? 'ring-2 ring-indigo-500/50 ring-inset' : ''} ${showFormattingMarks ? 'show-formatting-marks' : ''} ${focusMode ? 'focus-mode' : ''}`}
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
                <div className="absolute inset-0 pointer-events-none select-none overflow-hidden z-0 print-include" aria-hidden="true">
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

              {/* Welcome screen for empty documents */}
              {state.blocks.length <= 1 && !state.blocks[0]?.content && (
                <WelcomeScreen
                  onStartTyping={() => {
                    const el = document.querySelector('[contenteditable]') as HTMLElement
                    el?.focus()
                  }}
                  onUseTemplate={(blocks, title) => {
                    dispatch({ type: 'SET_BLOCKS', blocks, title })
                  }}
                  onAIGenerate={() => setAiOpen(true)}
                />
              )}

              {/* Company logo (title is shown in the breadcrumb and as H1 in the body) */}
              {brandSettings?.logoUrl && (
                <div className="flex items-center gap-3 mb-8 relative z-10">
                  <img src={brandSettings.logoUrl} alt={brandSettings.companyName || 'Logo'} className="w-10 h-10 rounded-lg object-contain bg-slate-800/80 border border-slate-700/50" />
                </div>
              )}

              <div className="relative z-10">
                <BlockList
                  blocks={state.blocks}
                  onUpdate={handleBlockUpdate}
                  onUpdateData={(id, data) => dispatch({ type: 'UPDATE_BLOCK_DATA', id, data })}
                  onAdd={handleBlockAdd}
                  onDelete={handleBlockDelete}
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
                    onSetTextIndent={(id, textIndent) => dispatch({ type: 'SET_TEXT_INDENT', id, textIndent })}
                    onSplitBlock={(id, before, after, newType) => dispatch({ type: 'SPLIT_BLOCK', id, contentBefore: before, contentAfter: after, newType })}
                    onMergeBlocks={(targetId, sourceId, mergedContent) => dispatch({ type: 'MERGE_BLOCKS', targetId, sourceId, mergedContent })}
                    selectedBlockIds={selectedBlockIds}
                    onSelectBlock={handleSelectBlock}
                    showLineNumbers={showLineNumbers}
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

              {/* Endnotes section (when footnote position is 'end') */}
              {state.footnotePosition === 'end' && state.blocks.some(b => b.type === 'footnote') && (
                <div className="mt-8 pt-4 border-t border-slate-700 relative z-10">
                  <h3 className="text-sm font-semibold text-slate-400 mb-2">注釈</h3>
                  <div className="space-y-1">
                    {state.blocks.filter(b => b.type === 'footnote').map((b, i) => (
                      <div key={b.id} className="text-xs text-slate-400">
                        <span className="text-indigo-400 mr-1">[{i + 1}]</span>
                        <span dangerouslySetInnerHTML={{ __html: b.content }} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </article>
          )}
        </div>

        <UnifiedSidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          blocks={state.blocks}
          comments={(state.comments || []).map(c => ({
            id: c.id,
            text: c.text,
            author: c.author || 'ユーザー',
            createdAt: c.createdAt,
            resolved: !!c.resolved,
            parentId: c.parentId,
          }))}
          onAddComment={(text, parentId) => dispatch({ type: 'ADD_COMMENT', text, parentId })}
          onResolveComment={(id) => dispatch({ type: 'RESOLVE_COMMENT', id })}
          onDeleteComment={(id) => dispatch({ type: 'DELETE_COMMENT', id })}
          bookmarks={(state.bookmarks || []).map(b => ({
            id: b.id,
            name: b.name,
            blockId: b.blockId,
          }))}
          focusedBlockId={focusedBlockId}
          onAddBookmark={(name, blockId) => dispatch({ type: 'ADD_BOOKMARK', name, blockId })}
          onDeleteBookmark={(id) => dispatch({ type: 'DELETE_BOOKMARK', id })}
        />

        {trackChangesOpen && (
          <TrackChangesPanel
            changes={state.trackChanges || []}
            enabled={!!state.trackChangesEnabled}
            onToggle={() => dispatch({ type: 'TOGGLE_TRACK_CHANGES' })}
            onAccept={(id) => dispatch({ type: 'ACCEPT_CHANGE', changeId: id })}
            onReject={(id) => dispatch({ type: 'REJECT_CHANGE', changeId: id })}
            onAcceptAll={() => dispatch({ type: 'ACCEPT_ALL_CHANGES' })}
            onRejectAll={() => dispatch({ type: 'REJECT_ALL_CHANGES' })}
          />
        )}
      </div>

      {/* Footer preview (continuous mode only) */}
      {!pageLayout && state.headerFooter && (state.headerFooter.footerLeft || state.headerFooter.showPageNumbers) && (
        <div className="flex items-center justify-between px-8 py-1 text-xs text-slate-500 border-t border-slate-800/50 max-w-2xl mx-auto w-full">
          <span>{state.headerFooter.footerLeft || ''}</span>
          <span>{state.headerFooter.footerCenter || ''}</span>
          <span>{state.headerFooter.showPageNumbers ? `ページ 1 / ${pageCount}` : state.headerFooter.footerRight || ''}</span>
        </div>
      )}

      {/* Word count status bar with zoom, voice input, and word count goal */}
      <div className="flex items-center no-print">
        <div className="flex-1">
          <WordCount
            blocks={state.blocks}
            zoom={zoom}
            onZoomChange={setZoom}
            focusedBlockIndex={focusedBlockId ? state.blocks.findIndex(b => b.id === focusedBlockId) : undefined}
            sectionCount={state.blocks.filter(b => b.type === 'section-break').length + 1}
            pageInfo={pageLayout ? { current: 1, total: pageCount } : undefined}
          />
        </div>
        <div className="flex items-center gap-2 px-3 bg-slate-900 border-t border-slate-800 py-1.5">
          <WordCountGoal blocks={state.blocks} docId={state.meta.id} />
          <div className="w-px h-4 bg-slate-700" />
          <VoiceInput onTranscript={handleVoiceTranscript} />
        </div>
      </div>

      {aiOpen && <AiDocPanel onInsert={handleAIInsert} onClose={() => setAiOpen(false)} />}

      {proofreadOpen && <AiProofreadPanel blocks={state.blocks} onClose={() => setProofreadOpen(false)} />}

      <AiTextToolsPanel
        open={aiTextToolsOpen}
        onClose={() => setAiTextToolsOpen(false)}
        blocks={state.blocks}
        selectedBlockIds={focusedBlockId ? [focusedBlockId] : []}
        onReplaceBlocks={handleReplaceBlocks}
        onInsertBlocksAfter={handleInsertBlocksAfter}
      />

      {pageSettingsOpen && (
        <PageSettingsModal
          pageSettings={state.pageSettings}
          headerFooter={state.headerFooter}
          pageBorder={state.pageBorder}
          onSavePageSettings={(settings) => dispatch({ type: 'SET_PAGE_SETTINGS', pageSettings: settings })}
          onSaveHeaderFooter={(settings) => dispatch({ type: 'SET_HEADER_FOOTER', headerFooter: settings })}
          onSavePageBorder={(border) => dispatch({ type: 'SET_PAGE_BORDER', pageBorder: border })}
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

      {templatesOpen && (
        <TemplatesModal
          onApply={(blocks, title) => {
            dispatch({ type: 'SET_BLOCKS', blocks, title })
            setTemplatesOpen(false)
            addToast('テンプレートを適用しました', 'success')
          }}
          onClose={() => setTemplatesOpen(false)}
        />
      )}

      {mailMergeOpen && (
        <MailMergeModal
          blocks={state.blocks}
          onApply={(mergedBlocks) => {
            dispatch({ type: 'SET_BLOCKS', blocks: mergedBlocks })
            setMailMergeOpen(false)
            addToast('差し込みを適用しました', 'success')
          }}
          onClose={() => setMailMergeOpen(false)}
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
      <VersionHistoryPanel
        open={versionHistoryOpen}
        onClose={() => setVersionHistoryOpen(false)}
        docId={state.meta.id}
        onRestore={handleRestoreVersion}
      />
      <PdfAiPanel
        open={pdfAiOpen}
        onClose={() => setPdfAiOpen(false)}
        context="doc"
        onInsertBlocks={(blocks, title) => dispatch({ type: 'SET_BLOCKS', blocks, title })}
      />
      {compareOpen && (
        <VersionCompareModal
          currentBlocks={state.blocks}
          versions={state.versions || []}
          onClose={() => setCompareOpen(false)}
        />
      )}
      {selectedBlockIds.length > 0 && (
        <MultiSelectToolbar
          count={selectedBlockIds.length}
          onDelete={() => {
            selectedBlockIds.forEach((id) => dispatch({ type: 'DELETE_BLOCK', id }))
            setSelectedBlockIds([])
          }}
          onChangeType={(type) => {
            selectedBlockIds.forEach((id) => dispatch({ type: 'CHANGE_TYPE', id, newType: type }))
            setSelectedBlockIds([])
          }}
          onMoveUp={() => {
            const indices = selectedBlockIds
              .map((id) => state.blocks.findIndex((b) => b.id === id))
              .filter((i) => i !== -1)
              .sort((a, b) => a - b)
            if (indices[0] > 0) {
              indices.forEach((idx) => {
                dispatch({ type: 'MOVE_BLOCK_UP', id: state.blocks[idx].id })
              })
            }
          }}
          onMoveDown={() => {
            const indices = selectedBlockIds
              .map((id) => state.blocks.findIndex((b) => b.id === id))
              .filter((i) => i !== -1)
              .sort((a, b) => b - a)
            if (indices[0] < state.blocks.length - 1) {
              indices.forEach((idx) => {
                dispatch({ type: 'MOVE_BLOCK_DOWN', id: state.blocks[idx].id })
              })
            }
          }}
        />
      )}
      {clipHistoryOpen && clipboardHistory.length > 0 && (
        <div className="fixed bottom-12 right-4 z-50 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-64 py-1 animate-slide-up">
          <div className="px-3 py-1.5 text-[10px] text-slate-500 font-medium border-b border-slate-800">
            クリップボード履歴 (Ctrl+Shift+H)
          </div>
          {clipboardHistory.map((text, i) => (
            <button
              key={i}
              onClick={() => {
                document.execCommand('insertText', false, text)
                setClipHistoryOpen(false)
              }}
              className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition-colors truncate"
              title={text}
            >
              {text.length > 50 ? text.substring(0, 50) + '…' : text}
            </button>
          ))}
        </div>
      )}
      <CommandPalette
        open={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onUndo={() => dispatch({ type: 'UNDO' })}
        onRedo={() => dispatch({ type: 'REDO' })}
        onExport={handleExport}
        onExportPDF={handleExportPDF}
        onExportDOCX={handleExportDOCX}
        onExportMarkdown={handleExportMarkdown}
        onExportText={handleExportText}
        onPrint={handlePrint}
        onDelete={handleDelete}
        onSaveVersion={() => dispatch({ type: 'SAVE_VERSION' })}
        onVersionHistory={() => setVersionHistoryOpen(true)}
        onShare={() => setShareOpen(true)}
        onComments={() => setSidebarOpen(true)}
        onFindReplace={() => setFindOpen(true)}
        onPageSettings={() => setPageSettingsOpen(true)}
        onReadingMode={() => setReadingMode(true)}
        onPageLayout={() => setPageLayout(!pageLayout)}
        onOutline={() => setOutlinePanelOpen(!outlinePanelOpen)}
        onFocusMode={() => setFocusMode(!focusMode)}
        onToggleLineNumbers={() => setShowLineNumbers(!showLineNumbers)}
        onWatermark={() => setWatermarkOpen(true)}
        onSpecialChars={() => setSpecialCharsOpen(true)}
        onBookmarks={() => setSidebarOpen(true)}
        onTemplates={() => setTemplatesOpen(true)}
        onMailMerge={() => setMailMergeOpen(true)}
        onTrackChanges={() => setTrackChangesOpen(!trackChangesOpen)}
        onCompare={() => setCompareOpen(true)}
        onAI={() => setAiOpen(true)}
        onProofread={() => setProofreadOpen(true)}
        onAiTextTools={() => setAiTextToolsOpen(true)}
        onPdfImport={() => setPdfAiOpen(true)}
        onShortcuts={() => setShortcutsOpen(true)}
        onClipboardHistory={() => setClipHistoryOpen(!clipHistoryOpen)}
        onInsertToc={handleInsertOrUpdateToc}
        onFigureToc={() => setFigureTocOpen(true)}
        onCrossReference={() => setCrossRefOpen(true)}
        onBibliography={() => setBibliographyOpen(true)}
        onIndexGenerator={() => setIndexGenOpen(true)}
        onInsertBlock={(type) => {
          const last = state.blocks[state.blocks.length - 1]
          if (last) dispatch({ type: 'ADD_BLOCK', afterId: last.id, blockType: type as BlockType })
        }}
        focusedBlockId={focusedBlockId}
      />
      {/* Paste Options popup (#34) */}
      {pasteOptionsPos && (
        <div
          className="fixed z-50 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl flex items-center gap-0.5 p-1 animate-scale-in"
          style={{ top: pasteOptionsPos.y, left: pasteOptionsPos.x }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              // Keep source formatting - already pasted with formatting, do nothing
              setPasteOptionsPos(null)
            }}
            className="flex items-center gap-1 px-2 py-1 text-[11px] text-slate-300 hover:bg-slate-800 hover:text-white rounded transition-colors"
            title="元の書式を保持"
            aria-label="元の書式を保持して貼り付け"
          >
            <Clipboard size={12} /> 書式保持
          </button>
          <button
            onClick={() => {
              // Merge formatting - undo last paste, re-paste with partial formatting (strip styles but keep bold/italic)
              if (lastPasteData.current) {
                document.execCommand('undo')
                const html = lastPasteData.current.html
                if (html) {
                  const tmp = document.createElement('div')
                  tmp.innerHTML = html
                  tmp.querySelectorAll('style, script, meta, link').forEach(el => el.remove())
                  tmp.querySelectorAll('[style]').forEach(el => el.removeAttribute('style'))
                  tmp.querySelectorAll('[class]').forEach(el => el.removeAttribute('class'))
                  document.execCommand('insertHTML', false, tmp.innerHTML)
                } else {
                  document.execCommand('insertText', false, lastPasteData.current.text)
                }
              }
              setPasteOptionsPos(null)
            }}
            className="flex items-center gap-1 px-2 py-1 text-[11px] text-slate-300 hover:bg-slate-800 hover:text-white rounded transition-colors"
            title="書式を結合"
            aria-label="書式を結合して貼り付け"
          >
            <ClipboardPaste size={12} /> 書式結合
          </button>
          <button
            onClick={() => {
              // Text only - undo last paste, re-paste as plain text
              if (lastPasteData.current) {
                document.execCommand('undo')
                document.execCommand('insertText', false, lastPasteData.current.text)
              }
              setPasteOptionsPos(null)
            }}
            className="flex items-center gap-1 px-2 py-1 text-[11px] text-slate-300 hover:bg-slate-800 hover:text-white rounded transition-colors"
            title="テキストのみ"
            aria-label="テキストのみ貼り付け"
          >
            <Type size={12} /> テキストのみ
          </button>
        </div>
      )}
      {figureTocOpen && (
        <FigureTocModal
          blocks={state.blocks}
          onInsertToc={(content) => {
            const last = state.blocks[state.blocks.length - 1]
            if (last) {
              dispatch({ type: 'ADD_BLOCK', afterId: last.id, blockType: 'paragraph' })
              setTimeout(() => {
                const newLast = state.blocks[state.blocks.length - 1]
                if (newLast) dispatch({ type: 'UPDATE_BLOCK', id: newLast.id, content })
              }, 100)
            }
            setFigureTocOpen(false)
          }}
          onClose={() => setFigureTocOpen(false)}
        />
      )}
      {crossRefOpen && (
        <CrossReferenceModal
          blocks={state.blocks}
          bookmarks={(state.bookmarks || []).map(b => ({ id: b.id, name: b.name, blockId: b.blockId }))}
          onInsert={(html) => {
            document.execCommand('insertHTML', false, html)
            setCrossRefOpen(false)
          }}
          onClose={() => setCrossRefOpen(false)}
        />
      )}
      {bibliographyOpen && (
        <BibliographyPanel
          onInsertCitation={(html) => {
            document.execCommand('insertHTML', false, html)
          }}
          onInsertBibliography={(html) => {
            const last = state.blocks[state.blocks.length - 1]
            if (last) {
              dispatch({ type: 'ADD_BLOCK', afterId: last.id, blockType: 'paragraph' })
              setTimeout(() => {
                const newLast = state.blocks[state.blocks.length - 1]
                if (newLast) dispatch({ type: 'UPDATE_BLOCK', id: newLast.id, content: html })
              }, 100)
            }
          }}
          onClose={() => setBibliographyOpen(false)}
        />
      )}
      {indexGenOpen && (
        <IndexGeneratorModal
          blocks={state.blocks}
          onInsertIndex={(content) => {
            const last = state.blocks[state.blocks.length - 1]
            if (last) {
              dispatch({ type: 'ADD_BLOCK', afterId: last.id, blockType: 'paragraph' })
              setTimeout(() => {
                const newLast = state.blocks[state.blocks.length - 1]
                if (newLast) dispatch({ type: 'UPDATE_BLOCK', id: newLast.id, content })
              }, 100)
            }
            setIndexGenOpen(false)
          }}
          onClose={() => setIndexGenOpen(false)}
        />
      )}
      {/* DOCX Import modal */}
      {docxImportOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center" onClick={() => setDocxImportOpen(false)}>
          <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-6 w-[400px]" onClick={e => e.stopPropagation()}>
            <h2 className="text-sm font-medium text-white mb-4">DOCX ファイルをインポート</h2>
            <DocxImport onImport={handleDocxImport} onClose={() => setDocxImportOpen(false)} />
          </div>
        </div>
      )}
      {/* Version Diff modal */}
      {versionDiffOpen && (
        <VersionDiffModal
          currentBlocks={state.blocks}
          versions={state.versions || []}
          onClose={() => setVersionDiffOpen(false)}
        />
      )}
      {/* Document Compare modal */}
      {docCompareOpen && (
        <DocumentCompare
          currentBlocks={state.blocks}
          currentTitle={state.meta.title || ''}
          versions={state.versions || []}
          onClose={() => setDocCompareOpen(false)}
        />
      )}
      <ShortcutsHint onOpenShortcuts={() => setShortcutsOpen(true)} />
    </div>
  )
}
