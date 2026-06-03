'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import type { Sheet, CellFormat, ConditionalFormat } from '@/types'
import type { SelectionRange } from './spreadsheet-editor'
import type { SpreadsheetAction } from '@/hooks/use-spreadsheet'
import type { UndoableAction } from '@/lib/undoable'
import { generateId } from '@/lib/utils'
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignVerticalJustifyStart,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  Merge,
  SplitSquareHorizontal,
  Plus,
  Minus,
  Paintbrush,
  Type,
  WrapText,
  ArrowUpAZ,
  ArrowDownAZ,
  Filter,
  Snowflake,
  Eraser,
  ArrowDown,
  ArrowRight,
  ChevronUp,
  ChevronDown,
  BarChart3,
  FunctionSquare,
  PaintBucket,
  ArrowLeft,
  Undo2,
  Redo2,
  Download,
  Upload,
  Search,
  Printer,
  FileDown,
  Code,
  ArrowUpDown,
  ListX,
  Clock,
  Sparkles,
  ShieldCheck,
  Trash2,
  Save,
  History,
  Keyboard,
  Link as LinkIcon,
  ZoomIn,
  ZoomOut,
  Clipboard,
  ClipboardCopy,
  ClipboardPaste,
  Scissors,
  Eye,
  Zap,
  FileSpreadsheet,
  HelpCircle,
  Table2,
  Database,
} from 'lucide-react'
import { parseCSV } from '@/lib/import/csv-import'
import { exportSheetToCSV, downloadCSV } from '@/lib/export/csv-export'
import { downloadXLSX } from '@/lib/export/xlsx-export'
import { useToast } from '@/components/shared/toast'
import PresenceAvatars from '../shared/presence-avatars'

// ========== Constants (from spreadsheet-toolbar) ==========

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

const COLOR_ROWS = [
  { label: 'グレー', colors: ['#ffffff', '#f1f5f9', '#cbd5e1', '#94a3b8', '#64748b', '#334155', '#1e293b', '#000000'] },
  { label: '赤系', colors: ['#fecaca', '#fca5a5', '#f87171', '#ef4444', '#dc2626', '#b91c1c', '#991b1b', '#7f1d1d'] },
  { label: '橙系', colors: ['#fed7aa', '#fdba74', '#fb923c', '#f97316', '#ea580c', '#c2410c', '#9a3412', '#7c2d12'] },
  { label: '黄系', colors: ['#fef08a', '#fde047', '#facc15', '#eab308', '#ca8a04', '#a16207', '#854d0e', '#713f12'] },
  { label: '緑系', colors: ['#bbf7d0', '#86efac', '#4ade80', '#22c55e', '#16a34a', '#15803d', '#166534', '#14532d'] },
  { label: '青系', colors: ['#bfdbfe', '#93c5fd', '#60a5fa', '#3b82f6', '#2563eb', '#1d4ed8', '#1e40af', '#1e3a8a'] },
  { label: '紫系', colors: ['#ddd6fe', '#c4b5fd', '#a78bfa', '#8b5cf6', '#7c3aed', '#6d28d9', '#5b21b6', '#4c1d95'] },
  { label: 'ピンク', colors: ['#fbcfe8', '#f9a8d4', '#f472b6', '#ec4899', '#db2777', '#be185d', '#9d174d', '#831843'] },
]

const BORDER_OPTIONS: { value: string; label: string; icon: (props: { size: number; className?: string }) => React.ReactNode }[] = [
  {
    value: 'outline', label: '外枠',
    icon: ({ size, className }) => (
      <svg width={size} height={size} viewBox="0 0 16 16" className={className}>
        <rect x="1" y="1" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" />
      </svg>
    ),
  },
  {
    value: 'all', label: '全罫線',
    icon: ({ size, className }) => (
      <svg width={size} height={size} viewBox="0 0 16 16" className={className}>
        <rect x="1" y="1" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <line x1="8" y1="1" x2="8" y2="15" stroke="currentColor" strokeWidth="1" />
        <line x1="1" y1="8" x2="15" y2="8" stroke="currentColor" strokeWidth="1" />
      </svg>
    ),
  },
  {
    value: 'top', label: '上罫線',
    icon: ({ size, className }) => (
      <svg width={size} height={size} viewBox="0 0 16 16" className={className}>
        <rect x="1" y="1" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 2" />
        <line x1="1" y1="1" x2="15" y2="1" stroke="currentColor" strokeWidth="2" />
      </svg>
    ),
  },
  {
    value: 'bottom', label: '下罫線',
    icon: ({ size, className }) => (
      <svg width={size} height={size} viewBox="0 0 16 16" className={className}>
        <rect x="1" y="1" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 2" />
        <line x1="1" y1="15" x2="15" y2="15" stroke="currentColor" strokeWidth="2" />
      </svg>
    ),
  },
  {
    value: 'left', label: '左罫線',
    icon: ({ size, className }) => (
      <svg width={size} height={size} viewBox="0 0 16 16" className={className}>
        <rect x="1" y="1" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 2" />
        <line x1="1" y1="1" x2="1" y2="15" stroke="currentColor" strokeWidth="2" />
      </svg>
    ),
  },
  {
    value: 'right', label: '右罫線',
    icon: ({ size, className }) => (
      <svg width={size} height={size} viewBox="0 0 16 16" className={className}>
        <rect x="1" y="1" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 2" />
        <line x1="15" y1="1" x2="15" y2="15" stroke="currentColor" strokeWidth="2" />
      </svg>
    ),
  },
  {
    value: 'none', label: '枠なし',
    icon: ({ size, className }) => (
      <svg width={size} height={size} viewBox="0 0 16 16" className={className}>
        <rect x="1" y="1" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 2" />
        <line x1="2" y1="2" x2="14" y2="14" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
]

const NUMBER_FORMATS: { value: CellFormat['numberFormat'] | 'custom'; label: string; example: string }[] = [
  { value: 'plain', label: '標準', example: '1234.5' },
  { value: 'number', label: '数値', example: '1,234.56' },
  { value: 'currency', label: '通貨', example: '¥1,234' },
  { value: 'percent', label: 'パーセント', example: '12.34%' },
  { value: 'date', label: '日付', example: '2025/01/15' },
  { value: 'time', label: '時刻', example: '14:30:00' },
  { value: 'scientific', label: '科学', example: '1.23E+03' },
  { value: 'fraction', label: '分数', example: '1 1/4' },
  { value: 'custom', label: 'カスタム', example: '#,##0.00' },
]

const ICON_SETS = [
  { name: 'arrows', label: '矢印', icons: '↑ → ↓' },
  { name: 'trafficLights', label: '信号', icons: '🔴 🟡 🟢' },
  { name: 'stars', label: '星', icons: '★ ★ ☆' },
  { name: 'flags', label: 'フラグ', icons: '🚩 🏳 ⚑' },
]

const COND_RULES: { value: ConditionalFormat['rule']; label: string }[] = [
  { value: 'greaterThan', label: '次より大きい' },
  { value: 'lessThan', label: '次より小さい' },
  { value: 'equalTo', label: '等しい' },
  { value: 'textContains', label: 'テキストを含む' },
  { value: 'isEmpty', label: '空白' },
  { value: 'isNotEmpty', label: '空白ではない' },
]

export interface FunctionDef {
  name: string
  desc: string
  template: string
}

const FUNCTION_CATEGORIES: { name: string; functions: FunctionDef[] }[] = [
  {
    name: '数学',
    functions: [
      { name: 'SUM', desc: '合計', template: '=SUM(A1:A10)' },
      { name: 'AVERAGE', desc: '平均', template: '=AVERAGE(A1:A10)' },
      { name: 'COUNT', desc: '数値の個数', template: '=COUNT(A1:A10)' },
      { name: 'MAX', desc: '最大値', template: '=MAX(A1:A10)' },
      { name: 'MIN', desc: '最小値', template: '=MIN(A1:A10)' },
      { name: 'ROUND', desc: '四捨五入', template: '=ROUND(A1, 2)' },
      { name: 'ABS', desc: '絶対値', template: '=ABS(A1)' },
      { name: 'SQRT', desc: '平方根', template: '=SQRT(A1)' },
      { name: 'POWER', desc: 'べき乗', template: '=POWER(A1, 2)' },
      { name: 'MOD', desc: '剰余', template: '=MOD(A1, 3)' },
    ],
  },
  {
    name: '文字列',
    functions: [
      { name: 'CONCAT', desc: '文字列結合', template: '=CONCAT(A1, B1)' },
      { name: 'LEN', desc: '文字数', template: '=LEN(A1)' },
      { name: 'UPPER', desc: '大文字変換', template: '=UPPER(A1)' },
      { name: 'LOWER', desc: '小文字変換', template: '=LOWER(A1)' },
      { name: 'TRIM', desc: '空白除去', template: '=TRIM(A1)' },
      { name: 'LEFT', desc: '左から抽出', template: '=LEFT(A1, 3)' },
      { name: 'RIGHT', desc: '右から抽出', template: '=RIGHT(A1, 3)' },
      { name: 'MID', desc: '中間抽出', template: '=MID(A1, 2, 3)' },
      { name: 'FIND', desc: '検索位置', template: '=FIND("検索語", A1)' },
      { name: 'SUBSTITUTE', desc: '置換', template: '=SUBSTITUTE(A1, "旧", "新")' },
    ],
  },
  {
    name: '論理',
    functions: [
      { name: 'IF', desc: '条件分岐', template: '=IF(A1>0, "正", "負")' },
      { name: 'AND', desc: 'すべて真', template: '=AND(A1>0, B1>0)' },
      { name: 'OR', desc: 'いずれか真', template: '=OR(A1>0, B1>0)' },
      { name: 'NOT', desc: '論理否定', template: '=NOT(A1>0)' },
      { name: 'IFERROR', desc: 'エラー時の値', template: '=IFERROR(A1/B1, 0)' },
      { name: 'ISBLANK', desc: '空白判定', template: '=ISBLANK(A1)' },
      { name: 'ISNUMBER', desc: '数値判定', template: '=ISNUMBER(A1)' },
    ],
  },
  {
    name: '日付',
    functions: [
      { name: 'TODAY', desc: '今日の日付', template: '=TODAY()' },
      { name: 'NOW', desc: '現在の日時', template: '=NOW()' },
      { name: 'DATE', desc: '日付作成', template: '=DATE(2025, 1, 15)' },
      { name: 'YEAR', desc: '年を取得', template: '=YEAR(A1)' },
      { name: 'MONTH', desc: '月を取得', template: '=MONTH(A1)' },
      { name: 'DAY', desc: '日を取得', template: '=DAY(A1)' },
    ],
  },
  {
    name: '検索',
    functions: [
      { name: 'VLOOKUP', desc: '縦方向検索', template: '=VLOOKUP(A1, B1:D10, 2, 0)' },
      { name: 'HLOOKUP', desc: '横方向検索', template: '=HLOOKUP(A1, B1:H3, 2, 0)' },
      { name: 'INDEX', desc: '位置指定取得', template: '=INDEX(A1:C10, 2, 3)' },
      { name: 'MATCH', desc: '検索位置', template: '=MATCH(A1, B1:B10, 0)' },
    ],
  },
  {
    name: '条件集計',
    functions: [
      { name: 'SUMIF', desc: '条件付き合計', template: '=SUMIF(A1:A10, ">0", B1:B10)' },
      { name: 'COUNTIF', desc: '条件付き個数', template: '=COUNTIF(A1:A10, ">0")' },
      { name: 'AVERAGEIF', desc: '条件付き平均', template: '=AVERAGEIF(A1:A10, ">0", B1:B10)' },
      { name: 'SUMIFS', desc: '複数条件合計', template: '=SUMIFS(C1:C10, A1:A10, ">0", B1:B10, "<100")' },
    ],
  },
  {
    name: '統計',
    functions: [
      { name: 'MEDIAN', desc: '中央値', template: '=MEDIAN(A1:A10)' },
      { name: 'STDEV', desc: '標準偏差', template: '=STDEV(A1:A10)' },
      { name: 'VAR', desc: '分散', template: '=VAR(A1:A10)' },
      { name: 'COUNTA', desc: '空白でない個数', template: '=COUNTA(A1:A10)' },
    ],
  },
]

// ========== Tab definitions ==========

type TabKey = 'home' | 'insert' | 'data' | 'view' | 'tools' | 'file'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'home', label: 'ホーム' },
  { key: 'insert', label: '挿入' },
  { key: 'data', label: 'データ' },
  { key: 'view', label: '表示' },
  { key: 'tools', label: 'ツール' },
  { key: 'file', label: 'ファイル' },
]

