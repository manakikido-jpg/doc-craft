'use client'

import { useState, useEffect, useRef, useMemo } from 'react'

interface FormulaInfo {
  name: string
  description: string
  syntax: string
  category: string
}

const FORMULA_LIST: FormulaInfo[] = [
  // Math
  { name: 'SUM', description: '合計を計算', syntax: 'SUM(範囲)', category: '数学' },
  { name: 'AVERAGE', description: '平均を計算', syntax: 'AVERAGE(範囲)', category: '数学' },
  { name: 'COUNT', description: '数値セルの個数', syntax: 'COUNT(範囲)', category: '数学' },
  { name: 'MAX', description: '最大値', syntax: 'MAX(範囲)', category: '数学' },
  { name: 'MIN', description: '最小値', syntax: 'MIN(範囲)', category: '数学' },
  { name: 'ABS', description: '絶対値', syntax: 'ABS(数値)', category: '数学' },
  { name: 'ROUND', description: '四捨五入', syntax: 'ROUND(数値, 桁数)', category: '数学' },
  { name: 'ROUNDUP', description: '切り上げ', syntax: 'ROUNDUP(数値, 桁数)', category: '数学' },
  { name: 'ROUNDDOWN', description: '切り捨て', syntax: 'ROUNDDOWN(数値, 桁数)', category: '数学' },
  { name: 'FLOOR', description: '基準値の倍数に切り捨て', syntax: 'FLOOR(数値, 基準値)', category: '数学' },
  { name: 'CEILING', description: '基準値の倍数に切り上げ', syntax: 'CEILING(数値, 基準値)', category: '数学' },
  { name: 'SQRT', description: '平方根', syntax: 'SQRT(数値)', category: '数学' },
  { name: 'POWER', description: 'べき乗', syntax: 'POWER(底, 指数)', category: '数学' },
  { name: 'MOD', description: '余り', syntax: 'MOD(数値, 除数)', category: '数学' },
  { name: 'INT', description: '整数部分', syntax: 'INT(数値)', category: '数学' },
  { name: 'RAND', description: '0~1の乱数', syntax: 'RAND()', category: '数学' },
  { name: 'RANDBETWEEN', description: '範囲内の乱数', syntax: 'RANDBETWEEN(最小, 最大)', category: '数学' },
  { name: 'PI', description: '円周率', syntax: 'PI()', category: '数学' },
  { name: 'LOG', description: '対数', syntax: 'LOG(数値, 底)', category: '数学' },
  { name: 'LN', description: '自然対数', syntax: 'LN(数値)', category: '数学' },
  { name: 'EXP', description: 'eのべき乗', syntax: 'EXP(数値)', category: '数学' },
  // String
  { name: 'CONCAT', description: '文字列を結合', syntax: 'CONCAT(文字列1, 文字列2, ...)', category: '文字列' },
  { name: 'CONCATENATE', description: '文字列を結合', syntax: 'CONCATENATE(文字列1, 文字列2, ...)', category: '文字列' },
  { name: 'LEN', description: '文字数', syntax: 'LEN(文字列)', category: '文字列' },
  { name: 'UPPER', description: '大文字に変換', syntax: 'UPPER(文字列)', category: '文字列' },
  { name: 'LOWER', description: '小文字に変換', syntax: 'LOWER(文字列)', category: '文字列' },
  { name: 'PROPER', description: '先頭を大文字に', syntax: 'PROPER(文字列)', category: '文字列' },
  { name: 'TRIM', description: '余分な空白を削除', syntax: 'TRIM(文字列)', category: '文字列' },
  { name: 'LEFT', description: '左から文字を取得', syntax: 'LEFT(文字列, 文字数)', category: '文字列' },
  { name: 'RIGHT', description: '右から文字を取得', syntax: 'RIGHT(文字列, 文字数)', category: '文字列' },
  { name: 'MID', description: '中間の文字を取得', syntax: 'MID(文字列, 開始位置, 文字数)', category: '文字列' },
  { name: 'FIND', description: '文字の位置を検索', syntax: 'FIND(検索文字, 対象, 開始位置)', category: '文字列' },
  { name: 'SUBSTITUTE', description: '文字を置換', syntax: 'SUBSTITUTE(文字列, 旧, 新)', category: '文字列' },
  { name: 'REPT', description: '文字列を繰り返し', syntax: 'REPT(文字列, 回数)', category: '文字列' },
  { name: 'TEXT', description: '値を文字列に変換', syntax: 'TEXT(値)', category: '文字列' },
  { name: 'VALUE', description: '文字列を数値に変換', syntax: 'VALUE(文字列)', category: '文字列' },
  // Logical
  { name: 'IF', description: '条件分岐', syntax: 'IF(条件, 真の値, 偽の値)', category: '論理' },
  { name: 'AND', description: 'すべての条件が真', syntax: 'AND(条件1, 条件2, ...)', category: '論理' },
  { name: 'OR', description: 'いずれかの条件が真', syntax: 'OR(条件1, 条件2, ...)', category: '論理' },
  { name: 'NOT', description: '条件を反転', syntax: 'NOT(条件)', category: '論理' },
  { name: 'TRUE', description: '真を返す', syntax: 'TRUE()', category: '論理' },
  { name: 'FALSE', description: '偽を返す', syntax: 'FALSE()', category: '論理' },
  { name: 'IFERROR', description: 'エラー時の代替値', syntax: 'IFERROR(値, エラー時の値)', category: '論理' },
  { name: 'ISBLANK', description: '空白かどうか', syntax: 'ISBLANK(セル)', category: '論理' },
  { name: 'ISNUMBER', description: '数値かどうか', syntax: 'ISNUMBER(値)', category: '論理' },
  { name: 'ISTEXT', description: 'テキストかどうか', syntax: 'ISTEXT(値)', category: '論理' },
  // Date
  { name: 'TODAY', description: '今日の日付', syntax: 'TODAY()', category: '日付' },
  { name: 'NOW', description: '現在の日時', syntax: 'NOW()', category: '日付' },
  { name: 'DATE', description: '日付を作成', syntax: 'DATE(年, 月, 日)', category: '日付' },
  { name: 'YEAR', description: '年を取得', syntax: 'YEAR(日付)', category: '日付' },
  { name: 'MONTH', description: '月を取得', syntax: 'MONTH(日付)', category: '日付' },
  { name: 'DAY', description: '日を取得', syntax: 'DAY(日付)', category: '日付' },
  // Lookup
  { name: 'VLOOKUP', description: '垂直方向の検索', syntax: 'VLOOKUP(検索値, 範囲, 列番号, 型)', category: '検索' },
  { name: 'HLOOKUP', description: '水平方向の検索', syntax: 'HLOOKUP(検索値, 範囲, 行番号, 型)', category: '検索' },
  { name: 'INDEX', description: '行列から値を取得', syntax: 'INDEX(範囲, 行番号, 列番号)', category: '検索' },
  { name: 'MATCH', description: '位置を検索', syntax: 'MATCH(検索値, 範囲, 型)', category: '検索' },
  // Conditional Aggregates
  { name: 'SUMIF', description: '条件付き合計', syntax: 'SUMIF(条件範囲, 条件, 合計範囲)', category: '条件集計' },
  { name: 'COUNTIF', description: '条件付きカウント', syntax: 'COUNTIF(範囲, 条件)', category: '条件集計' },
  { name: 'AVERAGEIF', description: '条件付き平均', syntax: 'AVERAGEIF(条件範囲, 条件, 平均範囲)', category: '条件集計' },
  { name: 'SUMIFS', description: '複数条件の合計', syntax: 'SUMIFS(合計範囲, 条件範囲1, 条件1, ...)', category: '条件集計' },
  // Statistical
  { name: 'MEDIAN', description: '中央値', syntax: 'MEDIAN(範囲)', category: '統計' },
  { name: 'STDEV', description: '標準偏差', syntax: 'STDEV(範囲)', category: '統計' },
  { name: 'VAR', description: '分散', syntax: 'VAR(範囲)', category: '統計' },
  { name: 'COUNTA', description: '空でないセルの個数', syntax: 'COUNTA(範囲)', category: '統計' },
  // Utility
  { name: 'ROW', description: '行番号を返す', syntax: 'ROW()', category: 'ユーティリティ' },
  { name: 'COLUMN', description: '列番号を返す', syntax: 'COLUMN()', category: 'ユーティリティ' },
]

