'use client'

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import {
  Search,
  FileDown,
  Printer,
  Save,
  History,
  Trash2,
  Undo2,
  Redo2,
  Download,
  Upload,
  ArrowUpAZ,
  ArrowDownAZ,
  Filter,
  ShieldCheck,
  ListX,
  Snowflake,
  Code,
  BarChart3,
  Sparkles,
  FunctionSquare,
  Keyboard,
  Eye,
  ZoomIn,
  ZoomOut,
  Plus,
  Minus,
  Merge,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  WrapText,
  Eraser,
  ArrowUpDown,
  ArrowDown,
  ArrowRight,
  PaintBucket,
} from 'lucide-react'

interface SpreadsheetCommandPaletteProps {
  open: boolean
  onClose: () => void
  onUndo?: () => void
  onRedo?: () => void
  onExportCSV?: () => void
  onExportHTML?: () => void
  onExportPDF?: () => void
  onImportCSV?: () => void
  onSaveVersion?: () => void
  onVersionHistory?: () => void
  onDelete?: () => void
  onFindReplace?: () => void
  onGoToCell?: () => void
  onSort?: () => void
  onSortAsc?: () => void
  onSortDesc?: () => void
  onFilter?: () => void
  onDataValidation?: () => void
  onRemoveDuplicates?: () => void
  onOpenChartPanel?: () => void
  onOpenPivot?: () => void
  onAiFormula?: () => void
  onPdfImport?: () => void
  onShortcuts?: () => void
  onPrintPreview?: () => void
  onToggleFormulas?: () => void
  onFreeze?: () => void
  onZoomIn?: () => void
  onZoomOut?: () => void
  onInsertRow?: () => void
  onInsertCol?: () => void
  onDeleteRow?: () => void
  onDeleteCol?: () => void
  onBold?: () => void
  onItalic?: () => void
  onUnderline?: () => void
  onAlignLeft?: () => void
  onAlignCenter?: () => void
  onAlignRight?: () => void
  onWrap?: () => void
  onClearFormat?: () => void
  onMerge?: () => void
  onFillDown?: () => void
  onFillRight?: () => void
  onFormatPainter?: () => void
}

interface CommandItem {
  id: string
  category: string
  name: string
  icon: React.ReactNode
  shortcut?: string
  action: () => void
}

interface FileItem {
  key: string
  title: string
  type: 'spreadsheet' | 'document' | 'slides'
  icon: string
  timestamp: number
}

function getRelativeTime(ts: number): string {
  const diff = Date.now() - ts
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'たった今'
  if (minutes < 60) return `${minutes}分前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}時間前`
  const days = Math.floor(hours / 24)
  return `${days}日前`
}

function getFileItems(): FileItem[] {
  if (typeof window === 'undefined') return []
  const items: FileItem[] = []
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key) continue
      let type: FileItem['type'] | null = null
      let icon = ''
      if (key.startsWith('doc-')) { type = 'document'; icon = '📄' }
      else if (key.startsWith('spreadsheet-')) { type = 'spreadsheet'; icon = '📊' }
      else if (key.startsWith('slides-')) { type = 'slides'; icon = '📑' }
      if (!type) continue
      try {
        const raw = localStorage.getItem(key)
        if (!raw) continue
        const data = JSON.parse(raw)
        const title = data.title || data.name || key
        const timestamp = data.updatedAt || data.createdAt || 0
        items.push({ key, title, type, icon, timestamp: typeof timestamp === 'number' ? timestamp : new Date(timestamp).getTime() || 0 })
      } catch {
        items.push({ key, title: key, type, icon, timestamp: 0 })
      }
    }
  } catch { /* localStorage may not be available */ }
  return items.sort((a, b) => b.timestamp - a.timestamp)
}

