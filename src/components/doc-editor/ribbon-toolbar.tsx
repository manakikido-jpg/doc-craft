'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import type { DocDocument, BlockType } from '@/types'
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
  Clock,
  GitCompare,
  MailIcon,
  FolderOpen,
  Focus,
  Hash,
  Link as LinkIcon,
  Highlighter,
  Superscript,
  Subscript,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Eraser,
  AArrowUp,
  AArrowDown,
  Space,
  Image,
  Table,
  Code,
  Minus,
  Pencil,
  Type,
  Columns,
  PenTool,
  FileImage,
  SeparatorHorizontal,
  ZoomIn,
  ZoomOut,
  Eye,
  ChevronUp,
  Clipboard,
  ClipboardCopy,
  ClipboardPaste,
  Scissors,
  Paintbrush,
  EyeOff,
  ListTree,
  BookOpenCheck,
  Library,
  ScrollText,
} from 'lucide-react'
import { t } from '@/lib/i18n'
import { useTheme } from '@/lib/theme-context'
import PresenceAvatars from '../shared/presence-avatars'

// ========== Constants from format-toolbar ==========

const FONT_FAMILIES = [
  { label: 'Gothic', value: 'system-ui, -apple-system, sans-serif' },
  { label: 'Mincho', value: '"Yu Mincho", "Hiragino Mincho ProN", serif' },
  { label: 'Monospace', value: '"SF Mono", "Consolas", monospace' },
  { label: 'Arial', value: 'Arial, Helvetica, sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Times', value: '"Times New Roman", Times, serif' },
]

const FONT_SIZES = [8, 9, 10, 10.5, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 36, 48, 72]

const HIGHLIGHT_COLORS = [
  '#fef08a', '#bbf7d0', '#bfdbfe', '#fecaca', '#e9d5ff',
  '#fed7aa', '#fce7f3', '#ccfbf1', 'transparent',
]

const TEXT_COLORS = [
  '#ffffff', '#f8fafc', '#94a3b8', '#64748b', '#0f172a',
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6',
  '#8b5cf6', '#ec4899', '#06b6d4', '#14b8a6', '#6366f1',
]

const UNDERLINE_STYLES = [
  { label: '下線', value: 'underline' },
  { label: '二重下線', value: 'underline double' },
  { label: '波線', value: 'underline wavy' },
  { label: '点線', value: 'underline dotted' },
  { label: '破線', value: 'underline dashed' },
  { label: '二重取り消し線', value: 'line-through double' },
]

const LINE_HEIGHTS = [
  { label: '1.0', value: '1.0' },
  { label: '1.15', value: '1.15' },
  { label: '1.25', value: '1.25' },
  { label: '1.5', value: '1.5' },
  { label: '1.75', value: '1.75' },
  { label: '2.0', value: '2.0' },
  { label: '2.5', value: '2.5' },
  { label: '3.0', value: '3.0' },
]

const LETTER_SPACINGS = [
  { label: '極狭', value: '-1px' },
  { label: '狭い', value: '-0.5px' },
  { label: '標準', value: '0px' },
  { label: '広い', value: '0.5px' },
  { label: 'やや広い', value: '1px' },
  { label: '広め', value: '2px' },
  { label: '最広', value: '3px' },
]

const ENCLOSED_CHARS = [
  '①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩',
  '⑪', '⑫', '⑬', '⑭', '⑮', '⑯', '⑰', '⑱', '⑲', '⑳',
  'Ⓐ', 'Ⓑ', 'Ⓒ', 'Ⓓ', 'Ⓔ', 'Ⓕ',
  '㋐', '㋑', '㋒', '㋓', '㋔',
  '㊀', '㊁', '㊂', '㊃', '㊄',
]

const BLOCK_STYLES: { type: BlockType; label: string; preview: string }[] = [
  { type: 'paragraph', label: '標準', preview: 'text-sm text-slate-300' },
  { type: 'h1', label: '見出し 1', preview: 'text-lg font-bold text-white' },
  { type: 'h2', label: '見出し 2', preview: 'text-base font-semibold text-white' },
  { type: 'h3', label: '見出し 3', preview: 'text-sm font-medium text-white' },
  { type: 'quote', label: '引用', preview: 'text-sm italic text-slate-400 border-l-2 border-indigo-500 pl-2' },
  { type: 'bullet', label: '箇条書き', preview: 'text-sm text-slate-300' },
  { type: 'numbered', label: '番号付き', preview: 'text-sm text-slate-300' },
  { type: 'code', label: 'コード', preview: 'text-sm font-mono text-emerald-400' },
  { type: 'callout', label: 'コールアウト', preview: 'text-sm text-blue-400' },
  { type: 'checklist', label: 'チェック', preview: 'text-sm text-slate-300' },
  { type: 'footnote', label: '脚注', preview: 'text-xs text-slate-400' },
]

// ========== Tab definitions ==========

type TabKey = 'home' | 'insert' | 'format' | 'view' | 'tools' | 'file'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'home', label: 'ホーム' },
  { key: 'insert', label: '挿入' },
  { key: 'format', label: '書式' },
  { key: 'view', label: '表示' },
  { key: 'tools', label: 'ツール' },
  { key: 'file', label: 'ファイル' },
]

// ========== Props ==========

export interface RibbonToolbarProps {
  // From DocToolbar
  state: DocDocument
  saveStatus?: 'saved' | 'saving' | 'error'
  onTitleChange: (title: string) => void
  onExport: () => void
  onExportPDF?: () => void
  onExportDOCX?: () => void
  onExportMarkdown?: () => void
  onExportText?: () => void
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
  onVersionHistory?: () => void
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
  onAiTextTools?: () => void
  onTrackChanges?: () => void
  onCompare?: () => void
  onMailMerge?: () => void
  onTemplates?: () => void
  focusMode?: boolean
  onFocusMode?: () => void
  onInsertToc?: () => void
  onFigureToc?: () => void
  onCrossReference?: () => void
  onBibliography?: () => void
  onIndexGenerator?: () => void
  onDocxImport?: () => void
  onVersionDiff?: () => void
  onDocCompare?: () => void
  onAiSummary?: () => void
  onSpellCheck?: () => void
  spellCheckEnabled?: boolean
  showLineNumbers?: boolean
  onToggleLineNumbers?: () => void
  // From FormatToolbar
  containerRef: React.RefObject<HTMLElement | null>
  showFormattingMarks?: boolean
  onToggleFormattingMarks?: () => void
  // From StylesGallery
  currentBlockType: BlockType
  onChangeBlockType: (type: BlockType) => void
  onBatchChangeBlockType?: (type: BlockType) => void
}

