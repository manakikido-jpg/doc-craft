'use client'

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import {
  Search,
  FileText,
  FileDown,
  Printer,
  Save,
  History,
  Share2,
  Trash2,
  Undo2,
  Redo2,
  Replace,
  Copy,
  ClipboardList,
  Pilcrow,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Code,
  Table,
  ImageIcon,
  Minus,
  Quote,
  AlertCircle,
  Calculator,
  Pencil,
  TextSelect,
  SeparatorHorizontal,
  FileText as PageBreakIcon,
  PenTool,
  BookOpen,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Superscript,
  Subscript,
  Link,
  Type,
  RemoveFormatting,
  Layout,
  Eye,
  ListTree,
  Focus,
  Hash,
  SunMoon,
  Settings,
  Droplets,
  Bookmark,
  Star,
  FileSpreadsheet,
  Mail,
  GitCompare,
  Sparkles,
  SpellCheck,
  Wand2,
  FileInput,
  BookOpenCheck,
  Library as LibraryIcon,
  ScrollText,
} from 'lucide-react'

interface CommandPaletteProps {
  open: boolean
  onClose: () => void
  onUndo?: () => void
  onRedo?: () => void
  onExport?: () => void
  onExportPDF?: () => void
  onExportDOCX?: () => void
  onExportMarkdown?: () => void
  onExportText?: () => void
  onPrint?: () => void
  onDelete?: () => void
  onSaveVersion?: () => void
  onVersionHistory?: () => void
  onShare?: () => void
  onComments?: () => void
  onFindReplace?: () => void
  onPageSettings?: () => void
  onReadingMode?: () => void
  onPageLayout?: () => void
  onOutline?: () => void
  onFocusMode?: () => void
  onToggleLineNumbers?: () => void
  onToggleTheme?: () => void
  onWatermark?: () => void
  onSpecialChars?: () => void
  onBookmarks?: () => void
  onTemplates?: () => void
  onMailMerge?: () => void
  onTrackChanges?: () => void
  onCompare?: () => void
  onAI?: () => void
  onProofread?: () => void
  onAiTextTools?: () => void
  onPdfImport?: () => void
  onShortcuts?: () => void
  onClipboardHistory?: () => void
  onInsertToc?: () => void
  onFigureToc?: () => void
  onCrossReference?: () => void
  onBibliography?: () => void
  onIndexGenerator?: () => void
  onInsertBlock?: (type: string) => void
  focusedBlockId?: string | null
}

interface CommandItem {
  id: string
  category: string
  name: string
  icon: React.ReactNode
  shortcut?: string
  action: () => void
}

