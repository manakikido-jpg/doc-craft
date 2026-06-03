'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import type { SlidesDocument, Slide, SlideElement, SlideTextElement } from '@/types'
import {
  ArrowLeft,
  Undo2,
  Redo2,
  Palette,
  ImageIcon,
  Shapes,
  Sparkle,
  StickyNote,
  MessageSquare,
  Sparkles,
  Save,
  History,
  Share2,
  Keyboard,
  Play,
  Printer,
  Trash2,
  Download,
  FileDown,
  ChevronDown,
  ChevronUp,
  Monitor,
  Plus,
  Table,
  Wallpaper,
  ArrowRightLeft,
  LayoutGrid,
  BarChart3,
  Video,
  Music,
  Settings2,
  Sun,
  Moon,
  Type,
  Clock,
  Wand2,
  Scissors,
  ClipboardCopy,
  ClipboardPaste,
  Copy,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  CaseSensitive,
  Minus,
  ZoomIn,
  ZoomOut,
  List,
  Square,
  Maximize2,
  Pipette,
  LayoutTemplate,
  FolderOpen,
  Move,
  Ruler,
  Layers,
  Network,
  Timer,
  CopyCheck,
  ListTree,
  PenTool,
  Search,
  BookOpen,
  ImagePlus,
  Route,
  ShapesIcon,
  FileText,
  CheckCircle2,
  Droplets,
} from 'lucide-react'
import type { SlideAction } from '@/hooks/use-slides'
import type { UndoableAction } from '@/lib/undoable'
import ThemePicker from './theme-picker'
import TemplatePicker from './template-picker'
import ThemeCustomizer from './theme-customizer'
import { fileToDataURL, isStorageNearLimit } from '@/lib/image-utils'
import { t } from '@/lib/i18n'
import LanguageToggle from './language-toggle'
import { useToast } from '@/components/shared/toast'
import { useTheme } from '@/lib/theme-context'
import PresenceAvatars from '../shared/presence-avatars'

// ========== Constants ==========

const SHAPE_CATEGORIES = [
  {
    label: '基本図形',
    shapes: [
      { shape: 'rect' as const, label: '□ 四角', fill: '#3b82f6' },
      { shape: 'circle' as const, label: '○ 丸', fill: '#10b981' },
      { shape: 'triangle' as const, label: '△ 三角', fill: '#f59e0b' },
      { shape: 'diamond' as const, label: '◇ ダイヤ', fill: '#ec4899' },
      { shape: 'pentagon' as const, label: '⬠ 五角', fill: '#06b6d4' },
      { shape: 'hexagon' as const, label: '⬡ 六角', fill: '#14b8a6' },
      { shape: 'line' as const, label: '— 線', fill: '#94a3b8' },
    ],
  },
  {
    label: '矢印',
    shapes: [
      { shape: 'arrow-right' as const, label: '→ 右矢印', fill: '#8b5cf6' },
      { shape: 'arrow-left' as const, label: '← 左矢印', fill: '#8b5cf6' },
      { shape: 'arrow-up' as const, label: '↑ 上矢印', fill: '#8b5cf6' },
      { shape: 'arrow-down' as const, label: '↓ 下矢印', fill: '#8b5cf6' },
    ],
  },
  {
    label: '特殊',
    shapes: [
      { shape: 'star' as const, label: '★ 星', fill: '#eab308' },
      { shape: 'heart' as const, label: '♥ ハート', fill: '#ef4444' },
      { shape: 'cross' as const, label: '✚ 十字', fill: '#6366f1' },
      { shape: 'callout' as const, label: '💬 吹出し', fill: '#64748b' },
    ],
  },
]

const TRANSITIONS: { value: Slide['transition']; label: string }[] = [
  { value: 'none', label: 'なし' },
  { value: 'fade', label: 'フェード' },
  { value: 'dissolve', label: 'ディゾルブ' },
  { value: 'slide-left', label: 'スライド左' },
  { value: 'slide-up', label: 'スライド上' },
  { value: 'wipe-left', label: 'ワイプ左' },
  { value: 'wipe-up', label: 'ワイプ上' },
  { value: 'zoom', label: 'ズーム' },
  { value: 'flip', label: 'フリップ' },
  { value: 'cube', label: 'キューブ' },
]

const FONT_SIZES = [12, 14, 16, 18, 20, 24, 28, 32, 36, 42, 48, 56, 64, 72, 96]

const FONT_FAMILIES = [
  { label: 'ゴシック', value: 'sans-serif' },
  { label: '明朝', value: 'serif' },
  { label: '等幅', value: 'monospace' },
  { label: 'Yu Gothic', value: '"Yu Gothic", sans-serif' },
  { label: 'Yu Mincho', value: '"Yu Mincho", serif' },
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Times', value: '"Times New Roman", serif' },
]

const FONT_WEIGHTS: { label: string; value: SlideTextElement['fontWeight'] }[] = [
  { label: 'Thin', value: '100' },
  { label: 'Light', value: '300' },
  { label: 'Regular', value: '400' },
  { label: 'Medium', value: '500' },
  { label: 'Semi Bold', value: '600' },
  { label: 'Bold', value: '700' },
  { label: 'Extra Bold', value: '800' },
  { label: 'Black', value: '900' },
]

const COLOR_ROWS = [
  { label: 'グレー系', colors: ['#ffffff', '#f1f5f9', '#cbd5e1', '#94a3b8', '#64748b', '#475569', '#334155', '#1e293b', '#0f172a', '#000000'] },
  { label: '暖色系', colors: ['#fef2f2', '#fecaca', '#fca5a5', '#f87171', '#ef4444', '#dc2626', '#b91c1c', '#991b1b', '#7f1d1d', '#450a0a'] },
  { label: 'オレンジ', colors: ['#fff7ed', '#fed7aa', '#fdba74', '#fb923c', '#f97316', '#ea580c', '#c2410c', '#9a3412', '#7c2d12', '#431407'] },
  { label: '黄色系', colors: ['#fefce8', '#fef08a', '#fde047', '#facc15', '#eab308', '#ca8a04', '#a16207', '#854d0e', '#713f12', '#422006'] },
  { label: '緑系', colors: ['#f0fdf4', '#bbf7d0', '#86efac', '#4ade80', '#22c55e', '#16a34a', '#15803d', '#166534', '#14532d', '#052e16'] },
  { label: '青系', colors: ['#eff6ff', '#bfdbfe', '#93c5fd', '#60a5fa', '#3b82f6', '#2563eb', '#1d4ed8', '#1e40af', '#1e3a8a', '#172554'] },
  { label: '紫系', colors: ['#f5f3ff', '#ddd6fe', '#c4b5fd', '#a78bfa', '#8b5cf6', '#7c3aed', '#6d28d9', '#5b21b6', '#4c1d95', '#2e1065'] },
  { label: 'ピンク', colors: ['#fdf2f8', '#fbcfe8', '#f9a8d4', '#f472b6', '#ec4899', '#db2777', '#be185d', '#9d174d', '#831843', '#500724'] },
]

// ========== Tab definitions ==========

type TabKey = 'home' | 'insert' | 'format' | 'design' | 'animation' | 'view' | 'slideshow' | 'file'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'home', label: 'ホーム' },
  { key: 'insert', label: '挿入' },
  { key: 'format', label: '書式' },
  { key: 'design', label: 'デザイン' },
  { key: 'animation', label: 'アニメーション' },
  { key: 'view', label: '表示' },
  { key: 'slideshow', label: 'スライドショー' },
  { key: 'file', label: 'ファイル' },
]

