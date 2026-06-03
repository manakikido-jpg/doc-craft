'use client'

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import {
  Search,
  FileDown,
  Printer,
  Save,
  History,
  Share2,
  Trash2,
  Undo2,
  Redo2,
  Copy,
  Plus,
  Play,
  Monitor,
  Shapes,
  ImageIcon,
  Type,
  Table,
  BarChart3,
  Video,
  Music,
  ArrowRightLeft,
  Palette,
  LayoutGrid,
  Sparkles,
  Wand2,
  Sparkle,
  StickyNote,
  MessageSquare,
  Settings2,
  Sun,
  Keyboard,
  Scissors,
  ClipboardCopy,
  ClipboardPaste,
  Wallpaper,
  Maximize2,
  Pipette,
  LayoutTemplate,
  FolderOpen,
  List,
  Square,
  Move,
  Ruler,
  Layers,
  Network,
  Timer,
  ListTree,
  PenTool,
  BookOpen,
  ImagePlus,
  Route,
  FileText,
} from 'lucide-react'

interface SlideCommandPaletteProps {
  open: boolean
  onClose: () => void
  onUndo?: () => void
  onRedo?: () => void
  onExport?: () => void
  onExportPDF?: () => void
  onExportPPTX?: () => void
  onPrint?: () => void
  onDelete?: () => void
  onSaveVersion?: () => void
  onVersionHistory?: () => void
  onShare?: () => void
  onPresent?: () => void
  onPresenterView?: () => void
  onNotesToggle?: () => void
  onCommentsToggle?: () => void
  onSorterView?: () => void
  onAnimationPanel?: () => void
  onFooterSettings?: () => void
  onSlideLayout?: () => void
  onAutoLayout?: () => void
  onAiDesign?: () => void
  onAiSlideGenerator?: () => void
  onPdfImport?: () => void
  onShortcuts?: () => void
  onToggleTheme?: () => void
  // Slide-specific actions
  onAddSlide?: () => void
  onDuplicateSlide?: () => void
  onDeleteSlide?: () => void
  onAddTextElement?: (textType: string) => void
  onAddImage?: () => void
  onAddShape?: () => void
  onAddTable?: () => void
  onAddChart?: () => void
  onAddVideo?: () => void
  onAddAudio?: () => void
  onAddConnector?: () => void
  onAddBackground?: () => void
  onThemePicker?: () => void
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
  onRulerToggle?: () => void
  // New feature callbacks
  onAnimationTimeline?: () => void
  onSelectionPane?: () => void
  onOutlineView?: () => void
  onTransitionPreview?: () => void
  onSmartArt?: () => void
  onFindReplace?: () => void
  onImageColorFilters?: () => void
  onFreehandDraw?: () => void
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
  // Round 4 features
  onAiSummary?: () => void
  onSlideLibrary?: () => void
  onVersionCompare?: () => void
  onRecorder?: () => void
  onCommentBubble?: () => void
}

interface CommandItem {
  id: string
  category: string
  name: string
  icon: React.ReactNode
  shortcut?: string
  action: () => void
}