export default function CommandPalette(props: CommandPaletteProps) {
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
      shortcut?: string
    ) => {
      if (action) {
        items.push({ id: `${category}-${name}`, category, name, icon, shortcut, action })
      }
    }

    const insertBlock = (type: string) => () => props.onInsertBlock?.(type)

    // ファイル
    add('ファイル', 'エクスポート (HTML)', <FileDown size={16} />, props.onExport, 'Ctrl+Shift+E')
    add('ファイル', 'エクスポート (PDF)', <FileDown size={16} />, props.onExportPDF)
    add('ファイル', 'エクスポート (DOCX)', <FileDown size={16} />, props.onExportDOCX)
    add('ファイル', 'エクスポート (Markdown)', <FileDown size={16} />, props.onExportMarkdown)
    add('ファイル', 'エクスポート (テキスト)', <FileDown size={16} />, props.onExportText)
    add('ファイル', '印刷', <Printer size={16} />, props.onPrint, 'Ctrl+P')
    add('ファイル', 'バージョン保存', <Save size={16} />, props.onSaveVersion, 'Ctrl+S')
    add('ファイル', 'バージョン履歴', <History size={16} />, props.onVersionHistory)
    add('ファイル', '共有', <Share2 size={16} />, props.onShare)
    add('ファイル', '削除', <Trash2 size={16} />, props.onDelete)

    // 編集
    add('編集', '元に戻す', <Undo2 size={16} />, props.onUndo, 'Ctrl+Z')
    add('編集', 'やり直し', <Redo2 size={16} />, props.onRedo, 'Ctrl+Shift+Z')
    add('編集', '検索・置換', <Replace size={16} />, props.onFindReplace, 'Ctrl+H')
    add('編集', 'ブロック複製', <Copy size={16} />, props.onInsertBlock ? () => {} : undefined)
    add('編集', 'クリップボード履歴', <ClipboardList size={16} />, props.onClipboardHistory)

    // 挿入
    add('挿入', '段落', <Pilcrow size={16} />, props.onInsertBlock ? insertBlock('paragraph') : undefined)
    add('挿入', '見出し1', <Heading1 size={16} />, props.onInsertBlock ? insertBlock('h1') : undefined)
    add('挿入', '見出し2', <Heading2 size={16} />, props.onInsertBlock ? insertBlock('h2') : undefined)
    add('挿入', '見出し3', <Heading3 size={16} />, props.onInsertBlock ? insertBlock('h3') : undefined)
    add('挿入', '箇条書き', <List size={16} />, props.onInsertBlock ? insertBlock('bullet') : undefined)
    add('挿入', '番号付きリスト', <ListOrdered size={16} />, props.onInsertBlock ? insertBlock('numbered') : undefined)
    add('挿入', 'チェックリスト', <CheckSquare size={16} />, props.onInsertBlock ? insertBlock('checklist') : undefined)
    add('挿入', 'コードブロック', <Code size={16} />, props.onInsertBlock ? insertBlock('code') : undefined)
    add('挿入', 'テーブル', <Table size={16} />, props.onInsertBlock ? insertBlock('table') : undefined)
    add('挿入', '画像', <ImageIcon size={16} />, props.onInsertBlock ? insertBlock('image') : undefined)
    add('挿入', '区切り線', <Minus size={16} />, props.onInsertBlock ? insertBlock('divider') : undefined)
    add('挿入', '引用', <Quote size={16} />, props.onInsertBlock ? insertBlock('quote') : undefined)
    add('挿入', 'コールアウト', <AlertCircle size={16} />, props.onInsertBlock ? insertBlock('callout') : undefined)
    add('挿入', '数式', <Calculator size={16} />, props.onInsertBlock ? insertBlock('math') : undefined)
    add('挿入', '描画', <Pencil size={16} />, props.onInsertBlock ? insertBlock('drawing') : undefined)
    add('挿入', 'テキストボックス', <TextSelect size={16} />, props.onInsertBlock ? insertBlock('textbox') : undefined)
    add('挿入', 'セクション区切り', <SeparatorHorizontal size={16} />, props.onInsertBlock ? insertBlock('section-break') : undefined)
    add('挿入', 'ページ区切り', <PageBreakIcon size={16} />, props.onInsertBlock ? insertBlock('page-break') : undefined)
    add('挿入', '署名', <PenTool size={16} />, props.onInsertBlock ? insertBlock('signature') : undefined)
    add('挿入', '表紙', <BookOpen size={16} />, props.onInsertBlock ? insertBlock('cover-page') : undefined)

    // 書式
    add('書式', '太字', <Bold size={16} />, props.focusedBlockId ? () => document.execCommand('bold') : undefined, 'Ctrl+B')
    add('書式', '斜体', <Italic size={16} />, props.focusedBlockId ? () => document.execCommand('italic') : undefined, 'Ctrl+I')
    add('書式', '下線', <Underline size={16} />, props.focusedBlockId ? () => document.execCommand('underline') : undefined, 'Ctrl+U')
    add('書式', '取り消し線', <Strikethrough size={16} />, props.focusedBlockId ? () => document.execCommand('strikethrough') : undefined)
    add('書式', '上付き', <Superscript size={16} />, props.focusedBlockId ? () => document.execCommand('superscript') : undefined)
    add('書式', '下付き', <Subscript size={16} />, props.focusedBlockId ? () => document.execCommand('subscript') : undefined)
    add('書式', 'リンク', <Link size={16} />, props.focusedBlockId ? () => {} : undefined, 'Ctrl+K')
    add('書式', 'ルビ', <Type size={16} />, props.focusedBlockId ? () => {} : undefined)
    add('書式', '書式クリア', <RemoveFormatting size={16} />, props.focusedBlockId ? () => document.execCommand('removeFormat') : undefined)

    // 表示
    add('表示', 'ページレイアウト', <Layout size={16} />, props.onPageLayout)
    add('表示', '閲覧モード', <Eye size={16} />, props.onReadingMode)
    add('表示', 'アウトライン', <ListTree size={16} />, props.onOutline)
    add('表示', 'フォーカスモード', <Focus size={16} />, props.onFocusMode)
    add('表示', '行番号', <Hash size={16} />, props.onToggleLineNumbers)
    add('表示', 'テーマ切替', <SunMoon size={16} />, props.onToggleTheme)

    // AI
    add('AI', 'AI生成', <Sparkles size={16} />, props.onAI)
    add('AI', 'AI校正', <SpellCheck size={16} />, props.onProofread)
    add('AI', 'AIテキストツール', <Wand2 size={16} />, props.onAiTextTools)
    add('AI', 'PDF取込', <FileInput size={16} />, props.onPdfImport)

    // ページ
    add('ページ', 'ページ設定', <Settings size={16} />, props.onPageSettings)
    add('ページ', '透かし', <Droplets size={16} />, props.onWatermark)
    add('ページ', 'ブックマーク', <Bookmark size={16} />, props.onBookmarks)
    add('ページ', '特殊文字', <Star size={16} />, props.onSpecialChars)
    add('ページ', 'テンプレート', <FileSpreadsheet size={16} />, props.onTemplates)
    add('ページ', '差し込み印刷', <Mail size={16} />, props.onMailMerge)
    add('ページ', '変更履歴', <FileText size={16} />, props.onTrackChanges)
    add('ページ', '文書比較', <GitCompare size={16} />, props.onCompare)

    // 参照
    add('参照', '目次を挿入/更新', <List size={16} />, props.onInsertToc)
    add('参照', '図表目次', <ListTree size={16} />, props.onFigureToc)
    add('参照', '相互参照', <BookOpenCheck size={16} />, props.onCrossReference)
    add('参照', '参考文献', <LibraryIcon size={16} />, props.onBibliography)
    add('参照', '索引生成', <ScrollText size={16} />, props.onIndexGenerator)

    return items
  }, [props])

  const filtered = useMemo(() => {
    if (!query) return commands
    const q = query.toLowerCase()
    return commands.filter((cmd) => cmd.name.toLowerCase().includes(q))
  }, [commands, query])

  // Group filtered items by category, preserving order
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

  // Flat list for keyboard navigation index
  const flatItems = useMemo(() => filtered, [filtered])

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery('')
      setSelectedIndex(0)
      // Small delay to ensure the DOM is ready
      requestAnimationFrame(() => {
        inputRef.current?.focus()
      })
    }
  }, [open])

  // Scroll selected item into view
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
    [flatItems, onClose]
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
    [flatItems.length, selectedIndex, executeItem, onClose]
  )

  if (!open) return null

  // Build a flat index counter for rendering
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