// ========== Props ==========

/** Core spreadsheet state: active sheet, selection, and format info */
export interface RibbonCoreState {
  activeSheet: Sheet
  selectedCell: { row: number; col: number } | null
  selectionRange: SelectionRange | null
  currentCellFormat?: CellFormat
  formatPainterActive?: boolean
  formatPopupAnchor?: { x: number; y: number } | null
}

/** File-level operations: title, save, undo/redo, import/export, versioning */
export interface RibbonFileOps {
  title: string
  onTitleChange: (title: string) => void
  saveStatus?: 'saved' | 'saving'
  docId?: string
  canUndo?: boolean
  canRedo?: boolean
  onUndo?: () => void
  onRedo?: () => void
  onExportCSV?: () => void
  onExportHTML?: () => void
  onExportPDF?: () => void
  onImportCSV?: () => void
  onSaveVersion?: () => void
  onVersionHistory?: () => void
  onDelete?: () => void
}

/** View options: zoom, formula display */
export interface RibbonViewOps {
  showFormulas?: boolean
  onToggleFormulas?: () => void
  zoom?: number
  onZoomIn?: () => void
  onZoomOut?: () => void
}

/** Format actions: changing cell format, dispatching spreadsheet actions */
export interface RibbonFormatActions {
  onFormatChange: (format: Partial<CellFormat>) => void
  dispatch: (action: UndoableAction<SpreadsheetAction>) => void
  onFormatPainterStart?: () => void
}

/** Insert operations: charts, pivots, functions */
export interface RibbonInsertOps {
  onOpenChartPanel?: () => void
  onOpenPivot?: () => void
  onInsertFunction?: (funcName: string, template: string) => void
}

/** Dialog openers for various features */
export interface RibbonDialogs {
  onFindReplace?: () => void
  onGoToCell?: () => void
  onDataValidation?: () => void
  onSort?: () => void
  onRemoveDuplicates?: () => void
  onPrintPreview?: () => void
  onShortcuts?: () => void
  onAiFormula?: () => void
  onPdfImport?: () => void
  onOpenCondFormat?: () => void
  onOpenNamedRanges?: () => void
  onDataConnection?: () => void
  onPrintRange?: () => void
  onShowShortcutsHelp?: () => void
}

/** Cell-level operations: navigation, flash fill, clipboard */
export interface RibbonCellOps {
  onNavigateToCell?: (row: number, col: number) => void
  onFlashFill?: () => void
  onPasteHtmlTable?: (data: { value: string; format?: Partial<CellFormat> }[][]) => void
}

