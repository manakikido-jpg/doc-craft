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
} from 'lucide-react'

interface Props {
  activeSheet: Sheet
  selectedCell: { row: number; col: number } | null
  selectionRange: SelectionRange | null
  currentCellFormat?: CellFormat
  onFormatChange: (format: Partial<CellFormat>) => void
  dispatch: (action: UndoableAction<SpreadsheetAction>) => void
}

const TEXT_COLORS = [
  '#ffffff',
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#64748b',
  '#0f172a',
]
const BG_COLORS = [
  'transparent',
  '#991b1b',
  '#9a3412',
  '#854d0e',
  '#166534',
  '#1e40af',
  '#5b21b6',
  '#9d174d',
  '#1e293b',
  '#334155',
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
  { value: 'percent', label: 'パーセント (%)' },
  { value: 'currency', label: '通貨 (¥)' },
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
}: Props) {
  const [showTextColors, setShowTextColors] = useState(false)
  const [showBgColors, setShowBgColors] = useState(false)
  const [showNumberFormat, setShowNumberFormat] = useState(false)
  const [showBorders, setShowBorders] = useState(false)
  const [showCondFormat, setShowCondFormat] = useState(false)
  const [condRule, setCondRule] = useState<ConditionalFormat['rule']>('greaterThan')
  const [condValue, setCondValue] = useState('')
  const [condColor, setCondColor] = useState('#22c55e')

  const fmt = currentCellFormat || {}

  const closeAllDropdowns = () => {
    setShowTextColors(false)
    setShowBgColors(false)
    setShowNumberFormat(false)
    setShowBorders(false)
    setShowCondFormat(false)
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
    let format: Partial<CellFormat> = {}
    switch (type) {
      case 'none':
        format = { borderTop: undefined, borderRight: undefined, borderBottom: undefined, borderLeft: undefined }
        break
      case 'all':
        format = { borderTop: border, borderRight: border, borderBottom: border, borderLeft: border }
        break
      case 'outline':
        // For outline, we need per-cell logic but simple approach: apply all borders
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
            <div className="absolute top-full left-0 mt-1 z-40 bg-slate-800 border border-slate-700 rounded-lg p-2 shadow-xl">
              <div className="grid grid-cols-5 gap-1">
                {TEXT_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => {
                      onFormatChange({ textColor: color })
                      closeAllDropdowns()
                    }}
                    className="w-6 h-6 rounded border border-slate-600 hover:border-white transition-colors"
                    style={{ backgroundColor: color }}
                  />
                ))}
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
            <div className="absolute top-full left-0 mt-1 z-40 bg-slate-800 border border-slate-700 rounded-lg p-2 shadow-xl">
              <div className="grid grid-cols-5 gap-1">
                {BG_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => {
                      onFormatChange({ bgColor: color === 'transparent' ? undefined : color })
                      closeAllDropdowns()
                    }}
                    className="w-6 h-6 rounded border border-slate-600 hover:border-white transition-colors"
                    style={{ backgroundColor: color === 'transparent' ? 'transparent' : color }}
                  >
                    {color === 'transparent' && <span className="text-[10px] text-slate-400">-</span>}
                  </button>
                ))}
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
    </div>
  )
}
