'use client'

import { useRef, useEffect, useState, useMemo, useCallback } from 'react'
import { colIndexToLetter, colLetterToIndex } from '@/lib/formula-engine'
import type { SelectionRange } from './spreadsheet-editor'
import { ChevronDown, ChevronUp, FunctionSquare } from 'lucide-react'

const FORMULA_FUNCTIONS: { name: string; signature: string }[] = [
  { name: 'SUM', signature: 'SUM(range)' },
  { name: 'AVG', signature: 'AVG(range)' },
  { name: 'AVERAGE', signature: 'AVERAGE(range)' },
  { name: 'COUNT', signature: 'COUNT(range)' },
  { name: 'COUNTA', signature: 'COUNTA(range)' },
  { name: 'COUNTIF', signature: 'COUNTIF(range, criteria)' },
  { name: 'SUMIF', signature: 'SUMIF(range, criteria, [sum_range])' },
  { name: 'AVERAGEIF', signature: 'AVERAGEIF(range, criteria, [avg_range])' },
  { name: 'MAX', signature: 'MAX(range)' },
  { name: 'MIN', signature: 'MIN(range)' },
  { name: 'MEDIAN', signature: 'MEDIAN(range)' },
  { name: 'STDEV', signature: 'STDEV(range)' },
  { name: 'IF', signature: 'IF(condition, true_val, false_val)' },
  { name: 'IFERROR', signature: 'IFERROR(value, error_val)' },
  { name: 'AND', signature: 'AND(condition1, condition2, ...)' },
  { name: 'OR', signature: 'OR(condition1, condition2, ...)' },
  { name: 'NOT', signature: 'NOT(condition)' },
  { name: 'VLOOKUP', signature: 'VLOOKUP(value, range, col_index, [approx])' },
  { name: 'HLOOKUP', signature: 'HLOOKUP(value, range, row_index, [approx])' },
  { name: 'INDEX', signature: 'INDEX(range, row, [col])' },
  { name: 'MATCH', signature: 'MATCH(value, range, [type])' },
  { name: 'CONCAT', signature: 'CONCAT(text1, text2, ...)' },
  { name: 'CONCATENATE', signature: 'CONCATENATE(text1, [text2], ...)' },
  { name: 'LEN', signature: 'LEN(text)' },
  { name: 'UPPER', signature: 'UPPER(text)' },
  { name: 'LOWER', signature: 'LOWER(text)' },
  { name: 'TRIM', signature: 'TRIM(text)' },
  { name: 'LEFT', signature: 'LEFT(text, num_chars)' },
  { name: 'RIGHT', signature: 'RIGHT(text, num_chars)' },
  { name: 'MID', signature: 'MID(text, start, num_chars)' },
  { name: 'FIND', signature: 'FIND(find_text, within_text, [start])' },
  { name: 'SUBSTITUTE', signature: 'SUBSTITUTE(text, old, new, [instance])' },
  { name: 'ABS', signature: 'ABS(number)' },
  { name: 'ROUND', signature: 'ROUND(number, decimals)' },
  { name: 'SQRT', signature: 'SQRT(number)' },
  { name: 'POWER', signature: 'POWER(base, exponent)' },
  { name: 'MOD', signature: 'MOD(number, divisor)' },
  { name: 'TODAY', signature: 'TODAY()' },
  { name: 'NOW', signature: 'NOW()' },
  { name: 'DATE', signature: 'DATE(year, month, day)' },
  { name: 'YEAR', signature: 'YEAR(date)' },
  { name: 'MONTH', signature: 'MONTH(date)' },
  { name: 'DAY', signature: 'DAY(date)' },
  { name: 'PI', signature: 'PI()' },
  { name: 'LOG', signature: 'LOG(number, [base])' },
  { name: 'LN', signature: 'LN(number)' },
  { name: 'EXP', signature: 'EXP(number)' },
  { name: 'RAND', signature: 'RAND()' },
  { name: 'RANDBETWEEN', signature: 'RANDBETWEEN(low, high)' },
  { name: 'TRUE', signature: 'TRUE()' },
  { name: 'FALSE', signature: 'FALSE()' },
  { name: 'ISBLANK', signature: 'ISBLANK(value)' },
  { name: 'ISNUMBER', signature: 'ISNUMBER(value)' },
  { name: 'ISTEXT', signature: 'ISTEXT(value)' },
  { name: 'TEXT', signature: 'TEXT(value, format)' },
  { name: 'VALUE', signature: 'VALUE(text)' },
  { name: 'REPT', signature: 'REPT(text, times)' },
  { name: 'INT', signature: 'INT(number)' },
  { name: 'FLOOR', signature: 'FLOOR(number, significance)' },
  { name: 'CEILING', signature: 'CEILING(number, significance)' },
  { name: 'ROUNDUP', signature: 'ROUNDUP(number, decimals)' },
  { name: 'ROUNDDOWN', signature: 'ROUNDDOWN(number, decimals)' },
  { name: 'SUMIFS', signature: 'SUMIFS(sum_range, range1, criteria1, ...)' },
  { name: 'COUNTIFS', signature: 'COUNTIFS(range1, criteria1, ...)' },
  { name: 'AVERAGEIFS', signature: 'AVERAGEIFS(avg_range, range1, criteria1, ...)' },
  { name: 'VAR', signature: 'VAR(range)' },
  { name: 'ROW', signature: 'ROW([reference])' },
  { name: 'COLUMN', signature: 'COLUMN([reference])' },
  // Math/Statistical (additional)
  { name: 'PRODUCT', signature: 'PRODUCT(range)' },
  { name: 'SUMPRODUCT', signature: 'SUMPRODUCT(range1, range2, ...)' },
  { name: 'LARGE', signature: 'LARGE(range, k)' },
  { name: 'SMALL', signature: 'SMALL(range, k)' },
  { name: 'RANK', signature: 'RANK(number, range, [order])' },
  { name: 'SIGN', signature: 'SIGN(number)' },
  { name: 'FACT', signature: 'FACT(number)' },
  { name: 'GCD', signature: 'GCD(a, b)' },
  { name: 'LCM', signature: 'LCM(a, b)' },
  // Trigonometry
  { name: 'SIN', signature: 'SIN(number)' },
  { name: 'COS', signature: 'COS(number)' },
  { name: 'TAN', signature: 'TAN(number)' },
  { name: 'ASIN', signature: 'ASIN(number)' },
  { name: 'ACOS', signature: 'ACOS(number)' },
  { name: 'ATAN', signature: 'ATAN(number)' },
  { name: 'ATAN2', signature: 'ATAN2(x, y)' },
  { name: 'DEGREES', signature: 'DEGREES(radians)' },
  { name: 'RADIANS', signature: 'RADIANS(degrees)' },
  // String (additional)
  { name: 'SEARCH', signature: 'SEARCH(find, within, [start])' },
  { name: 'REPLACE', signature: 'REPLACE(old_text, start, num_chars, new_text)' },
  { name: 'EXACT', signature: 'EXACT(text1, text2)' },
  { name: 'CLEAN', signature: 'CLEAN(text)' },
  { name: 'CODE', signature: 'CODE(text)' },
  { name: 'CHAR', signature: 'CHAR(number)' },
  // Logical (additional)
  { name: 'IFS', signature: 'IFS(cond1, val1, cond2, val2, ...)' },
  { name: 'SWITCH', signature: 'SWITCH(expr, val1, result1, ..., [default])' },
  { name: 'CHOOSE', signature: 'CHOOSE(index, val1, val2, ...)' },
  { name: 'ISEVEN', signature: 'ISEVEN(number)' },
  { name: 'ISODD', signature: 'ISODD(number)' },
  { name: 'ISERROR', signature: 'ISERROR(value)' },
  // Date (additional)
  { name: 'DATEDIF', signature: 'DATEDIF(start, end, unit)' },
  { name: 'WEEKDAY', signature: 'WEEKDAY(date, [type])' },
  { name: 'HOUR', signature: 'HOUR(time)' },
  { name: 'MINUTE', signature: 'MINUTE(time)' },
  { name: 'SECOND', signature: 'SECOND(time)' },
  // Dynamic Array
  { name: 'FILTER', signature: 'FILTER(range, criteria_range, criteria)' },
  { name: 'UNIQUE', signature: 'UNIQUE(range)' },
  { name: 'SORT', signature: 'SORT(range, [sort_index], [sort_order])' },
  { name: 'SORTBY', signature: 'SORTBY(range, by_range, [order])' },
  { name: 'SEQUENCE', signature: 'SEQUENCE(rows, [cols], [start], [step])' },
  // Advanced
  { name: 'XLOOKUP', signature: 'XLOOKUP(lookup_value, lookup_array, return_array, [if_not_found], [match_mode], [search_mode])' },
  { name: 'LET', signature: 'LET(name1, value1, ..., calculation)' },
  { name: 'TEXTJOIN', signature: 'TEXTJOIN(delimiter, ignore_empty, text1, ...)' },
  { name: 'QUERY', signature: 'QUERY(data_range, query_string)' },
]