// ========== Helper: ribbon button ==========

function RibbonBtn({
  icon,
  label,
  onClick,
  active,
  disabled,
  title,
  className: extraClass,
  badge,
  variant,
}: {
  icon: React.ReactNode
  label?: string
  onClick?: () => void
  active?: boolean
  disabled?: boolean
  title?: string
  className?: string
  badge?: number
  variant?: 'default' | 'accent' | 'danger'
}) {
  const base = 'flex flex-col items-center justify-center gap-0.5 px-1.5 py-1 rounded transition-colors relative min-w-[32px]'
  const v = variant || 'default'
  const cls = active
    ? `${base} bg-indigo-500/20 text-indigo-400 border border-indigo-500/50`
    : disabled
      ? `${base} text-slate-600 cursor-not-allowed`
      : v === 'accent'
        ? `${base} text-indigo-400 hover:bg-indigo-500/10 hover:text-indigo-300`
        : v === 'danger'
          ? `${base} text-slate-400 hover:bg-red-500/10 hover:text-red-400`
          : `${base} text-slate-400 hover:bg-slate-700 hover:text-white`

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title || label}
      aria-label={title || label}
      className={`${cls} ${extraClass || ''}`}
    >
      {icon}
      {label && <span className="text-[9px] leading-none max-md:hidden whitespace-nowrap">{label}</span>}
      {badge !== undefined && badge > 0 && (
        <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-indigo-500 text-white text-[8px] rounded-full flex items-center justify-center">
          {badge}
        </span>
      )}
    </button>
  )
}

// ========== Helper: group separator ==========

function Separator() {
  return <div className="w-px h-10 bg-slate-700/60 mx-1 flex-shrink-0" />
}

// ========== Helper: group label wrapper ==========

function RibbonGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center gap-0.5">{children}</div>
      <span className="text-[8px] text-slate-500 leading-none mt-0.5 max-md:hidden">{label}</span>
    </div>
  )
}

// ========== Helper: dropdown wrapper ==========

function DropdownBtn({
  trigger,
  open,
  onToggle,
  children,
  align = 'left',
}: {
  trigger: React.ReactNode
  open: boolean
  onToggle: () => void
  children: React.ReactNode
  align?: 'left' | 'right' | 'center'
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onToggle()
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open, onToggle])

  const alignClass = align === 'right' ? 'right-0' : align === 'center' ? 'left-1/2 -translate-x-1/2' : 'left-0'

  return (
    <div className="relative" ref={ref}>
      {trigger}
      {open && (
        <div className={`absolute top-full mt-1 ${alignClass} bg-slate-900 border border-slate-700 rounded-lg shadow-xl z-50`}>
          {children}
        </div>
      )}
    </div>
  )
}

// ========== Main component ==========