const CATEGORY_COLORS: Record<string, string> = {
  '数学': 'text-blue-400',
  '文字列': 'text-emerald-400',
  '論理': 'text-amber-400',
  '日付': 'text-pink-400',
  '検索': 'text-violet-400',
  '条件集計': 'text-cyan-400',
  '統計': 'text-orange-400',
  'ユーティリティ': 'text-slate-400',
}

const CATEGORY_BG: Record<string, string> = {
  '数学': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  '文字列': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  '論理': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  '日付': 'bg-pink-500/10 text-pink-400 border-pink-500/20',
  '検索': 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  '条件集計': 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  '統計': 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  'ユーティリティ': 'bg-slate-500/10 text-slate-400 border-slate-500/20',
}

interface Props {
  editValue: string
  onSelect: (funcName: string) => void
  visible: boolean
  anchorRect: { top: number; left: number } | null
  /** Whether the autocomplete was triggered by "/" (slash command mode) */
  slashMode?: boolean
}

export default function FormulaAutocomplete({ editValue, onSelect, visible, anchorRect, slashMode }: Props) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)

  // Extract the function name being typed after '=' or '/'
  const searchText = useMemo(() => {
    if (slashMode) {
      // Slash mode: search text is everything after '/'
      if (!editValue.startsWith('/')) return ''
      const afterSlash = editValue.substring(1)
      return afterSlash.toUpperCase()
    }
    if (!editValue.startsWith('=')) return ''
    const afterEq = editValue.substring(1)
    const match = afterEq.match(/([A-Za-z]+)$/)
    return match ? match[1].toUpperCase() : ''
  }, [editValue, slashMode])

  // In slash mode, show all functions grouped by category when no search text
  const filteredFunctions = useMemo(() => {
    if (slashMode && !searchText) {
      return FORMULA_LIST
    }
    if (!searchText) return FORMULA_LIST.slice(0, 10)
    return FORMULA_LIST.filter(
      (f) => f.name.startsWith(searchText) || f.name.includes(searchText) ||
        f.description.includes(searchText.toLowerCase()),
    ).slice(0, slashMode ? 86 : 10)
  }, [searchText, slashMode])

  // Build items with category headers for slash mode
  const displayItems = useMemo(() => {
    if (!slashMode) {
      return filteredFunctions.map((fn) => ({ type: 'function' as const, fn }))
    }
    const items: Array<{ type: 'header'; label: string } | { type: 'function'; fn: FormulaInfo }> = []
    let lastCategory = ''
    for (const fn of filteredFunctions) {
      if (fn.category !== lastCategory) {
        items.push({ type: 'header', label: fn.category })
        lastCategory = fn.category
      }
      items.push({ type: 'function', fn })
    }
    return items
  }, [filteredFunctions, slashMode])

  // Selectable items only (not headers)
  const selectableIndices = useMemo(() => {
    return displayItems
      .map((item, i) => (item.type === 'function' ? i : -1))
      .filter((i) => i >= 0)
  }, [displayItems])

  useEffect(() => {
    setSelectedIndex(0)
  }, [searchText])

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current && selectableIndices[selectedIndex] !== undefined) {
      const actualIndex = selectableIndices[selectedIndex]
      const item = listRef.current.children[actualIndex] as HTMLElement
      if (item) item.scrollIntoView({ block: 'nearest' })
    }
  }, [selectedIndex, selectableIndices])

  useEffect(() => {
    if (!visible) return

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        e.stopPropagation()
        setSelectedIndex((prev) => Math.min(prev + 1, selectableIndices.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        e.stopPropagation()
        setSelectedIndex((prev) => Math.max(prev - 1, 0))
      } else if (e.key === 'Tab' || (e.key === 'Enter' && selectableIndices.length > 0)) {
        if ((slashMode || searchText) && selectableIndices.length > 0) {
          e.preventDefault()
          e.stopPropagation()
          const actualIndex = selectableIndices[selectedIndex]
          const item = displayItems[actualIndex]
          if (item && item.type === 'function') {
            onSelect(item.fn.name)
          }
        }
      } else if (e.key === 'Escape') {
        // Let parent handle escape to close
      }
    }

    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [visible, selectedIndex, selectableIndices, displayItems, searchText, slashMode, onSelect])

  if (!visible || !anchorRect || selectableIndices.length === 0) return null

  return (
    <div
      className="fixed z-50 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl shadow-black/30 overflow-hidden"
      style={{
        top: anchorRect.top + 28,
        left: anchorRect.left,
        minWidth: slashMode ? 400 : 320,
        maxHeight: slashMode ? 360 : 260,
      }}
    >
      {/* Header for slash mode */}
      {slashMode && (
        <div className="px-3 py-2 border-b border-slate-700/50 bg-slate-800/80">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded">/</span>
            <span className="text-xs text-slate-400">
              {searchText ? `「${searchText}」で検索中...` : '関数を検索（名前を入力して絞り込み）'}
            </span>
            <span className="ml-auto text-[10px] text-slate-600">{selectableIndices.length}件</span>
          </div>
        </div>
      )}
      <div ref={listRef} className="overflow-y-auto custom-scrollbar" style={{ maxHeight: slashMode ? 320 : 260 }}>
        {displayItems.map((item, i) => {
          if (item.type === 'header') {
            return (
              <div
                key={`header-${item.label}`}
                className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider bg-slate-900/50 border-b border-slate-700/30 flex items-center gap-2 sticky top-0 z-10"
              >
                <span className={`inline-block px-1.5 py-0.5 rounded border text-[9px] ${CATEGORY_BG[item.label] || 'bg-slate-700 text-slate-400'}`}>
                  {item.label}
                </span>
              </div>
            )
          }
          const fn = item.fn
          const selectableIdx = selectableIndices.indexOf(i)
          const isSelected = selectableIdx === selectedIndex
          return (
            <button
              key={fn.name}
              onMouseDown={(e) => {
                e.preventDefault()
                onSelect(fn.name)
              }}
              className={`w-full text-left px-3 py-2 flex items-center gap-3 text-xs transition-colors ${
                isSelected ? 'bg-indigo-600/20 text-white' : 'text-slate-300 hover:bg-slate-700/50'
              }`}
            >
              <span className={`font-mono font-semibold w-28 shrink-0 ${CATEGORY_COLORS[fn.category] || 'text-indigo-400'}`}>{fn.name}</span>
              <span className="text-slate-400 flex-1 truncate">{fn.description}</span>
              <span className="text-slate-500 text-[10px] font-mono truncate max-w-[160px]">{fn.syntax}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
