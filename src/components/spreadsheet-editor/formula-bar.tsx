'use client'

import { useRef, useEffect, useState, useMemo } from 'react'
import { colIndexToLetter } from '@/lib/formula-engine'
import type { SelectionRange } from './spreadsheet-editor'

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
  const [cellRefEditing, setCellRefEditing] = useState(false)
  const [cellRefInput, setCellRefInput] = useState('')
  const [showAutocomplete, setShowAutocomplete] = useState(false)
  const [autocompleteIndex, setAutocompleteIndex] = useState(0)
  const autocompleteRef = useRef<HTMLDivElement>(null)

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

  // Autocomplete filtering
  const autocompleteMatches = useMemo(() => {
    if (!editValue.startsWith('=')) return []
    // Extract the function being typed (last token after = or after operators/commas)
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

  const insertAutocomplete = (funcName: string) => {
    // Replace partial with full function name
    const afterEq = editValue.slice(1)
    const tokenMatch = afterEq.match(/([A-Z]*)$/i)
    const before = tokenMatch ? editValue.slice(0, editValue.length - tokenMatch[1].length) : editValue
    onEditValueChange(before + funcName + '(')
    setShowAutocomplete(false)
    inputRef.current?.focus()
  }

  const handleCellRefSubmit = () => {
    const ref = cellRefInput.trim().toUpperCase()
    const match = ref.match(/^([A-Z])(\d+)$/)
    if (match && onNavigateToCell) {
      const col = match[1].charCodeAt(0) - 65
      const row = parseInt(match[2], 10) - 1
      if (row >= 0 && col >= 0 && col <= 25) {
        onNavigateToCell(row, col)
      }
    }
    setCellRefEditing(false)
    setCellRefInput('')
  }

  return (
    <div className="flex items-center border-b border-slate-800 bg-slate-900 shrink-0 relative">
      {/* Cell reference - clickable to navigate */}
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
          className="w-20 text-center text-xs font-mono text-white border-r border-slate-800 py-2 shrink-0 bg-slate-800 outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="A1"
        />
      ) : (
        <button
          onClick={() => {
            setCellRefEditing(true)
            setCellRefInput(cellRef)
          }}
          className="w-20 text-center text-xs font-mono text-slate-300 border-r border-slate-800 py-2 shrink-0 select-none bg-slate-900/50 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
          title="クリックしてセル参照を入力"
        >
          {cellRef}
        </button>
      )}

      {/* fx label */}
      <div className="flex items-center justify-center w-8 shrink-0">
        <span className="text-[10px] font-bold text-slate-500 bg-slate-800/60 rounded px-1.5 py-0.5 select-none italic">
          fx
        </span>
      </div>

      {/* Formula / value input */}
      <div className="flex-1 flex items-center pr-2 relative">
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => onEditValueChange(e.target.value)}
          onFocus={() => {
            if (!editingCell) onStartEdit()
          }}
          onKeyDown={(e) => {
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
            if (e.key === 'Enter') {
              e.preventDefault()
              onCommit()
            }
            if (e.key === 'Escape') {
              e.preventDefault()
              onCancel()
              setShowAutocomplete(false)
              inputRef.current?.blur()
            }
          }}
          className={`w-full bg-transparent text-xs py-2 outline-none font-mono placeholder-slate-600 ${
            hasFormulaError ? 'text-red-400' : 'text-white'
          }`}
          placeholder={selectedCell ? 'セル値を入力...' : ''}
        />

        {/* Formula autocomplete dropdown */}
        {showAutocomplete && autocompleteMatches.length > 0 && (
          <div
            ref={autocompleteRef}
            className="absolute top-full left-0 z-50 mt-1 w-80 max-h-56 overflow-y-auto bg-slate-800 border border-slate-700 rounded-lg shadow-xl"
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
    </div>
  )
}