export default function RibbonToolbar(props: RibbonToolbarProps) {
  const {
    state, saveStatus, onTitleChange, onExport, onExportPDF, onExportDOCX,
    onExportMarkdown, onExportText, onPrint, onAI, onDelete, canUndo, canRedo,
    onUndo, onRedo, onComments, onSaveVersion, onShare, onVersions,
    onVersionHistory, onShortcuts, onFindReplace, onPageSettings, onReadingMode,
    pageLayout, onPageLayout, onOutline, onWatermark, onSpecialChars, onBookmarks,
    onProofread, onPdfImport, onAiTextTools, onTrackChanges, onCompare, onMailMerge,
    onTemplates, focusMode, onFocusMode, onInsertToc, onFigureToc, onCrossReference,
    onBibliography, onIndexGenerator, onDocxImport, onVersionDiff, onDocCompare,
    onAiSummary, onSpellCheck, spellCheckEnabled, showLineNumbers, onToggleLineNumbers,
    containerRef, showFormattingMarks, onToggleFormattingMarks,
    currentBlockType, onChangeBlockType, onBatchChangeBlockType,
  } = props

  const { theme, toggleTheme } = useTheme()
  const [activeTab, setActiveTab] = useState<TabKey>('home')
  const [collapsed, setCollapsed] = useState(false)
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)
  const ribbonRef = useRef<HTMLDivElement>(null)
  const commentCount = (state.comments || []).filter((c) => !c.resolved && !c.parentId).length

  // Format painter state
  const [formatPainterStyle, setFormatPainterStyle] = useState<Record<string, string> | null>(null)
  const [formatPainterLock, setFormatPainterLock] = useState(false)
  const formatPainterClickCount = useRef(0)
  const formatPainterTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Format Painter: apply stored styles on next selection
  useEffect(() => {
    if (!formatPainterStyle) return
    const container = containerRef.current
    if (!container) return

    container.style.cursor = 'crosshair'

    const handleApply = () => {
      const sel = window.getSelection()
      if (!sel || sel.isCollapsed || !sel.rangeCount) return
      const range = sel.getRangeAt(0)
      const content = range.extractContents()
      const span = document.createElement('span')
      Object.entries(formatPainterStyle).forEach(([k, v]) => {
        span.style.setProperty(k, v)
      })
      span.appendChild(content)
      range.insertNode(span)
      if (!formatPainterLock) {
        setFormatPainterStyle(null)
      }
    }

    container.addEventListener('mouseup', handleApply)
    return () => {
      container.removeEventListener('mouseup', handleApply)
      container.style.cursor = ''
    }
  }, [formatPainterStyle, formatPainterLock, containerRef])

  // Format Painter: Escape to deactivate
  useEffect(() => {
    if (!formatPainterStyle) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setFormatPainterStyle(null)
        setFormatPainterLock(false)
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [formatPainterStyle])

  const handleFormatPainterClick = useCallback(() => {
    formatPainterClickCount.current++
    if (formatPainterTimer.current) clearTimeout(formatPainterTimer.current)
    formatPainterTimer.current = setTimeout(() => {
      const clicks = formatPainterClickCount.current
      formatPainterClickCount.current = 0

      if (formatPainterStyle) {
        setFormatPainterStyle(null)
        setFormatPainterLock(false)
        return
      }

      const sel = window.getSelection()
      if (!sel || sel.isCollapsed) return
      const node = sel.anchorNode
      const el = node?.nodeType === Node.TEXT_NODE ? node.parentElement : (node as HTMLElement)
      if (!el) return
      const computed = window.getComputedStyle(el)
      const styles: Record<string, string> = {}
      const props = ['font-weight', 'font-style', 'text-decoration', 'color', 'font-size', 'font-family', 'background-color', 'text-transform', 'font-variant']
      props.forEach((p) => {
        const v = computed.getPropertyValue(p)
        if (v) styles[p] = v
      })
      setFormatPainterStyle(styles)
      setFormatPainterLock(clicks >= 2)
    }, 250)
  }, [formatPainterStyle])

  // Close dropdown when clicking outside ribbon
  useEffect(() => {
    if (!activeDropdown) return
    function handle(e: MouseEvent) {
      if (ribbonRef.current && !ribbonRef.current.contains(e.target as Node)) {
        setActiveDropdown(null)
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [activeDropdown])

  const toggleDropdown = useCallback((name: string) => {
    setActiveDropdown((prev) => (prev === name ? null : name))
  }, [])

  // ===== Format commands =====
  function exec(command: string, value?: string) {
    document.execCommand(command, false, value)
  }

  function isActive(command: string) {
    try { return document.queryCommandState(command) } catch { return false }
  }

  function handleLink() {
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed) return
    const url = prompt('URLを入力', 'https://')
    if (url) exec('createLink', url)
  }

  function handleRuby() {
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed) return
    const text = sel.toString()
    const reading = prompt(`「${text}」のふりがなを入力:`, '')
    if (reading === null) return
    const range = sel.getRangeAt(0)
    range.deleteContents()
    const ruby = document.createElement('ruby')
    ruby.textContent = text
    const rt = document.createElement('rt')
    rt.textContent = reading
    ruby.appendChild(rt)
    range.insertNode(ruby)
  }

  function handleTextBorder() {
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed || !sel.rangeCount) return
    const range = sel.getRangeAt(0)
    const parent = range.commonAncestorContainer.parentElement
    if (parent?.style.border) {
      parent.style.border = ''
      parent.style.padding = ''
      parent.style.borderRadius = ''
      return
    }
    const content = range.extractContents()
    const span = document.createElement('span')
    span.style.border = '1px solid currentColor'
    span.style.padding = '0 3px'
    span.style.borderRadius = '2px'
    span.appendChild(content)
    range.insertNode(span)
  }

  function handleGrowFont() { exec('fontSize', '5') }
  function handleShrinkFont() { exec('fontSize', '2') }

  function handleLineHeight(value: string) {
    const sel = window.getSelection()
    if (!sel || !sel.rangeCount) return
    const range = sel.getRangeAt(0)
    let block = range.commonAncestorContainer as HTMLElement
    if (block.nodeType === Node.TEXT_NODE) block = block.parentElement!
    while (block && !block.hasAttribute('contenteditable') && block.parentElement) {
      block = block.parentElement
    }
    if (block?.hasAttribute('contenteditable')) {
      block.style.lineHeight = value
    }
  }

  function handleLetterSpacing(value: string) {
    const sel = window.getSelection()
    if (!sel || !sel.rangeCount) return
    if (sel.isCollapsed) {
      const range = sel.getRangeAt(0)
      let block = range.commonAncestorContainer as HTMLElement
      if (block.nodeType === Node.TEXT_NODE) block = block.parentElement!
      while (block && !block.hasAttribute('contenteditable') && block.parentElement) {
        block = block.parentElement
      }
      if (block?.hasAttribute('contenteditable')) {
        block.style.letterSpacing = value === '0px' ? '' : value
      }
    } else {
      const range = sel.getRangeAt(0)
      const content = range.extractContents()
      const span = document.createElement('span')
      span.style.letterSpacing = value === '0px' ? '' : value
      span.appendChild(content)
      range.insertNode(span)
    }
  }

  function insertEnclosedChar(char: string) {
    exec('insertText', char)
    setActiveDropdown(null)
  }

  function handleUnderlineStyle(style: string) {
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed || !sel.rangeCount) return
    const range = sel.getRangeAt(0)
    const content = range.extractContents()
    const span = document.createElement('span')
    span.style.textDecoration = style
    span.appendChild(content)
    range.insertNode(span)
    setActiveDropdown(null)
  }

  const fmtBtnClass = (cmd?: string, active?: boolean) =>
    `w-7 h-7 flex items-center justify-center rounded text-xs transition-colors ${
      (cmd && isActive(cmd)) || active
        ? 'bg-indigo-500 text-white'
        : 'text-slate-300 hover:bg-slate-700 hover:text-white'
    }`

  // Tab double-click to collapse/expand
  function handleTabClick(key: TabKey) {
    if (activeTab === key) {
      setCollapsed(!collapsed)
    } else {
      setActiveTab(key)
      setCollapsed(false)
    }
  }

  // ===== Tab content renderers =====

  function renderHome() {
    return (
      <div className="flex items-end gap-1 overflow-x-auto flex-nowrap scrollbar-none" onMouseDown={(e) => e.preventDefault()}>
        {/* Clipboard */}
        <RibbonGroup label="クリップボード">
          <button className={fmtBtnClass()} onClick={() => exec('cut')} title="切り取り (Ctrl+X)">
            <Scissors size={14} />
          </button>
          <button className={fmtBtnClass()} onClick={() => exec('copy')} title="コピー (Ctrl+C)">
            <ClipboardCopy size={14} />
          </button>
          <button className={fmtBtnClass()} onClick={() => exec('paste')} title="貼り付け (Ctrl+V)">
            <ClipboardPaste size={14} />
          </button>
          <button className={fmtBtnClass(undefined, !!formatPainterStyle)} onClick={handleFormatPainterClick} title="書式のコピー/貼り付け (ダブルクリックでロック)">
            <Paintbrush size={14} />
          </button>
        </RibbonGroup>

        <Separator />

        {/* Undo/Redo */}
        {onUndo && (
          <RibbonGroup label="元に戻す">
            <button className={fmtBtnClass()} onClick={onUndo} disabled={!canUndo} title="元に戻す (Ctrl+Z)">
              <Undo2 size={14} />
            </button>
            <button className={fmtBtnClass()} onClick={onRedo} disabled={!canRedo} title="やり直し (Ctrl+Y)">
              <Redo2 size={14} />
            </button>
          </RibbonGroup>
        )}

        <Separator />

        {/* Font */}
        <RibbonGroup label="フォント">
          {/* Font family dropdown */}
          <DropdownBtn
            trigger={
              <button className={fmtBtnClass()} onClick={() => toggleDropdown('fontFamily')} title="フォント">
                <span className="text-[10px] font-bold">F</span>
              </button>
            }
            open={activeDropdown === 'fontFamily'}
            onToggle={() => toggleDropdown('fontFamily')}
          >
            <div className="py-1 w-40">
              {FONT_FAMILIES.map((f) => (
                <button
                  key={f.label}
                  className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 hover:text-white"
                  style={{ fontFamily: f.value }}
                  onMouseDown={(e) => { e.preventDefault(); exec('fontName', f.value); setActiveDropdown(null) }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </DropdownBtn>

          {/* Font size dropdown */}
          <DropdownBtn
            trigger={
              <button className={fmtBtnClass()} onClick={() => toggleDropdown('fontSize')} title="サイズ">
                <span className="text-[10px]">A&#x2195;</span>
              </button>
            }
            open={activeDropdown === 'fontSize'}
            onToggle={() => toggleDropdown('fontSize')}
          >
            <div className="py-1 w-16 max-h-48 overflow-y-auto">
              {FONT_SIZES.map((s) => (
                <button
                  key={s}
                  className="w-full text-left px-2 py-1 text-xs text-slate-300 hover:bg-slate-800 hover:text-white"
                  onMouseDown={(e) => { e.preventDefault(); exec('fontSize', String(Math.min(7, Math.max(1, Math.round(s / 12))))); setActiveDropdown(null) }}
                >
                  {s}
                </button>
              ))}
            </div>
          </DropdownBtn>

          <button className={fmtBtnClass()} onClick={handleGrowFont} title="文字の拡大">
            <AArrowUp size={14} />
          </button>
          <button className={fmtBtnClass()} onClick={handleShrinkFont} title="文字の縮小">
            <AArrowDown size={14} />
          </button>

          <div className="w-px h-4 bg-slate-700 mx-0.5" />

          {/* B I U S */}
          <button className={fmtBtnClass('bold')} onClick={() => exec('bold')} title="太字 (Ctrl+B)">
            <strong>B</strong>
          </button>
          <button className={fmtBtnClass('italic')} onClick={() => exec('italic')} title="斜体 (Ctrl+I)">
            <em>I</em>
          </button>

          {/* Underline with style dropdown */}
          <div className="relative flex">
            <button className={fmtBtnClass('underline')} onClick={() => exec('underline')} title="下線 (Ctrl+U)">
              <span className="underline">U</span>
            </button>
            <button
              className="w-3 h-7 flex items-center justify-center text-slate-500 hover:text-white text-[8px]"
              onClick={() => toggleDropdown('underline')}
              title="下線スタイル"
            >
              &#x25BE;
            </button>
            {activeDropdown === 'underline' && (
              <div className="absolute top-full mt-1 left-0 bg-slate-900 border border-slate-700 rounded-lg shadow-xl py-1 w-28 z-50">
                {UNDERLINE_STYLES.map((u) => (
                  <button
                    key={u.value}
                    className="w-full text-left px-3 py-1 text-xs text-slate-300 hover:bg-slate-800 hover:text-white"
                    onMouseDown={(e) => { e.preventDefault(); handleUnderlineStyle(u.value) }}
                  >
                    <span style={{ textDecoration: u.value }}>{u.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button className={fmtBtnClass('strikeThrough')} onClick={() => exec('strikeThrough')} title="取り消し線">
            <span className="line-through">S</span>
          </button>

          <div className="w-px h-4 bg-slate-700 mx-0.5" />

          {/* Text color */}
          <DropdownBtn
            trigger={
              <button className={fmtBtnClass()} onClick={() => toggleDropdown('textColor')} title="フォントの色">
                <span className="text-[11px] font-bold" style={{ borderBottom: '2px solid #ef4444' }}>A</span>
              </button>
            }
            open={activeDropdown === 'textColor'}
            onToggle={() => toggleDropdown('textColor')}
          >
            <div className="p-2">
              <div className="flex flex-wrap gap-1 w-[130px]">
                {TEXT_COLORS.map((c) => (
                  <button
                    key={c}
                    className="w-5 h-5 rounded border border-slate-600 hover:scale-110 transition-transform"
                    style={{ background: c }}
                    onMouseDown={(e) => { e.preventDefault(); exec('foreColor', c); setActiveDropdown(null) }}
                  />
                ))}
              </div>
              <div className="mt-1.5 pt-1.5 border-t border-slate-700">
                <input
                  type="color"
                  className="w-full h-5 rounded cursor-pointer border-0 bg-transparent"
                  onMouseDown={(e) => e.stopPropagation()}
                  onChange={(e) => { exec('foreColor', e.target.value); setActiveDropdown(null) }}
                />
              </div>
            </div>
          </DropdownBtn>

          {/* Highlight */}
          <DropdownBtn
            trigger={
              <button className={fmtBtnClass()} onClick={() => toggleDropdown('highlight')} title="網かけ/ハイライト">
                <Highlighter size={14} />
              </button>
            }
            open={activeDropdown === 'highlight'}
            onToggle={() => toggleDropdown('highlight')}
          >
            <div className="p-2">
              <div className="flex flex-wrap gap-1 w-[100px]">
                {HIGHLIGHT_COLORS.map((c) => (
                  <button
                    key={c}
                    className="w-5 h-5 rounded border border-slate-600 hover:scale-110 transition-transform"
                    style={{ background: c === 'transparent' ? 'linear-gradient(45deg, #f00 50%, transparent 50%)' : c }}
                    onMouseDown={(e) => { e.preventDefault(); exec('hiliteColor', c); setActiveDropdown(null) }}
                    title={c === 'transparent' ? 'ハイライト解除' : ''}
                  />
                ))}
              </div>
            </div>
          </DropdownBtn>
        </RibbonGroup>

        <Separator />

        {/* Paragraph */}
        <RibbonGroup label="段落">
          <button className={fmtBtnClass()} onClick={() => exec('justifyLeft')} title="左揃え">
            <AlignLeft size={14} />
          </button>
          <button className={fmtBtnClass()} onClick={() => exec('justifyCenter')} title="中央揃え">
            <AlignCenter size={14} />
          </button>
          <button className={fmtBtnClass()} onClick={() => exec('justifyRight')} title="右揃え">
            <AlignRight size={14} />
          </button>
          <button className={fmtBtnClass()} onClick={() => exec('justifyFull')} title="均等割り付け">
            <AlignJustify size={14} />
          </button>

          <div className="w-px h-4 bg-slate-700 mx-0.5" />

          <button className={fmtBtnClass('insertUnorderedList')} onClick={() => exec('insertUnorderedList')} title="箇条書き">
            <List size={14} />
          </button>
          <button className={fmtBtnClass('insertOrderedList')} onClick={() => exec('insertOrderedList')} title="段落番号">
            <ListOrdered size={14} />
          </button>

          <div className="w-px h-4 bg-slate-700 mx-0.5" />

          <button className={fmtBtnClass()} onClick={() => exec('indent')} title="インデント">
            <span className="text-[10px]">{'→⌐'}</span>
          </button>
          <button className={fmtBtnClass()} onClick={() => exec('outdent')} title="インデント解除">
            <span className="text-[10px]">{'←⌐'}</span>
          </button>
        </RibbonGroup>

        <Separator />

        {/* Styles gallery inline */}
        <RibbonGroup label="スタイル">
          <div className="flex items-center gap-0.5 overflow-x-auto max-w-[300px] scrollbar-none">
            {BLOCK_STYLES.map((s) => (
              <button
                key={s.type}
                onClick={(e) => {
                  if (e.shiftKey && onBatchChangeBlockType) {
                    onBatchChangeBlockType(s.type)
                  } else {
                    onChangeBlockType(s.type)
                  }
                }}
                className={`flex-shrink-0 px-1.5 py-0.5 rounded border text-[10px] transition-colors ${
                  currentBlockType === s.type
                    ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400'
                    : 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-white'
                }`}
                title={`${s.label}${onBatchChangeBlockType ? ' (Shift+クリックで一括)' : ''}`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </RibbonGroup>
      </div>
    )
  }

  function renderInsert() {
    return (
      <div className="flex items-end gap-1 overflow-x-auto flex-nowrap scrollbar-none">
        <RibbonGroup label="ページ">
          <RibbonBtn icon={<FileImage size={15} />} label="表紙" onClick={onPageSettings} title="表紙ページ" />
          <RibbonBtn icon={<SeparatorHorizontal size={15} />} label="ページ区切り" onClick={() => exec('insertHorizontalRule')} title="ページ区切り" />
          <RibbonBtn icon={<Minus size={15} />} label="セクション" onClick={() => exec('insertHorizontalRule')} title="セクション区切り" />
        </RibbonGroup>

        <Separator />

        <RibbonGroup label="表/図">
          <RibbonBtn icon={<Image size={15} />} label="画像" onClick={() => exec('insertImage', prompt('画像URLを入力:', 'https://') || '')} title="画像の挿入" />
          <RibbonBtn icon={<Table size={15} />} label="表" onClick={() => {
            const html = '<table style="border-collapse:collapse;width:100%"><tr><td style="border:1px solid #475569;padding:4px">&nbsp;</td><td style="border:1px solid #475569;padding:4px">&nbsp;</td></tr><tr><td style="border:1px solid #475569;padding:4px">&nbsp;</td><td style="border:1px solid #475569;padding:4px">&nbsp;</td></tr></table>'
            exec('insertHTML', html)
          }} title="表の挿入" />
        </RibbonGroup>

        <Separator />

        <RibbonGroup label="テキスト">
          <RibbonBtn icon={<Code size={15} />} label="コード" onClick={() => onChangeBlockType('code')} title="コードブロック" />
          <RibbonBtn icon={<Minus size={15} />} label="区切り線" onClick={() => exec('insertHorizontalRule')} title="区切り線" />
          <RibbonBtn icon={<Omega size={15} />} label="特殊文字" onClick={onSpecialChars} title="特殊文字の挿入" />
          <RibbonBtn icon={<BookmarkIcon size={15} />} label="ブックマーク" onClick={onBookmarks} title="ブックマーク" />
          <RibbonBtn icon={<LinkIcon size={15} />} label="リンク" onClick={handleLink} title="リンクの挿入" />
        </RibbonGroup>

        <Separator />

        <RibbonGroup label="参照">
          {onInsertToc && (
            <RibbonBtn icon={<List size={15} />} label="目次" onClick={onInsertToc} title="目次を挿入/更新" />
          )}
          {onFigureToc && (
            <RibbonBtn icon={<ListTree size={15} />} label="図表目次" onClick={onFigureToc} title="図表目次の生成" />
          )}
          {onCrossReference && (
            <RibbonBtn icon={<BookOpenCheck size={15} />} label="相互参照" onClick={onCrossReference} title="相互参照の挿入" />
          )}
          {onBibliography && (
            <RibbonBtn icon={<Library size={15} />} label="参考文献" onClick={onBibliography} title="参考文献の管理" />
          )}
          {onIndexGenerator && (
            <RibbonBtn icon={<ScrollText size={15} />} label="索引" onClick={onIndexGenerator} title="索引の生成" />
          )}
        </RibbonGroup>

        <Separator />

        <RibbonGroup label="レイアウト">
          <RibbonBtn icon={<Pencil size={15} />} label="描画" onClick={() => {}} title="描画ツール" />
          <RibbonBtn icon={<Type size={15} />} label="テキストボックス" onClick={() => {}} title="テキストボックスの挿入" />
          <RibbonBtn icon={<Columns size={15} />} label="段組み" onClick={() => {}} title="段組みレイアウト" />
          <RibbonBtn icon={<PenTool size={15} />} label="署名" onClick={() => {}} title="署名の挿入" />
        </RibbonGroup>
      </div>
    )
  }

  function renderFormat() {
    return (
      <div className="flex items-end gap-1 overflow-x-auto flex-nowrap scrollbar-none" onMouseDown={(e) => e.preventDefault()}>
        {/* Text effects */}
        <RibbonGroup label="文字の効果">
          <button className={fmtBtnClass()} onClick={handleRuby} title="ルビ/ふりがな">
            <span className="text-[9px] leading-none flex flex-col items-center">
              <span className="text-[6px] text-indigo-300">あ</span>
              <span>亜</span>
            </span>
          </button>

          {/* Enclosed chars */}
          <DropdownBtn
            trigger={
              <button className={fmtBtnClass()} onClick={() => toggleDropdown('enclosed')} title="囲い文字">
                <span className="text-[11px]">{'①'}</span>
              </button>
            }
            open={activeDropdown === 'enclosed'}
            onToggle={() => toggleDropdown('enclosed')}
            align="center"
          >
            <div className="p-2">
              <div className="flex flex-wrap gap-0.5 w-[180px]">
                {ENCLOSED_CHARS.map((c) => (
                  <button
                    key={c}
                    className="w-6 h-6 flex items-center justify-center rounded text-sm text-slate-200 hover:bg-indigo-500/20 hover:text-indigo-300 transition-colors"
                    onMouseDown={(e) => { e.preventDefault(); insertEnclosedChar(c) }}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </DropdownBtn>

          <button className={fmtBtnClass()} onClick={handleTextBorder} title="囲み線">
            <span className="text-[10px] border border-current px-0.5 leading-tight">A</span>
          </button>

          <button className={fmtBtnClass('superscript')} onClick={() => exec('superscript')} title="上付き">
            <Superscript size={14} />
          </button>
          <button className={fmtBtnClass('subscript')} onClick={() => exec('subscript')} title="下付き">
            <Subscript size={14} />
          </button>

          <div className="w-px h-4 bg-slate-700 mx-0.5" />

          {/* Small Caps */}
          <button className={fmtBtnClass()} onClick={() => {
            const sel = window.getSelection()
            if (sel && !sel.isCollapsed) {
              const text = sel.toString()
              document.execCommand('insertHTML', false,
                `<span style="font-variant: small-caps">${text}</span>`)
            }
          }} title="スモールキャップス">
            <span className="text-[10px] font-bold">Sc</span>
          </button>

          {/* All Caps */}
          <button className={fmtBtnClass()} onClick={() => {
            const sel = window.getSelection()
            if (sel && !sel.isCollapsed) {
              const text = sel.toString()
              document.execCommand('insertHTML', false,
                `<span style="text-transform: uppercase">${text}</span>`)
            }
          }} title="すべて大文字">
            <span className="text-[10px] font-bold">AA</span>
          </button>

          {/* Character Scaling (均等割り付け) */}
          <button className={fmtBtnClass()} onClick={() => {
            const sel = window.getSelection()
            if (sel && !sel.isCollapsed) {
              const width = prompt('文字幅を入力してください (例: 5em)', '5em')
              if (width) {
                const text = sel.toString()
                document.execCommand('insertHTML', false,
                  `<span style="display: inline-block; width: ${width}; text-align: justify; text-align-last: justify;">${text}</span>`)
              }
            }
          }} title="均等割り付け">
            <span className="text-[10px] font-bold">均</span>
          </button>

          {/* Hidden Text */}
          <button className={fmtBtnClass()} onClick={() => {
            const sel = window.getSelection()
            if (sel && !sel.isCollapsed) {
              const text = sel.toString()
              document.execCommand('insertHTML', false,
                `<span class="hidden-text" style="display: none">${text}</span>`)
            }
          }} title="隠し文字">
            <EyeOff size={14} />
          </button>
        </RibbonGroup>

        <Separator />

        {/* Line height & letter spacing */}
        <RibbonGroup label="行間・文字間">
          <DropdownBtn
            trigger={
              <button className={fmtBtnClass()} onClick={() => toggleDropdown('lineHeight')} title="行間">
                <Space size={14} />
              </button>
            }
            open={activeDropdown === 'lineHeight'}
            onToggle={() => toggleDropdown('lineHeight')}
          >
            <div className="py-1 w-20">
              {LINE_HEIGHTS.map((lh) => (
                <button
                  key={lh.value}
                  className="w-full text-left px-3 py-1 text-xs text-slate-300 hover:bg-slate-800 hover:text-white"
                  onMouseDown={(e) => { e.preventDefault(); handleLineHeight(lh.value); setActiveDropdown(null) }}
                >
                  {lh.label}
                </button>
              ))}
            </div>
          </DropdownBtn>

          <DropdownBtn
            trigger={
              <button className={fmtBtnClass()} onClick={() => toggleDropdown('letterSpacing')} title="文字間隔">
                <span className="text-[10px] font-bold">AV</span>
              </button>
            }
            open={activeDropdown === 'letterSpacing'}
            onToggle={() => toggleDropdown('letterSpacing')}
          >
            <div className="py-1 w-28">
              {LETTER_SPACINGS.map((ls) => (
                <button
                  key={ls.value}
                  className="w-full text-left px-3 py-1 text-xs text-slate-300 hover:bg-slate-800 hover:text-white"
                  onMouseDown={(e) => { e.preventDefault(); handleLetterSpacing(ls.value); setActiveDropdown(null) }}
                >
                  {ls.label} ({ls.value})
                </button>
              ))}
            </div>
          </DropdownBtn>
        </RibbonGroup>

        <Separator />

        {/* Indent */}
        <RibbonGroup label="インデント">
          <button className={fmtBtnClass()} onClick={() => exec('indent')} title="インデント">
            <span className="text-[10px]">{'→⌐'}</span>
          </button>
          <button className={fmtBtnClass()} onClick={() => exec('outdent')} title="インデント解除">
            <span className="text-[10px]">{'←⌐'}</span>
          </button>
        </RibbonGroup>

        <Separator />

        {/* Drop cap placeholder */}
        <RibbonGroup label="ドロップキャップ">
          <RibbonBtn icon={<span className="text-lg font-serif leading-none">A</span>} label="ドロップ" onClick={() => {}} title="ドロップキャップ" />
        </RibbonGroup>

        <Separator />

        {/* Formatting marks & clear */}
        <RibbonGroup label="書式設定">
          {onToggleFormattingMarks && (
            <button
              className={fmtBtnClass(undefined, showFormattingMarks)}
              onClick={onToggleFormattingMarks}
              title="編集記号の表示"
            >
              <span className="text-[12px] font-bold">{'¶'}</span>
            </button>
          )}
          <button className={fmtBtnClass()} onClick={() => exec('removeFormat')} title="書式をクリア">
            <Eraser size={14} />
          </button>
        </RibbonGroup>
      </div>
    )
  }

  function renderView() {
    return (
      <div className="flex items-end gap-1 overflow-x-auto flex-nowrap scrollbar-none">
        <RibbonGroup label="表示モード">
          {onPageLayout && (
            <RibbonBtn
              icon={<LayoutTemplate size={15} />}
              label="ページ"
              onClick={onPageLayout}
              active={pageLayout}
              title="ページレイアウト"
            />
          )}
          {onReadingMode && (
            <RibbonBtn icon={<BookOpen size={15} />} label="閲覧" onClick={onReadingMode} title="閲覧モード" />
          )}
          {onOutline && (
            <RibbonBtn icon={<PanelRight size={15} />} label="構成" onClick={onOutline} title="ドキュメント構成" />
          )}
          {onFocusMode && (
            <RibbonBtn
              icon={<Focus size={15} />}
              label="フォーカス"
              onClick={onFocusMode}
              active={focusMode}
              title="フォーカスモード (Ctrl+Shift+F)"
            />
          )}
        </RibbonGroup>

        <Separator />

        <RibbonGroup label="表示オプション">
          {onToggleLineNumbers && (
            <RibbonBtn
              icon={<Hash size={15} />}
              label="行番号"
              onClick={onToggleLineNumbers}
              active={showLineNumbers}
              title="行番号表示"
            />
          )}
          {onSpellCheck && (
            <RibbonBtn
              icon={<SpellCheck size={15} />}
              label="スペルチェック"
              onClick={onSpellCheck}
              active={spellCheckEnabled}
              title="スペルチェックのオン/オフ"
            />
          )}
          <RibbonBtn icon={<ZoomIn size={15} />} label="拡大" onClick={() => {}} title="拡大" />
          <RibbonBtn icon={<ZoomOut size={15} />} label="縮小" onClick={() => {}} title="縮小" />
        </RibbonGroup>

        <Separator />

        <RibbonGroup label="テーマ">
          <RibbonBtn
            icon={theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            label={theme === 'dark' ? 'ライト' : 'ダーク'}
            onClick={toggleTheme}
            title={theme === 'dark' ? 'ライトモード' : 'ダークモード'}
          />
          {onWatermark && (
            <RibbonBtn icon={<Droplets size={15} />} label="透かし" onClick={onWatermark} title="透かし設定" />
          )}
        </RibbonGroup>

        <Separator />

        <RibbonGroup label="ページ">
          {onPageSettings && (
            <RibbonBtn icon={<FileText size={15} />} label="ページ設定" onClick={onPageSettings} title="ページ設定" />
          )}
        </RibbonGroup>
      </div>
    )
  }

  function renderTools() {
    return (
      <div className="flex items-end gap-1 overflow-x-auto flex-nowrap scrollbar-none">
        <RibbonGroup label="AI">
          <RibbonBtn icon={<Sparkles size={15} />} label="AI生成" onClick={onAI} variant="accent" title="AI文章生成" />
          {onProofread && (
            <RibbonBtn icon={<SpellCheck size={15} />} label="AI校正" onClick={onProofread} variant="accent" title="AI文章校正" />
          )}
          {onAiTextTools && (
            <RibbonBtn icon={<Sparkles size={15} />} label="AIツール" onClick={onAiTextTools} variant="accent" title="AIテキストツール" />
          )}
          {onAiSummary && (
            <RibbonBtn icon={<ScrollText size={15} />} label="要約" onClick={onAiSummary} variant="accent" title="AI要約を生成" />
          )}
        </RibbonGroup>

        <Separator />

        <RibbonGroup label="インポート">
          {onPdfImport && (
            <RibbonBtn icon={<FileDown size={15} />} label="PDF取込" onClick={onPdfImport} title="PDFを読み込んでAI処理" />
          )}
          {onDocxImport && (
            <RibbonBtn icon={<FileDown size={15} />} label="DOCX取込" onClick={onDocxImport} title="DOCXファイルをインポート" />
          )}
        </RibbonGroup>

        <Separator />

        <RibbonGroup label="検索・校閲">
          {onFindReplace && (
            <RibbonBtn icon={<Search size={15} />} label="検索・置換" onClick={onFindReplace} title="検索・置換 (Ctrl+F)" />
          )}
          {onTrackChanges && (
            <RibbonBtn icon={<GitCompare size={15} />} label="変更履歴" onClick={onTrackChanges} title="変更履歴" />
          )}
          {onCompare && (
            <RibbonBtn icon={<span className="text-[10px] font-bold">{'⇔'}</span>} label="比較" onClick={onCompare} title="文書の比較" />
          )}
          {onVersionDiff && (
            <RibbonBtn icon={<span className="text-[10px] font-bold">{'±'}</span>} label="差分" onClick={onVersionDiff} title="バージョン差分表示" />
          )}
          {onDocCompare && (
            <RibbonBtn icon={<span className="text-[10px] font-bold">{'⇄'}</span>} label="文書比較" onClick={onDocCompare} title="文書の並列比較" />
          )}
        </RibbonGroup>

        <Separator />

        <RibbonGroup label="差し込み・テンプレ">
          {onMailMerge && (
            <RibbonBtn icon={<MailIcon size={15} />} label="差し込み" onClick={onMailMerge} title="差し込み印刷" />
          )}
          {onTemplates && (
            <RibbonBtn icon={<FolderOpen size={15} />} label="テンプレート" onClick={onTemplates} title="テンプレート" />
          )}
        </RibbonGroup>

        <Separator />

        <RibbonGroup label="ヘルプ">
          {onShortcuts && (
            <RibbonBtn icon={<Keyboard size={15} />} label="ショートカット" onClick={onShortcuts} title="ショートカット (Ctrl+/)" />
          )}
        </RibbonGroup>
      </div>
    )
  }

  function renderFile() {
    return (
      <div className="flex items-end gap-1 overflow-x-auto flex-nowrap scrollbar-none">
        <RibbonGroup label="エクスポート">
          <RibbonBtn icon={<Download size={15} />} label="HTML" onClick={onExport} title="HTML (.html)" />
          {onExportPDF && <RibbonBtn icon={<FileDown size={15} />} label="PDF" onClick={onExportPDF} title="PDF (.pdf)" />}
          {onExportDOCX && <RibbonBtn icon={<FileDown size={15} />} label="DOCX" onClick={onExportDOCX} title="Word (.docx)" />}
          {onExportMarkdown && <RibbonBtn icon={<FileDown size={15} />} label="MD" onClick={onExportMarkdown} title="Markdown (.md)" />}
          {onExportText && <RibbonBtn icon={<FileDown size={15} />} label="TXT" onClick={onExportText} title="テキスト (.txt)" />}
        </RibbonGroup>

        <Separator />

        <RibbonGroup label="印刷">
          {onPrint && <RibbonBtn icon={<Printer size={15} />} label="印刷" onClick={onPrint} title="印刷" />}
        </RibbonGroup>

        <Separator />

        <RibbonGroup label="バージョン">
          {onSaveVersion && (
            <RibbonBtn icon={<Save size={15} />} label="保存" onClick={onSaveVersion} title="バージョンを保存" />
          )}
          {onVersions && (
            <RibbonBtn icon={<History size={15} />} label="履歴" onClick={onVersions} title="バージョン履歴" />
          )}
          {onVersionHistory && (
            <RibbonBtn icon={<Clock size={15} />} label="自動履歴" onClick={onVersionHistory} title="自動バージョン履歴" />
          )}
        </RibbonGroup>

        <Separator />

        <RibbonGroup label="共有・コメント">
          {onShare && (
            <RibbonBtn icon={<Share2 size={15} />} label="共有" onClick={onShare} title="共有" />
          )}
          {onComments && (
            <RibbonBtn icon={<MessageSquare size={15} />} label="コメント" onClick={onComments} badge={commentCount} title="コメント" />
          )}
        </RibbonGroup>

        <Separator />

        <RibbonGroup label="削除">
          <RibbonBtn icon={<Trash2 size={15} />} label="削除" onClick={onDelete} variant="danger" title="削除" />
        </RibbonGroup>
      </div>
    )
  }

  const tabContent: Record<TabKey, () => React.ReactNode> = {
    home: renderHome,
    insert: renderInsert,
    format: renderFormat,
    view: renderView,
    tools: renderTools,
    file: renderFile,
  }

  return (
    <div ref={ribbonRef} className="sticky top-0 z-10 bg-slate-950 border-b border-slate-800 no-print select-none">
      {/* ===== Title bar ===== */}
      <div className="flex items-center gap-2 px-4 py-1.5 border-b border-slate-800/50 max-md:px-2">
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
          <span className={`text-xs hidden lg:block transition-colors ${
            saveStatus === 'saving' ? 'text-yellow-400' :
            saveStatus === 'error' ? 'text-red-400' :
            'text-green-400'
          }`}>
            {saveStatus === 'saving' ? '保存中...' :
             saveStatus === 'error' ? '保存エラー' :
             '✓ 保存済み'}
          </span>

          <PresenceAvatars documentId={state.meta.id} />
        </div>
      </div>

      {/* ===== Tab headers ===== */}
      <div className="flex items-center px-2 gap-0 border-b border-slate-800/50">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleTabClick(tab.key)}
            className={`px-3 py-1 text-xs font-medium transition-colors border-b-2 ${
              activeTab === tab.key
                ? 'text-indigo-400 border-indigo-500'
                : 'text-slate-400 border-transparent hover:text-white hover:border-slate-600'
            }`}
          >
            {tab.label}
          </button>
        ))}

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto text-slate-500 hover:text-white p-1 transition-colors"
          title={collapsed ? 'リボンを展開' : 'リボンを折りたたむ'}
        >
          {collapsed ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
        </button>
      </div>

      {/* ===== Tab content ===== */}
      {!collapsed && (
        <div className="px-3 py-1.5 min-h-[48px] max-md:px-1">
          {tabContent[activeTab]()}
        </div>
      )}
    </div>
  )
}