// ========== Props ==========

export interface SlideRibbonToolbarProps {
  state: SlidesDocument
  dispatch: React.Dispatch<UndoableAction<SlideAction>>
  onExport: () => void
  onExportPDF?: () => void
  onExportPPTX?: () => void
  onExportImages?: () => void
  onImportPPTX?: () => void
  onDelete: () => void
  onPresent?: () => void
  onPresenterView?: () => void
  canUndo?: boolean
  canRedo?: boolean
  onUndo?: () => void
  onRedo?: () => void
  onPrint?: () => void
  onNotesToggle?: () => void
  onCommentsToggle?: () => void
  onShortcuts?: () => void
  onShare?: () => void
  onVersions?: () => void
  onVersionHistory?: () => void
  onAutoLayout?: () => void
  onSorterView?: () => void
  onSlideLayout?: () => void
  onAnimationPanel?: () => void
  onFooterSettings?: () => void
  onPdfImport?: () => void
  onAiDesign?: () => void
  // PowerPoint improvements
  onSlideSizeSettings?: () => void
  onBackgroundGallery?: () => void
  onThemeColorEditor?: () => void
  onSectionManager?: () => void
  onMasterEditor?: () => void
  onHandoutView?: () => void
  onBulletPanel?: () => void
  onPaddingPanel?: () => void
  onWordArtPicker?: () => void
  onPositionPanel?: () => void
  onAlignmentToolbar?: () => void
  onSlideRuler?: () => void
  // New feature callbacks
  onAnimationTimeline?: () => void
  onSelectionPane?: () => void
  onOutlineView?: () => void
  onTransitionPreview?: () => void
  onSmartArt?: () => void
  onFindReplace?: () => void
  onImageColorFilters?: () => void
  onFreehandDraw?: () => void
  onTableGridPicker?: () => void
  onTransitionApplyAll?: () => void
  // Round 3 features
  onGuideManager?: () => void
  onReadingView?: () => void
  onImageTools?: () => void
  onMotionPath?: () => void
  onMoreShapes?: () => void
  onMoreCharts?: () => void
  onMoreTransitions?: () => void
  onRehearsal?: () => void
  onNotesPrint?: () => void
  onThemePreview?: () => void
  onGradientEditor?: () => void
  onFontPairPicker?: () => void
  onCompareView?: () => void
  onCustomThemeManager?: () => void
  onFormatPainter?: () => void
  onHyperlinkEditor?: () => void
  onPictureStyles?: () => void
  onEyedropper?: (target: 'fill' | 'text' | 'stroke') => void
  onAccessibilityCheck?: () => void
  onInspector?: () => void
  onShapeTextEditor?: () => void
  onBackgroundPattern?: () => void
  onEasingPicker?: () => void
  onPresentationSettings?: () => void
  onCsvImport?: () => void
  onWatermark?: () => void
  // Animation duration
  currentTransitionDuration?: number
  onTransitionDuration?: (ms: number) => void
  // Format bar props
  activeSlideId?: string
  elements: SlideElement[]
  selectedIds: string[]
  onUpdateProps: (slideId: string, elementId: string, props: Partial<SlideTextElement>) => void
  // Zoom
  zoom?: number
  onZoomChange?: (z: number) => void
}

// ========== Helpers ==========

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

function Separator() {
  return <div className="w-px h-10 bg-slate-700/60 mx-1 flex-shrink-0" />
}

function RibbonGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center gap-0.5">{children}</div>
      <span className="text-[8px] text-slate-500 leading-none mt-0.5 max-md:hidden">{label}</span>
    </div>
  )
}

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
  const triggerRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  useEffect(() => {
    if (!open) return
    function handle(e: MouseEvent) {
      if (
        ref.current && !ref.current.contains(e.target as Node) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node)
      ) {
        onToggle()
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open, onToggle])

  useEffect(() => {
    if (!open || !triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    let top = rect.bottom + 4
    let left = align === 'right' ? rect.right : align === 'center' ? rect.left + rect.width / 2 : rect.left

    // Defer boundary check to after dropdown renders
    requestAnimationFrame(() => {
      if (!dropdownRef.current) return
      const dd = dropdownRef.current.getBoundingClientRect()
      // Flip up if overflows bottom
      if (top + dd.height > window.innerHeight - 8) {
        top = Math.max(8, rect.top - dd.height - 4)
      }
      // Adjust horizontal if overflows right
      if (align === 'right') {
        left = Math.max(8, rect.right - dd.width)
      } else if (align === 'center') {
        left = Math.max(8, left - dd.width / 2)
      }
      if (left + dd.width > window.innerWidth - 8) {
        left = window.innerWidth - dd.width - 8
      }
      left = Math.max(8, left)
      setPos({ top, left })
    })

    setPos({ top, left })
  }, [open, align])

  return (
    <div className="relative" ref={ref}>
      <div ref={triggerRef}>{trigger}</div>
      {open && pos && (
        <div
          ref={dropdownRef}
          className="fixed bg-slate-900 border border-slate-700 rounded-lg shadow-xl z-[9999]"
          style={{ top: pos.top, left: pos.left }}
        >
          {children}
        </div>
      )}
    </div>
  )
}

// ========== Main component ==========

export default function SlideRibbonToolbar(props: SlideRibbonToolbarProps) {
  const {
    state, dispatch, onExport, onExportPDF, onExportPPTX, onExportImages, onImportPPTX, onPrint, onDelete,
    onPresent, onPresenterView, canUndo, canRedo, onUndo, onRedo,
    onNotesToggle, onCommentsToggle, onShortcuts, onShare, onVersions,
    onVersionHistory, onAutoLayout, onSorterView, onSlideLayout,
    onAnimationPanel, onFooterSettings, onPdfImport, onAiDesign,
    onSlideSizeSettings, onBackgroundGallery, onThemeColorEditor,
    onSectionManager, onMasterEditor, onHandoutView,
    onBulletPanel, onPaddingPanel, onWordArtPicker,
    onPositionPanel, onAlignmentToolbar, onSlideRuler,
    onAnimationTimeline, onSelectionPane, onOutlineView,
    onTransitionPreview, onSmartArt, onFindReplace,
    onImageColorFilters, onFreehandDraw, onTableGridPicker, onTransitionApplyAll,
    onGuideManager, onReadingView, onImageTools, onMotionPath,
    onMoreShapes, onMoreCharts, onMoreTransitions, onRehearsal, onNotesPrint,
    onThemePreview, onGradientEditor, onFontPairPicker, onCompareView, onCustomThemeManager,
    onFormatPainter, onHyperlinkEditor,
    onPictureStyles, onEyedropper, onAccessibilityCheck, onInspector, onShapeTextEditor, onBackgroundPattern, onEasingPicker, onPresentationSettings,
    onCsvImport, onWatermark,
    currentTransitionDuration, onTransitionDuration,
    activeSlideId: activeSlideIdProp, elements, selectedIds, onUpdateProps,
    zoom, onZoomChange,
  } = props

  const { addToast } = useToast()
  const { theme, toggleTheme } = useTheme()
  const [activeTab, setActiveTab] = useState<TabKey>('home')
  const [collapsed, setCollapsed] = useState(false)
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)
  const [customizerOpen, setCustomizerOpen] = useState(false)
  const ribbonRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const bgFileRef = useRef<HTMLInputElement>(null)
  const commentCount = (state.comments || []).filter((c) => !c.resolved).length

  const activeSlide = state.slides.find((s) => s.id === state.activeSlideId)

  // Format bar: get selected text element
  const selectedId = selectedIds.length === 1 ? selectedIds[0] : null
  const selectedEl = selectedId
    ? elements.find(
        (e) =>
          e.id === selectedId &&
          e.type !== 'image' &&
          e.type !== 'shape' &&
          e.type !== 'table' &&
          e.type !== 'connector' &&
          e.type !== 'video' &&
          e.type !== 'audio' &&
          e.type !== 'chart',
      )
    : null
  const textEl = selectedEl as SlideTextElement | undefined
  const fmtDisabled = !textEl || !activeSlideIdProp

  function updateTextProp(p: Partial<SlideTextElement>) {
    if (!activeSlideIdProp || !selectedId) return
    onUpdateProps(activeSlideIdProp, selectedId, p)
  }

  // Close dropdown on outside click
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

  async function handleImageFile(file: File) {
    if (!file.type.startsWith('image/') || !activeSlide) return
    if (isStorageNearLimit()) {
      addToast('ストレージの容量が不足しています。', 'warning')
      return
    }
    const src = await fileToDataURL(file)
    dispatch({ type: 'ADD_IMAGE_ELEMENT', slideId: activeSlide.id, src, alt: file.name })
  }

  function handleTabClick(key: TabKey) {
    if (activeTab === key) {
      setCollapsed(!collapsed)
    } else {
      setActiveTab(key)
      setCollapsed(false)
    }
  }

  const currentFontSize = textEl?.fontSize ?? 32
  const currentFontFamily = textEl?.fontFamily ?? 'sans-serif'
  const currentFontWeight = textEl?.fontWeight ?? '400'
  const currentAlign = textEl?.align ?? 'left'
  const currentColor = textEl?.color ?? '#ffffff'
  const isBold = Number(currentFontWeight) >= 700

  function fmtBtnClass(active?: boolean) {
    return `w-7 h-7 flex items-center justify-center rounded text-xs transition-colors ${
      fmtDisabled
        ? 'text-slate-600 cursor-not-allowed'
        : active
          ? 'bg-indigo-500 text-white'
          : 'text-slate-300 hover:bg-slate-700 hover:text-white'
    }`
  }

  // ===== Tab renderers =====

  function renderHome() {
    return (
      <div className="flex items-end gap-1 overflow-x-auto flex-nowrap scrollbar-none">
        {/* Undo/Redo */}
        {onUndo && (
          <RibbonGroup label="元に戻す">
            <RibbonBtn icon={<Undo2 size={15} />} label="元に戻す" onClick={onUndo} disabled={!canUndo} title="元に戻す (Ctrl+Z)" />
            <RibbonBtn icon={<Redo2 size={15} />} label="やり直し" onClick={onRedo} disabled={!canRedo} title="やり直し (Ctrl+Y)" />
          </RibbonGroup>
        )}

        <Separator />

        {/* Clipboard */}
        <RibbonGroup label="クリップボード">
          <RibbonBtn icon={<Scissors size={15} />} label="切り取り" onClick={() => document.execCommand('cut')} title="切り取り (Ctrl+X)" />
          <RibbonBtn icon={<ClipboardCopy size={15} />} label="コピー" onClick={() => document.execCommand('copy')} title="コピー (Ctrl+C)" />
          <RibbonBtn icon={<ClipboardPaste size={15} />} label="貼付け" onClick={() => document.execCommand('paste')} title="貼り付け (Ctrl+V)" />
          {onFormatPainter && <RibbonBtn icon={<Pipette size={15} />} label="書式コピー" onClick={onFormatPainter} title="書式のコピー/貼り付け" />}
        </RibbonGroup>

        <Separator />

        {/* Slide operations */}
        <RibbonGroup label="スライド">
          <RibbonBtn
            icon={<Plus size={15} />}
            label="新規"
            onClick={() => dispatch({ type: 'ADD_SLIDE', afterId: state.activeSlideId })}
            title="新しいスライド"
          />
          {activeSlide && (
            <>
              <RibbonBtn
                icon={<Copy size={15} />}
                label="複製"
                onClick={() => dispatch({ type: 'DUPLICATE_SLIDE', id: activeSlide.id })}
                title="スライドを複製"
              />
              <RibbonBtn
                icon={<Trash2 size={15} />}
                label="削除"
                onClick={() => dispatch({ type: 'DELETE_SLIDE', id: activeSlide.id })}
                variant="danger"
                title="スライドを削除"
              />
            </>
          )}
        </RibbonGroup>

        <Separator />

        {/* Theme / Template */}
        {activeSlide && (
          <RibbonGroup label="テーマ">
            <ThemePicker
              currentTheme={activeSlide.themeKey}
              onSelect={(key) => dispatch({ type: 'SET_THEME', slideId: activeSlide.id, themeKey: key })}
              onSelectAll={(key) => dispatch({ type: 'SET_THEME_ALL', themeKey: key })}
            />
            <TemplatePicker
              currentTheme={activeSlide.themeKey}
              onApply={(id) => dispatch({ type: 'APPLY_TEMPLATE', templateId: id })}
            />
          </RibbonGroup>
        )}

        <Separator />
        <RibbonGroup label="選択">
          {onSelectionPane && <RibbonBtn icon={<Layers size={15} />} label="選択ウィンドウ" onClick={onSelectionPane} title="選択ウィンドウ" />}
          {onFindReplace && <RibbonBtn icon={<Search size={15} />} label="検索・置換" onClick={onFindReplace} title="テキスト検索・置換" />}
        </RibbonGroup>
      </div>
    )
  }

  function renderInsert() {
    return (
      <div className="flex items-end gap-1 overflow-x-auto flex-nowrap scrollbar-none">
        {/* Text box */}
        <RibbonGroup label="テキスト">
          <DropdownBtn
            trigger={
              <button
                className="flex flex-col items-center justify-center gap-0.5 px-1.5 py-1 rounded transition-colors min-w-[32px] text-slate-400 hover:bg-slate-700 hover:text-white"
                onClick={() => toggleDropdown('textInsert')}
                title="テキストボックス"
              >
                <Type size={15} />
                <span className="text-[9px] leading-none max-md:hidden">テキスト</span>
              </button>
            }
            open={activeDropdown === 'textInsert'}
            onToggle={() => toggleDropdown('textInsert')}
          >
            <div className="py-1 w-44">
              {[
                { textType: 'title' as const, label: 'タイトル', desc: '大きい見出し' },
                { textType: 'subtitle' as const, label: 'サブタイトル', desc: '中見出し' },
                { textType: 'body' as const, label: '本文', desc: '標準テキスト' },
                { textType: 'label' as const, label: 'ラベル', desc: '小さいテキスト' },
              ].map((item) => (
                <button
                  key={item.textType}
                  onClick={() => {
                    if (activeSlide) dispatch({ type: 'ADD_TEXT_ELEMENT', slideId: activeSlide.id, textType: item.textType })
                    setActiveDropdown(null)
                  }}
                  className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 hover:text-white flex items-center justify-between"
                >
                  <span>{item.label}</span>
                  <span className="text-[10px] text-slate-500">{item.desc}</span>
                </button>
              ))}
            </div>
          </DropdownBtn>
        </RibbonGroup>

        <Separator />

        {/* Image */}
        <RibbonGroup label="画像">
          <RibbonBtn icon={<ImageIcon size={15} />} label="画像" onClick={() => fileRef.current?.click()} title="画像を挿入 (I)" />
          <RibbonBtn icon={<Wallpaper size={15} />} label="背景" onClick={() => bgFileRef.current?.click()} title="背景画像" />
          {onImageTools && <RibbonBtn icon={<ImagePlus size={15} />} label="画像ツール" onClick={onImageTools} title="画像ツール" />}
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageFile(f) }} />
          <input
            ref={bgFileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0]
              if (!file || !activeSlide) return
              if (isStorageNearLimit()) { addToast('ストレージの容量が不足しています。', 'warning'); return }
              const src = await fileToDataURL(file)
              dispatch({ type: 'SET_BACKGROUND_IMAGE', slideId: activeSlide.id, backgroundImage: src, backgroundFit: 'cover' })
            }}
          />
        </RibbonGroup>

        <Separator />

        {/* Shape */}
        <RibbonGroup label="図形">
          <DropdownBtn
            trigger={
              <button
                className="flex flex-col items-center justify-center gap-0.5 px-1.5 py-1 rounded transition-colors min-w-[32px] text-slate-400 hover:bg-slate-700 hover:text-white"
                onClick={() => toggleDropdown('shapeInsert')}
                title="図形を挿入"
              >
                <Shapes size={15} />
                <span className="text-[9px] leading-none max-md:hidden">図形</span>
              </button>
            }
            open={activeDropdown === 'shapeInsert'}
            onToggle={() => toggleDropdown('shapeInsert')}
          >
            <div className="py-1 w-40 max-h-80 overflow-y-auto">
              {SHAPE_CATEGORIES.map((cat) => (
                <div key={cat.label}>
                  <div className="px-3 py-1 text-[10px] text-slate-500 font-medium uppercase tracking-wider">{cat.label}</div>
                  {cat.shapes.map((s) => (
                    <button
                      key={s.shape}
                      onClick={() => {
                        if (activeSlide) dispatch({ type: 'ADD_SHAPE_ELEMENT', slideId: activeSlide.id, shape: s.shape, fill: s.fill })
                        setActiveDropdown(null)
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 hover:text-white"
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </DropdownBtn>
          {onMoreShapes && <RibbonBtn icon={<ShapesIcon size={15} />} label="図形一覧" onClick={onMoreShapes} title="図形一覧" />}
        </RibbonGroup>

        <Separator />

        {/* Table */}
        <RibbonGroup label="テーブル">
          <DropdownBtn
            trigger={
              <button
                className="flex flex-col items-center justify-center gap-0.5 px-1.5 py-1 rounded transition-colors min-w-[32px] text-slate-400 hover:bg-slate-700 hover:text-white"
                onClick={() => toggleDropdown('tableInsert')}
                title="テーブルを挿入"
              >
                <Table size={15} />
                <span className="text-[9px] leading-none max-md:hidden">テーブル</span>
              </button>
            }
            open={activeDropdown === 'tableInsert'}
            onToggle={() => toggleDropdown('tableInsert')}
          >
            <div className="py-1 w-32">
              {[
                { r: 2, c: 2, l: '2x2' },
                { r: 3, c: 3, l: '3x3' },
                { r: 4, c: 4, l: '4x4' },
                { r: 3, c: 5, l: '3x5' },
              ].map((tbl) => (
                <button
                  key={tbl.l}
                  onClick={() => {
                    if (activeSlide) dispatch({ type: 'ADD_TABLE_ELEMENT', slideId: activeSlide.id, rows: tbl.r, cols: tbl.c })
                    setActiveDropdown(null)
                  }}
                  className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 hover:text-white"
                >
                  {tbl.l} テーブル
                </button>
              ))}
            </div>
          </DropdownBtn>
        </RibbonGroup>

        <Separator />

        {/* Chart */}
        <RibbonGroup label="グラフ">
          <DropdownBtn
            trigger={
              <button
                className="flex flex-col items-center justify-center gap-0.5 px-1.5 py-1 rounded transition-colors min-w-[32px] text-slate-400 hover:bg-slate-700 hover:text-white"
                onClick={() => toggleDropdown('chartInsert')}
                title="グラフを挿入"
              >
                <BarChart3 size={15} />
                <span className="text-[9px] leading-none max-md:hidden">グラフ</span>
              </button>
            }
            open={activeDropdown === 'chartInsert'}
            onToggle={() => toggleDropdown('chartInsert')}
          >
            <div className="py-1 w-36">
              {[
                { type: 'bar' as const, label: '棒グラフ' },
                { type: 'line' as const, label: '折れ線グラフ' },
                { type: 'pie' as const, label: '円グラフ' },
                { type: 'donut' as const, label: 'ドーナツグラフ' },
              ].map((c) => (
                <button
                  key={c.type}
                  onClick={() => {
                    if (activeSlide) dispatch({ type: 'ADD_CHART_ELEMENT', slideId: activeSlide.id, chartType: c.type })
                    setActiveDropdown(null)
                  }}
                  className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 hover:text-white"
                >
                  {c.label}
                </button>
              ))}
            </div>
          </DropdownBtn>
          {onMoreCharts && <RibbonBtn icon={<BarChart3 size={15} />} label="グラフ一覧" onClick={onMoreCharts} title="グラフ一覧" />}
        </RibbonGroup>

        <Separator />

        {/* Media & Connector */}
        <RibbonGroup label="メディア">
          <RibbonBtn
            icon={<Video size={15} />}
            label="動画"
            onClick={() => {
              const url = prompt('動画URLまたはYouTube URLを入力')
              if (!url || !activeSlide) return
              const isYT = url.includes('youtube.com') || url.includes('youtu.be')
              let src = url
              if (isYT) {
                const match = url.match(/(?:v=|youtu\.be\/)([^&\s]+)/)
                if (match) src = `https://www.youtube.com/embed/${match[1]}`
              }
              dispatch({ type: 'ADD_VIDEO_ELEMENT', slideId: activeSlide.id, src, embedType: isYT ? 'youtube' : 'url' })
            }}
            title="動画を挿入"
          />
          <RibbonBtn
            icon={<Music size={15} />}
            label="音声"
            onClick={() => {
              const url = prompt('音声ファイルURLを入力')
              if (!url || !activeSlide) return
              dispatch({ type: 'ADD_AUDIO_ELEMENT', slideId: activeSlide.id, src: url })
            }}
            title="音声を挿入"
          />
          <RibbonBtn
            icon={<ArrowRightLeft size={15} />}
            label="コネクター"
            onClick={() => {
              if (!activeSlide) return
              dispatch({ type: 'ADD_CONNECTOR', slideId: activeSlide.id, fromPoint: { x: 20, y: 50 }, toPoint: { x: 80, y: 50 }, stroke: '#6366f1' })
            }}
            title="コネクター線"
          />
        </RibbonGroup>

        <Separator />

        <RibbonGroup label="テキスト書式">
          {onBulletPanel && <RibbonBtn icon={<List size={15} />} label="箇条書き" onClick={onBulletPanel} title="箇条書きスタイル" />}
          {onPaddingPanel && <RibbonBtn icon={<Square size={15} />} label="余白" onClick={onPaddingPanel} title="テキスト内余白" />}
          {onWordArtPicker && <RibbonBtn icon={<Type size={15} />} label="WordArt" onClick={onWordArtPicker} title="テキストエフェクト" />}
          {onShapeTextEditor && <RibbonBtn icon={<Type size={15} />} label="図形テキスト" onClick={onShapeTextEditor} title="図形内テキスト編集" />}
        </RibbonGroup>

        <Separator />
        <RibbonGroup label="図表">
          {onSmartArt && <RibbonBtn icon={<Network size={15} />} label="SmartArt" onClick={onSmartArt} title="SmartArtの挿入" />}
          {onFreehandDraw && <RibbonBtn icon={<PenTool size={15} />} label="フリーハンド" onClick={onFreehandDraw} title="フリーハンド描画" />}
        </RibbonGroup>

        <Separator />
        <RibbonGroup label="データ">
          {onCsvImport && <RibbonBtn icon={<FileText size={15} />} label="CSV取込" onClick={onCsvImport} title="CSVからチャート作成" />}
        </RibbonGroup>

        <Separator />
        <RibbonGroup label="リンク">
          {onHyperlinkEditor && <RibbonBtn icon={<Network size={15} />} label="リンク" onClick={onHyperlinkEditor} title="ハイパーリンクの挿入" />}
        </RibbonGroup>
      </div>
    )
  }

  function renderFormat() {
    return (
      <div className="flex items-end gap-1 overflow-x-auto flex-nowrap scrollbar-none">
        {/* Font family */}
        <RibbonGroup label="フォント">
          <DropdownBtn
            trigger={
              <button
                className={`h-7 px-2 flex items-center gap-1 rounded text-xs transition-colors min-w-[80px] ${
                  fmtDisabled ? 'text-slate-600 cursor-not-allowed' : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
                onClick={() => !fmtDisabled && toggleDropdown('fontFamily')}
                disabled={fmtDisabled}
              >
                <CaseSensitive size={13} />
                <span className="truncate max-w-[60px]">
                  {FONT_FAMILIES.find((f) => f.value === currentFontFamily)?.label ?? 'ゴシック'}
                </span>
                <ChevronDown size={10} />
              </button>
            }
            open={activeDropdown === 'fontFamily'}
            onToggle={() => toggleDropdown('fontFamily')}
          >
            <div className="py-1 w-40 max-h-56 overflow-y-auto">
              {FONT_FAMILIES.map((f) => (
                <button
                  key={f.value}
                  className={`w-full text-left px-3 py-1.5 text-xs hover:bg-slate-800 ${
                    currentFontFamily === f.value ? 'text-indigo-400' : 'text-slate-300'
                  } hover:text-white`}
                  style={{ fontFamily: f.value }}
                  onClick={() => { updateTextProp({ fontFamily: f.value }); setActiveDropdown(null) }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </DropdownBtn>
        </RibbonGroup>

        <Separator />

        {/* Font size */}
        <RibbonGroup label="サイズ">
          <button
            className={fmtBtnClass()}
            disabled={fmtDisabled}
            onClick={() => {
              const idx = FONT_SIZES.findIndex((s) => s >= currentFontSize)
              const prev = FONT_SIZES[Math.max(0, (idx > 0 ? idx : FONT_SIZES.length) - 1)]
              updateTextProp({ fontSize: prev })
            }}
            title="サイズを小さく"
          >
            <Minus size={13} />
          </button>
          <DropdownBtn
            trigger={
              <div className="relative">
                <input
                  type="number"
                  min={8}
                  max={120}
                  value={currentFontSize}
                  disabled={fmtDisabled}
                  className={`h-7 w-[52px] px-1.5 rounded text-xs text-center transition-colors bg-transparent border border-slate-700 focus:border-indigo-500 focus:outline-none ${
                    fmtDisabled ? 'text-slate-600 cursor-not-allowed' : 'text-white hover:bg-slate-700'
                  }`}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10)
                    if (!isNaN(val) && val >= 8 && val <= 120) {
                      updateTextProp({ fontSize: val })
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      (e.target as HTMLInputElement).blur()
                    }
                    e.stopPropagation()
                  }}
                  onClick={(e) => {
                    e.stopPropagation()
                    if (!fmtDisabled) toggleDropdown('fontSize')
                  }}
                  title="フォントサイズ (8-120)"
                />
              </div>
            }
            open={activeDropdown === 'fontSize'}
            onToggle={() => toggleDropdown('fontSize')}
          >
            <div className="py-1 w-20 max-h-48 overflow-y-auto">
              {FONT_SIZES.map((s) => (
                <button
                  key={s}
                  className={`w-full text-left px-3 py-1 text-xs hover:bg-slate-800 ${
                    currentFontSize === s ? 'text-indigo-400' : 'text-slate-300'
                  } hover:text-white`}
                  onClick={() => { updateTextProp({ fontSize: s }); setActiveDropdown(null) }}
                >
                  {s}px
                </button>
              ))}
            </div>
          </DropdownBtn>
          <button
            className={fmtBtnClass()}
            disabled={fmtDisabled}
            onClick={() => {
              const idx = FONT_SIZES.findIndex((s) => s > currentFontSize)
              const next = FONT_SIZES[idx >= 0 ? idx : FONT_SIZES.length - 1]
              updateTextProp({ fontSize: next })
            }}
            title="サイズを大きく"
          >
            <Plus size={13} />
          </button>
        </RibbonGroup>

        <Separator />

        {/* Bold/Italic/Underline/Strikethrough */}
        <RibbonGroup label="文字装飾">
          {/* Font weight dropdown */}
          <DropdownBtn
            trigger={
              <button
                className={`h-7 px-2 flex items-center gap-1 rounded text-xs transition-colors ${
                  fmtDisabled ? 'text-slate-600 cursor-not-allowed' : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
                onClick={() => !fmtDisabled && toggleDropdown('fontWeight')}
                disabled={fmtDisabled}
              >
                <Bold size={13} className={isBold ? 'text-indigo-400' : ''} />
                <span className="max-lg:hidden">
                  {FONT_WEIGHTS.find((w) => w.value === currentFontWeight)?.label ?? 'Regular'}
                </span>
                <ChevronDown size={10} />
              </button>
            }
            open={activeDropdown === 'fontWeight'}
            onToggle={() => toggleDropdown('fontWeight')}
          >
            <div className="py-1 w-32">
              {FONT_WEIGHTS.map((w) => (
                <button
                  key={w.value}
                  className={`w-full text-left px-3 py-1.5 text-xs hover:bg-slate-800 ${
                    currentFontWeight === w.value ? 'text-indigo-400' : 'text-slate-300'
                  } hover:text-white`}
                  style={{ fontWeight: Number(w.value) }}
                  onClick={() => { updateTextProp({ fontWeight: w.value }); setActiveDropdown(null) }}
                >
                  {w.label}
                </button>
              ))}
            </div>
          </DropdownBtn>
          <button className={fmtBtnClass(textEl?.underline)} disabled={fmtDisabled} onClick={() => updateTextProp({ underline: !textEl?.underline })} title="下線">
            <Underline size={13} />
          </button>
          <button className={fmtBtnClass(textEl?.strikethrough)} disabled={fmtDisabled} onClick={() => updateTextProp({ strikethrough: !textEl?.strikethrough })} title="取り消し線">
            <Strikethrough size={13} />
          </button>
        </RibbonGroup>

        <Separator />

        {/* Text color */}
        <RibbonGroup label="テキスト色">
          <DropdownBtn
            trigger={
              <button
                className={`h-7 px-2 flex items-center gap-1.5 rounded text-xs transition-colors ${
                  fmtDisabled ? 'text-slate-600 cursor-not-allowed' : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
                onClick={() => !fmtDisabled && toggleDropdown('textColor')}
                disabled={fmtDisabled}
                title="テキスト色"
              >
                <Palette size={13} />
                <span className="w-4 h-3 rounded-sm border border-slate-600" style={{ background: currentColor }} />
              </button>
            }
            open={activeDropdown === 'textColor'}
            onToggle={() => toggleDropdown('textColor')}
          >
            <div className="p-3">
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">テキスト色</p>
              <div className="space-y-1">
                {COLOR_ROWS.map((row) => (
                  <div key={row.label} className="flex items-center gap-0.5">
                    {row.colors.map((c) => (
                      <button
                        key={c}
                        className={`w-5 h-5 rounded-md border-2 hover:scale-125 transition-all ${
                          currentColor === c ? 'border-indigo-400 ring-2 ring-indigo-400/50 scale-110' : 'border-transparent hover:border-slate-400'
                        }`}
                        style={{ background: c }}
                        title={c}
                        onClick={() => { updateTextProp({ color: c }); setActiveDropdown(null) }}
                      />
                    ))}
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-2 border-t border-slate-700 flex items-center gap-2">
                <label className="text-[10px] text-slate-400">カスタム:</label>
                <input type="color" value={currentColor} className="w-8 h-8 rounded-lg cursor-pointer border border-slate-600 bg-transparent" onChange={(e) => updateTextProp({ color: e.target.value })} />
                <span className="text-xs text-slate-400 font-mono">{currentColor}</span>
              </div>
            </div>
          </DropdownBtn>
        </RibbonGroup>

        <Separator />

        {/* Alignment */}
        <RibbonGroup label="配置">
          <button className={fmtBtnClass(currentAlign === 'left')} disabled={fmtDisabled} onClick={() => updateTextProp({ align: 'left' })} title="左揃え">
            <AlignLeft size={13} />
          </button>
          <button className={fmtBtnClass(currentAlign === 'center')} disabled={fmtDisabled} onClick={() => updateTextProp({ align: 'center' })} title="中央揃え">
            <AlignCenter size={13} />
          </button>
          <button className={fmtBtnClass(currentAlign === 'right')} disabled={fmtDisabled} onClick={() => updateTextProp({ align: 'right' })} title="右揃え">
            <AlignRight size={13} />
          </button>
        </RibbonGroup>

        <Separator />

        {/* Line height & Letter spacing */}
        <RibbonGroup label="行間・字間">
          <DropdownBtn
            trigger={
              <button
                className={`h-7 px-2 flex items-center gap-1 rounded text-xs transition-colors ${
                  fmtDisabled ? 'text-slate-600 cursor-not-allowed' : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
                onClick={() => !fmtDisabled && toggleDropdown('lineHeight')}
                disabled={fmtDisabled}
                title="行間"
              >
                <span className="text-[10px] font-mono">行間</span>
                <ChevronDown size={10} />
              </button>
            }
            open={activeDropdown === 'lineHeight'}
            onToggle={() => toggleDropdown('lineHeight')}
          >
            <div className="py-1 w-24">
              {[1.0, 1.15, 1.3, 1.5, 1.8, 2.0].map((lh) => (
                <button
                  key={lh}
                  className={`w-full text-left px-3 py-1 text-xs hover:bg-slate-800 ${
                    (textEl?.lineHeight ?? 1.3) === lh ? 'text-indigo-400' : 'text-slate-300'
                  } hover:text-white`}
                  onClick={() => { updateTextProp({ lineHeight: lh }); setActiveDropdown(null) }}
                >
                  {lh.toFixed(lh % 1 === 0 ? 1 : 2)}
                </button>
              ))}
            </div>
          </DropdownBtn>
          <DropdownBtn
            trigger={
              <button
                className={`h-7 px-2 flex items-center gap-1 rounded text-xs transition-colors ${
                  fmtDisabled ? 'text-slate-600 cursor-not-allowed' : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
                onClick={() => !fmtDisabled && toggleDropdown('spacing')}
                disabled={fmtDisabled}
                title="文字間隔"
              >
                <span className="text-[10px] font-mono">字間</span>
                <ChevronDown size={10} />
              </button>
            }
            open={activeDropdown === 'spacing'}
            onToggle={() => toggleDropdown('spacing')}
          >
            <div className="p-2.5 w-36">
              <label className="text-[10px] text-slate-400 block mb-1.5">文字間隔 (em)</label>
              <input
                type="range"
                min="-0.05"
                max="0.3"
                step="0.01"
                value={textEl?.letterSpacing ?? 0}
                className="w-full accent-indigo-500"
                onChange={(e) => updateTextProp({ letterSpacing: parseFloat(e.target.value) })}
              />
              <div className="text-[10px] text-slate-400 text-center mt-1">
                {(textEl?.letterSpacing ?? 0).toFixed(2)}em
              </div>
            </div>
          </DropdownBtn>
        </RibbonGroup>

        <Separator />
        <RibbonGroup label="画像">
          {onPictureStyles && <RibbonBtn icon={<ImagePlus size={15} />} label="画像スタイル" onClick={onPictureStyles} title="画像スタイルプリセット" />}
        </RibbonGroup>
        <Separator />
        <RibbonGroup label="カラー">
          {onEyedropper && <RibbonBtn icon={<Pipette size={15} />} label="スポイト" onClick={() => onEyedropper('fill')} title="画面から色を取得" />}
        </RibbonGroup>

        <Separator />

        <RibbonGroup label="位置">
          {onInspector && <RibbonBtn icon={<Move size={15} />} label="位置・サイズ" onClick={onInspector} title="数値で位置とサイズを指定" />}
        </RibbonGroup>

        <Separator />

        <RibbonGroup label="グループ">
          <RibbonBtn
            icon={<Layers size={15} />}
            label="グループ化"
            onClick={() => {
              if (selectedIds.length >= 2 && activeSlideIdProp) {
                dispatch({ type: 'GROUP_ELEMENTS', slideId: activeSlideIdProp, elementIds: selectedIds })
              }
            }}
            disabled={selectedIds.length < 2}
            title="選択した要素をグループ化 (Ctrl+G)"
          />
          <RibbonBtn
            icon={<Layers size={15} />}
            label="グループ解除"
            onClick={() => {
              if (selectedIds.length === 1 && activeSlideIdProp) {
                const sel = elements.find(e => e.id === selectedIds[0])
                if (sel?.groupId) {
                  dispatch({ type: 'UNGROUP_ELEMENTS', slideId: activeSlideIdProp, groupId: sel.groupId })
                }
              }
            }}
            title="グループを解除 (Ctrl+Shift+G)"
          />
        </RibbonGroup>

        {/* Hint when no element selected */}
        {fmtDisabled && (
          <span className="text-[10px] text-slate-600 ml-2 whitespace-nowrap self-center">
            テキスト要素を選択して書式を変更
          </span>
        )}
      </div>
    )
  }

  function renderDesign() {
    return (
      <div className="flex items-end gap-1 overflow-x-auto flex-nowrap scrollbar-none">
        {/* Theme picker */}
        {activeSlide && (
          <RibbonGroup label="テーマ">
            <ThemePicker
              currentTheme={activeSlide.themeKey}
              onSelect={(key) => dispatch({ type: 'SET_THEME', slideId: activeSlide.id, themeKey: key })}
              onSelectAll={(key) => dispatch({ type: 'SET_THEME_ALL', themeKey: key })}
            />
            <RibbonBtn
              icon={<Palette size={15} />}
              label="カスタマイズ"
              onClick={() => setCustomizerOpen(true)}
              title="テーマカスタマイズ"
            />
          </RibbonGroup>
        )}

        <Separator />

        {/* Layout */}
        <RibbonGroup label="レイアウト">
          {onSlideLayout && (
            <RibbonBtn icon={<LayoutGrid size={15} />} label="レイアウト" onClick={onSlideLayout} title="レイアウト" />
          )}
          {onAutoLayout && (
            <RibbonBtn icon={<Sparkles size={15} />} label="自動配置" onClick={onAutoLayout} title="自動レイアウト" />
          )}
        </RibbonGroup>

        <Separator />

        {/* AI Design */}
        <RibbonGroup label="AI">
          {onAiDesign && (
            <RibbonBtn icon={<Wand2 size={15} />} label="AIデザイン" onClick={onAiDesign} variant="accent" title="AIデザイン改善" />
          )}
          {onPdfImport && (
            <RibbonBtn icon={<FileDown size={15} />} label="PDF取込" onClick={onPdfImport} title="PDF読み込み" />
          )}
        </RibbonGroup>

        <Separator />

        {/* Footer settings */}
        <RibbonGroup label="フッター">
          {onFooterSettings && (
            <RibbonBtn icon={<Settings2 size={15} />} label="フッター" onClick={onFooterSettings} title="フッター設定" />
          )}
          {onWatermark && <RibbonBtn icon={<Droplets size={15} />} label="透かし" onClick={onWatermark} title="透かし設定" />}
        </RibbonGroup>

        <Separator />

        <RibbonGroup label="スライド設定">
          {onSlideSizeSettings && <RibbonBtn icon={<Maximize2 size={15} />} label="サイズ" onClick={onSlideSizeSettings} title="スライドサイズ変更" />}
          {onBackgroundGallery && <RibbonBtn icon={<Palette size={15} />} label="背景ギャラリー" onClick={onBackgroundGallery} title="背景スタイル" />}
          {onThemeColorEditor && <RibbonBtn icon={<Pipette size={15} />} label="テーマ色" onClick={onThemeColorEditor} title="テーマカラー編集" />}
          {onMasterEditor && <RibbonBtn icon={<LayoutTemplate size={15} />} label="マスター" onClick={onMasterEditor} title="スライドマスター編集" />}
          {onBackgroundPattern && <RibbonBtn icon={<Wallpaper size={15} />} label="パターン" onClick={onBackgroundPattern} title="背景パターン" />}
        </RibbonGroup>

        {/* Theme customizer modal */}
        {customizerOpen && activeSlide && (
          <ThemeCustomizer
            currentTheme={activeSlide.themeKey}
            onApplyCustom={(custom) => {
              dispatch({ type: 'SET_CUSTOM_THEME', slideId: activeSlide.id, customTheme: custom })
            }}
            onClose={() => setCustomizerOpen(false)}
          />
        )}

        <Separator />

        <RibbonGroup label="テーマツール">
          {onThemePreview && <RibbonBtn icon={<Palette size={15} />} label="テーマ一覧" onClick={onThemePreview} title="テーマプレビュー付き選択" />}
          {onGradientEditor && <RibbonBtn icon={<Palette size={15} />} label="グラデーション" onClick={onGradientEditor} title="背景グラデーション編集" />}
          {onFontPairPicker && <RibbonBtn icon={<Type size={15} />} label="フォントペア" onClick={onFontPairPicker} title="フォントの組み合わせ" />}
          {onCustomThemeManager && <RibbonBtn icon={<Save size={15} />} label="テーマ保存" onClick={onCustomThemeManager} title="カスタムテーマ保存・管理" />}
        </RibbonGroup>
      </div>
    )
  }

  function renderAnimation() {
    return (
      <div className="flex items-end gap-1 overflow-x-auto flex-nowrap scrollbar-none">
        {/* Transition */}
        {activeSlide && (
          <RibbonGroup label="トランジション">
            <DropdownBtn
              trigger={
                <button
                  className="flex flex-col items-center justify-center gap-0.5 px-1.5 py-1 rounded transition-colors min-w-[32px] text-slate-400 hover:bg-slate-700 hover:text-white"
                  onClick={() => toggleDropdown('transition')}
                  title="トランジション"
                >
                  <Sparkle size={15} />
                  <span className="text-[9px] leading-none max-md:hidden">切替効果</span>
                </button>
              }
              open={activeDropdown === 'transition'}
              onToggle={() => toggleDropdown('transition')}
            >
              <div className="py-1 w-32">
                {TRANSITIONS.map((tr) => (
                  <button
                    key={tr.value}
                    onClick={() => {
                      dispatch({ type: 'SET_TRANSITION', slideId: activeSlide.id, transition: tr.value })
                      setActiveDropdown(null)
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
                      activeSlide.transition === tr.value
                        ? 'text-indigo-400 bg-indigo-500/10'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    {tr.label}
                  </button>
                ))}
              </div>
            </DropdownBtn>
          </RibbonGroup>
        )}

        <Separator />

        {/* Animation panel */}
        <RibbonGroup label="アニメーション">
          {onAnimationPanel && (
            <RibbonBtn icon={<Sparkle size={15} />} label="アニメーション" onClick={onAnimationPanel} title="アニメーションパネル" />
          )}
          {onAnimationTimeline && <RibbonBtn icon={<Timer size={15} />} label="タイムライン" onClick={onAnimationTimeline} title="アニメーションタイムライン" />}
          {onTransitionPreview && <RibbonBtn icon={<Play size={15} />} label="プレビュー" onClick={onTransitionPreview} title="トランジションプレビュー" />}
          {onTransitionApplyAll && <RibbonBtn icon={<CopyCheck size={15} />} label="全てに適用" onClick={onTransitionApplyAll} title="トランジションを全スライドに適用" />}
          {onMotionPath && <RibbonBtn icon={<Route size={15} />} label="モーションパス" onClick={onMotionPath} title="モーションパス" />}
          {onMoreTransitions && <RibbonBtn icon={<ArrowRightLeft size={15} />} label="トランジション一覧" onClick={onMoreTransitions} title="トランジション一覧" />}
          {onRehearsal && <RibbonBtn icon={<Timer size={15} />} label="リハーサル" onClick={onRehearsal} title="リハーサル" />}
          {onEasingPicker && <RibbonBtn icon={<Timer size={15} />} label="イージング" onClick={onEasingPicker} title="アニメーション速度曲線" />}
        </RibbonGroup>

        <Separator />

        <RibbonGroup label="速度">
          <div className="flex items-center gap-1 px-1">
            <span className="text-[9px] text-slate-500">速度</span>
            <select
              className="bg-slate-800 border border-slate-700 rounded text-[10px] text-slate-300 px-1 py-0.5"
              value={currentTransitionDuration}
              onChange={(e) => onTransitionDuration?.(Number(e.target.value))}
            >
              <option value={200}>高速</option>
              <option value={500}>標準</option>
              <option value={1000}>低速</option>
              <option value={2000}>非常に遅い</option>
            </select>
          </div>
        </RibbonGroup>
      </div>
    )
  }

  function renderView() {
    return (
      <div className="flex items-end gap-1 overflow-x-auto flex-nowrap scrollbar-none">
        <RibbonGroup label="パネル">
          {onNotesToggle && (
            <RibbonBtn icon={<StickyNote size={15} />} label="ノート" onClick={onNotesToggle} title="スピーカーノート" />
          )}
          {onCommentsToggle && (
            <RibbonBtn icon={<MessageSquare size={15} />} label="コメント" onClick={onCommentsToggle} badge={commentCount} title="コメント" />
          )}
        </RibbonGroup>

        <Separator />

        <RibbonGroup label="表示">
          {onSorterView && (
            <RibbonBtn icon={<LayoutGrid size={15} />} label="一覧" onClick={onSorterView} title="スライド一覧" />
          )}
          {onOutlineView && <RibbonBtn icon={<ListTree size={15} />} label="アウトライン" onClick={onOutlineView} title="アウトラインビュー" />}
          {onReadingView && <RibbonBtn icon={<BookOpen size={15} />} label="閲覧表示" onClick={onReadingView} title="閲覧表示" />}
        </RibbonGroup>

        <Separator />

        <RibbonGroup label="ズーム">
          <RibbonBtn
            icon={<ZoomOut size={15} />}
            label="縮小"
            onClick={() => onZoomChange?.(Math.max(25, (zoom ?? 100) - 25))}
            title="縮小"
          />
          <span className="text-xs text-slate-400 px-1 self-center">{zoom ?? 100}%</span>
          <RibbonBtn
            icon={<ZoomIn size={15} />}
            label="拡大"
            onClick={() => onZoomChange?.(Math.min(200, (zoom ?? 100) + 25))}
            title="拡大"
          />
        </RibbonGroup>

        <Separator />

        <RibbonGroup label="テーマ">
          <RibbonBtn
            icon={theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            label={theme === 'dark' ? 'ライト' : 'ダーク'}
            onClick={toggleTheme}
            title={theme === 'dark' ? 'ライトモード' : 'ダークモード'}
          />
        </RibbonGroup>

        <Separator />

        <RibbonGroup label="ツール">
          {onSectionManager && <RibbonBtn icon={<FolderOpen size={15} />} label="セクション" onClick={onSectionManager} title="セクション管理" />}
          {onHandoutView && <RibbonBtn icon={<Printer size={15} />} label="配布資料" onClick={onHandoutView} title="配布資料ビュー" />}
          {onPositionPanel && <RibbonBtn icon={<Move size={15} />} label="位置/サイズ" onClick={onPositionPanel} title="要素の位置とサイズ" />}
          {onAlignmentToolbar && <RibbonBtn icon={<AlignCenter size={15} />} label="整列" onClick={onAlignmentToolbar} title="要素の整列" />}
          {onSlideRuler && <RibbonBtn icon={<Ruler size={15} />} label="ルーラー" onClick={onSlideRuler} title="ルーラー表示" />}
          {onGuideManager && <RibbonBtn icon={<Ruler size={15} />} label="ガイド管理" onClick={onGuideManager} title="ガイド管理" />}
          {onNotesPrint && <RibbonBtn icon={<FileText size={15} />} label="ノート印刷" onClick={onNotesPrint} title="ノート印刷" />}
          {onCompareView && <RibbonBtn icon={<ArrowRightLeft size={15} />} label="比較" onClick={onCompareView} title="スライド比較ビュー" />}
          {onAccessibilityCheck && <RibbonBtn icon={<CheckCircle2 size={15} />} label="アクセシビリティ" onClick={onAccessibilityCheck} title="アクセシビリティチェック" />}
        </RibbonGroup>
      </div>
    )
  }

  function renderSlideshow() {
    return (
      <div className="flex items-end gap-1 overflow-x-auto flex-nowrap scrollbar-none">
        <RibbonGroup label="発表">
          {onPresent && (
            <RibbonBtn icon={<Play size={15} />} label="最初から (F5)" onClick={onPresent} variant="accent" title="スライドショーを開始 (F5)" />
          )}
          {onPresenterView && (
            <RibbonBtn icon={<Monitor size={15} />} label="発表者ビュー" onClick={onPresenterView} title="発表者ビュー" />
          )}
        </RibbonGroup>

        <Separator />

        <RibbonGroup label="設定">
          {onPresentationSettings && <RibbonBtn icon={<Settings2 size={15} />} label="設定" onClick={onPresentationSettings} title="プレゼンテーション設定" />}
        </RibbonGroup>

        <Separator />

        <RibbonGroup label="印刷">
          {onPrint && (
            <RibbonBtn icon={<Printer size={15} />} label="印刷" onClick={onPrint} title="印刷" />
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
          {onExportPPTX && <RibbonBtn icon={<FileDown size={15} />} label="PPTX" onClick={onExportPPTX} title="PPTX (.pptx)" />}
          {onExportImages && <RibbonBtn icon={<ImageIcon size={15} />} label="画像エクスポート" onClick={onExportImages} title="各スライドを画像として保存" />}
        </RibbonGroup>

        <Separator />

        <RibbonGroup label="インポート">
          {onImportPPTX && <RibbonBtn icon={<FileDown size={15} />} label="PPTXインポート" onClick={onImportPPTX} title="PowerPointファイルを読み込み" />}
          {onPdfImport && (
            <RibbonBtn icon={<FileDown size={15} />} label="PDF取込" onClick={onPdfImport} title="PDF読み込み" />
          )}
        </RibbonGroup>

        <Separator />

        <RibbonGroup label="共有">
          {onShare && <RibbonBtn icon={<Share2 size={15} />} label="共有" onClick={onShare} title="共有" />}
        </RibbonGroup>

        <Separator />

        <RibbonGroup label="バージョン">
          {onVersions && (
            <>
              <RibbonBtn icon={<Save size={15} />} label="保存" onClick={() => dispatch({ type: 'SAVE_VERSION' } as any)} title="バージョンを保存" />
              <RibbonBtn icon={<History size={15} />} label="履歴" onClick={onVersions} title="バージョン履歴" />
            </>
          )}
          {onVersionHistory && (
            <RibbonBtn icon={<Clock size={15} />} label="自動履歴" onClick={onVersionHistory} title="自動バージョン履歴" />
          )}
        </RibbonGroup>

        <Separator />

        <RibbonGroup label="ヘルプ">
          {onShortcuts && (
            <RibbonBtn icon={<Keyboard size={15} />} label="ショートカット" onClick={onShortcuts} title="ショートカット (Ctrl+/)" />
          )}
        </RibbonGroup>

        <Separator />

        <RibbonGroup label="削除">
          <RibbonBtn icon={<Trash2 size={15} />} label="削除" onClick={onDelete} variant="danger" title="プレゼンテーションを削除" />
        </RibbonGroup>
      </div>
    )
  }

  const tabContent: Record<TabKey, () => React.ReactNode> = {
    home: renderHome,
    insert: renderInsert,
    format: renderFormat,
    design: renderDesign,
    animation: renderAnimation,
    view: renderView,
    slideshow: renderSlideshow,
    file: renderFile,
  }

  return (
    <div ref={ribbonRef} className="sticky top-0 z-10 bg-slate-950 border-b border-slate-800 no-print select-none flex-shrink-0">
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
          onChange={(e) => dispatch({ type: 'SET_TITLE', title: e.target.value })}
          onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
          className="flex-1 bg-transparent text-white text-base font-medium placeholder-slate-500 focus:outline-none focus:bg-slate-800/50 focus:ring-1 focus:ring-indigo-500/50 rounded px-1 -mx-1 min-w-0 min-w-[300px] max-w-[500px] truncate"
          placeholder="無題のプレゼンテーション"
          title={state.meta.title || '無題のプレゼンテーション'}
        />

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <LanguageToggle />
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-700 hover:text-white transition"
            title={theme === 'dark' ? 'ライトモード' : 'ダークモード'}
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          <span className="text-xs hidden lg:block text-green-400">
            {'✓ 保存済み'}
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