export interface SpreadsheetRibbonToolbarProps {
  coreState: RibbonCoreState
  fileOps: RibbonFileOps
  viewOps: RibbonViewOps
  formatActions: RibbonFormatActions
  insertOps: RibbonInsertOps
  dialogs: RibbonDialogs
  cellOps: RibbonCellOps
  /** All sheets (for XLSX export) */
  allSheets?: Sheet[]
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
  variant,
}: {
  icon: React.ReactNode
  label?: string
  onClick?: () => void
  active?: boolean
  disabled?: boolean
  title?: string
  className?: string
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
  const containerRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  useEffect(() => {
    if (!open) return
    function handle(e: MouseEvent) {
      if (
        containerRef.current && !containerRef.current.contains(e.target as Node) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node)
      ) {
        onToggle()
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open, onToggle])

  useEffect(() => {
    if (!open || !containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    let top = rect.bottom + 4
    let left = align === 'right' ? rect.right : align === 'center' ? rect.left + rect.width / 2 : rect.left

    // Defer measurement to next frame so dropdown content is rendered
    requestAnimationFrame(() => {
      if (!dropdownRef.current) return
      const dd = dropdownRef.current.getBoundingClientRect()
      // Flip up if near bottom
      if (top + dd.height > window.innerHeight - 8) {
        top = rect.top - dd.height - 4
      }
      // Adjust horizontal
      if (align === 'center') {
        left = left - dd.width / 2
      } else if (align === 'right') {
        left = left - dd.width
      }
      // Clamp to viewport
      if (left + dd.width > window.innerWidth - 8) {
        left = window.innerWidth - dd.width - 8
      }
      if (left < 8) left = 8
      if (top < 8) top = 8
      setPos({ top, left })
    })
  }, [open, align])

  return (
    <div className="relative" ref={containerRef}>
      {trigger}
      {open && (
        <div
          ref={dropdownRef}
          className="fixed bg-slate-900 border border-slate-700 rounded-lg shadow-xl z-[9999]"
          style={pos ? { top: pos.top, left: pos.left } : { top: -9999, left: -9999 }}
        >
          {children}
        </div>
      )}
    </div>
  )
}

// ========== Color picker dropdown ==========

function ColorPicker({
  label,
  value,
  onChange,
  onClear,
  open,
  onToggle,
}: {
  label: string
  value?: string
  onChange: (color: string) => void
  onClear?: () => void
  open: boolean
  onToggle: () => void
}) {
  return (
    <DropdownBtn
      trigger={
        <button
          className="flex flex-col items-center justify-center gap-0.5 px-1.5 py-1 rounded transition-colors min-w-[32px] text-slate-400 hover:bg-slate-700 hover:text-white relative"
          onClick={onToggle}
          title={label}
          aria-label={label}
        >
          {label === '文字色' ? <Type size={14} /> : <Paintbrush size={14} />}
          <div
            className="absolute bottom-0.5 left-1.5 right-1.5 h-0.5 rounded"
            style={{ backgroundColor: value || (label === '文字色' ? '#ffffff' : 'transparent') }}
          />
          <span className="text-[9px] leading-none max-md:hidden whitespace-nowrap">{label}</span>
        </button>
      }
      open={open}
      onToggle={onToggle}
    >
      <div className="p-2 w-[220px]">
        <div className="text-[10px] text-slate-400 mb-1.5 font-medium">{label}</div>
        {onClear && (
          <button
            onClick={() => { onClear(); onToggle() }}
            className={`w-full text-left px-2 py-1 mb-1 rounded text-[10px] transition-colors ${
              !value ? 'text-indigo-400 bg-slate-700' : 'text-slate-400 hover:bg-slate-700 hover:text-white'
            }`}
          >
            なし（透明）
          </button>
        )}
        <div className="flex flex-col gap-0.5">
          {COLOR_ROWS.map((row) => (
            <div key={row.label} className="grid grid-cols-8 gap-0.5">
              {row.colors.map((color) => (
                <button
                  key={color}
                  onClick={() => { onChange(color); onToggle() }}
                  className={`w-6 h-6 rounded transition-transform hover:scale-125 ${
                    value === color ? 'ring-2 ring-indigo-400 ring-offset-1 ring-offset-slate-800' : 'border border-slate-600'
                  }`}
                  style={{ backgroundColor: color }}
                  title={`${row.label} ${color}`}
                />
              ))}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-700">
          <span className="text-[10px] text-slate-400">カスタム:</span>
          <input
            type="color"
            value={value || (label === '文字色' ? '#ffffff' : '#000000')}
            onChange={(e) => onChange(e.target.value)}
            className="w-6 h-6 bg-transparent border-none cursor-pointer"
          />
        </div>
      </div>
    </DropdownBtn>
  )
}

// ========== Main component ==========

export default function SpreadsheetRibbonToolbar(props: SpreadsheetRibbonToolbarProps) {
  const { coreState, fileOps, viewOps, formatActions, insertOps, dialogs, cellOps, allSheets } = props

  // Destructure grouped props for convenient access
  const {
    activeSheet, selectedCell, selectionRange, currentCellFormat: currentCellFormat,
    formatPainterActive, formatPopupAnchor,
  } = coreState
  const {
    title, onTitleChange, saveStatus, docId,
    canUndo, canRedo, onUndo, onRedo,
    onExportCSV, onExportHTML, onExportPDF,
    onImportCSV, onSaveVersion, onVersionHistory, onDelete,
  } = fileOps
  const { showFormulas, onToggleFormulas, zoom, onZoomIn, onZoomOut } = viewOps
  const { onFormatChange, dispatch, onFormatPainterStart } = formatActions
  const { onOpenChartPanel, onOpenPivot, onInsertFunction } = insertOps
  const {
    onFindReplace, onGoToCell, onDataValidation, onSort,
    onRemoveDuplicates, onPrintPreview, onShortcuts,
    onAiFormula, onPdfImport, onOpenCondFormat, onOpenNamedRanges,
    onDataConnection, onPrintRange, onShowShortcutsHelp,
  } = dialogs
  const { onNavigateToCell, onFlashFill, onPasteHtmlTable } = cellOps

  const router = useRouter()
  const { addToast } = useToast()
  const [activeTab, setActiveTab] = useState<TabKey>('home')
  const [collapsed, setCollapsed] = useState(false)
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)
  const [showFormatPopup, setShowFormatPopup] = useState(false)
  const ribbonRef = useRef<HTMLDivElement>(null)
  const formatPopupRef = useRef<HTMLDivElement>(null)
  const csvInputRef = useRef<HTMLInputElement>(null)

  // Local state for dropdowns
  const [functionCategory, setFunctionCategory] = useState('数学')
  const [condRule, setCondRule] = useState<ConditionalFormat['rule']>('greaterThan')
  const [condValue, setCondValue] = useState('')
  const [condColor, setCondColor] = useState('#22c55e')
  // Custom number format
  const [customFormatInput, setCustomFormatInput] = useState('')
  const [showCustomFormat, setShowCustomFormat] = useState(false)
  // Name box
  const [nameBoxValue, setNameBoxValue] = useState('')
  const [nameBoxEditing, setNameBoxEditing] = useState(false)

  const fmt = currentCellFormat || {}

  // Update name box when selected cell changes
  useEffect(() => {
    if (selectedCell && !nameBoxEditing) {
      const colLetter = String.fromCharCode(65 + (selectedCell.col % 26))
      const prefix = selectedCell.col >= 26 ? String.fromCharCode(64 + Math.floor(selectedCell.col / 26)) : ''
      setNameBoxValue(`${prefix}${colLetter}${selectedCell.row + 1}`)
    }
  }, [selectedCell, nameBoxEditing])

  // Keyboard shortcuts: Ctrl+E (flash fill), Ctrl+/ (shortcuts help)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey && e.key === 'e') {
        e.preventDefault()
        onFlashFill?.()
      }
      if (e.ctrlKey && e.key === '/') {
        e.preventDefault()
        onShowShortcutsHelp?.()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onFlashFill, onShowShortcutsHelp])

  // Handle CSV file import
  const handleCsvFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string
        if (!text) {
          addToast('CSVファイルの読み込みに失敗しました: ファイルが空です', 'error')
          return
        }
        const rows = parseCSV(text)
        if (rows.length === 0) {
          addToast('CSVファイルにデータが含まれていません', 'error')
          return
        }
        // Dispatch cell values
        let rowCount = 0
        for (let r = 0; r < rows.length; r++) {
          let hasData = false
          for (let c = 0; c < rows[r].length; c++) {
            if (rows[r][c]) {
              dispatch({
                type: 'SET_CELL_VALUE',
                sheetId: activeSheet.id,
                row: r,
                col: c,
                value: rows[r][c],
              })
              hasData = true
            }
          }
          if (hasData) rowCount++
        }
        addToast(`${rowCount}行をインポートしました`, 'success')
      } catch (err) {
        addToast('CSVファイルの読み込みに失敗しました', 'error')
        console.error('[DocCraft] CSV import error:', err)
      }
    }
    reader.onerror = () => {
      addToast('CSVファイルの読み込みに失敗しました', 'error')
    }
    reader.readAsText(file)
    // Reset input
    if (csvInputRef.current) csvInputRef.current.value = ''
  }, [dispatch, activeSheet.id, addToast])

  // Handle clipboard paste with HTML table detection
  useEffect(() => {
    function handlePaste(e: ClipboardEvent) {
      if (!onPasteHtmlTable) return
      const html = e.clipboardData?.getData('text/html')
      if (!html || !html.includes('<table')) return

      // Parse HTML table
      const parser = new DOMParser()
      const doc = parser.parseFromString(html, 'text/html')
      const table = doc.querySelector('table')
      if (!table) return

      const data: { value: string; format?: Partial<CellFormat> }[][] = []
      const trs = table.querySelectorAll('tr')
      trs.forEach((tr) => {
        const row: { value: string; format?: Partial<CellFormat> }[] = []
        const cells = tr.querySelectorAll('td, th')
        cells.forEach((cell) => {
          const el = cell as HTMLElement
          const format: Partial<CellFormat> = {}
          const style = el.style
          if (style.fontWeight === 'bold' || el.tagName === 'TH') format.bold = true
          if (style.fontStyle === 'italic') format.italic = true
          if (style.color) format.textColor = style.color
          if (style.backgroundColor) format.bgColor = style.backgroundColor
          row.push({
            value: el.textContent?.trim() ?? '',
            format: Object.keys(format).length > 0 ? format : undefined,
          })
        })
        if (row.length > 0) data.push(row)
      })

      if (data.length > 0) {
        e.preventDefault()
        onPasteHtmlTable(data)
      }
    }
    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [onPasteHtmlTable])

  // Name box navigation
  const handleNameBoxSubmit = useCallback(() => {
    setNameBoxEditing(false)
    if (!onNavigateToCell) return
    const match = nameBoxValue.trim().toUpperCase().match(/^([A-Z]{1,2})(\d+)$/)
    if (match) {
      const colStr = match[1]
      const rowNum = parseInt(match[2], 10) - 1
      let col = 0
      for (let i = 0; i < colStr.length; i++) {
        col = col * 26 + (colStr.charCodeAt(i) - 64)
      }
      col -= 1 // zero-indexed
      if (rowNum >= 0 && col >= 0) {
        onNavigateToCell(rowNum, col)
      }
    }
  }, [nameBoxValue, onNavigateToCell])

  // Close format popup when clicking outside, pressing Escape, or switching tabs
  useEffect(() => {
    if (!showFormatPopup) return
    function handleClickOutside(e: MouseEvent) {
      if (
        formatPopupRef.current && !formatPopupRef.current.contains(e.target as Node) &&
        ribbonRef.current && !ribbonRef.current.contains(e.target as Node)
      ) {
        setShowFormatPopup(false)
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setShowFormatPopup(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [showFormatPopup])

  // Close dropdown when clicking outside ribbon
  useEffect(() => {
    if (!activeDropdown) return
    function handle(e: MouseEvent) {
      if (
        ribbonRef.current && !ribbonRef.current.contains(e.target as Node) &&
        (!formatPopupRef.current || !formatPopupRef.current.contains(e.target as Node))
      ) {
        setActiveDropdown(null)
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [activeDropdown])

  const toggleDropdown = useCallback((name: string) => {
    setActiveDropdown((prev) => (prev === name ? null : name))
  }, [])

  const range =
    selectionRange ||
    (selectedCell
      ? {
          startRow: selectedCell.row,
          startCol: selectedCell.col,
          endRow: selectedCell.row,
          endCol: selectedCell.col,
        }
      : null)

  const isFrozen = !!(activeSheet.frozenRows || activeSheet.frozenCols)

  const applyBorder = (type: string) => {
    const border = '1px solid #64748b'
    if (type === 'outline' && range && activeSheet) {
      for (let r = range.startRow; r <= range.endRow; r++) {
        for (let c = range.startCol; c <= range.endCol; c++) {
          const cellBorder: Partial<CellFormat> = {}
          if (r === range.startRow) cellBorder.borderTop = border
          if (r === range.endRow) cellBorder.borderBottom = border
          if (c === range.startCol) cellBorder.borderLeft = border
          if (c === range.endCol) cellBorder.borderRight = border
          if (Object.keys(cellBorder).length > 0) {
            dispatch({
              type: 'SET_CELL_FORMAT',
              sheetId: activeSheet.id,
              row: r,
              col: c,
              format: cellBorder,
            })
          }
        }
      }
      setActiveDropdown(null)
      return
    }
    let format: Partial<CellFormat> = {}
    switch (type) {
      case 'none':
        format = { borderTop: undefined, borderRight: undefined, borderBottom: undefined, borderLeft: undefined }
        break
      case 'all':
        format = { borderTop: border, borderRight: border, borderBottom: border, borderLeft: border }
        break
      case 'top':
        format = { borderTop: border }
        break
      case 'bottom':
        format = { borderBottom: border }
        break
      case 'left':
        format = { borderLeft: border }
        break
      case 'right':
        format = { borderRight: border }
        break
    }
    onFormatChange(format)
    setActiveDropdown(null)
  }

  // Tab double-click to collapse/expand
  function handleTabClick(key: TabKey) {
    if (activeTab === key) {
      setCollapsed(!collapsed)
    } else {
      setActiveTab(key)
      setCollapsed(false)
      setShowFormatPopup(false)
    }
  }

  // ===== Tab content renderers =====

  // Compute popup position based on formatPopupAnchor
  const popupPosition = useMemo(() => {
    if (!formatPopupAnchor) return { top: 100, left: 100 }
    const popupWidth = 620
    const popupHeight = 80
    const margin = 8

    // Try to position above the cell
    let top = formatPopupAnchor.y - popupHeight - margin
    let left = formatPopupAnchor.x

    // If not enough space above, position below
    if (top < margin) {
      top = formatPopupAnchor.y + 28 + margin // 28 = approximate cell height
    }

    // Clamp horizontal to viewport
    if (left + popupWidth > window.innerWidth - margin) {
      left = window.innerWidth - popupWidth - margin
    }
    if (left < margin) left = margin

    // Clamp vertical
    if (top + popupHeight > window.innerHeight - margin) {
      top = window.innerHeight - popupHeight - margin
    }

    return { top, left }
  }, [formatPopupAnchor])

  function renderHome() {
    return (
      <div className="flex items-end gap-1 overflow-x-auto flex-nowrap scrollbar-none">
        {/* Undo/Redo */}
        <RibbonGroup label="元に戻す">
          <RibbonBtn icon={<Undo2 size={14} />} label="元に戻す" onClick={onUndo} disabled={!canUndo} title="元に戻す (Ctrl+Z)" />
          <RibbonBtn icon={<Redo2 size={14} />} label="やり直し" onClick={onRedo} disabled={!canRedo} title="やり直し (Ctrl+Y)" />
        </RibbonGroup>

        <Separator />

        {/* Clipboard */}
        <RibbonGroup label="クリップボード">
          <RibbonBtn icon={<Scissors size={14} />} label="切り取り" onClick={() => document.execCommand('cut')} title="切り取り (Ctrl+X)" />
          <RibbonBtn icon={<ClipboardCopy size={14} />} label="コピー" onClick={() => document.execCommand('copy')} title="コピー (Ctrl+C)" />
          <RibbonBtn icon={<ClipboardPaste size={14} />} label="貼り付け" onClick={() => document.execCommand('paste')} title="貼り付け (Ctrl+V)" />
        </RibbonGroup>

        <Separator />

        {/* Format popup toggle button */}
        <RibbonGroup label="書式">
          <RibbonBtn
            icon={<Type size={14} />}
            label="書式"
            onClick={() => setShowFormatPopup(!showFormatPopup)}
            active={showFormatPopup}
            title="書式ツールバーを開く"
          />
        </RibbonGroup>
      </div>
    )
  }

  function renderFormatPopup() {
    if (!showFormatPopup) return null

    return (
      <div
        ref={formatPopupRef}
        className="fixed z-50 bg-slate-800 border border-slate-700 rounded-lg shadow-2xl animate-in fade-in zoom-in-95 duration-150"
        style={{ top: popupPosition.top, left: popupPosition.left }}
        onMouseDown={(e) => {
          // Allow inputs and dropdowns inside the popup to work,
          // but prevent stealing focus from the editing textarea for buttons
          const target = e.target as HTMLElement
          if (target.tagName !== 'INPUT' && target.tagName !== 'SELECT' && target.tagName !== 'TEXTAREA') {
            e.preventDefault()
          }
        }}
      >
        <div className="flex flex-col gap-0.5 px-2 py-1.5">
          {/* Row 1: Font, size, BIUS, colors, borders */}
          <div className="flex items-center gap-0.5">
            {/* Font family */}
            <DropdownBtn
              trigger={
                <button
                  className="flex items-center justify-center gap-0.5 px-1 py-0.5 rounded transition-colors min-w-[28px] text-slate-400 hover:bg-slate-700 hover:text-white"
                  onClick={() => toggleDropdown('fontFamily')}
                  title="フォント"
                >
                  <span className="text-[10px] font-bold max-w-[50px] truncate">
                    {FONT_FAMILIES.find((f) => f.value === fmt.fontFamily)?.label || 'ゴシック'}
                  </span>
                </button>
              }
              open={activeDropdown === 'fontFamily'}
              onToggle={() => toggleDropdown('fontFamily')}
            >
              <div className="py-1 w-44">
                {FONT_FAMILIES.map((f) => (
                  <button
                    key={f.value}
                    onClick={() => {
                      onFormatChange({ fontFamily: f.value })
                      setActiveDropdown(null)
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
                      fmt.fontFamily === f.value
                        ? 'text-indigo-400 bg-slate-700'
                        : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                    }`}
                    style={{ fontFamily: f.value }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </DropdownBtn>

            <div className="w-px h-4 bg-slate-700 mx-0.5" />

            {/* Font size */}
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => onFormatChange({ fontSize: Math.max(6, (fmt.fontSize || 12) - 1) })}
                className="w-4 h-4 flex items-center justify-center rounded text-xs text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                title="フォントサイズを小さく"
              >
                <Minus size={9} />
              </button>
              <input
                type="number"
                min={6}
                max={72}
                value={fmt.fontSize || 12}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10)
                  if (!isNaN(v) && v >= 6 && v <= 72) onFormatChange({ fontSize: v })
                }}
                className="w-7 h-5 bg-slate-900 border border-slate-700 rounded text-center text-[10px] text-white outline-none focus:border-indigo-500"
                title="フォントサイズ"
              />
              <button
                onClick={() => onFormatChange({ fontSize: Math.min(72, (fmt.fontSize || 12) + 1) })}
                className="w-4 h-4 flex items-center justify-center rounded text-xs text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                title="フォントサイズを大きく"
              >
                <Plus size={9} />
              </button>
            </div>

            <div className="w-px h-4 bg-slate-700 mx-0.5" />

            {/* B I U S */}
            <button onClick={() => onFormatChange({ bold: !fmt.bold })} className={`px-1 py-0.5 rounded transition-colors ${fmt.bold ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-400 hover:bg-slate-700 hover:text-white'}`} title="太字 (Ctrl+B)"><Bold size={13} /></button>
            <button onClick={() => onFormatChange({ italic: !fmt.italic })} className={`px-1 py-0.5 rounded transition-colors ${fmt.italic ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-400 hover:bg-slate-700 hover:text-white'}`} title="斜体 (Ctrl+I)"><Italic size={13} /></button>
            <button onClick={() => onFormatChange({ underline: !fmt.underline })} className={`px-1 py-0.5 rounded transition-colors ${fmt.underline ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-400 hover:bg-slate-700 hover:text-white'}`} title="下線 (Ctrl+U)"><UnderlineIcon size={13} /></button>
            <button onClick={() => onFormatChange({ strikethrough: !fmt.strikethrough })} className={`px-1 py-0.5 rounded transition-colors ${fmt.strikethrough ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-400 hover:bg-slate-700 hover:text-white'}`} title="取り消し線"><Strikethrough size={13} /></button>

            <div className="w-px h-4 bg-slate-700 mx-0.5" />

            {/* Colors */}
            <ColorPicker
              label="文字色"
              value={fmt.textColor}
              onChange={(color) => onFormatChange({ textColor: color })}
              open={activeDropdown === 'textColor'}
              onToggle={() => toggleDropdown('textColor')}
            />
            <ColorPicker
              label="背景色"
              value={fmt.bgColor}
              onChange={(color) => onFormatChange({ bgColor: color })}
              onClear={() => onFormatChange({ bgColor: undefined })}
              open={activeDropdown === 'bgColor'}
              onToggle={() => toggleDropdown('bgColor')}
            />

            <div className="w-px h-4 bg-slate-700 mx-0.5" />

            {/* Borders */}
            <DropdownBtn
              trigger={
                <button
                  className="px-1 py-0.5 rounded transition-colors text-slate-400 hover:bg-slate-700 hover:text-white"
                  onClick={() => toggleDropdown('borders')}
                  title="罫線"
                >
                  <svg width={13} height={13} viewBox="0 0 16 16">
                    <rect x="1" y="1" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" />
                    <line x1="8" y1="1" x2="8" y2="15" stroke="currentColor" strokeWidth="0.75" />
                    <line x1="1" y1="8" x2="15" y2="8" stroke="currentColor" strokeWidth="0.75" />
                  </svg>
                </button>
              }
              open={activeDropdown === 'borders'}
              onToggle={() => toggleDropdown('borders')}
            >
              <div className="py-1 w-40">
                {BORDER_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => applyBorder(opt.value)}
                    className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                  >
                    <opt.icon size={16} className="flex-shrink-0" />
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
            </DropdownBtn>
          </div>

          {/* Row 2: Number format, alignment, wrap, merge, format painter, clear, conditional format */}
          <div className="flex items-center gap-0.5">
            {/* Number format */}
            <DropdownBtn
              trigger={
                <button
                  className="flex items-center justify-center gap-0.5 px-1 py-0.5 rounded transition-colors min-w-[28px] text-slate-400 hover:bg-slate-700 hover:text-white"
                  onClick={() => toggleDropdown('numberFormat')}
                  title="数値フォーマット"
                >
                  <span className="text-[10px] font-mono">
                    {NUMBER_FORMATS.find((f) => f.value === fmt.numberFormat)?.label || '標準'}
                  </span>
                </button>
              }
              open={activeDropdown === 'numberFormat'}
              onToggle={() => toggleDropdown('numberFormat')}
            >
              <div className="py-1 w-52">
                {NUMBER_FORMATS.map(({ value, label, example }) => (
                  value === 'custom' ? (
                    <div key="custom">
                      <div className="h-px bg-slate-700 my-0.5" />
                      <button
                        onClick={() => setShowCustomFormat(!showCustomFormat)}
                        className={`w-full flex items-center justify-between px-3 py-1.5 text-xs transition-colors ${
                          showCustomFormat
                            ? 'text-indigo-400 bg-slate-700'
                            : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                        }`}
                      >
                        <span>{label}</span>
                        <span className="font-mono text-slate-500 text-[10px]">{example}</span>
                      </button>
                      {showCustomFormat && (
                        <div className="px-3 pb-2 pt-1">
                          <input
                            autoFocus
                            type="text"
                            value={customFormatInput}
                            onChange={(e) => setCustomFormatInput(e.target.value)}
                            placeholder="#,##0.00 / 0.0% / yyyy/mm/dd"
                            className="w-full h-7 bg-slate-700 border border-slate-600 rounded text-xs text-white px-2 mb-1.5 outline-none focus:border-indigo-500 font-mono"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && customFormatInput.trim()) {
                                if (range) {
                                  for (let r = range.startRow; r <= range.endRow; r++) {
                                    for (let c = range.startCol; c <= range.endCol; c++) {
                                      dispatch({
                                        type: 'SET_CELL_FORMAT',
                                        sheetId: activeSheet.id,
                                        row: r,
                                        col: c,
                                        format: { numberFormat: 'custom', customFormat: customFormatInput.trim() },
                                      })
                                    }
                                  }
                                }
                                setActiveDropdown(null)
                                setShowCustomFormat(false)
                              }
                            }}
                          />
                          <div className="text-[9px] text-slate-500">
                            例: #,##0.00 / 0.0% / yyyy/mm/dd
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <button
                      key={value}
                      onClick={() => {
                        onFormatChange({ numberFormat: value as CellFormat['numberFormat'] })
                        setActiveDropdown(null)
                        setShowCustomFormat(false)
                      }}
                      className={`w-full flex items-center justify-between px-3 py-1.5 text-xs transition-colors ${
                        fmt.numberFormat === value
                          ? 'text-indigo-400 bg-slate-700'
                          : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                      }`}
                    >
                      <span>{label}</span>
                      <span className="font-mono text-slate-500 text-[10px]">{example}</span>
                    </button>
                  )
                ))}
              </div>
            </DropdownBtn>

            <div className="w-px h-4 bg-slate-700 mx-0.5" />

            {/* Alignment */}
            <button onClick={() => onFormatChange({ align: 'left' })} className={`px-1 py-0.5 rounded transition-colors ${!fmt.align || fmt.align === 'left' ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-400 hover:bg-slate-700 hover:text-white'}`} title="左揃え"><AlignLeft size={13} /></button>
            <button onClick={() => onFormatChange({ align: 'center' })} className={`px-1 py-0.5 rounded transition-colors ${fmt.align === 'center' ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-400 hover:bg-slate-700 hover:text-white'}`} title="中央揃え"><AlignCenter size={13} /></button>
            <button onClick={() => onFormatChange({ align: 'right' })} className={`px-1 py-0.5 rounded transition-colors ${fmt.align === 'right' ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-400 hover:bg-slate-700 hover:text-white'}`} title="右揃え"><AlignRight size={13} /></button>

            <div className="w-px h-4 bg-slate-700 mx-0.5" />

            {/* Vertical align */}
            <button onClick={() => onFormatChange({ verticalAlign: 'top' })} className={`px-1 py-0.5 rounded transition-colors ${fmt.verticalAlign === 'top' ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-400 hover:bg-slate-700 hover:text-white'}`} title="上揃え"><AlignVerticalJustifyStart size={13} /></button>
            <button onClick={() => onFormatChange({ verticalAlign: 'middle' })} className={`px-1 py-0.5 rounded transition-colors ${!fmt.verticalAlign || fmt.verticalAlign === 'middle' ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-400 hover:bg-slate-700 hover:text-white'}`} title="中央揃え（垂直）"><AlignVerticalJustifyCenter size={13} /></button>
            <button onClick={() => onFormatChange({ verticalAlign: 'bottom' })} className={`px-1 py-0.5 rounded transition-colors ${fmt.verticalAlign === 'bottom' ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-400 hover:bg-slate-700 hover:text-white'}`} title="下揃え"><AlignVerticalJustifyEnd size={13} /></button>

            <div className="w-px h-4 bg-slate-700 mx-0.5" />

            {/* Wrap */}
            <button onClick={() => onFormatChange({ wrap: !fmt.wrap })} className={`px-1 py-0.5 rounded transition-colors ${fmt.wrap ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-400 hover:bg-slate-700 hover:text-white'}`} title="テキスト折り返し"><WrapText size={13} /></button>

            {/* Merge dropdown */}
            <DropdownBtn
              trigger={
                <button
                  className={`px-1 py-0.5 rounded transition-colors ${
                    selectedCell && activeSheet.mergedCells.some((m) => m.startRow === selectedCell.row && m.startCol === selectedCell.col)
                      ? 'bg-indigo-500/20 text-indigo-400'
                      : 'text-slate-400 hover:bg-slate-700 hover:text-white'
                  }`}
                  onClick={() => toggleDropdown('mergeCells')}
                  title="セルの結合"
                >
                  <Merge size={13} />
                </button>
              }
              open={activeDropdown === 'mergeCells'}
              onToggle={() => toggleDropdown('mergeCells')}
            >
              <div className="py-1 w-44">
                <button
                  onClick={() => {
                    if (selectionRange && (selectionRange.endRow > selectionRange.startRow || selectionRange.endCol > selectionRange.startCol)) {
                      dispatch({
                        type: 'MERGE_CELLS',
                        sheetId: activeSheet.id,
                        startRow: selectionRange.startRow,
                        startCol: selectionRange.startCol,
                        endRow: selectionRange.endRow,
                        endCol: selectionRange.endCol,
                      })
                      onFormatChange({ align: 'center' })
                    }
                    setActiveDropdown(null)
                  }}
                  disabled={!selectionRange || (selectionRange.endRow === selectionRange.startRow && selectionRange.endCol === selectionRange.startCol)}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700 hover:text-white disabled:text-slate-600 disabled:cursor-not-allowed transition-colors"
                >
                  <Merge size={14} />
                  <span>結合して中央揃え</span>
                </button>
                <button
                  onClick={() => {
                    if (selectionRange && selectionRange.endCol > selectionRange.startCol) {
                      for (let r = selectionRange.startRow; r <= selectionRange.endRow; r++) {
                        dispatch({
                          type: 'MERGE_CELLS',
                          sheetId: activeSheet.id,
                          startRow: r,
                          startCol: selectionRange.startCol,
                          endRow: r,
                          endCol: selectionRange.endCol,
                        })
                      }
                    }
                    setActiveDropdown(null)
                  }}
                  disabled={!selectionRange || selectionRange.endCol === selectionRange.startCol}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700 hover:text-white disabled:text-slate-600 disabled:cursor-not-allowed transition-colors"
                >
                  <ArrowRight size={14} />
                  <span>横方向に結合</span>
                </button>
                <div className="h-px bg-slate-700 my-1" />
                <button
                  onClick={() => {
                    if (selectedCell) {
                      dispatch({
                        type: 'UNMERGE_CELLS',
                        sheetId: activeSheet.id,
                        startRow: selectedCell.row,
                        startCol: selectedCell.col,
                      })
                    }
                    setActiveDropdown(null)
                  }}
                  disabled={!selectedCell || !activeSheet.mergedCells.some((m) => m.startRow === selectedCell.row && m.startCol === selectedCell.col)}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700 hover:text-white disabled:text-slate-600 disabled:cursor-not-allowed transition-colors"
                >
                  <SplitSquareHorizontal size={14} />
                  <span>結合の解除</span>
                </button>
              </div>
            </DropdownBtn>

            <div className="w-px h-4 bg-slate-700 mx-0.5" />

            {/* Format painter */}
            <button onClick={onFormatPainterStart} className={`px-1 py-0.5 rounded transition-colors ${formatPainterActive ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-400 hover:bg-slate-700 hover:text-white'}`} title="書式のコピー"><PaintBucket size={13} /></button>

            {/* Clear */}
            {range && (
              <button
                onClick={() => {
                  dispatch({
                    type: 'CLEAR_FORMAT',
                    sheetId: activeSheet.id,
                    startRow: range.startRow,
                    startCol: range.startCol,
                    endRow: range.endRow,
                    endCol: range.endCol,
                  })
                }}
                className="px-1 py-0.5 rounded transition-colors text-slate-400 hover:bg-slate-700 hover:text-white"
                title="書式をクリア"
              >
                <Eraser size={13} />
              </button>
            )}

            {/* Conditional format */}
            <DropdownBtn
              trigger={
                <button
                  className="px-1 py-0.5 rounded transition-colors text-slate-400 hover:bg-slate-700 hover:text-white"
                  onClick={() => toggleDropdown('condFormatQuick')}
                  title="条件付き書式"
                >
                  <span className="w-3 h-3 rounded-sm bg-gradient-to-r from-red-500 to-green-500 inline-block" />
                </button>
              }
              open={activeDropdown === 'condFormatQuick'}
              onToggle={() => toggleDropdown('condFormatQuick')}
            >
              <div className="w-64">
                <div className="px-3 pt-2 pb-1">
                  <div className="text-[10px] text-slate-500 font-medium mb-1">セルの強調表示ルール</div>
                </div>
                {[
                  { rule: 'greaterThan' as const, label: '指定の値より大きい', icon: '>' },
                  { rule: 'lessThan' as const, label: '指定の値より小さい', icon: '<' },
                  { rule: 'equalTo' as const, label: '指定の値と等しい', icon: '=' },
                  { rule: 'textContains' as const, label: 'テキストを含む', icon: 'Aa' },
                ].map((item) => (
                  <button
                    key={item.rule}
                    onClick={() => {
                      setCondRule(item.rule)
                      setActiveDropdown('condFormatDialog')
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                  >
                    <span className="w-5 h-5 flex items-center justify-center rounded bg-slate-800 text-[10px] font-mono text-indigo-400 flex-shrink-0">
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </button>
                ))}
                <div className="h-px bg-slate-700 my-1" />
                <div className="px-3 pt-1 pb-1">
                  <div className="text-[10px] text-slate-500 font-medium mb-1">データの視覚化</div>
                </div>
                <button
                  onClick={() => {
                    if (range) {
                      const cf: ConditionalFormat = {
                        id: generateId(),
                        range: { startRow: range.startRow, startCol: range.startCol, endRow: range.endRow, endCol: range.endCol },
                        rule: 'greaterThan' as ConditionalFormat['rule'],
                        values: ['#1e40af', '#3b82f6'],
                        style: { bgColor: 'transparent' },
                      }
                      dispatch({ type: 'ADD_CONDITIONAL_FORMAT', sheetId: activeSheet.id, format: { ...cf, rule: 'dataBar' as ConditionalFormat['rule'] } })
                      setActiveDropdown(null)
                    }
                  }}
                  disabled={!range}
                  className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700 hover:text-white transition-colors disabled:text-slate-600 disabled:cursor-not-allowed"
                >
                  <span className="w-5 h-5 flex items-center justify-center rounded bg-slate-800 flex-shrink-0">
                    <span className="w-3 h-1.5 bg-gradient-to-r from-indigo-500 to-indigo-300 rounded-sm inline-block" />
                  </span>
                  <span>データバー</span>
                </button>
                <button
                  onClick={() => {
                    if (range) {
                      const cf: ConditionalFormat = {
                        id: generateId(),
                        range: { startRow: range.startRow, startCol: range.startCol, endRow: range.endRow, endCol: range.endCol },
                        rule: 'greaterThan' as ConditionalFormat['rule'],
                        values: ['#22c55e', '#eab308', '#ef4444'],
                        style: { bgColor: 'transparent' },
                      }
                      dispatch({ type: 'ADD_CONDITIONAL_FORMAT', sheetId: activeSheet.id, format: { ...cf, rule: 'colorScale' as ConditionalFormat['rule'] } })
                      setActiveDropdown(null)
                    }
                  }}
                  disabled={!range}
                  className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700 hover:text-white transition-colors disabled:text-slate-600 disabled:cursor-not-allowed"
                >
                  <span className="w-5 h-5 flex items-center justify-center rounded bg-slate-800 flex-shrink-0">
                    <span className="w-3 h-3 bg-gradient-to-br from-red-500 via-yellow-400 to-green-500 rounded-sm inline-block" />
                  </span>
                  <span>カラースケール</span>
                </button>
                <div className="h-px bg-slate-700 my-1" />
                <div className="px-3 pt-1 pb-1">
                  <div className="text-[10px] text-slate-500 font-medium mb-1">アイコンセット</div>
                </div>
                {ICON_SETS.map((iconSet) => (
                  <button
                    key={iconSet.name}
                    onClick={() => {
                      if (range) {
                        const cf: ConditionalFormat = {
                          id: generateId(),
                          range: { startRow: range.startRow, startCol: range.startCol, endRow: range.endRow, endCol: range.endCol },
                          rule: 'greaterThan' as ConditionalFormat['rule'],
                          values: [iconSet.name],
                          style: { bgColor: 'transparent' },
                        }
                        dispatch({ type: 'ADD_CONDITIONAL_FORMAT', sheetId: activeSheet.id, format: { ...cf, rule: 'greaterThan', values: [`iconSet:${iconSet.name}`] } })
                        setActiveDropdown(null)
                      }
                    }}
                    disabled={!range}
                    className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700 hover:text-white transition-colors disabled:text-slate-600 disabled:cursor-not-allowed"
                  >
                    <span className="w-5 h-5 flex items-center justify-center rounded bg-slate-800 text-[10px] flex-shrink-0">
                      {iconSet.icons.split(' ')[0]}
                    </span>
                    <span>{iconSet.label} ({iconSet.icons})</span>
                  </button>
                ))}
                {(activeSheet.conditionalFormats ?? []).length > 0 && (
                  <>
                    <div className="h-px bg-slate-700 my-1" />
                    <div className="px-3 pt-1 pb-2">
                      <div className="text-[10px] text-slate-500 font-medium mb-1">
                        設定済みルール ({(activeSheet.conditionalFormats ?? []).length})
                      </div>
                      {(activeSheet.conditionalFormats ?? []).map((cf) => (
                        <div key={cf.id} className="flex items-center justify-between text-xs text-slate-300 py-0.5">
                          <span className="flex items-center gap-1">
                            <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: cf.style.bgColor }} />
                            {COND_RULES.find((r) => r.value === cf.rule)?.label}
                            {cf.values[0] ? ` ${cf.values[0]}` : ''}
                          </span>
                          <button
                            onClick={() => dispatch({ type: 'DELETE_CONDITIONAL_FORMAT', sheetId: activeSheet.id, formatId: cf.id })}
                            className="text-red-400 hover:text-red-300 px-1"
                          >
                            x
                          </button>
                        </div>
                      ))}
                    </div>
                  </>
                )}
                {onOpenCondFormat && (
                  <>
                    <div className="h-px bg-slate-700 my-1" />
                    <button
                      onClick={() => { setActiveDropdown(null); onOpenCondFormat() }}
                      className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs text-indigo-400 hover:bg-slate-700 hover:text-indigo-300 transition-colors"
                    >
                      詳細な条件付き書式...
                    </button>
                  </>
                )}
              </div>
            </DropdownBtn>

            {/* Conditional format value dialog */}
            {activeDropdown === 'condFormatDialog' && range && (
              <DropdownBtn
                trigger={<span />}
                open={true}
                onToggle={() => setActiveDropdown(null)}
              >
                <div className="p-3 w-64">
                  <div className="text-xs text-slate-300 mb-2 font-medium">
                    {COND_RULES.find((r) => r.value === condRule)?.label}
                  </div>
                  {condRule !== 'isEmpty' && condRule !== 'isNotEmpty' && (
                    <input
                      autoFocus
                      type="text"
                      value={condValue}
                      onChange={(e) => setCondValue(e.target.value)}
                      placeholder="値を入力"
                      className="w-full h-7 bg-slate-700 border border-slate-600 rounded text-xs text-white px-2 mb-2 outline-none focus:border-indigo-500"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const cf: ConditionalFormat = {
                            id: generateId(),
                            range: { startRow: range.startRow, startCol: range.startCol, endRow: range.endRow, endCol: range.endCol },
                            rule: condRule,
                            values: [condValue],
                            style: { bgColor: condColor },
                          }
                          dispatch({ type: 'ADD_CONDITIONAL_FORMAT', sheetId: activeSheet.id, format: cf })
                          setActiveDropdown(null)
                          setCondValue('')
                        }
                      }}
                    />
                  )}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-slate-400">書式の色:</span>
                    <div className="flex gap-1">
                      {['#22c55e', '#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6'].map((c) => (
                        <button
                          key={c}
                          onClick={() => setCondColor(c)}
                          className={`w-5 h-5 rounded-full transition-transform ${condColor === c ? 'ring-2 ring-white scale-110' : 'hover:scale-110'}`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                      <input
                        type="color"
                        value={condColor}
                        onChange={(e) => setCondColor(e.target.value)}
                        className="w-5 h-5 bg-transparent border-none cursor-pointer"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setActiveDropdown(null)
                        setCondValue('')
                      }}
                      className="flex-1 h-7 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-xs transition-colors"
                    >
                      キャンセル
                    </button>
                    <button
                      onClick={() => {
                        const cf: ConditionalFormat = {
                          id: generateId(),
                          range: { startRow: range.startRow, startCol: range.startCol, endRow: range.endRow, endCol: range.endCol },
                          rule: condRule,
                          values: condRule === 'isEmpty' || condRule === 'isNotEmpty' ? [] : [condValue],
                          style: { bgColor: condColor },
                        }
                        dispatch({ type: 'ADD_CONDITIONAL_FORMAT', sheetId: activeSheet.id, format: cf })
                        setActiveDropdown(null)
                        setCondValue('')
                      }}
                      className="flex-1 h-7 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs transition-colors"
                    >
                      適用
                    </button>
                  </div>
                </div>
              </DropdownBtn>
            )}
          </div>
        </div>
      </div>
    )
  }

  function renderInsert() {
    return (
      <div className="flex items-end gap-1 overflow-x-auto flex-nowrap scrollbar-none">
        {/* Insert/Delete row/col */}
        <RibbonGroup label="行と列">
          {selectedCell && (
            <>
              <RibbonBtn
                icon={<Plus size={14} />}
                label="行挿入"
                onClick={() => dispatch({ type: 'INSERT_ROW', sheetId: activeSheet.id, atRow: selectedCell.row + 1 })}
                title="行を挿入"
              />
              <RibbonBtn
                icon={<Plus size={14} />}
                label="列挿入"
                onClick={() => dispatch({ type: 'INSERT_COL', sheetId: activeSheet.id, atCol: selectedCell.col + 1 })}
                title="列を挿入"
              />
              <RibbonBtn
                icon={<Minus size={14} />}
                label="行削除"
                onClick={() => dispatch({ type: 'DELETE_ROW', sheetId: activeSheet.id, row: selectedCell.row })}
                variant="danger"
                title="行を削除"
              />
              <RibbonBtn
                icon={<Minus size={14} />}
                label="列削除"
                onClick={() => dispatch({ type: 'DELETE_COL', sheetId: activeSheet.id, col: selectedCell.col })}
                variant="danger"
                title="列を削除"
              />
            </>
          )}
        </RibbonGroup>

        <Separator />

        {/* Chart & Pivot */}
        <RibbonGroup label="グラフ">
          <RibbonBtn icon={<BarChart3 size={15} />} label="グラフ" onClick={onOpenChartPanel} title="グラフ作成" />
          {onOpenPivot && (
            <RibbonBtn icon={<Filter size={15} />} label="ピボット" onClick={onOpenPivot} title="ピボットテーブル" />
          )}
        </RibbonGroup>

        <Separator />

        {/* Function insert */}
        <RibbonGroup label="関数">
          <DropdownBtn
            trigger={
              <button
                className="flex flex-col items-center justify-center gap-0.5 px-1.5 py-1 rounded transition-colors min-w-[32px] text-slate-400 hover:bg-slate-700 hover:text-white"
                onClick={() => toggleDropdown('functions')}
                title="関数を挿入"
              >
                <FunctionSquare size={15} />
                <span className="text-[9px] leading-none max-md:hidden">関数</span>
              </button>
            }
            open={activeDropdown === 'functions'}
            onToggle={() => toggleDropdown('functions')}
          >
            <div className="w-72 max-h-80 flex flex-col">
              <div className="flex flex-wrap gap-0.5 p-1.5 border-b border-slate-700">
                {FUNCTION_CATEGORIES.map((cat) => (
                  <button
                    key={cat.name}
                    onClick={() => setFunctionCategory(cat.name)}
                    className={`px-2 py-0.5 rounded text-[10px] transition-colors ${
                      functionCategory === cat.name
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-400 hover:text-white hover:bg-slate-700'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
              <div className="overflow-y-auto flex-1 py-1">
                {FUNCTION_CATEGORIES.find((c) => c.name === functionCategory)?.functions.map((fn) => (
                  <button
                    key={fn.name}
                    onClick={() => {
                      onInsertFunction?.(fn.name, fn.template)
                      setActiveDropdown(null)
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-slate-700 transition-colors group"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-indigo-400 font-mono font-semibold group-hover:text-indigo-300">{fn.name}</span>
                      <span className="text-[10px] text-slate-500 group-hover:text-slate-400">{fn.desc}</span>
                    </div>
                    <div className="text-[10px] text-slate-600 font-mono mt-0.5 group-hover:text-slate-500">{fn.template}</div>
                  </button>
                ))}
              </div>
            </div>
          </DropdownBtn>
        </RibbonGroup>

        <Separator />

        {/* Fill down / Fill right */}
        <RibbonGroup label="オートフィル">
          {range && (
            <>
              <RibbonBtn
                icon={<ArrowDown size={14} />}
                label="下へ"
                onClick={() => {
                  if (range.endRow > range.startRow) {
                    dispatch({
                      type: 'FILL_DOWN',
                      sheetId: activeSheet.id,
                      startRow: range.startRow,
                      startCol: range.startCol,
                      endRow: range.endRow,
                      endCol: range.endCol,
                    })
                  }
                }}
                title="下方向へコピー (Ctrl+D)"
              />
              <RibbonBtn
                icon={<ArrowRight size={14} />}
                label="右へ"
                onClick={() => {
                  if (range.endCol > range.startCol) {
                    dispatch({
                      type: 'FILL_RIGHT',
                      sheetId: activeSheet.id,
                      startRow: range.startRow,
                      startCol: range.startCol,
                      endRow: range.endRow,
                      endCol: range.endCol,
                    })
                  }
                }}
                title="右方向へコピー (Ctrl+R)"
              />
            </>
          )}
        </RibbonGroup>

        <Separator />

        {/* Hyperlink */}
        <RibbonGroup label="リンク">
          <RibbonBtn icon={<LinkIcon size={15} />} label="リンク" onClick={() => {
            if (!selectedCell) return
            const url = prompt('URL を入力')
            if (!url) return
            const label = prompt('表示テキスト（空欄でURL表示）')
            dispatch({ type: 'SET_CELL_HYPERLINK', sheetId: activeSheet.id, row: selectedCell.row, col: selectedCell.col, url, label: label || undefined })
          }} title="ハイパーリンク挿入" />
        </RibbonGroup>
      </div>
    )
  }

  function renderData() {
    return (
      <div className="flex items-end gap-1 overflow-x-auto flex-nowrap scrollbar-none">
        {/* Sort */}
        <RibbonGroup label="並べ替え">
          {selectedCell && (
            <>
              <RibbonBtn
                icon={<ArrowUpAZ size={14} />}
                label="A→Z"
                onClick={() => dispatch({ type: 'SORT_SHEET', sheetId: activeSheet.id, col: selectedCell.col, direction: 'asc' })}
                title="昇順ソート (A→Z)"
              />
              <RibbonBtn
                icon={<ArrowDownAZ size={14} />}
                label="Z→A"
                onClick={() => dispatch({ type: 'SORT_SHEET', sheetId: activeSheet.id, col: selectedCell.col, direction: 'desc' })}
                title="降順ソート (Z→A)"
              />
            </>
          )}
          {onSort && (
            <RibbonBtn icon={<ArrowUpDown size={15} />} label="詳細" onClick={onSort} title="並べ替え（詳細）" />
          )}
        </RibbonGroup>

        <Separator />

        {/* Filter */}
        <RibbonGroup label="フィルター">
          <RibbonBtn
            icon={<Filter size={14} />}
            label="フィルター"
            active={!!(activeSheet.filterState && activeSheet.filterState.length > 0)}
            onClick={() => {
              if (activeSheet.filterState && activeSheet.filterState.length > 0) {
                dispatch({ type: 'CLEAR_FILTERS', sheetId: activeSheet.id })
              } else if (selectedCell) {
                dispatch({ type: 'SET_FILTER', sheetId: activeSheet.id, col: selectedCell.col, values: [] })
              }
            }}
            title="オートフィルター"
          />
        </RibbonGroup>

        <Separator />

        {/* Data validation */}
        <RibbonGroup label="データツール">
          {onDataValidation && (
            <RibbonBtn icon={<ShieldCheck size={15} />} label="入力規則" onClick={onDataValidation} title="データ入力規則" />
          )}
          {onRemoveDuplicates && (
            <RibbonBtn icon={<ListX size={15} />} label="重複削除" onClick={onRemoveDuplicates} title="重複の削除" />
          )}
          {onOpenNamedRanges && (
            <RibbonBtn icon={<Eye size={15} />} label="名前付き範囲" onClick={onOpenNamedRanges} title="名前付き範囲の管理" />
          )}
        </RibbonGroup>

        <Separator />

        {/* Flash Fill */}
        <Separator />
        <RibbonGroup label="フラッシュフィル">
          <RibbonBtn
            icon={<Zap size={15} />}
            label="フラッシュフィル"
            onClick={() => onFlashFill?.()}
            title="フラッシュフィル (Ctrl+E)"
          />
        </RibbonGroup>

        <Separator />

        {/* CSV Import */}
        <RibbonGroup label="インポート">
          <RibbonBtn
            icon={<Upload size={15} />}
            label="CSV読込"
            onClick={() => csvInputRef.current?.click()}
            title="CSVファイルを読み込み"
          />
          <input
            ref={csvInputRef}
            type="file"
            accept=".csv,.tsv,.txt"
            onChange={handleCsvFileChange}
            className="hidden"
          />
        </RibbonGroup>

        <Separator />

        {/* Data Connection */}
        {onDataConnection && (
          <RibbonGroup label="外部データ">
            <RibbonBtn icon={<Database size={15} />} label="データ接続" onClick={onDataConnection} title="外部CSVデータを取得" />
          </RibbonGroup>
        )}

        <Separator />

        {/* Print Range */}
        {onPrintRange && (
          <RibbonGroup label="印刷範囲">
            <RibbonBtn icon={<Printer size={15} />} label="印刷範囲" onClick={onPrintRange} title="印刷範囲の設定" />
          </RibbonGroup>
        )}

        <Separator />

        {/* Find/Replace & Go To */}
        <RibbonGroup label="検索">
          {onFindReplace && (
            <RibbonBtn icon={<Search size={15} />} label="検索・置換" onClick={onFindReplace} title="検索・置換 (Ctrl+F)" />
          )}
          {onGoToCell && (
            <RibbonBtn icon={<Eye size={15} />} label="セル移動" onClick={onGoToCell} title="セルに移動 (Ctrl+G)" />
          )}
        </RibbonGroup>
      </div>
    )
  }

  function renderView() {
    return (
      <div className="flex items-end gap-1 overflow-x-auto flex-nowrap scrollbar-none">
        {/* Show formulas */}
        <RibbonGroup label="数式">
          {onToggleFormulas && (
            <RibbonBtn
              icon={<Code size={15} />}
              label="数式表示"
              onClick={onToggleFormulas}
              active={showFormulas}
              title="数式表示モード (Ctrl+`)"
            />
          )}
        </RibbonGroup>

        <Separator />

        {/* Freeze panes */}
        <RibbonGroup label="固定">
          <DropdownBtn
            trigger={
              <button
                className={`flex flex-col items-center justify-center gap-0.5 px-1.5 py-1 rounded transition-colors min-w-[32px] ${
                  isFrozen
                    ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/50'
                    : 'text-slate-400 hover:bg-slate-700 hover:text-white'
                }`}
                onClick={() => toggleDropdown('freezePanes')}
                title="固定"
              >
                <Snowflake size={15} />
                <span className="text-[9px] leading-none max-md:hidden">固定</span>
              </button>
            }
            open={activeDropdown === 'freezePanes'}
            onToggle={() => toggleDropdown('freezePanes')}
          >
            <div className="py-1 w-44">
              <button
                onClick={() => {
                  if (selectedCell) {
                    dispatch({
                      type: 'SET_FREEZE',
                      sheetId: activeSheet.id,
                      frozenRows: selectedCell.row,
                      frozenCols: selectedCell.col,
                    })
                  }
                  setActiveDropdown(null)
                }}
                disabled={!selectedCell}
                className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700 hover:text-white disabled:text-slate-600 disabled:cursor-not-allowed transition-colors"
              >
                ウィンドウ枠の固定
                {selectedCell && (
                  <span className="text-slate-500 ml-1">({selectedCell.row}行{selectedCell.col}列)</span>
                )}
              </button>
              <button
                onClick={() => {
                  if (selectedCell) {
                    dispatch({
                      type: 'SET_FREEZE',
                      sheetId: activeSheet.id,
                      frozenRows: selectedCell.row + 1,
                      frozenCols: activeSheet.frozenCols ?? 0,
                    })
                  }
                  setActiveDropdown(null)
                }}
                disabled={!selectedCell}
                className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700 hover:text-white disabled:text-slate-600 disabled:cursor-not-allowed transition-colors"
              >
                行を固定
                {selectedCell && (
                  <span className="text-slate-500 ml-1">(行 {selectedCell.row + 1} まで)</span>
                )}
              </button>
              <button
                onClick={() => {
                  if (selectedCell) {
                    dispatch({
                      type: 'SET_FREEZE',
                      sheetId: activeSheet.id,
                      frozenRows: activeSheet.frozenRows ?? 0,
                      frozenCols: selectedCell.col + 1,
                    })
                  }
                  setActiveDropdown(null)
                }}
                disabled={!selectedCell}
                className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700 hover:text-white disabled:text-slate-600 disabled:cursor-not-allowed transition-colors"
              >
                列を固定
                {selectedCell && (
                  <span className="text-slate-500 ml-1">(列 {String.fromCharCode(65 + (selectedCell.col % 26))} まで)</span>
                )}
              </button>
              {isFrozen && (
                <>
                  <div className="h-px bg-slate-700 my-1" />
                  <button
                    onClick={() => {
                      dispatch({ type: 'SET_FREEZE', sheetId: activeSheet.id, frozenRows: 0, frozenCols: 0 })
                      setActiveDropdown(null)
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs text-red-400 hover:bg-slate-700 hover:text-red-300 transition-colors"
                  >
                    固定解除
                  </button>
                </>
              )}
            </div>
          </DropdownBtn>
        </RibbonGroup>

        <Separator />

        {/* Zoom */}
        <RibbonGroup label="ズーム">
          {onZoomOut && <RibbonBtn icon={<ZoomOut size={15} />} label="縮小" onClick={onZoomOut} title="縮小" />}
          <span className="text-xs text-slate-400 px-1">{zoom || 100}%</span>
          {onZoomIn && <RibbonBtn icon={<ZoomIn size={15} />} label="拡大" onClick={onZoomIn} title="拡大" />}
        </RibbonGroup>

        <Separator />

        {/* Conditional formatting */}
        <RibbonGroup label="条件付き書式">
          <DropdownBtn
            trigger={
              <button
                className="flex flex-col items-center justify-center gap-0.5 px-1.5 py-1 rounded transition-colors min-w-[32px] text-slate-400 hover:bg-slate-700 hover:text-white"
                onClick={() => toggleDropdown('condFormat')}
                title="条件付き書式"
              >
                <span className="w-3.5 h-3.5 rounded-sm bg-gradient-to-r from-red-500 to-green-500 inline-block" />
                <span className="text-[9px] leading-none max-md:hidden">条件付き書式</span>
              </button>
            }
            open={activeDropdown === 'condFormat'}
            onToggle={() => toggleDropdown('condFormat')}
          >
            {range && (
              <div className="p-3 w-64">
                <div className="text-xs text-slate-300 mb-2 font-medium">条件付き書式を追加</div>
                <select
                  value={condRule}
                  onChange={(e) => setCondRule(e.target.value as ConditionalFormat['rule'])}
                  className="w-full h-7 bg-slate-700 border border-slate-600 rounded text-xs text-white px-2 mb-2 outline-none"
                >
                  {COND_RULES.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
                {condRule !== 'isEmpty' && condRule !== 'isNotEmpty' && (
                  <input
                    type="text"
                    value={condValue}
                    onChange={(e) => setCondValue(e.target.value)}
                    placeholder="値"
                    className="w-full h-7 bg-slate-700 border border-slate-600 rounded text-xs text-white px-2 mb-2 outline-none"
                  />
                )}
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-slate-400">色:</span>
                  <input
                    type="color"
                    value={condColor}
                    onChange={(e) => setCondColor(e.target.value)}
                    className="w-8 h-6 bg-transparent border-none cursor-pointer"
                  />
                </div>
                <button
                  onClick={() => {
                    const cf: ConditionalFormat = {
                      id: generateId(),
                      range: {
                        startRow: range.startRow,
                        startCol: range.startCol,
                        endRow: range.endRow,
                        endCol: range.endCol,
                      },
                      rule: condRule,
                      values: condRule === 'isEmpty' || condRule === 'isNotEmpty' ? [] : [condValue],
                      style: { bgColor: condColor },
                    }
                    dispatch({ type: 'ADD_CONDITIONAL_FORMAT', sheetId: activeSheet.id, format: cf })
                    setActiveDropdown(null)
                    setCondValue('')
                  }}
                  className="w-full h-7 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs transition-colors"
                >
                  適用
                </button>
                {(activeSheet.conditionalFormats ?? []).length > 0 && (
                  <div className="mt-2 pt-2 border-t border-slate-700">
                    <div className="text-xs text-slate-400 mb-1">
                      設定済み ({(activeSheet.conditionalFormats ?? []).length})
                    </div>
                    {(activeSheet.conditionalFormats ?? []).map((cf) => (
                      <div key={cf.id} className="flex items-center justify-between text-xs text-slate-300 py-0.5">
                        <span className="flex items-center gap-1">
                          <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: cf.style.bgColor }} />
                          {COND_RULES.find((r) => r.value === cf.rule)?.label}
                          {cf.values[0] ? ` ${cf.values[0]}` : ''}
                        </span>
                        <button
                          onClick={() => dispatch({ type: 'DELETE_CONDITIONAL_FORMAT', sheetId: activeSheet.id, formatId: cf.id })}
                          className="text-red-400 hover:text-red-300"
                        >
                          x
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </DropdownBtn>
        </RibbonGroup>

        <Separator />

        {/* Print preview */}
        <RibbonGroup label="印刷">
          {onPrintPreview && (
            <RibbonBtn icon={<Printer size={15} />} label="プレビュー" onClick={onPrintPreview} title="印刷プレビュー" />
          )}
        </RibbonGroup>
      </div>
    )
  }

  function renderTools() {
    return (
      <div className="flex items-end gap-1 overflow-x-auto flex-nowrap scrollbar-none">
        {/* AI */}
        <RibbonGroup label="AI">
          {onAiFormula && (
            <RibbonBtn icon={<Sparkles size={15} />} label="AI数式" onClick={onAiFormula} variant="accent" title="AI数式アシスタント" />
          )}
        </RibbonGroup>

        <Separator />

        {/* Import */}
        <RibbonGroup label="インポート">
          {onPdfImport && (
            <RibbonBtn icon={<FileDown size={15} />} label="PDF取込" onClick={onPdfImport} title="PDF読み込み + AI処理" />
          )}
        </RibbonGroup>

        <Separator />

        {/* Shortcuts */}
        <RibbonGroup label="ヘルプ">
          <RibbonBtn
            icon={<Keyboard size={15} />}
            label="ショートカット"
            onClick={() => onShowShortcutsHelp?.() || onShortcuts?.()}
            title="キーボードショートカット (Ctrl+/)"
          />
          <RibbonBtn
            icon={<HelpCircle size={15} />}
            label="ヘルプ"
            onClick={() => onShowShortcutsHelp?.()}
            title="ヘルプ"
          />
        </RibbonGroup>
      </div>
    )
  }

  function renderFile() {
    return (
      <div className="flex items-end gap-1 overflow-x-auto flex-nowrap scrollbar-none">
        {/* Export */}
        <RibbonGroup label="エクスポート">
          <RibbonBtn
            icon={<Download size={15} />}
            label="CSV"
            onClick={() => {
              const csv = exportSheetToCSV(activeSheet)
              downloadCSV(csv, `${title || 'export'}.csv`)
            }}
            title="CSV (.csv)"
          />
          <RibbonBtn
            icon={<FileSpreadsheet size={15} />}
            label="XLSX"
            onClick={() => {
              const sheets = allSheets || [activeSheet]
              downloadXLSX(sheets, `${title || 'export'}.xlsx`)
            }}
            title="Excel (.xlsx)"
          />
          {onExportHTML && <RibbonBtn icon={<FileDown size={15} />} label="HTML" onClick={onExportHTML} title="HTML (.html)" />}
          {onExportPDF && <RibbonBtn icon={<FileDown size={15} />} label="PDF" onClick={onExportPDF} title="PDF (.pdf)" />}
        </RibbonGroup>

        <Separator />

        {/* Import */}
        <RibbonGroup label="インポート">
          {onImportCSV && <RibbonBtn icon={<Upload size={15} />} label="CSV読込" onClick={onImportCSV} title="CSVインポート" />}
        </RibbonGroup>

        <Separator />

        {/* Version */}
        <RibbonGroup label="バージョン">
          {onSaveVersion && <RibbonBtn icon={<Save size={15} />} label="保存" onClick={onSaveVersion} title="バージョンを保存" />}
          {onVersionHistory && <RibbonBtn icon={<Clock size={15} />} label="自動履歴" onClick={onVersionHistory} title="自動バージョン履歴" />}
        </RibbonGroup>

        <Separator />

        {/* Delete */}
        <RibbonGroup label="削除">
          {onDelete && <RibbonBtn icon={<Trash2 size={15} />} label="削除" onClick={onDelete} variant="danger" title="削除" />}
        </RibbonGroup>
      </div>
    )
  }

  const tabContent: Record<TabKey, () => React.ReactNode> = {
    home: renderHome,
    insert: renderInsert,
    data: renderData,
    view: renderView,
    tools: renderTools,
    file: renderFile,
  }

  return (
    <div ref={ribbonRef} className="sticky top-0 z-10 bg-slate-950 border-b border-slate-800 no-print select-none">
      {/* ===== Title bar ===== */}
      <div className="flex items-center gap-2 px-4 py-1.5 border-b border-slate-800/50 max-md:px-2">
        <button
          onClick={() => router.push('/dashboard')}
          className="text-slate-400 hover:text-white transition-colors text-sm flex items-center gap-1 flex-shrink-0"
          title="ダッシュボードに戻る"
        >
          <ArrowLeft size={14} />
          <span className="max-md:hidden">戻る</span>
        </button>

        <div className="w-px h-5 bg-slate-800 flex-shrink-0" />

        <input
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          className="flex-1 bg-transparent text-white text-sm font-medium placeholder-slate-500 focus:outline-none min-w-0"
          placeholder="無題のスプレッドシート"
        />

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className={`text-xs hidden lg:block transition-colors ${
            saveStatus === 'saving' ? 'text-yellow-400' : 'text-green-400'
          }`}>
            {saveStatus === 'saving' ? '保存中...' : '保存済み'}
          </span>

          {docId && <PresenceAvatars documentId={docId} />}
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

      {/* ===== Floating format popup ===== */}
      {renderFormatPopup()}

      {/* ===== Name Box (below ribbon) ===== */}
      {onNavigateToCell && (
        <div className="flex items-center gap-1 px-3 py-0.5 border-t border-slate-800/50 bg-slate-950/50">
          <input
            type="text"
            value={nameBoxValue}
            onChange={(e) => {
              setNameBoxValue(e.target.value.toUpperCase())
              setNameBoxEditing(true)
            }}
            onFocus={() => setNameBoxEditing(true)}
            onBlur={() => {
              setNameBoxEditing(false)
              handleNameBoxSubmit()
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleNameBoxSubmit()
                ;(e.target as HTMLInputElement).blur()
              }
              if (e.key === 'Escape') {
                setNameBoxEditing(false)
                ;(e.target as HTMLInputElement).blur()
              }
            }}
            className="w-16 h-5 bg-slate-800 border border-slate-700 rounded text-center text-[10px] text-white outline-none focus:border-indigo-500 font-mono"
            title="セル参照を入力して移動（例: A1, Z100）"
          />
          <span className="text-[9px] text-slate-600 max-md:hidden">セル移動</span>
        </div>
      )}
    </div>
  )
}
