'use client'

import { useState, useEffect, useRef, useMemo } from 'react'

interface FormulaInfo {
  name: string
  description: string
  syntax: string
  category: string
}

/** Parameter signature info for tooltip hints */
interface FunctionSignature {
  params: { name: string; optional?: boolean }[]
  description: string
}

/** Comprehensive function signatures map for parameter hints (30+ functions) */
export const FUNCTION_SIGNATURES: Record<string, FunctionSignature> = {
  SUM: { params: [{ name: 'range' }], description: '合計を計算' },
  AVERAGE: { params: [{ name: 'range' }], description: '平均を計算' },
  COUNT: { params: [{ name: 'range' }], description: '数値セルの個数' },
  MAX: { params: [{ name: 'range' }], description: '最大値' },
  MIN: { params: [{ name: 'range' }], description: '最小値' },
  IF: { params: [{ name: 'condition' }, { name: 'true_value' }, { name: 'false_value', optional: true }], description: '条件分岐' },
  IFERROR: { params: [{ name: 'value' }, { name: 'error_value' }], description: 'エラー時の代替値' },
  VLOOKUP: { params: [{ name: 'lookup_value' }, { name: 'range' }, { name: 'col_index' }, { name: 'approx', optional: true }], description: '垂直方向の検索' },
  HLOOKUP: { params: [{ name: 'lookup_value' }, { name: 'range' }, { name: 'row_index' }, { name: 'approx', optional: true }], description: '水平方向の検索' },
  XLOOKUP: { params: [{ name: 'lookup_value' }, { name: 'lookup_array' }, { name: 'return_array' }, { name: 'if_not_found', optional: true }, { name: 'match_mode', optional: true }, { name: 'search_mode', optional: true }], description: '高度な検索' },
  INDEX: { params: [{ name: 'range' }, { name: 'row_num' }, { name: 'col_num', optional: true }], description: '行列から値を取得' },
  MATCH: { params: [{ name: 'lookup_value' }, { name: 'lookup_range' }, { name: 'match_type', optional: true }], description: '位置を検索' },
  ROUND: { params: [{ name: 'number' }, { name: 'decimals' }], description: '四捨五入' },
  ROUNDUP: { params: [{ name: 'number' }, { name: 'decimals' }], description: '切り上げ' },
  ROUNDDOWN: { params: [{ name: 'number' }, { name: 'decimals' }], description: '切り捨て' },
  ABS: { params: [{ name: 'number' }], description: '絶対値' },
  SQRT: { params: [{ name: 'number' }], description: '平方根' },
  POWER: { params: [{ name: 'base' }, { name: 'exponent' }], description: 'べき乗' },
  MOD: { params: [{ name: 'number' }, { name: 'divisor' }], description: '余り' },
  CONCAT: { params: [{ name: 'text1' }, { name: 'text2' }, { name: '...', optional: true }], description: '文字列を結合' },
  LEN: { params: [{ name: 'text' }], description: '文字数' },
  LEFT: { params: [{ name: 'text' }, { name: 'num_chars', optional: true }], description: '左から文字を取得' },
  RIGHT: { params: [{ name: 'text' }, { name: 'num_chars', optional: true }], description: '右から文字を取得' },
  MID: { params: [{ name: 'text' }, { name: 'start_num' }, { name: 'num_chars' }], description: '中間の文字を取得' },
  FIND: { params: [{ name: 'find_text' }, { name: 'within_text' }, { name: 'start_num', optional: true }], description: '文字の位置を検索' },
  SUBSTITUTE: { params: [{ name: 'text' }, { name: 'old_text' }, { name: 'new_text' }, { name: 'instance', optional: true }], description: '文字を置換' },
  SUMIF: { params: [{ name: 'criteria_range' }, { name: 'criteria' }, { name: 'sum_range', optional: true }], description: '条件付き合計' },
  COUNTIF: { params: [{ name: 'range' }, { name: 'criteria' }], description: '条件付きカウント' },
  AVERAGEIF: { params: [{ name: 'criteria_range' }, { name: 'criteria' }, { name: 'avg_range', optional: true }], description: '条件付き平均' },
  SUMIFS: { params: [{ name: 'sum_range' }, { name: 'criteria_range1' }, { name: 'criteria1' }, { name: '...', optional: true }], description: '複数条件の合計' },
  DATE: { params: [{ name: 'year' }, { name: 'month' }, { name: 'day' }], description: '日付を作成' },
  DATEDIF: { params: [{ name: 'start_date' }, { name: 'end_date' }, { name: 'unit' }], description: '日付の差' },
  TEXTJOIN: { params: [{ name: 'delimiter' }, { name: 'ignore_empty' }, { name: 'text1' }, { name: '...', optional: true }], description: '区切り文字で結合' },
  FILTER: { params: [{ name: 'range' }, { name: 'criteria_range' }, { name: 'criteria' }], description: '条件に合う行を抽出' },
  UNIQUE: { params: [{ name: 'range' }], description: '一意の値を抽出' },
  SORT: { params: [{ name: 'range' }, { name: 'sort_index', optional: true }, { name: 'sort_order', optional: true }], description: '値を並べ替え' },
  SORTBY: { params: [{ name: 'range' }, { name: 'by_range' }, { name: 'order', optional: true }], description: '別範囲で並べ替え' },
  SEQUENCE: { params: [{ name: 'rows' }, { name: 'cols', optional: true }, { name: 'start', optional: true }, { name: 'step', optional: true }], description: '連番を生成' },
  LET: { params: [{ name: 'name1' }, { name: 'value1' }, { name: '...', optional: true }, { name: 'calculation' }], description: '名前付き中間結果' },
  IFS: { params: [{ name: 'condition1' }, { name: 'value1' }, { name: '...', optional: true }], description: '複数条件分岐' },
  SWITCH: { params: [{ name: 'expression' }, { name: 'value1' }, { name: 'result1' }, { name: '...', optional: true }], description: '値に応じた結果' },
  LOG: { params: [{ name: 'number' }, { name: 'base', optional: true }], description: '対数' },
  RANDBETWEEN: { params: [{ name: 'low' }, { name: 'high' }], description: '範囲内の乱数' },
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
  { name: 'PRODUCT', description: '範囲の積', syntax: 'PRODUCT(範囲)', category: '数学' },
  { name: 'SUMPRODUCT', description: '対応要素の積の合計', syntax: 'SUMPRODUCT(範囲1, 範囲2)', category: '数学' },
  { name: 'LARGE', description: 'K番目の最大値', syntax: 'LARGE(範囲, K)', category: '数学' },
  { name: 'SMALL', description: 'K番目の最小値', syntax: 'SMALL(範囲, K)', category: '数学' },
  { name: 'RANK', description: '順位', syntax: 'RANK(数値, 範囲, 順序)', category: '数学' },
  { name: 'SIGN', description: '符号（-1, 0, 1）', syntax: 'SIGN(数値)', category: '数学' },
  { name: 'FACT', description: '階乗', syntax: 'FACT(数値)', category: '数学' },
  { name: 'GCD', description: '最大公約数', syntax: 'GCD(数値1, 数値2)', category: '数学' },
  { name: 'LCM', description: '最小公倍数', syntax: 'LCM(数値1, 数値2)', category: '数学' },
  // Trigonometry
  { name: 'SIN', description: '正弦', syntax: 'SIN(数値)', category: '数学' },
  { name: 'COS', description: '余弦', syntax: 'COS(数値)', category: '数学' },
  { name: 'TAN', description: '正接', syntax: 'TAN(数値)', category: '数学' },
  { name: 'ASIN', description: '逆正弦', syntax: 'ASIN(数値)', category: '数学' },
  { name: 'ACOS', description: '逆余弦', syntax: 'ACOS(数値)', category: '数学' },
  { name: 'ATAN', description: '逆正接', syntax: 'ATAN(数値)', category: '数学' },
  { name: 'ATAN2', description: '2引数の逆正接', syntax: 'ATAN2(X, Y)', category: '数学' },
  { name: 'DEGREES', description: 'ラジアンを度に変換', syntax: 'DEGREES(ラジアン)', category: '数学' },
  { name: 'RADIANS', description: '度をラジアンに変換', syntax: 'RADIANS(度)', category: '数学' },
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
  { name: 'SEARCH', description: '大文字小文字を区別しない検索', syntax: 'SEARCH(検索文字, 対象, 開始位置)', category: '文字列' },
  { name: 'REPLACE', description: '位置指定で置換', syntax: 'REPLACE(文字列, 開始, 文字数, 新文字列)', category: '文字列' },
  { name: 'EXACT', description: '大文字小文字を区別して比較', syntax: 'EXACT(文字列1, 文字列2)', category: '文字列' },
  { name: 'CLEAN', description: '印刷不可文字を削除', syntax: 'CLEAN(文字列)', category: '文字列' },
  { name: 'CODE', description: '先頭文字のコード', syntax: 'CODE(文字列)', category: '文字列' },
  { name: 'CHAR', description: 'コードから文字', syntax: 'CHAR(数値)', category: '文字列' },
  { name: 'TEXTJOIN', description: '区切り文字で結合', syntax: 'TEXTJOIN(区切り, 空白無視, 文字列1, ...)', category: '文字列' },
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
  { name: 'IFS', description: '複数条件分岐', syntax: 'IFS(条件1, 値1, 条件2, 値2, ...)', category: '論理' },
  { name: 'SWITCH', description: '値に応じた結果', syntax: 'SWITCH(式, 値1, 結果1, ...)', category: '論理' },
  { name: 'CHOOSE', description: 'インデックスで選択', syntax: 'CHOOSE(番号, 値1, 値2, ...)', category: '論理' },
  { name: 'ISEVEN', description: '偶数かどうか', syntax: 'ISEVEN(数値)', category: '論理' },
  { name: 'ISODD', description: '奇数かどうか', syntax: 'ISODD(数値)', category: '論理' },
  { name: 'ISERROR', description: 'エラーかどうか', syntax: 'ISERROR(値)', category: '論理' },
  // Date
  { name: 'TODAY', description: '今日の日付', syntax: 'TODAY()', category: '日付' },
  { name: 'NOW', description: '現在の日時', syntax: 'NOW()', category: '日付' },
  { name: 'DATE', description: '日付を作成', syntax: 'DATE(年, 月, 日)', category: '日付' },
  { name: 'YEAR', description: '年を取得', syntax: 'YEAR(日付)', category: '日付' },
  { name: 'MONTH', description: '月を取得', syntax: 'MONTH(日付)', category: '日付' },
  { name: 'DAY', description: '日を取得', syntax: 'DAY(日付)', category: '日付' },
  { name: 'DATEDIF', description: '日付の差', syntax: 'DATEDIF(開始, 終了, 単位)', category: '日付' },
  { name: 'WEEKDAY', description: '曜日番号', syntax: 'WEEKDAY(日付, 種類)', category: '日付' },
  { name: 'HOUR', description: '時を取得', syntax: 'HOUR(時刻)', category: '日付' },
  { name: 'MINUTE', description: '分を取得', syntax: 'MINUTE(時刻)', category: '日付' },
  { name: 'SECOND', description: '秒を取得', syntax: 'SECOND(時刻)', category: '日付' },
  // Lookup
  { name: 'VLOOKUP', description: '垂直方向の検索', syntax: 'VLOOKUP(検索値, 範囲, 列番号, 型)', category: '検索' },
  { name: 'HLOOKUP', description: '水平方向の検索', syntax: 'HLOOKUP(検索値, 範囲, 行番号, 型)', category: '検索' },
  { name: 'XLOOKUP', description: '高度な検索', syntax: 'XLOOKUP(検索値, 検索範囲, 戻り範囲, [既定値], [一致モード], [検索モード])', category: '検索' },
  { name: 'INDEX', description: '行列から値を取得', syntax: 'INDEX(範囲, 行番号, 列番号)', category: '検索' },
  { name: 'MATCH', description: '位置を検索', syntax: 'MATCH(検索値, 範囲, 型)', category: '検索' },
  // Conditional Aggregates
  { name: 'SUMIF', description: '条件付き合計', syntax: 'SUMIF(条件範囲, 条件, 合計範囲)', category: '条件集計' },
  { name: 'COUNTIF', description: '条件付きカウント', syntax: 'COUNTIF(範囲, 条件)', category: '条件集計' },
  { name: 'AVERAGEIF', description: '条件付き平均', syntax: 'AVERAGEIF(条件範囲, 条件, 平均範囲)', category: '条件集計' },
  { name: 'SUMIFS', description: '複数条件の合計', syntax: 'SUMIFS(合計範囲, 条件範囲1, 条件1, ...)', category: '条件集計' },
  { name: 'COUNTIFS', description: '複数条件のカウント', syntax: 'COUNTIFS(条件範囲1, 条件1, ...)', category: '条件集計' },
  { name: 'AVERAGEIFS', description: '複数条件の平均', syntax: 'AVERAGEIFS(平均範囲, 条件範囲1, 条件1, ...)', category: '条件集計' },
  // Statistical
  { name: 'MEDIAN', description: '中央値', syntax: 'MEDIAN(範囲)', category: '統計' },
  { name: 'STDEV', description: '標準偏差', syntax: 'STDEV(範囲)', category: '統計' },
  { name: 'VAR', description: '分散', syntax: 'VAR(範囲)', category: '統計' },
  { name: 'COUNTA', description: '空でないセルの個数', syntax: 'COUNTA(範囲)', category: '統計' },
  // Dynamic Array
  { name: 'FILTER', description: '条件に合う行を抽出', syntax: 'FILTER(範囲, 条件範囲, 条件)', category: '配列' },
  { name: 'UNIQUE', description: '一意の値を抽出', syntax: 'UNIQUE(範囲)', category: '配列' },
  { name: 'SORT', description: '値を並べ替え', syntax: 'SORT(範囲, [列番号], [順序])', category: '配列' },
  { name: 'SORTBY', description: '別範囲で並べ替え', syntax: 'SORTBY(範囲, 基準範囲, [順序])', category: '配列' },
  { name: 'SEQUENCE', description: '連番を生成', syntax: 'SEQUENCE(行数, [列数], [開始], [増分])', category: '配列' },
  // Advanced
  { name: 'LET', description: '名前付き中間結果', syntax: 'LET(名前1, 値1, ..., 計算式)', category: '高度' },
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
  '配列': 'text-teal-400',
  '高度': 'text-rose-400',
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
  '配列': 'bg-teal-500/10 text-teal-400 border-teal-500/20',
  '高度': 'bg-rose-500/10 text-rose-400 border-rose-500/20',
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

/**
 * Detect the function context: which function the cursor is inside and which parameter index.
 * Returns { funcName, paramIndex } or null if not inside a function call.
 */
function detectFunctionContext(value: string): { funcName: string; paramIndex: number } | null {
  if (!value.startsWith('=')) return null
  const expr = value.substring(1)

  // Walk backwards from the end to find the innermost open function call
  let depth = 0
  let commaCount = 0
  let inStr = false
  let strCh = ''

  for (let i = expr.length - 1; i >= 0; i--) {
    const ch = expr[i]

    if (inStr) {
      if (ch === strCh) inStr = false
      continue
    }
    if (ch === '"' || ch === "'") {
      inStr = true
      strCh = ch
      continue
    }

    if (ch === ')') {
      depth++
    } else if (ch === '(') {
      if (depth > 0) {
        depth--
      } else {
        // Found the matching open paren — look for function name before it
        const before = expr.substring(0, i)
        const funcMatch = before.match(/([A-Za-z]+)$/)
        if (funcMatch) {
          return { funcName: funcMatch[1].toUpperCase(), paramIndex: commaCount }
        }
        return null
      }
    } else if (ch === ',' && depth === 0) {
      commaCount++
    }
  }
  return null
}

export default function FormulaAutocomplete({ editValue, onSelect, visible, anchorRect, slashMode }: Props) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)

  // Detect function context for parameter hints
  const functionContext = useMemo(() => detectFunctionContext(editValue), [editValue])

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

  // Show parameter hints even when autocomplete list is not visible
  const showParamHints = visible && anchorRect && functionContext && FUNCTION_SIGNATURES[functionContext.funcName]

  if (!visible || !anchorRect) return null

  // If no autocomplete matches but we have param hints, show just the hints
  if (selectableIndices.length === 0 && !showParamHints) return null

  return (
    <div
      className="fixed z-50"
      style={{
        top: anchorRect.top + 28,
        left: anchorRect.left,
      }}
    >
      {/* Parameter hints tooltip */}
      {showParamHints && (() => {
        const sig = FUNCTION_SIGNATURES[functionContext.funcName]
        return (
          <div className="bg-slate-900 border border-slate-600 rounded-lg shadow-xl px-3 py-2 mb-1 max-w-md">
            <div className="flex items-center gap-1.5 text-xs font-mono">
              <span className="text-indigo-400 font-semibold">{functionContext.funcName}</span>
              <span className="text-slate-500">(</span>
              {sig.params.map((param, idx) => {
                const isCurrent = idx === functionContext.paramIndex
                const isOptional = param.optional
                return (
                  <span key={idx} className="inline-flex items-center">
                    {idx > 0 && <span className="text-slate-500 mr-1">,</span>}
                    <span
                      className={`${
                        isCurrent
                          ? 'text-white font-bold bg-indigo-500/20 px-1 rounded'
                          : isOptional
                            ? 'text-slate-500 italic'
                            : 'text-slate-400'
                      }`}
                    >
                      {isOptional && !isCurrent ? `[${param.name}]` : param.name}
                    </span>
                  </span>
                )
              })}
              <span className="text-slate-500">)</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-1">{sig.description}</div>
          </div>
        )
      })()}

      {/* Autocomplete dropdown */}
      {selectableIndices.length > 0 && (
    <div
      className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl shadow-black/30 overflow-hidden"
      style={{
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
      )}
    </div>
  )
}