export default function SpreadsheetCommandPalette(props: SpreadsheetCommandPaletteProps) {
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

    // ファイル
    add('ファイル', 'エクスポート (CSV)', <Download size={16} />, props.onExportCSV)
    add('ファイル', 'エクスポート (HTML)', <FileDown size={16} />, props.onExportHTML)
    add('ファイル', 'エクスポート (PDF)', <FileDown size={16} />, props.onExportPDF)
    add('ファイル', 'CSVインポート', <Upload size={16} />, props.onImportCSV)
    add('ファイル', 'バージョン保存', <Save size={16} />, props.onSaveVersion, 'Ctrl+S')
    add('ファイル', 'バージョン履歴', <History size={16} />, props.onVersionHistory)
    add('ファイル', '印刷プレビュー', <Printer size={16} />, props.onPrintPreview)
    add('ファイル', '削除', <Trash2 size={16} />, props.onDelete)

    // 編集
    add('編集', '元に戻す', <Undo2 size={16} />, props.onUndo, 'Ctrl+Z')
    add('編集', 'やり直し', <Redo2 size={16} />, props.onRedo, 'Ctrl+Y')
    add('編集', '検索・置換', <Search size={16} />, props.onFindReplace, 'Ctrl+F')
    add('編集', 'セルに移動', <Eye size={16} />, props.onGoToCell, 'Ctrl+G')
    add('編集', '下方向コピー', <ArrowDown size={16} />, props.onFillDown, 'Ctrl+D')
    add('編集', '右方向コピー', <ArrowRight size={16} />, props.onFillRight, 'Ctrl+R')

    // 挿入
    add('挿入', '行を挿入', <Plus size={16} />, props.onInsertRow)
    add('挿入', '列を挿入', <Plus size={16} />, props.onInsertCol)
    add('挿入', '行を削除', <Minus size={16} />, props.onDeleteRow)
    add('挿入', '列を削除', <Minus size={16} />, props.onDeleteCol)
    add('挿入', 'グラフ作成', <BarChart3 size={16} />, props.onOpenChartPanel)
    add('挿入', 'ピボットテーブル', <Filter size={16} />, props.onOpenPivot)

    // データ
    add('データ', '昇順ソート (A→Z)', <ArrowUpAZ size={16} />, props.onSortAsc)
    add('データ', '降順ソート (Z→A)', <ArrowDownAZ size={16} />, props.onSortDesc)
    add('データ', '並べ替え（詳細）', <ArrowUpDown size={16} />, props.onSort)
    add('データ', 'オートフィルター', <Filter size={16} />, props.onFilter)
    add('データ', 'データ入力規則', <ShieldCheck size={16} />, props.onDataValidation)
    add('データ', '重複の削除', <ListX size={16} />, props.onRemoveDuplicates)

    // 書式
    add('書式', '太字', <Bold size={16} />, props.onBold, 'Ctrl+B')
    add('書式', '斜体', <Italic size={16} />, props.onItalic, 'Ctrl+I')
    add('書式', '下線', <Underline size={16} />, props.onUnderline, 'Ctrl+U')
    add('書式', '左揃え', <AlignLeft size={16} />, props.onAlignLeft)
    add('書式', '中央揃え', <AlignCenter size={16} />, props.onAlignCenter)
    add('書式', '右揃え', <AlignRight size={16} />, props.onAlignRight)
    add('書式', 'テキスト折り返し', <WrapText size={16} />, props.onWrap)
    add('書式', '書式をクリア', <Eraser size={16} />, props.onClearFormat)
    add('書式', 'セル結合', <Merge size={16} />, props.onMerge)
    add('書式', '書式のコピー', <PaintBucket size={16} />, props.onFormatPainter)

    // 表示
    add('表示', '数式表示モード', <Code size={16} />, props.onToggleFormulas, 'Ctrl+`')
    add('表示', 'ウィンドウ枠の固定', <Snowflake size={16} />, props.onFreeze)
    add('表示', '拡大', <ZoomIn size={16} />, props.onZoomIn, 'Ctrl++')
    add('表示', '縮小', <ZoomOut size={16} />, props.onZoomOut, 'Ctrl+-')

    // ツール
    add('ツール', 'AI数式アシスタント', <Sparkles size={16} />, props.onAiFormula)
    add('ツール', 'PDF取込 + AI処理', <FileDown size={16} />, props.onPdfImport)
    add('ツール', 'ショートカット一覧', <Keyboard size={16} />, props.onShortcuts, 'Ctrl+/')

    return items
  }, [props])

  const allFiles = useMemo(() => getFileItems(), [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const filteredFiles = useMemo(() => {
    const files = query
      ? allFiles.filter((f) => f.title.toLowerCase().includes(query.toLowerCase()))
      : allFiles
    return files.slice(0, 5)
  }, [allFiles, query])

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

  // File items come first in the flat list
  const fileCommandItems = useMemo<CommandItem[]>(() => {
    return filteredFiles.map((f) => ({
      id: `file-${f.key}`,
      category: 'ファイル',
      name: `${f.icon} ${f.title}`,
      icon: <Search size={16} />,
      action: () => {
        const docId = f.key
        const basePath = f.type === 'spreadsheet' ? '/spreadsheet/' : f.type === 'slides' ? '/slides/' : '/editor/'
        window.location.href = basePath + docId
      },
    }))
  }, [filteredFiles])

  const flatItems = useMemo(() => [...fileCommandItems, ...filtered], [fileCommandItems, filtered])

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
          {flatItems.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-slate-500">
              一致するコマンドが見つかりません
            </div>
          )}

          {/* File results section */}
          {filteredFiles.length > 0 && (
            <>
              <div className="px-4 pt-2 pb-1 text-xs font-medium text-slate-500 select-none">
                ファイル
              </div>
              {fileCommandItems.map((item) => {
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
                    <span className="flex-1 text-left truncate flex items-center gap-2">
                      <span>{item.name}</span>
                      {filteredFiles.find((f) => `file-${f.key}` === item.id)?.timestamp ? (
                        <span className="text-[10px] text-slate-500 ml-auto shrink-0">
                          {getRelativeTime(filteredFiles.find((f) => `file-${f.key}` === item.id)!.timestamp)}
                        </span>
                      ) : null}
                    </span>
                  </button>
                )
              })}
              {/* Divider between files and actions */}
              {grouped.length > 0 && (
                <div className="px-4 pt-3 pb-1 flex items-center gap-2">
                  <div className="flex-1 border-t border-slate-700" />
                  <span className="text-[10px] text-slate-500 font-medium">アクション</span>
                  <div className="flex-1 border-t border-slate-700" />
                </div>
              )}
            </>
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
