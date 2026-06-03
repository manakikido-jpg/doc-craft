'use client'

import { useState } from 'react'
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
} from 'lucide-react'

interface Props {
  activeSheet: Sheet
  selectedCell: { row: number; col: number } | null
  selectionRange: SelectionRange | null
  currentCellFormat?: CellFormat
  onFormatChange: (format: Partial<CellFormat>) => void
  dispatch: (action: UndoableAction<SpreadsheetAction>) => void
  onOpenChartPanel?: () => void
  onOpenPivot?: () => void
  onInsertFunction?: (funcName: string, template: string) => void
  formatPainterActive?: boolean
  onFormatPainterStart?: () => void
}

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

const BORDER_OPTIONS: { value: string; label: string }[] = [
  { value: 'none', label: 'なし' },
  { value: 'all', label: '全辺' },
  { value: 'outline', label: '外枠' },
  { value: 'top', label: '上' },
  { value: 'bottom', label: '下' },
  { value: 'left', label: '左' },
  { value: 'right', label: '右' },
]

const NUMBER_FORMATS: { value: CellFormat['numberFormat']; label: string }[] = [
  { value: 'plain', label: '標準' },
  { value: 'number', label: '数値 (1,234)' },
  { value: 'comma', label: '桁区切り (1,234.5)' },
  { value: 'percent', label: 'パーセント (%)' },
  { value: 'currency', label: '通貨 (¥)' },
  { value: 'accounting', label: '会計 (¥, 負数は括弧)' },
  { value: 'currencyUSD', label: '通貨 ($)' },
  { value: 'currencyEUR', label: '通貨 (€)' },
  { value: 'date', label: '日付 (yyyy/mm/dd)' },
  { value: 'time', label: '時刻' },
  { value: 'scientific', label: '指数' },
  { value: 'fraction', label: '分数' },
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
  template: string  // 関数選択時にセルに自動入力されるテンプレート
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

const BTN = 'w-7 h-7 flex items-center justify-center rounded text-xs transition-colors'
const BTN_DEFAULT = 'text-slate-400 hover:text-white hover:bg-slate-700'
const BTN_ACTIVE = 'bg-indigo-600 text-white'
const DIVIDER = 'w-px h-5 bg-slate-700 mx-1'

export default function SpreadsheetToolbar({
  activeSheet,
  selectedCell,
  selectionRange,
  currentCellFormat,
  onFormatChange,
  dispatch,
  onOpenChartPanel,
  onOpenPivot,
  onInsertFunction,
  formatPainterActive,
  onFormatPainterStart,
}: Props) {
  const [showFontFamily, setShowFontFamily] = useState(false)
  const [showTextColors, setShowTextColors] = useState(false)
  const [showBgColors, setShowBgColors] = useState(false)
  const [showNumberFormat, setShowNumberFormat] = useState(false)
  const [showBorders, setShowBorders] = useState(false)
  const [showCondFormat, setShowCondFormat] = useState(false)
  const [showFunctionPicker, setShowFunctionPicker] = useState(false)
  const [functionCategory, setFunctionCategory] = useState('数学')
  const [condRule, setCondRule] = useState<ConditionalFormat['rule']>('greaterThan')
  const [condValue, setCondValue] = useState('')
  const [condColor, setCondColor] = useState('#22c55e')

  const fmt = currentCellFormat || {}

  const closeAllDropdowns = () => {
    setShowFontFamily(false)
    setShowTextColors(false)
    setShowBgColors(false)
    setShowNumberFormat(false)
    setShowBorders(false)
    setShowCondFormat(false)
    setShowFunctionPicker(false)
  }

  const toggleDropdown = (setter: (v: boolean) => void, current: boolean) => {
    closeAllDropdowns()
    setter(!current)
  }

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

  const applyBorder = (type: string) => {
    const border = '1px solid #64748b'
    if (type === 'outline' && range && activeSheet) {
      // Outline: only apply borders on the outer edges of the selection
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
      setShowBorders(false)
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
    setShowBorders(false)
  }

  const isFrozen = !!(activeSheet.frozenRows || activeSheet.frozenCols)

  return (
    <div
      role="toolbar"
      aria-label="書式設定ツールバー"
      className="flex items-center gap-1 px-3 py-1.5 border-b border-slate-800 bg-slate-900 shrink-0 flex-wrap"
    >
      {/* ── Font family ── */}
      <div className="relative">
        <button
          onClick={() => toggleDropdown(setShowFontFamily, showFontFamily)}
          className={`h-7 px-2 flex items-center gap-1 rounded text-xs ${BTN_DEFAULT}`}
          title="フォント"
          aria-label="フォント"
        >
          <span className="max-w-[80px] truncate">
            {FONT_FAMILIES.find((f) => f.value === fmt.fontFamily)?.label || 'ゴシック'}
          </span>
          <ChevronDown size={10} />
        </button>
        {showFontFamily && (
          <>
            <div className="fixed inset-0 z-30" onClick={closeAllDropdowns} />
            <div className="absolute top-full left-0 mt-1 z-40 bg-slate-800 border border-slate-700 rounded-lg py-1 shadow-xl w-44">
              {FONT_FAMILIES.map((f) => (
                <button
                  key={f.value}
                  onClick={() => {
                    onFormatChange({ fontFamily: f.value })
                    closeAllDropdowns()
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
          </>
        )}
      </div>

      <div className={DIVIDER} />

      {/* ── Bold / Italic / Underline / Strikethrough ── */}
      <button
        onClick={() => onFormatChange({ bold: !fmt.bold })}
        className={`${BTN} ${fmt.bold ? BTN_ACTIVE : BTN_DEFAULT}`}
        title="太字 (Ctrl+B)"
        aria-label="太字"
      >
        <Bold size={14} />
      </button>
      <button
        onClick={() => onFormatChange({ italic: !fmt.italic })}
        className={`${BTN} ${fmt.italic ? BTN_ACTIVE : BTN_DEFAULT}`}
        title="斜体 (Ctrl+I)"
        aria-label="斜体"
      >
        <Italic size={14} />
      </button>
      <button
        onClick={() => onFormatChange({ underline: !fmt.underline })}
        className={`${BTN} ${fmt.underline ? BTN_ACTIVE : BTN_DEFAULT}`}
        title="下線 (Ctrl+U)"
        aria-label="下線"
      >
        <UnderlineIcon size={14} />
      </button>
      <button
        onClick={() => onFormatChange({ strikethrough: !fmt.strikethrough })}
        className={`${BTN} ${fmt.strikethrough ? BTN_ACTIVE : BTN_DEFAULT}`}
        title="取り消し線"
        aria-label="取り消し線"
      >
        <Strikethrough size={14} />
      </button>

      <div className={DIVIDER} />

      {/* ── Font size ── */}
      <div className="flex items-center gap-0.5">
        <button
          onClick={() => onFormatChange({ fontSize: Math.max(6, (fmt.fontSize || 12) - 1) })}
          className={`${BTN} ${BTN_DEFAULT}`}
          title="フォントサイズを小さく"
          aria-label="フォントサイズを小さく"
        >
          <ChevronDown size={12} />
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
          className="w-10 h-7 bg-slate-800 border border-slate-700 rounded text-center text-xs text-white outline-none focus:border-indigo-500"
          title="フォントサイズ"
          aria-label="フォントサイズ"
        />
        <button
          onClick={() => onFormatChange({ fontSize: Math.min(72, (fmt.fontSize || 12) + 1) })}
          className={`${BTN} ${BTN_DEFAULT}`}
          title="フォントサイズを大きく"
          aria-label="フォントサイズを大きく"
        >
          <ChevronUp size={12} />
        </button>
      </div>

      <div className={DIVIDER} />

      {/* ── Text color ── */}
      <div className="relative">
        <button
          onClick={() => toggleDropdown(setShowTextColors, showTextColors)}
          className={`${BTN} ${BTN_DEFAULT}`}
          title="文字色"
          aria-label="文字色"
        >
          <Type size={14} />
          <div
            className="absolute bottom-0.5 left-1 right-1 h-0.5 rounded"
            style={{ backgroundColor: fmt.textColor || '#ffffff' }}
          />
        </button>
        {showTextColors && (
          <>
            <div className="fixed inset-0 z-30" onClick={closeAllDropdowns} />
            <div className="absolute top-full left-0 mt-1 z-40 bg-slate-800 border border-slate-700 rounded-lg p-2 shadow-xl w-[220px]">
              <div className="text-[10px] text-slate-400 mb-1.5 font-medium">文字色</div>
              <div className="flex flex-col gap-0.5">
                {COLOR_ROWS.map((row) => (
                  <div key={row.label} className="grid grid-cols-8 gap-0.5">
                    {row.colors.map((color) => (
                      <button
                        key={color}
                        onClick={() => {
                          onFormatChange({ textColor: color })
                          closeAllDropdowns()
                        }}
                        className={`w-6 h-6 rounded transition-transform hover:scale-125 ${
                          fmt.textColor === color ? 'ring-2 ring-indigo-400 ring-offset-1 ring-offset-slate-800' : 'border border-slate-600'
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
                  value={fmt.textColor || '#ffffff'}
                  onChange={(e) => {
                    onFormatChange({ textColor: e.target.value })
                  }}
                  className="w-6 h-6 bg-transparent border-none cursor-pointer"
                />
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Bg color ── */}
      <div className="relative">
        <button
          onClick={() => toggleDropdown(setShowBgColors, showBgColors)}
          className={`${BTN} ${BTN_DEFAULT}`}
          title="背景色"
          aria-label="背景色"
        >
          <Paintbrush size={14} />
          <div
            className="absolute bottom-0.5 left-1 right-1 h-0.5 rounded"
            style={{ backgroundColor: fmt.bgColor || 'transparent' }}
          />
        </button>
        {showBgColors && (
          <>
            <div className="fixed inset-0 z-30" onClick={closeAllDropdowns} />
            <div className="absolute top-full left-0 mt-1 z-40 bg-slate-800 border border-slate-700 rounded-lg p-2 shadow-xl w-[220px]">
              <div className="text-[10px] text-slate-400 mb-1.5 font-medium">背景色</div>
              <button
                onClick={() => {
                  onFormatChange({ bgColor: undefined })
                  closeAllDropdowns()
                }}
                className={`w-full text-left px-2 py-1 mb-1 rounded text-[10px] transition-colors ${
                  !fmt.bgColor ? 'text-indigo-400 bg-slate-700' : 'text-slate-400 hover:bg-slate-700 hover:text-white'
                }`}
              >
                なし（透明）
              </button>
              <div className="flex flex-col gap-0.5">
                {COLOR_ROWS.map((row) => (
                  <div key={row.label} className="grid grid-cols-8 gap-0.5">
                    {row.colors.map((color) => (
                      <button
                        key={color}
                        onClick={() => {
                          onFormatChange({ bgColor: color })
                          closeAllDropdowns()
                        }}
                        className={`w-6 h-6 rounded transition-transform hover:scale-125 ${
                          fmt.bgColor === color ? 'ring-2 ring-indigo-400 ring-offset-1 ring-offset-slate-800' : 'border border-slate-600'
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
                  value={fmt.bgColor || '#000000'}
                  onChange={(e) => {
                    onFormatChange({ bgColor: e.target.value })
                  }}
                  className="w-6 h-6 bg-transparent border-none cursor-pointer"
                />
              </div>
            </div>
          </>
        )}
      </div>

      <div className={DIVIDER} />

      {/* ── Horizontal alignment ── */}
      <button
        onClick={() => onFormatChange({ align: 'left' })}
        className={`${BTN} ${!fmt.align || fmt.align === 'left' ? 'bg-slate-700 text-white' : BTN_DEFAULT}`}
        title="左揃え"
        aria-label="左揃え"
      >
        <AlignLeft size={14} />
      </button>
      <button
        onClick={() => onFormatChange({ align: 'center' })}
        className={`${BTN} ${fmt.align === 'center' ? 'bg-slate-700 text-white' : BTN_DEFAULT}`}
        title="中央揃え"
        aria-label="中央揃え"
      >
        <AlignCenter size={14} />
      </button>
      <button
        onClick={() => onFormatChange({ align: 'right' })}
        className={`${BTN} ${fmt.align === 'right' ? 'bg-slate-700 text-white' : BTN_DEFAULT}`}
        title="右揃え"
        aria-label="右揃え"
      >
        <AlignRight size={14} />
      </button>

      <div className={DIVIDER} />

      {/* ── Vertical alignment ── */}
      <button
        onClick={() => onFormatChange({ verticalAlign: 'top' })}
        className={`${BTN} ${fmt.verticalAlign === 'top' ? 'bg-slate-700 text-white' : BTN_DEFAULT}`}
        title="上揃え"
        aria-label="上揃え"
      >
        <AlignVerticalJustifyStart size={14} />
      </button>
      <button
        onClick={() => onFormatChange({ verticalAlign: 'middle' })}
        className={`${BTN} ${!fmt.verticalAlign || fmt.verticalAlign === 'middle' ? 'bg-slate-700 text-white' : BTN_DEFAULT}`}
        title="中央揃え（垂直）"
        aria-label="中央揃え（垂直）"
      >
        <AlignVerticalJustifyCenter size={14} />
      </button>
      <button
        onClick={() => onFormatChange({ verticalAlign: 'bottom' })}
        className={`${BTN} ${fmt.verticalAlign === 'bottom' ? 'bg-slate-700 text-white' : BTN_DEFAULT}`}
        title="下揃え"
        aria-label="下揃え"
      >
        <AlignVerticalJustifyEnd size={14} />
      </button>

      <div className={DIVIDER} />

      {/* ── Text wrap ── */}
      <button
        onClick={() => onFormatChange({ wrap: !fmt.wrap })}
        className={`${BTN} ${fmt.wrap ? BTN_ACTIVE : BTN_DEFAULT}`}
        title="テキスト折り返し"
        aria-label="テキスト折り返し"
      >
        <WrapText size={14} />
      </button>

      <div className={DIVIDER} />

      {/* ── Cell borders ── */}
      <div className="relative">
        <button
          onClick={() => toggleDropdown(setShowBorders, showBorders)}
          className={`h-7 px-2 flex items-center gap-1 rounded text-xs ${BTN_DEFAULT}`}
          title="罫線"
          aria-label="罫線"
        >
          <span className="border border-slate-400 w-3.5 h-3.5 inline-block" />
        </button>
        {showBorders && (
          <>
            <div className="fixed inset-0 z-30" onClick={closeAllDropdowns} />
            <div className="absolute top-full left-0 mt-1 z-40 bg-slate-800 border border-slate-700 rounded-lg py-1 shadow-xl w-28">
              {BORDER_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => applyBorder(opt.value)}
                  className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700 hover:text-white"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <div className={DIVIDER} />

      {/* ── Merge ── */}
      {selectionRange &&
        (selectionRange.endRow > selectionRange.startRow || selectionRange.endCol > selectionRange.startCol) && (
          <button
            onClick={() => {
              dispatch({
                type: 'MERGE_CELLS',
                sheetId: activeSheet.id,
                startRow: selectionRange.startRow,
                startCol: selectionRange.startCol,
                endRow: selectionRange.endRow,
                endCol: selectionRange.endCol,
              })
            }}
            className={`${BTN} ${BTN_DEFAULT}`}
            title="セル結合"
            aria-label="セル結合"
          >
            <Merge size={14} />
          </button>
        )}
      {selectedCell &&
        activeSheet.mergedCells.some((m) => m.startRow === selectedCell.row && m.startCol === selectedCell.col) && (
          <button
            onClick={() => {
              dispatch({
                type: 'UNMERGE_CELLS',
                sheetId: activeSheet.id,
                startRow: selectedCell.row,
                startCol: selectedCell.col,
              })
            }}
            className={`${BTN} ${BTN_DEFAULT}`}
            title="結合解除"
            aria-label="結合解除"
          >
            <SplitSquareHorizontal size={14} />
          </button>
        )}

      <div className={DIVIDER} />

      {/* ── Insert/Delete row/col ── */}
      {selectedCell && (
        <>
          <button
            onClick={() => dispatch({ type: 'INSERT_ROW', sheetId: activeSheet.id, atRow: selectedCell.row + 1 })}
            className={`h-7 px-2 flex items-center gap-1 rounded text-xs ${BTN_DEFAULT}`}
            title="行を挿入"
            aria-label="行を挿入"
          >
            <Plus size={12} /> 行
          </button>
          <button
            onClick={() => dispatch({ type: 'INSERT_COL', sheetId: activeSheet.id, atCol: selectedCell.col + 1 })}
            className={`h-7 px-2 flex items-center gap-1 rounded text-xs ${BTN_DEFAULT}`}
            title="列を挿入"
            aria-label="列を挿入"
          >
            <Plus size={12} /> 列
          </button>
          <button
            onClick={() => dispatch({ type: 'DELETE_ROW', sheetId: activeSheet.id, row: selectedCell.row })}
            className="h-7 px-2 flex items-center gap-1 rounded text-xs text-slate-400 hover:text-red-400 hover:bg-slate-700 transition-colors"
            title="行を削除"
            aria-label="行を削除"
          >
            <Minus size={12} /> 行
          </button>
          <button
            onClick={() => dispatch({ type: 'DELETE_COL', sheetId: activeSheet.id, col: selectedCell.col })}
            className="h-7 px-2 flex items-center gap-1 rounded text-xs text-slate-400 hover:text-red-400 hover:bg-slate-700 transition-colors"
            title="列を削除"
            aria-label="列を削除"
          >
            <Minus size={12} /> 列
          </button>
        </>
      )}

      <div className={DIVIDER} />

      {/* ── Number format ── */}
      <div className="relative">
        <button
          onClick={() => toggleDropdown(setShowNumberFormat, showNumberFormat)}
          className={`h-7 px-2 flex items-center gap-1 rounded text-xs ${BTN_DEFAULT}`}
          title="数値フォーマット"
          aria-label="数値フォーマット"
        >
          {fmt.numberFormat === 'number'
            ? '1,234'
            : fmt.numberFormat === 'percent'
              ? '%'
              : fmt.numberFormat === 'currency'
                ? '¥'
                : fmt.numberFormat === 'date'
                  ? '日付'
                  : fmt.numberFormat === 'time'
                    ? '時刻'
                    : fmt.numberFormat === 'scientific'
                      ? '指数'
                      : fmt.numberFormat === 'fraction'
                        ? '分数'
                        : '標準'}
        </button>
        {showNumberFormat && (
          <>
            <div className="fixed inset-0 z-30" onClick={closeAllDropdowns} />
            <div className="absolute top-full left-0 mt-1 z-40 bg-slate-800 border border-slate-700 rounded-lg py-1 shadow-xl w-40">
              {NUMBER_FORMATS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => {
                    onFormatChange({ numberFormat: value })
                    closeAllDropdowns()
                  }}
                  className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
                    fmt.numberFormat === value
                      ? 'text-indigo-400 bg-slate-700'
                      : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Function picker ── */}
      <div className="relative">
        <button
          onClick={() => toggleDropdown(setShowFunctionPicker, showFunctionPicker)}
          className={`h-7 px-2 flex items-center gap-1 rounded text-xs ${BTN_DEFAULT}`}
          title="関数を挿入"
          aria-label="関数を挿入"
        >
          <FunctionSquare size={14} />
          <span className="hidden sm:inline">関数</span>
        </button>
        {showFunctionPicker && (
          <>
            <div className="fixed inset-0 z-30" onClick={closeAllDropdowns} />
            <div className="absolute top-full left-0 mt-1 z-40 bg-slate-800 border border-slate-700 rounded-lg shadow-xl w-72 max-h-80 flex flex-col">
              {/* Category tabs */}
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
              {/* Function list */}
              <div className="overflow-y-auto flex-1 py-1">
                {FUNCTION_CATEGORIES.find((c) => c.name === functionCategory)?.functions.map((fn) => (
                  <button
                    key={fn.name}
                    onClick={() => {
                      onInsertFunction?.(fn.name, fn.template)
                      closeAllDropdowns()
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
          </>
        )}
      </div>

      <div className={DIVIDER} />

      {/* ── Freeze panes ── */}
      <button
        onClick={() => {
          if (isFrozen) {
            dispatch({ type: 'SET_FREEZE', sheetId: activeSheet.id, frozenRows: 0, frozenCols: 0 })
          } else if (selectedCell) {
            dispatch({
              type: 'SET_FREEZE',
              sheetId: activeSheet.id,
              frozenRows: selectedCell.row,
              frozenCols: selectedCell.col,
            })
          }
        }}
        className={`${BTN} ${isFrozen ? BTN_ACTIVE : BTN_DEFAULT}`}
        title={isFrozen ? '固定解除' : 'ウィンドウ枠の固定'}
        aria-label={isFrozen ? '固定解除' : 'ウィンドウ枠の固定'}
      >
        <Snowflake size={14} />
      </button>

      <div className={DIVIDER} />

      {/* ── Sort A→Z / Z→A ── */}
      {selectedCell && (
        <>
          <button
            onClick={() =>
              dispatch({ type: 'SORT_SHEET', sheetId: activeSheet.id, col: selectedCell.col, direction: 'asc' })
            }
            className={`${BTN} ${BTN_DEFAULT}`}
            title="昇順ソート (A→Z)"
            aria-label="昇順ソート"
          >
            <ArrowUpAZ size={14} />
          </button>
          <button
            onClick={() =>
              dispatch({ type: 'SORT_SHEET', sheetId: activeSheet.id, col: selectedCell.col, direction: 'desc' })
            }
            className={`${BTN} ${BTN_DEFAULT}`}
            title="降順ソート (Z→A)"
            aria-label="降順ソート"
          >
            <ArrowDownAZ size={14} />
          </button>
        </>
      )}

      {/* ── Filter toggle ── */}
      <button
        onClick={() => {
          if (activeSheet.filterState && activeSheet.filterState.length > 0) {
            dispatch({ type: 'CLEAR_FILTERS', sheetId: activeSheet.id })
          } else if (selectedCell) {
            // Enable filter mode by setting an empty filter for the column
            dispatch({ type: 'SET_FILTER', sheetId: activeSheet.id, col: selectedCell.col, values: [] })
          }
        }}
        className={`${BTN} ${activeSheet.filterState && activeSheet.filterState.length > 0 ? BTN_ACTIVE : BTN_DEFAULT}`}
        title="オートフィルター"
        aria-label="オートフィルター"
      >
        <Filter size={14} />
      </button>

      <div className={DIVIDER} />

      {/* ── Conditional formatting ── */}
      <div className="relative">
        <button
          onClick={() => toggleDropdown(setShowCondFormat, showCondFormat)}
          className={`h-7 px-2 flex items-center gap-1 rounded text-xs ${BTN_DEFAULT}`}
          title="条件付き書式"
          aria-label="条件付き書式"
        >
          <span className="w-3.5 h-3.5 rounded-sm bg-gradient-to-r from-red-500 to-green-500 inline-block" />
        </button>
        {showCondFormat && range && (
          <>
            <div className="fixed inset-0 z-30" onClick={closeAllDropdowns} />
            <div className="absolute top-full left-0 mt-1 z-40 bg-slate-800 border border-slate-700 rounded-lg p-3 shadow-xl w-64">
              <div className="text-xs text-slate-300 mb-2 font-medium">条件付き書式を追加</div>
              <select
                value={condRule}
                onChange={(e) => setCondRule(e.target.value as ConditionalFormat['rule'])}
                className="w-full h-7 bg-slate-700 border border-slate-600 rounded text-xs text-white px-2 mb-2 outline-none"
              >
                {COND_RULES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
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
                  closeAllDropdowns()
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
                        <span
                          className="w-3 h-3 rounded-sm inline-block"
                          style={{ backgroundColor: cf.style.bgColor }}
                        />
                        {COND_RULES.find((r) => r.value === cf.rule)?.label}
                        {cf.values[0] ? ` ${cf.values[0]}` : ''}
                      </span>
                      <button
                        onClick={() =>
                          dispatch({ type: 'DELETE_CONDITIONAL_FORMAT', sheetId: activeSheet.id, formatId: cf.id })
                        }
                        className="text-red-400 hover:text-red-300"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <div className={DIVIDER} />

      {/* ── Fill down / Fill right ── */}
      {range && (
        <>
          <button
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
            className={`${BTN} ${BTN_DEFAULT}`}
            title="下方向へコピー (Ctrl+D)"
            aria-label="下方向へコピー"
          >
            <ArrowDown size={14} />
          </button>
          <button
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
            className={`${BTN} ${BTN_DEFAULT}`}
            title="右方向へコピー (Ctrl+R)"
            aria-label="右方向へコピー"
          >
            <ArrowRight size={14} />
          </button>
        </>
      )}

      <div className={DIVIDER} />

      {/* ── Chart ── */}
      <button
        onClick={onOpenChartPanel}
        className={`h-7 px-2 flex items-center gap-1 rounded text-xs ${BTN_DEFAULT}`}
        title="グラフ作成"
        aria-label="グラフ作成"
      >
        <BarChart3 size={14} />
        <span className="hidden sm:inline">グラフ</span>
      </button>

      {/* ── Pivot Table ── */}
      {onOpenPivot && (
        <button
          onClick={onOpenPivot}
          className={`h-7 px-2 flex items-center gap-1 rounded text-xs ${BTN_DEFAULT}`}
          title="ピボットテーブル"
          aria-label="ピボットテーブル"
        >
          <Filter size={14} />
          <span className="hidden sm:inline">ピボット</span>
        </button>
      )}

      <div className={DIVIDER} />

      {/* ── Clear formatting ── */}
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
          className={`${BTN} ${BTN_DEFAULT}`}
          title="書式をクリア"
          aria-label="書式をクリア"
        >
          <Eraser size={14} />
        </button>
      )}

      {/* ── Format Painter ── */}
      <button
        onClick={onFormatPainterStart}
        className={`${BTN} ${formatPainterActive ? BTN_ACTIVE : BTN_DEFAULT}`}
        title="書式のコピー"
        aria-label="書式のコピー"
      >
        <PaintBucket size={14} />
      </button>

      <div className={DIVIDER} />
    </div>
  )
}