interface Props {
  selectedCell: { row: number; col: number } | null
  selectionRange?: SelectionRange | null
  editingCell: { row: number; col: number } | null
  editValue: string
  onEditValueChange: (value: string) => void
  onStartEdit: () => void
  onCommit: () => void
  onCancel: () => void
  onNavigateToCell?: (row: number, col: number) => void
  hasFormulaError?: boolean
}

export default function FormulaBar({
  selectedCell,
  selectionRange,
  editingCell,
  editValue,
  onEditValueChange,
  onStartEdit,
  onCommit,
  onCancel,
  onNavigateToCell,
  hasFormulaError,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [cellRefEditing, setCellRefEditing] = useState(false)
  const [cellRefInput, setCellRefInput] = useState('')
  const [showAutocomplete, setShowAutocomplete] = useState(false)
  const [autocompleteIndex, setAutocompleteIndex] = useState(0)
  const autocompleteRef = useRef<HTMLDivElement>(null)
  const [expanded, setExpanded] = useState(false)
  const [showNameDropdown, setShowNameDropdown] = useState(false)
  const nameBoxRef = useRef<HTMLDivElement>(null)
  const [nameDropdownPos, setNameDropdownPos] = useState<{ top: number; left: number } | null>(null)
  const [cursorPos, setCursorPos] = useState<number | null>(null)
  const [activeFunction, setActiveFunction] = useState<{ name: string; signature: string; paramIndex: number } | null>(null)

  // Build cell reference display
  const cellRef = useMemo(() => {
    if (
      selectionRange &&
      (selectionRange.startRow !== selectionRange.endRow || selectionRange.startCol !== selectionRange.endCol)
    ) {
      const s = `${colIndexToLetter(selectionRange.startCol)}${selectionRange.startRow + 1}`
      const e = `${colIndexToLetter(selectionRange.endCol)}${selectionRange.endRow + 1}`
      return `${s}:${e}`
    }
    if (selectedCell) {
      return `${colIndexToLetter(selectedCell.col)}${selectedCell.row + 1}`
    }
    return ''
  }, [selectedCell, selectionRange])

  const isFormula = editValue.startsWith('=')

  // Color palette for formula reference highlighting (matches cell-grid FORMULA_REF_COLORS)
  const FORMULA_REF_COLORS = ['rgb(59,130,246)', 'rgb(239,68,68)', 'rgb(16,185,129)', 'rgb(168,85,247)', 'rgb(245,158,11)', 'rgb(236,72,153)']

  // Build colored formula overlay segments
  const formulaSegments = useMemo(() => {
    if (!isFormula || !editingCell) return null
    const text = editValue
    const refPattern = /([A-Z]+\d+(?::[A-Z]+\d+)?)/gi
    const segments: { text: string; color?: string }[] = []
    let lastIdx = 0
    let colorIdx = 0
    let match: RegExpExecArray | null
    const tempPattern = new RegExp(refPattern.source, 'gi')
    while ((match = tempPattern.exec(text)) !== null) {
      if (match.index > lastIdx) {
        segments.push({ text: text.slice(lastIdx, match.index) })
      }
      segments.push({ text: match[0], color: FORMULA_REF_COLORS[colorIdx % FORMULA_REF_COLORS.length] })
      colorIdx++
      lastIdx = match.index + match[0].length
    }
    if (lastIdx < text.length) {
      segments.push({ text: text.slice(lastIdx) })
    }
    return segments.length > 1 ? segments : null
  }, [isFormula, editingCell, editValue])

  // Autocomplete filtering
  const autocompleteMatches = useMemo(() => {
    if (!editValue.startsWith('=')) return []
    const afterEq = editValue.slice(1)
    const tokenMatch = afterEq.match(/([A-Z]+)$/i)
    if (!tokenMatch) return []
    const partial = tokenMatch[1].toUpperCase()
    if (partial.length === 0) return FORMULA_FUNCTIONS.slice(0, 15)
    return FORMULA_FUNCTIONS.filter((f) => f.name.startsWith(partial))
  }, [editValue])

  // Show/hide autocomplete
  useEffect(() => {
    if (editingCell && editValue.startsWith('=') && autocompleteMatches.length > 0) {
      setShowAutocomplete(true)
      setAutocompleteIndex(0)
    } else {
      setShowAutocomplete(false)
    }
  }, [editingCell, editValue, autocompleteMatches.length])

  // Close name dropdown on outside click
  useEffect(() => {
    if (!showNameDropdown) return
    function handle(e: MouseEvent) {
      if (nameBoxRef.current && !nameBoxRef.current.contains(e.target as Node)) {
        setShowNameDropdown(false)
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [showNameDropdown])

  // Position name dropdown with fixed positioning
  useEffect(() => {
    if (!showNameDropdown || !nameBoxRef.current) return
    const rect = nameBoxRef.current.getBoundingClientRect()
    setNameDropdownPos({ top: rect.bottom + 2, left: rect.left })
  }, [showNameDropdown])

  const insertAutocomplete = useCallback((funcName: string) => {
    const afterEq = editValue.slice(1)
    const tokenMatch = afterEq.match(/([A-Z]*)$/i)
    const before = tokenMatch ? editValue.slice(0, editValue.length - tokenMatch[1].length) : editValue
    onEditValueChange(before + funcName + '(')
    setShowAutocomplete(false)
    if (expanded) {
      textareaRef.current?.focus()
    } else {
      inputRef.current?.focus()
    }
  }, [editValue, onEditValueChange, expanded])

  const handleCellRefSubmit = () => {
    const ref = cellRefInput.trim().toUpperCase()
    const match = ref.match(/^([A-Z]+)(\d+)$/)
    if (match && onNavigateToCell) {
      const col = colLetterToIndex(match[1])
      const row = parseInt(match[2], 10) - 1
      if (row >= 0 && col >= 0) {
        onNavigateToCell(row, col)
      }
    }
    setCellRefEditing(false)
    setCellRefInput('')
  }

  const handleFxClick = () => {
    if (!editingCell) onStartEdit()
    if (!editValue.startsWith('=')) {
      onEditValueChange('=' + editValue)
    }
    if (expanded) {
      textareaRef.current?.focus()
    } else {
      inputRef.current?.focus()
    }
  }

  // Detect active function at cursor position for tooltip
  useEffect(() => {
    if (!editingCell || !editValue.startsWith('=')) {
      setActiveFunction(null)
      return
    }
    // Use the actual cursor position from input/textarea
    const el = expanded ? textareaRef.current : inputRef.current
    const pos = el?.selectionStart ?? editValue.length
    // Walk backward from cursor to find enclosing function call
    let depth = 0
    let funcEnd = -1
    for (let i = pos - 1; i >= 0; i--) {
      const ch = editValue[i]
      if (ch === ')') depth++
      if (ch === '(') {
        if (depth === 0) {
          funcEnd = i
          break
        }
        depth--
      }
    }
    if (funcEnd > 0) {
      // Extract function name before the '('
      const before = editValue.substring(0, funcEnd)
      const fnMatch = before.match(/([A-Z]+)$/i)
      if (fnMatch) {
        const fnName = fnMatch[1].toUpperCase()
        const fn = FORMULA_FUNCTIONS.find((f) => f.name === fnName)
        if (fn) {
          // Count commas between '(' and cursor to determine param index
          const insideParens = editValue.substring(funcEnd + 1, pos)
          let paramIdx = 0
          let parenDepth = 0
          for (const ch of insideParens) {
            if (ch === '(') parenDepth++
            else if (ch === ')') parenDepth--
            else if (ch === ',' && parenDepth === 0) paramIdx++
          }
          setActiveFunction({ name: fn.name, signature: fn.signature, paramIndex: paramIdx })
          return
        }
      }
    }
    setActiveFunction(null)
  }, [editValue, editingCell, expanded, cursorPos])

  // Track cursor position on selection change
  const handleSelect = useCallback(() => {
    const el = expanded ? textareaRef.current : inputRef.current
    if (el) setCursorPos(el.selectionStart)
  }, [expanded])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Autocomplete navigation
    if (showAutocomplete && autocompleteMatches.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setAutocompleteIndex((i) => Math.min(i + 1, autocompleteMatches.length - 1))
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setAutocompleteIndex((i) => Math.max(i - 1, 0))
        return
      }
      if (e.key === 'Tab' || (e.key === 'Enter' && showAutocomplete)) {
        e.preventDefault()
        insertAutocomplete(autocompleteMatches[autocompleteIndex].name)
        return
      }
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onCommit()
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      onCancel()
      setShowAutocomplete(false)
      inputRef.current?.blur()
      textareaRef.current?.blur()
    }
  }

  return (
    <div className="flex items-stretch border-b border-slate-800 bg-slate-900 shrink-0 relative">
      {/* Name box with dropdown arrow */}
      <div ref={nameBoxRef} className="relative flex-shrink-0">
        {cellRefEditing ? (
          <input
            autoFocus
            type="text"
            value={cellRefInput}
            onChange={(e) => setCellRefInput(e.target.value.toUpperCase())}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleCellRefSubmit()
              }
              if (e.key === 'Escape') {
                setCellRefEditing(false)
                setCellRefInput('')
              }
            }}
            onBlur={handleCellRefSubmit}
            className="w-24 text-center text-xs font-mono text-white border-r border-slate-800 py-2 shrink-0 bg-slate-800 outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="A1"
            aria-label="セル参照を入力"
          />
        ) : (
          <button
            onClick={() => {
              setCellRefEditing(true)
              setCellRefInput(cellRef)
            }}
            className="w-24 flex items-center justify-between px-2 text-xs font-mono text-slate-300 border-r border-slate-800 py-2 shrink-0 select-none bg-slate-900/50 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
            title="クリックしてセル参照を入力"
          >
            <span className="flex-1 text-center">{cellRef}</span>
            <ChevronDown
              size={10}
              className="text-slate-600 flex-shrink-0 ml-0.5"
              onClick={(e) => {
                e.stopPropagation()
                setShowNameDropdown(!showNameDropdown)
              }}
            />
          </button>
        )}

        {/* Name box dropdown (future: named ranges) */}
        {showNameDropdown && nameDropdownPos && (
          <div
            className="fixed bg-slate-900 border border-slate-700 rounded-lg shadow-xl z-[9999] w-48"
            style={{ top: nameDropdownPos.top, left: nameDropdownPos.left }}
          >
            <div className="px-3 py-2 text-[10px] text-slate-500 font-medium border-b border-slate-700">
              名前付き範囲
            </div>
            <div className="py-1">
              <div className="px-3 py-2 text-xs text-slate-500 italic">
                名前付き範囲はまだ定義されていません
              </div>
              {selectedCell && (
                <div className="px-3 py-1.5 text-xs text-slate-400 border-t border-slate-700">
                  <span className="text-slate-500">現在のセル: </span>
                  <span className="font-mono text-indigo-400">{cellRef}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* fx button - inserts = to start formula */}
      <button
        onClick={handleFxClick}
        className={`flex items-center justify-center w-8 shrink-0 transition-colors ${
          isFormula
            ? 'bg-indigo-500/10 text-indigo-400'
            : 'text-slate-500 hover:text-indigo-400 hover:bg-slate-800/60'
        }`}
        title="関数を挿入"
        aria-label="関数を挿入"
      >
        <FunctionSquare size={14} />
      </button>

      {/* Formula / value input area */}
      <div className="flex-1 flex items-stretch relative min-w-0">
        {/* Colored formula reference overlay */}
        {formulaSegments && editingCell && (
          <div
            className="absolute inset-0 flex items-center px-1 text-xs font-mono pointer-events-none select-none overflow-hidden whitespace-nowrap z-[1]"
            aria-hidden="true"
          >
            {formulaSegments.map((seg, i) => (
              <span key={i} style={seg.color ? { color: seg.color, fontWeight: 600 } : { color: 'transparent' }}>
                {seg.text}
              </span>
            ))}
          </div>
        )}
        {expanded ? (
          <textarea
            ref={textareaRef}
            value={editValue}
            onChange={(e) => onEditValueChange(e.target.value)}
            onFocus={() => {
              if (!editingCell) onStartEdit()
            }}
            onKeyDown={handleKeyDown}
            onSelect={handleSelect}
            onClick={handleSelect}
            className={`w-full bg-transparent text-xs py-2 px-1 outline-none font-mono placeholder-slate-600 resize-none relative z-[2] ${
              hasFormulaError ? 'text-red-400' : formulaSegments ? 'text-transparent caret-white' : 'text-white'
            }`}
            rows={4}
            placeholder={selectedCell ? 'セル値を入力...' : ''}
            aria-label="数式バー"
          />
        ) : (
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => onEditValueChange(e.target.value)}
            onFocus={() => {
              if (!editingCell) onStartEdit()
            }}
            onKeyDown={handleKeyDown}
            onSelect={handleSelect}
            onClick={handleSelect}
            className={`w-full bg-transparent text-xs py-2 px-1 outline-none font-mono placeholder-slate-600 relative z-[2] ${
              hasFormulaError ? 'text-red-400' : formulaSegments ? 'text-transparent caret-white' : 'text-white'
            }`}
            placeholder={selectedCell ? 'セル値を入力...' : ''}
            aria-label="数式バー"
          />
        )}

        {/* Cross-sheet reference indicator */}
        {editValue.startsWith('=') && /(?:'[^']+'|[A-Za-z0-9_]+)!/.test(editValue) && (
          <div className="absolute top-0 right-2 h-full flex items-center pointer-events-none z-10">
            <span className="text-[9px] px-1.5 py-0.5 bg-purple-500/15 text-purple-400 rounded font-medium">
              クロスシート参照
            </span>
          </div>
        )}

        {/* Function signature tooltip */}
        {activeFunction && editingCell && !showAutocomplete && (
          <div className="absolute top-full left-0 z-[9998] mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl px-3 py-2">
            <span className="text-[11px] font-mono">
              {activeFunction.signature.split(/([,()[\]])/).map((part, i) => {
                // Highlight current parameter
                const params = activeFunction.signature.match(/\((.+)\)/)?.[1]?.split(',') || []
                const currentParam = params[activeFunction.paramIndex]?.trim()
                if (currentParam && part.trim() === currentParam) {
                  return <span key={i} className="text-white font-bold underline decoration-indigo-400 underline-offset-2">{part}</span>
                }
                return <span key={i} className="text-slate-400">{part}</span>
              })}
            </span>
          </div>
        )}

        {/* Formula autocomplete dropdown */}
        {showAutocomplete && autocompleteMatches.length > 0 && (
          <div
            ref={autocompleteRef}
            className="absolute top-full left-0 z-[9999] mt-1 w-80 max-h-56 overflow-y-auto bg-slate-800 border border-slate-700 rounded-lg shadow-xl"
          >
            {autocompleteMatches.slice(0, 15).map((fn, i) => (
              <button
                key={fn.name}
                onMouseDown={(e) => {
                  e.preventDefault()
                  insertAutocomplete(fn.name)
                }}
                className={`w-full text-left px-3 py-1.5 flex items-center justify-between text-xs ${
                  i === autocompleteIndex
                    ? 'bg-blue-600/40 text-white'
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <span className="font-mono font-semibold">{fn.name}</span>
                <span className="text-slate-500 text-[10px] font-mono ml-2">{fn.signature}</span>
              </button>
            ))}
            {/* Signature hint for highlighted item */}
            <div className="border-t border-slate-700 px-3 py-1.5 text-[10px] text-slate-400 font-mono bg-slate-850">
              {autocompleteMatches[autocompleteIndex]?.signature || ''}
            </div>
          </div>
        )}
      </div>

      {/* Formula/value indicator + expand toggle */}
      <div className="flex items-center gap-0.5 px-1 shrink-0 border-l border-slate-800">
        {/* Formula/value indicator */}
        {editingCell && (
          <span
            className={`text-[9px] px-1.5 py-0.5 rounded font-medium select-none ${
              isFormula
                ? 'bg-indigo-500/15 text-indigo-400'
                : 'bg-slate-800 text-slate-500'
            }`}
          >
            {isFormula ? '数式' : '値'}
          </span>
        )}

        {/* Expand / collapse button */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="p-1 text-slate-500 hover:text-white hover:bg-slate-800 rounded transition-colors"
          title={expanded ? '数式バーを折りたたむ' : '数式バーを展開'}
        >
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
      </div>
    </div>
  )
}