export default function SlideCommandPalette(props: SlideCommandPaletteProps) {
  const { open, onClose } = props
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<Map<number, HTMLButtonElement>>(new Map())

  const commands = useMemo<CommandItem[]>(() => {
    const items: CommandItem[] = []

    const add = (
      category: string,
      name: string,
      icon: React.ReactNode,
      action: (() => void) | undefined,
      shortcut?: string,
    ) => {
      if (action) {
        items.push({ id: `${category}-${name}`, category, name, icon, shortcut, action })
      }
    }

    // ファイル
    add('ファイル', 'エクスポート (HTML)', <FileDown size={16} />, props.onExport, 'Ctrl+Shift+E')
    add('ファイル', 'エクスポート (PDF)', <FileDown size={16} />, props.onExportPDF)
    add('ファイル', 'エクスポート (PPTX)', <FileDown size={16} />, props.onExportPPTX)
    add('ファイル', '印刷', <Printer size={16} />, props.onPrint, 'Ctrl+P')
    add('ファイル', 'バージョン保存', <Save size={16} />, props.onSaveVersion, 'Ctrl+S')
    add('ファイル', 'バージョン履歴', <History size={16} />, props.onVersionHistory)
    add('ファイル', '共有', <Share2 size={16} />, props.onShare)
    add('ファイル', '削除', <Trash2 size={16} />, props.onDelete)

    // 編集
    add('編集', '元に戻す', <Undo2 size={16} />, props.onUndo, 'Ctrl+Z')
    add('編集', 'やり直し', <Redo2 size={16} />, props.onRedo, 'Ctrl+Y')
    add('編集', '切り取り', <Scissors size={16} />, () => document.execCommand('cut'), 'Ctrl+X')
    add('編集', 'コピー', <ClipboardCopy size={16} />, () => document.execCommand('copy'), 'Ctrl+C')
    add('編集', '貼り付け', <ClipboardPaste size={16} />, () => document.execCommand('paste'), 'Ctrl+V')
    add('編集', '新しいスライド', <Plus size={16} />, props.onAddSlide)
    add('編集', 'スライドを複製', <Copy size={16} />, props.onDuplicateSlide)
    add('編集', 'スライドを削除', <Trash2 size={16} />, props.onDeleteSlide)

    // 挿入
    add('挿入', 'タイトル', <Type size={16} />, props.onAddTextElement ? () => props.onAddTextElement!('title') : undefined)
    add('挿入', 'サブタイトル', <Type size={16} />, props.onAddTextElement ? () => props.onAddTextElement!('subtitle') : undefined)
    add('挿入', '本文テキスト', <Type size={16} />, props.onAddTextElement ? () => props.onAddTextElement!('body') : undefined)
    add('挿入', 'ラベル', <Type size={16} />, props.onAddTextElement ? () => props.onAddTextElement!('label') : undefined)
    add('挿入', '画像', <ImageIcon size={16} />, props.onAddImage, 'I')
    add('挿入', '背景画像', <Wallpaper size={16} />, props.onAddBackground)
    add('挿入', '図形', <Shapes size={16} />, props.onAddShape, 'S')
    add('挿入', 'テーブル', <Table size={16} />, props.onAddTable)
    add('挿入', 'グラフ', <BarChart3 size={16} />, props.onAddChart)
    add('挿入', '動画', <Video size={16} />, props.onAddVideo)
    add('挿入', '音声', <Music size={16} />, props.onAddAudio)
    add('挿入', 'コネクター', <ArrowRightLeft size={16} />, props.onAddConnector)

    // デザイン
    add('デザイン', 'テーマ変更', <Palette size={16} />, props.onThemePicker)
    add('デザイン', 'レイアウト', <LayoutGrid size={16} />, props.onSlideLayout)
    add('デザイン', '自動レイアウト', <Sparkles size={16} />, props.onAutoLayout)
    add('デザイン', 'AIデザイン改善', <Wand2 size={16} />, props.onAiDesign)
    add('デザイン', 'AIスライド生成', <Sparkles size={16} />, props.onAiSlideGenerator)
    add('デザイン', 'PDF取込', <FileDown size={16} />, props.onPdfImport)
    add('デザイン', 'フッター設定', <Settings2 size={16} />, props.onFooterSettings)

    // 表示
    add('表示', 'スピーカーノート', <StickyNote size={16} />, props.onNotesToggle)
    add('表示', 'コメント', <MessageSquare size={16} />, props.onCommentsToggle)
    add('表示', 'スライド一覧', <LayoutGrid size={16} />, props.onSorterView)
    add('表示', 'アニメーション', <Sparkle size={16} />, props.onAnimationPanel)
    add('表示', 'テーマ切替', <Sun size={16} />, props.onToggleTheme)
    add('表示', 'ショートカット', <Keyboard size={16} />, props.onShortcuts, 'Ctrl+/')

    // スライドショー
    add('スライドショー', 'スライドショー開始', <Play size={16} />, props.onPresent, 'F5')
    add('スライドショー', '発表者ビュー', <Monitor size={16} />, props.onPresenterView)

    // スライド設定
    add('スライド設定', 'スライドサイズ変更', <Maximize2 size={16} />, props.onSlideSizeSettings)
    add('スライド設定', '背景ギャラリー', <Palette size={16} />, props.onBackgroundGallery)
    add('スライド設定', 'テーマカラー編集', <Pipette size={16} />, props.onThemeColorEditor)
    add('スライド設定', 'マスタースライド', <LayoutTemplate size={16} />, props.onMasterEditor)
    add('スライド設定', 'セクション管理', <FolderOpen size={16} />, props.onSectionManager)

    // テキスト書式
    add('テキスト書式', '箇条書き設定', <List size={16} />, props.onBulletPanel)
    add('テキスト書式', 'テキスト余白', <Square size={16} />, props.onPaddingPanel)
    add('テキスト書式', 'WordArtスタイル', <Type size={16} />, props.onWordArtPicker)

    // レイアウト
    add('レイアウト', '位置/サイズ設定', <Move size={16} />, props.onPositionPanel)
    add('レイアウト', 'ルーラー表示', <Ruler size={16} />, props.onRulerToggle)
    add('レイアウト', '配布資料ビュー', <Printer size={16} />, props.onHandoutView)

    // 新機能
    add('ツール', 'アニメーションタイムライン', <Timer size={16} />, props.onAnimationTimeline)
    add('ツール', '選択ウィンドウ', <Layers size={16} />, props.onSelectionPane)
    add('ツール', 'アウトラインビュー', <ListTree size={16} />, props.onOutlineView)
    add('ツール', 'トランジションプレビュー', <Play size={16} />, props.onTransitionPreview)
    add('挿入', 'SmartArt', <Network size={16} />, props.onSmartArt)
    add('挿入', 'フリーハンド描画', <PenTool size={16} />, props.onFreehandDraw)
    add('編集', '検索・置換', <Search size={16} />, props.onFindReplace)
    add('ツール', '画像カラーフィルター', <ImageIcon size={16} />, props.onImageColorFilters)

    // Round 3 features
    add('ツール', 'ガイド管理', <Ruler size={16} />, props.onGuideManager)
    add('表示', '閲覧表示', <BookOpen size={16} />, props.onReadingView)
    add('ツール', '画像ツール', <ImagePlus size={16} />, props.onImageTools)
    add('アニメーション', 'モーションパス', <Route size={16} />, props.onMotionPath)
    add('挿入', '図形一覧', <Shapes size={16} />, props.onMoreShapes)
    add('挿入', 'グラフ一覧', <BarChart3 size={16} />, props.onMoreCharts)
    add('アニメーション', 'トランジション一覧', <ArrowRightLeft size={16} />, props.onMoreTransitions)
    add('ツール', 'リハーサル', <Timer size={16} />, props.onRehearsal)
    add('表示', 'ノート印刷', <FileText size={16} />, props.onNotesPrint)

    // Round 4 features
    add('AI', 'AIサマリースライド', <Sparkles size={16} />, props.onAiSummary)
    add('挿入', 'スライドライブラリ', <FolderOpen size={16} />, props.onSlideLibrary)
    add('表示', 'バージョン比較', <Copy size={16} />, props.onVersionCompare)
    add('ツール', 'プレゼン録画', <Play size={16} />, props.onRecorder)
    add('コメント', 'スライドコメント', <MessageSquare size={16} />, props.onCommentBubble)

    return items
  }, [props])

  const filtered = useMemo(() => {
    if (!query) return commands
    const q = query.toLowerCase()
    return commands.filter((cmd) => cmd.name.toLowerCase().includes(q) || cmd.category.toLowerCase().includes(q))
  }, [commands, query])

  const grouped = useMemo(() => {
    const groups: { category: string; items: CommandItem[] }[] = []
    let currentCategory = ''
    for (const item of filtered) {
      if (item.category !== currentCategory) {
        currentCategory = item.category
        groups.push({ category: currentCategory, items: [] })
      }
      groups[groups.length - 1].items.push(item)
    }
    return groups
  }, [filtered])

  const flatItems = useMemo(() => filtered, [filtered])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  useEffect(() => {
    if (open) {
      setQuery('')
      setSelectedIndex(0)
      requestAnimationFrame(() => {
        inputRef.current?.focus()
      })
    }
  }, [open])

  useEffect(() => {
    const el = itemRefs.current.get(selectedIndex)
    if (el) {
      el.scrollIntoView({ block: 'nearest' })
    }
  }, [selectedIndex])

  const executeItem = useCallback(
    (index: number) => {
      const item = flatItems[index]
      if (item) {
        onClose()
        item.action()
      }
    },
    [flatItems, onClose],
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex((prev) => (prev + 1) % Math.max(flatItems.length, 1))
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex((prev) => (prev - 1 + flatItems.length) % Math.max(flatItems.length, 1))
          break
        case 'Enter':
          e.preventDefault()
          executeItem(selectedIndex)
          break
        case 'Escape':
          e.preventDefault()
          onClose()
          break
      }
    },
    [flatItems.length, selectedIndex, executeItem, onClose],
  )

  if (!open) return null

  let flatIndex = 0

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-xl shadow-2xl animate-scale-in overflow-hidden"
        onKeyDown={handleKeyDown}
      >
        {/* Search input */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-700">
          <Search size={18} className="text-slate-500 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="コマンドを検索..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-slate-200 placeholder-slate-500 outline-none"
          />
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-slate-800 text-slate-500 rounded border border-slate-700">
            ESC
          </kbd>
        </div>

        {/* Results list */}
        <div ref={listRef} className="max-h-80 overflow-y-auto py-1">
          {grouped.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-slate-500">
              一致するコマンドが見つかりません
            </div>
          )}

          {grouped.map((group) => {
            const header = (
              <div
                key={`header-${group.category}`}
                className="px-4 pt-2 pb-1 text-xs font-medium text-slate-500 select-none"
              >
                {group.category}
              </div>
            )

            const rows = group.items.map((item) => {
              const idx = flatIndex++
              return (
                <button
                  key={item.id}
                  ref={(el) => {
                    if (el) itemRefs.current.set(idx, el)
                    else itemRefs.current.delete(idx)
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  onClick={() => executeItem(idx)}
                  className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
                    idx === selectedIndex
                      ? 'bg-indigo-500/20 text-white'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <span className="w-7 h-7 rounded-md bg-slate-800 flex items-center justify-center text-slate-400 flex-shrink-0">
                    {item.icon}
                  </span>
                  <span className="flex-1 text-left truncate">{item.name}</span>
                  {item.shortcut && (
                    <kbd className="ml-auto px-1.5 py-0.5 text-xs font-mono bg-slate-800 text-slate-400 rounded border border-slate-700 flex-shrink-0">
                      {item.shortcut}
                    </kbd>
                  )}
                </button>
              )
            })

            return [header, ...rows]
          })}
        </div>
      </div>
    </div>
  )
}
