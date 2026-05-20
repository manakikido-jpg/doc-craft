'use client'

import { useRef, useEffect, useCallback, useState, useMemo, memo } from 'react'
import type { Sheet, ConditionalFormat } from '@/types'
import type { SelectionRange } from './spreadsheet-editor'
import type { SpreadsheetAction } from '@/hooks/use-spreadsheet'
import type { UndoableAction } from '@/lib/undoable'
import { colIndexToLetter, formatCellValue } from '@/lib/formula-engine'
import { ChevronDown } from 'lucide-react'

interface Props {
  sheet: Sheet
  selectedCell: { row: number; col: number } | null
  selectionRange: SelectionRange | null
  editingCell: { row: number; col: number } | null
  editValue: string
  computedValues: Record<string, string | number>
  onSelectCell: (row: number, col: number, shiftKey?: boolean) => void
  onExtendSelection: (row: number, col: number) => void
  onStartEdit: (row: number, col: number, initialValue?: string) => void
  onEditValueChange: (value: string) => void
  onCommitEdit: () => void
  onCancelEdit: () => void
  onContextMenu: (x: number, y: number) => void
  dispatch: (action: UndoableAction<SpreadsheetAction>) => void
  validationError?: string | null
  onListSelect?: (row: number, col: number, value: string) => void
  cutRange?: SelectionRange | null
}

const DEFAULT_COL_WIDTH = 100
const DEFAULT_ROW_HEIGHT = 28
const HEADER_WIDTH = 46
const HEADER_HEIGHT = 26

function isCellHidden(row: number, col: number, mergedCells: Sheet['mergedCells']): boolean {
  for (const m of mergedCells) {
    if (
      row >= m.startRow &&
      row < m.startRow + m.rowSpan &&
      col >= m.startCol &&
      col < m.startCol + m.colSpan &&
      !(row === m.startRow && col === m.startCol)
    ) {
      return true
    }
  }
  return false
}

function getMerge(row: number, col: number, mergedCells: Sheet['mergedCells']) {
  return mergedCells.find((m) => m.startRow === row && m.startCol === col)
}

function isInRange(row: number, col: number, range: SelectionRange | null): boolean {
  if (!range) return false
  return row >= range.startRow && row <= range.endRow && col >= range.startCol && col <= range.endCol
}

/** Check conditional formatting rules for a cell */
function getConditionalStyle(
  row: number,
  col: number,
  computedValue: string | number | undefined,
  formats: ConditionalFormat[] | undefined,
): React.CSSProperties | undefined {
  if (!formats || formats.length === 0) return undefined
  for (const cf of formats) {
    if (row < cf.range.startRow || row > cf.range.endRow || col < cf.range.startCol || col > cf.range.endCol) continue
    const val = computedValue
    const numVal = typeof val === 'number' ? val : val !== undefined ? Number(val) : NaN
    let match = false
    switch (cf.rule) {
      case 'greaterThan':
        match = !isNaN(numVal) && numVal > Number(cf.values[0])
        break
      case 'lessThan':
        match = !isNaN(numVal) && numVal < Number(cf.values[0])
        break
      case 'equalTo':
        match = String(val) === cf.values[0] || (!isNaN(numVal) && numVal === Number(cf.values[0]))
        break
      case 'textContains':
        match = typeof val === 'string' && val.includes(cf.values[0])
        break
      case 'isEmpty':
        match = val === undefined || val === ''
        break
      case 'isNotEmpty':
        match = val !== undefined && val !== ''
        break
    }
    if (match) {
      const s: React.CSSProperties = {}
      if (cf.style.bgColor) s.backgroundColor = cf.style.bgColor
      if (cf.style.textColor) s.color = cf.style.textColor
      if (cf.style.bold) s.fontWeight = 'bold'
      return s
    }
  }
  return undefined
}

export default memo(function CellGrid({
  sheet,
  selectedCell,
  selectionRange,
  editingCell,
  editValue,
  computedValues,
  onSelectCell,
  onExtendSelection,
  onStartEdit,
  onEditValueChange,
  onCommitEdit,
  onCancelEdit,
  onContextMenu,
  dispatch,
  validationError,
  onListSelect,
  cutRange,
}: Props) {
  const editInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isFillDragging, setIsFillDragging] = useState(false)
  const [fillTarget, setFillTarget] = useState<{ row: number; col: number } | null>(null)
  const [resizingCol, setResizingCol] = useState<number | null>(null)
  const [resizingRow, setResizingRow] = useState<number | null>(null)
  const resizeStartRef = useRef<{ pos: number; size: number }>({ pos: 0, size: 0 })
  const [filterDropdown, setFilterDropdown] = useState<{ col: number } | null>(null)
  const [listDropdown, setListDropdown] = useState<{ row: number; col: number } | null>(null)

  const frozenRows = sheet.frozenRows ?? 0
  const frozenCols = sheet.frozenCols ?? 0
  const hasFilter = !!(sheet.filterState && sheet.filterState.length > 0)

  useEffect(() => {
    if (editingCell && editInputRef.current) {
      editInputRef.current.focus()
    }
  }, [editingCell])

  const getColWidth = useCallback((col: number) => sheet.colWidths[col] || DEFAULT_COL_WIDTH, [sheet.colWidths])
  const getRowHeight = useCallback((row: number) => sheet.rowHeights[row] || DEFAULT_ROW_HEIGHT, [sheet.rowHeights])

  // Compute cumulative column left positions for frozen pane sticky
  const colLeftPositions = useMemo(() => {
    const pos: number[] = []
    let x = HEADER_WIDTH
    for (let c = 0; c < sheet.colCount; c++) {
      pos.push(x)
      x += getColWidth(c)
    }
    return pos
  }, [sheet.colCount, getColWidth])

  // Compute cumulative row top positions for frozen pane sticky
  const rowTopPositions = useMemo(() => {
    const pos: number[] = []
    let y = HEADER_HEIGHT
    for (let r = 0; r < sheet.rowCount; r++) {
      pos.push(y)
      y += getRowHeight(r)
    }
    return pos
  }, [sheet.rowCount, getRowHeight])

  // Unique values per column for filter dropdown
  const getUniqueValues = useCallback(
    (col: number): string[] => {
      const vals = new Set<string>()
      for (let r = 0; r < sheet.rowCount; r++) {
        const key = `${r}-${col}`
        const cv = computedValues[key]
        if (cv !== undefined && cv !== '') vals.add(String(cv))
      }
      return Array.from(vals).sort()
    },
    [sheet.rowCount, computedValues],
  )

  // Determine which rows are visible given active filters
  const visibleRows = useMemo(() => {
    if (!sheet.filterState || sheet.filterState.length === 0) return null // all visible
    const activeFilters = sheet.filterState.filter((f) => f.values.length > 0)
    if (activeFilters.length === 0) return null
    const hidden = new Set<number>()
    for (let r = 0; r < sheet.rowCount; r++) {
      for (const f of activeFilters) {
        const key = `${r}-${f.col}`
        const val = computedValues[key] !== undefined ? String(computedValues[key]) : ''
        if (!f.values.includes(val)) {
          hidden.add(r)
          break
        }
      }
    }
    return hidden
  }, [sheet.filterState, sheet.rowCount, computedValues])

  // Selection status bar
  const selectionStats = useMemo(() => {
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
    if (!range) return null
    let count = 0
    let sum = 0
    let numCount = 0
    for (let r = range.startRow; r <= range.endRow; r++) {
      for (let c = range.startCol; c <= range.endCol; c++) {
        count++
        const cv = computedValues[`${r}-${c}`]
        if (cv !== undefined && cv !== '') {
          const n = Number(cv)
          if (!isNaN(n)) {
            sum += n
            numCount++
          }
        }
      }
    }
    return { count, sum, avg: numCount > 0 ? sum / numCount : 0, numCount }
  }, [selectionRange, selectedCell, computedValues])

  // Mouse handlers for drag selection
  const handleMouseDown = useCallback(
    (e: React.MouseEvent, row: number, col: number) => {
      if (e.button === 2) return
      if (e.shiftKey) {
        onSelectCell(row, col, true)
      } else {
        onSelectCell(row, col)
      }
      setIsDragging(true)
    },
    [onSelectCell, onExtendSelection],
  )

  const handleMouseEnter = useCallback(
    (row: number, col: number) => {
      if (isDragging) {
        onExtendSelection(row, col)
      }
      if (isFillDragging) {
        setFillTarget({ row, col })
      }
    },
    [isDragging, isFillDragging, onExtendSelection],
  )

  useEffect(() => {
    function handleMouseUp() {
      setIsDragging(false)
      if (isFillDragging && fillTarget && selectedCell) {
        // Perform auto-fill from selection to fillTarget
        const range = selectionRange || { startRow: selectedCell.row, startCol: selectedCell.col, endRow: selectedCell.row, endCol: selectedCell.col }
        const normRange = {
          startRow: Math.min(range.startRow, range.endRow),
          startCol: Math.min(range.startCol, range.endCol),
          endRow: Math.max(range.startRow, range.endRow),
          endCol: Math.max(range.startCol, range.endCol),
        }
        // Fill downward
        if (fillTarget.row > normRange.endRow) {
          for (let c = normRange.startCol; c <= normRange.endCol; c++) {
            const sourceValues: string[] = []
            for (let r = normRange.startRow; r <= normRange.endRow; r++) {
              sourceValues.push(sheet.cells[`${r}-${c}`]?.value ?? '')
            }
            for (let r = normRange.endRow + 1; r <= fillTarget.row; r++) {
              const idx = (r - normRange.endRow - 1) % sourceValues.length
              const srcVal = sourceValues[idx]
              const srcNum = Number(srcVal)
              let fillVal = srcVal
              // Detect numeric pattern: if all source values are numbers, increment
              if (sourceValues.length === 1 && !isNaN(srcNum) && srcVal !== '') {
                fillVal = String(srcNum + (r - normRange.endRow))
              } else if (sourceValues.every((v) => !isNaN(Number(v)) && v !== '') && sourceValues.length > 1) {
                const diff = Number(sourceValues[1]) - Number(sourceValues[0])
                fillVal = String(Number(sourceValues[sourceValues.length - 1]) + diff * (r - normRange.endRow))
              }
              dispatch({
                type: 'SET_CELL_VALUE',
                sheetId: sheet.id,
                row: r,
                col: c,
                value: fillVal,
              })
            }
          }
        }
        // Fill rightward
        if (fillTarget.col > normRange.endCol) {
          for (let r = normRange.startRow; r <= normRange.endRow; r++) {
            const sourceValues: string[] = []
            for (let c = normRange.startCol; c <= normRange.endCol; c++) {
              sourceValues.push(sheet.cells[`${r}-${c}`]?.value ?? '')
            }
            for (let c = normRange.endCol + 1; c <= fillTarget.col; c++) {
              const idx = (c - normRange.endCol - 1) % sourceValues.length
              const srcVal = sourceValues[idx]
              const srcNum = Number(srcVal)
              let fillVal = srcVal
              if (sourceValues.length === 1 && !isNaN(srcNum) && srcVal !== '') {
                fillVal = String(srcNum + (c - normRange.endCol))
              } else if (sourceValues.every((v) => !isNaN(Number(v)) && v !== '') && sourceValues.length > 1) {
                const diff = Number(sourceValues[1]) - Number(sourceValues[0])
                fillVal = String(Number(sourceValues[sourceValues.length - 1]) + diff * (c - normRange.endCol))
              }
              dispatch({
                type: 'SET_CELL_VALUE',
                sheetId: sheet.id,
                row: r,
                col: c,
                value: fillVal,
              })
            }
          }
        }
        setIsFillDragging(false)
        setFillTarget(null)
      }
    }
    window.addEventListener('mouseup', handleMouseUp)
    return () => window.removeEventListener('mouseup', handleMouseUp)
  }, [isFillDragging, fillTarget, selectedCell, selectionRange, sheet.cells, sheet.id, dispatch])

  // Fill handle drag: track which cell the mouse is over
  const handleFillMouseEnter = useCallback(
    (row: number, col: number) => {
      if (isFillDragging) {
        setFillTarget({ row, col })
      }
    },
    [isFillDragging],
  )

  const handleFillHandleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsFillDragging(true)
  }, [])

  // Column resize handlers
  const handleColResizeStart = useCallback(
    (e: React.MouseEvent, col: number) => {
      e.preventDefault()
      e.stopPropagation()
      setResizingCol(col)
      resizeStartRef.current = { pos: e.clientX, size: getColWidth(col) }

      function onMouseMove(ev: MouseEvent) {
        const delta = ev.clientX - resizeStartRef.current.pos
        const newWidth = Math.max(40, resizeStartRef.current.size + delta)
        dispatch({ type: 'SET_COL_WIDTH', sheetId: sheet.id, col, width: newWidth })
      }
      function onMouseUp() {
        setResizingCol(null)
        window.removeEventListener('mousemove', onMouseMove)
        window.removeEventListener('mouseup', onMouseUp)
      }
      window.addEventListener('mousemove', onMouseMove)
      window.addEventListener('mouseup', onMouseUp)
    },
    [sheet.id, dispatch, getColWidth],
  )

  // Row resize handlers
  const handleRowResizeStart = useCallback(
    (e: React.MouseEvent, row: number) => {
      e.preventDefault()
      e.stopPropagation()
      setResizingRow(row)
      resizeStartRef.current = { pos: e.clientY, size: getRowHeight(row) }

      function onMouseMove(ev: MouseEvent) {
        const delta = ev.clientY - resizeStartRef.current.pos
        const newHeight = Math.max(20, resizeStartRef.current.size + delta)
        dispatch({ type: 'SET_ROW_HEIGHT', sheetId: sheet.id, row, height: newHeight })
      }
      function onMouseUp() {
        setResizingRow(null)
        window.removeEventListener('mousemove', onMouseMove)
        window.removeEventListener('mouseup', onMouseUp)
      }
      window.addEventListener('mousemove', onMouseMove)
      window.addEventListener('mouseup', onMouseUp)
    },
    [sheet.id, dispatch, getRowHeight],
  )

  // Select entire column
  const handleSelectColumn = useCallback(
    (col: number) => {
      onSelectCell(0, col)
      onExtendSelection(sheet.rowCount - 1, col)
    },
    [onSelectCell, onExtendSelection, sheet.rowCount],
  )

  // Select entire row
  const handleSelectRow = useCallback(
    (row: number) => {
      onSelectCell(row, 0)
      onExtendSelection(row, sheet.colCount - 1)
    },
    [onSelectCell, onExtendSelection, sheet.colCount],
  )

  // Select all
  const handleSelectAll = useCallback(() => {
    onSelectCell(0, 0)
    onExtendSelection(sheet.rowCount - 1, sheet.colCount - 1)
  }, [onSelectCell, onExtendSelection, sheet.rowCount, sheet.colCount])

  // Compute fill range for highlighting
  const fillRange = useMemo(() => {
    if (!isFillDragging || !fillTarget || !selectedCell) return null
    const range = selectionRange || { startRow: selectedCell.row, startCol: selectedCell.col, endRow: selectedCell.row, endCol: selectedCell.col }
    const normRange = {
      startRow: Math.min(range.startRow, range.endRow),
      startCol: Math.min(range.startCol, range.endCol),
      endRow: Math.max(range.startRow, range.endRow),
      endCol: Math.max(range.startCol, range.endCol),
    }
    return {
      startRow: normRange.endRow + 1,
      startCol: normRange.startCol,
      endRow: Math.max(normRange.endRow, fillTarget.row),
      endCol: Math.max(normRange.endCol, fillTarget.col),
    }
  }, [isFillDragging, fillTarget, selectedCell, selectionRange])

  // Bottom-right cell of current selection (for fill handle placement)
  const selectionBottomRight = useMemo(() => {
    if (!selectedCell) return null
    if (selectionRange) {
      return {
        row: Math.max(selectionRange.startRow, selectionRange.endRow),
        col: Math.max(selectionRange.startCol, selectionRange.endCol),
      }
    }
    return { row: selectedCell.row, col: selectedCell.col }
  }, [selectedCell, selectionRange])

  // Compute frozen area sizes
  const _frozenColsWidth = useMemo(() => {
    let w = 0
    for (let c = 0; c < frozenCols; c++) w += getColWidth(c)
    return w
  }, [frozenCols, getColWidth])

  const _frozenRowsHeight = useMemo(() => {
    let h = 0
    for (let r = 0; r < frozenRows; r++) h += getRowHeight(r)
    return h
  }, [frozenRows, getRowHeight])

  return (
    <div
      className="w-full h-full flex flex-col relative select-none"
      style={{ cursor: resizingCol !== null ? 'col-resize' : resizingRow !== null ? 'row-resize' : undefined }}
    >
      <div className="flex-1 overflow-auto relative">
        <table
          className="border-collapse"
          style={{ tableLayout: 'fixed' }}
          role="grid"
          aria-rowcount={sheet.rowCount}
          aria-colcount={sheet.colCount}
          aria-label="スプレッドシート"
        >
          <colgroup>
            <col style={{ width: HEADER_WIDTH }} />
            {Array.from({ length: sheet.colCount }, (_, c) => (
              <col key={c} style={{ width: getColWidth(c) }} />
            ))}
          </colgroup>

          {/* Column headers */}
          <thead>
            <tr style={{ height: HEADER_HEIGHT }}>
              <th
                className="sticky top-0 left-0 z-30 bg-slate-800 border-b border-r border-slate-700 text-[10px] text-slate-500 cursor-pointer hover:bg-slate-700"
                onClick={handleSelectAll}
                title="全選択"
              />
              {Array.from({ length: sheet.colCount }, (_, c) => {
                const isFrozenCol = c < frozenCols
                return (
                  <th
                    key={c}
                    className={`sticky top-0 ${isFrozenCol ? 'z-30' : 'z-20'} bg-slate-800 border-b border-r border-slate-700 text-[10px] font-medium text-slate-400 relative select-none ${
                      selectedCell?.col === c ? 'bg-indigo-900/40 text-indigo-300' : ''
                    }${c === frozenCols - 1 ? ' border-r-2 border-r-indigo-500' : ''}`}
                    style={isFrozenCol ? { position: 'sticky', left: colLeftPositions[c], zIndex: 31 } : undefined}
                    onClick={() => handleSelectColumn(c)}
                  >
                    <span className="flex items-center justify-center gap-0.5">
                      {colIndexToLetter(c)}
                      {/* Auto-filter dropdown arrow */}
                      {hasFilter && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setFilterDropdown(filterDropdown?.col === c ? null : { col: c })
                          }}
                          className="w-3.5 h-3.5 flex items-center justify-center rounded hover:bg-slate-600"
                          title="フィルター"
                        >
                          <ChevronDown size={10} />
                        </button>
                      )}
                    </span>
                    {/* Resize handle */}
                    <div
                      className="absolute top-0 right-0 bottom-0 w-1 cursor-col-resize hover:bg-indigo-500 z-10"
                      onMouseDown={(e) => handleColResizeStart(e, c)}
                    />
                    {/* Filter dropdown */}
                    {filterDropdown?.col === c && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setFilterDropdown(null)} />
                        <div className="absolute top-full left-0 mt-1 z-50 bg-slate-800 border border-slate-700 rounded-lg shadow-xl w-44 py-1 max-h-60 overflow-y-auto text-left">
                          <button
                            onClick={() => {
                              dispatch({ type: 'SET_FILTER', sheetId: sheet.id, col: c, values: [] })
                              setFilterDropdown(null)
                            }}
                            className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700 hover:text-white"
                          >
                            すべて表示
                          </button>
                          <div className="border-t border-slate-700 my-1" />
                          {getUniqueValues(c).map((val) => {
                            const currentFilter = sheet.filterState?.find((f) => f.col === c)
                            const isChecked =
                              !currentFilter || currentFilter.values.length === 0 || currentFilter.values.includes(val)
                            return (
                              <label
                                key={val}
                                className="flex items-center gap-2 px-3 py-1 text-xs text-slate-300 hover:bg-slate-700 cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {
                                    const current = sheet.filterState?.find((f) => f.col === c)?.values || []
                                    let newValues: string[]
                                    if (current.length === 0) {
                                      // Currently showing all, so deselect this one
                                      newValues = getUniqueValues(c).filter((v) => v !== val)
                                    } else if (current.includes(val)) {
                                      newValues = current.filter((v) => v !== val)
                                    } else {
                                      newValues = [...current, val]
                                    }
                                    dispatch({ type: 'SET_FILTER', sheetId: sheet.id, col: c, values: newValues })
                                  }}
                                  className="w-3 h-3 accent-indigo-500"
                                />
                                <span className="truncate">{val || '(空白)'}</span>
                              </label>
                            )
                          })}
                        </div>
                      </>
                    )}
                  </th>
                )
              })}
            </tr>
          </thead>

          <tbody>
            {Array.from({ length: sheet.rowCount }, (_, r) => {
              // Skip filtered-out rows
              if (visibleRows && visibleRows.has(r)) return null

              const isFrozenRow = r < frozenRows
              const rowH = getRowHeight(r)
              const isEvenRow = r % 2 === 0

              return (
                <tr key={r} style={{ height: rowH }}>
                  {/* Row header */}
                  <td
                    className={`sticky left-0 z-10 bg-slate-800 border-b border-r border-slate-700 text-[10px] font-medium text-slate-400 text-center select-none relative cursor-pointer hover:bg-slate-700 ${
                      selectedCell?.row === r ? 'bg-indigo-900/40 text-indigo-300' : ''
                    }${r === frozenRows - 1 ? ' border-b-2 border-b-indigo-500' : ''}`}
                    style={isFrozenRow ? { position: 'sticky', top: rowTopPositions[r], zIndex: 21 } : undefined}
                    onClick={() => handleSelectRow(r)}
                  >
                    {r + 1}
                    {/* Row resize handle */}
                    <div
                      className="absolute bottom-0 left-0 right-0 h-1 cursor-row-resize hover:bg-indigo-500 z-10"
                      onMouseDown={(e) => handleRowResizeStart(e, r)}
                    />
                  </td>

                  {/* Data cells */}
                  {Array.from({ length: sheet.colCount }, (_, c) => {
                    if (isCellHidden(r, c, sheet.mergedCells)) return null
                    const merge = getMerge(r, c, sheet.mergedCells)
                    const key = `${r}-${c}`
                    const cell = sheet.cells[key]
                    const computed = computedValues[key]
                    const isSelected = selectedCell?.row === r && selectedCell?.col === c
                    const isEditing = editingCell?.row === r && editingCell?.col === c
                    const inRange = isInRange(r, c, selectionRange)
                    const inCutRange = isInRange(r, c, cutRange || null)
                    const fmt = cell?.format || {}
                    const isFrozenCol = c < frozenCols

                    const displayValue = computed !== undefined ? formatCellValue(computed, fmt) : ''

                    // Build text decoration
                    const textDecorations: string[] = []
                    if (fmt.underline) textDecorations.push('underline')
                    if (fmt.strikethrough) textDecorations.push('line-through')

                    const cellStyle: React.CSSProperties = {
                      fontWeight: fmt.bold ? 'bold' : undefined,
                      fontStyle: fmt.italic ? 'italic' : undefined,
                      textDecoration: textDecorations.length > 0 ? textDecorations.join(' ') : undefined,
                      color: fmt.textColor || undefined,
                      backgroundColor: fmt.bgColor || (isEvenRow ? 'rgba(15, 23, 42, 0.3)' : undefined),
                      textAlign: fmt.align || 'left',
                      verticalAlign: fmt.verticalAlign || 'middle',
                      fontSize: fmt.fontSize ? `${fmt.fontSize}px` : '12px',
                      whiteSpace: fmt.wrap ? 'pre-wrap' : 'nowrap',
                      borderTop: fmt.borderTop || undefined,
                      borderRight: fmt.borderRight || undefined,
                      borderBottom: fmt.borderBottom || undefined,
                      borderLeft: fmt.borderLeft || undefined,
                    }

                    // Frozen pane sticky positioning
                    if (isFrozenRow && isFrozenCol) {
                      cellStyle.position = 'sticky'
                      cellStyle.top = rowTopPositions[r]
                      cellStyle.left = colLeftPositions[c]
                      cellStyle.zIndex = 15
                    } else if (isFrozenRow) {
                      cellStyle.position = 'sticky'
                      cellStyle.top = rowTopPositions[r]
                      cellStyle.zIndex = 12
                    } else if (isFrozenCol) {
                      cellStyle.position = 'sticky'
                      cellStyle.left = colLeftPositions[c]
                      cellStyle.zIndex = 11
                    }

                    // Conditional formatting overlay
                    const condStyle = getConditionalStyle(r, c, computed, sheet.conditionalFormats)
                    if (condStyle) {
                      if (condStyle.backgroundColor) cellStyle.backgroundColor = condStyle.backgroundColor
                      if (condStyle.color) cellStyle.color = condStyle.color
                      if (condStyle.fontWeight) cellStyle.fontWeight = condStyle.fontWeight
                    }

                    // Frozen pane divider borders
                    if (c === frozenCols - 1 && frozenCols > 0) {
                      cellStyle.borderRight = '2px solid rgb(99, 102, 241)'
                    }
                    if (r === frozenRows - 1 && frozenRows > 0) {
                      cellStyle.borderBottom = '2px solid rgb(99, 102, 241)'
                    }

                    const isFillRangeCell = fillRange && r >= fillRange.startRow && r <= fillRange.endRow && c >= fillRange.startCol && c <= fillRange.endCol
                    const isBottomRight = selectionBottomRight && r === selectionBottomRight.row && c === selectionBottomRight.col && !isEditing
                    const cellValidation = sheet.dataValidation?.[key]
                    const hasListValidation = cellValidation?.type === 'list'
                    const isListOpen = listDropdown?.row === r && listDropdown?.col === c

                    // Cut range dashed border (marching ants style)
                    if (inCutRange && cutRange) {
                      if (r === cutRange.startRow) cellStyle.borderTop = '2px dashed rgb(245, 158, 11)'
                      if (r === cutRange.endRow) cellStyle.borderBottom = '2px dashed rgb(245, 158, 11)'
                      if (c === cutRange.startCol) cellStyle.borderLeft = '2px dashed rgb(245, 158, 11)'
                      if (c === cutRange.endCol) cellStyle.borderRight = '2px dashed rgb(245, 158, 11)'
                    }

                    return (
                      <td
                        key={c}
                        rowSpan={merge?.rowSpan}
                        colSpan={merge?.colSpan}
                        className={`border-b border-r border-slate-800 px-1 relative overflow-hidden ${
                          isSelected ? 'outline outline-2 outline-indigo-500 z-[5]' : inRange ? 'bg-indigo-500/10' : ''
                        }${isFrozenCol || isFrozenRow ? ' bg-slate-900' : ''}${isFillRangeCell ? ' bg-indigo-500/20 outline-dashed outline-1 outline-indigo-400' : ''}${inCutRange ? ' bg-amber-500/5' : ''}`}
                        style={cellStyle}
                        onMouseDown={(e) => handleMouseDown(e, r, c)}
                        onMouseEnter={() => handleMouseEnter(r, c)}
                        onDoubleClick={() => onStartEdit(r, c)}
                        onContextMenu={(e) => {
                          e.preventDefault()
                          onSelectCell(r, c)
                          onContextMenu(e.clientX, e.clientY)
                        }}
                      >
                        {isEditing ? (
                          <>
                            <input
                              ref={editInputRef}
                              type="text"
                              value={editValue}
                              onChange={(e) => onEditValueChange(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault()
                                  onCommitEdit()
                                }
                                if (e.key === 'Escape') {
                                  e.preventDefault()
                                  onCancelEdit()
                                }
                                if (e.key === 'Tab') {
                                  e.preventDefault()
                                  onCommitEdit()
                                }
                                e.stopPropagation()
                              }}
                              onBlur={() => onCommitEdit()}
                              className="absolute inset-0 bg-slate-900 text-white text-xs px-1 outline-none border-2 border-indigo-500 font-mono z-10"
                              style={{ textAlign: fmt.align || 'left' }}
                            />
                            {validationError && isSelected && (
                              <div className="absolute top-full left-0 mt-0.5 z-20 bg-red-600 text-white text-[10px] px-2 py-1 rounded shadow-lg whitespace-nowrap">
                                {validationError}
                              </div>
                            )}
                          </>
                        ) : (
                          <>
                            <span className="text-xs leading-none pointer-events-none">{displayValue}</span>
                            {/* List validation dropdown arrow */}
                            {hasListValidation && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setListDropdown(isListOpen ? null : { row: r, col: c })
                                }}
                                className="absolute right-0 top-0 bottom-0 w-5 flex items-center justify-center text-slate-500 hover:text-indigo-400 hover:bg-slate-700/50"
                              >
                                <ChevronDown size={12} />
                              </button>
                            )}
                            {/* List dropdown */}
                            {isListOpen && cellValidation?.listValues && (
                              <>
                                <div className="fixed inset-0 z-30" onClick={() => setListDropdown(null)} />
                                <div className="absolute top-full left-0 mt-0.5 z-40 bg-slate-800 border border-slate-600 rounded shadow-xl w-full min-w-[100px] max-h-40 overflow-y-auto py-0.5">
                                  {cellValidation.listValues.map((val) => (
                                    <button
                                      key={val}
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        onListSelect?.(r, c, val)
                                        setListDropdown(null)
                                      }}
                                      className={`w-full text-left px-2 py-1 text-xs hover:bg-indigo-600 hover:text-white transition-colors ${
                                        displayValue === val ? 'text-indigo-400 bg-slate-700' : 'text-slate-300'
                                      }`}
                                    >
                                      {val}
                                    </button>
                                  ))}
                                </div>
                              </>
                            )}
                          </>
                        )}
                        {/* Fill handle */}
                        {isBottomRight && (
                          <div
                            className="absolute bottom-[-3px] right-[-3px] w-[7px] h-[7px] bg-indigo-500 border border-white cursor-crosshair z-[6]"
                            onMouseDown={handleFillHandleMouseDown}
                          />
                        )}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Status bar */}
      <div className="h-6 shrink-0 flex items-center justify-end gap-4 px-3 border-t border-slate-800 bg-slate-900 text-[10px] text-slate-400">
        {selectedCell && (
          <span>
            {colIndexToLetter(selectedCell.col)}
            {selectedCell.row + 1}
          </span>
        )}
        {selectionStats && selectionStats.count > 1 && (
          <>
            <span>選択: {selectionStats.count}セル</span>
            {selectionStats.numCount > 0 && (
              <>
                <span>合計: {selectionStats.sum.toLocaleString('ja-JP', { maximumFractionDigits: 4 })}</span>
                <span>平均: {selectionStats.avg.toLocaleString('ja-JP', { maximumFractionDigits: 4 })}</span>
              </>
            )}
          </>
        )}
        {frozenRows > 0 || frozenCols > 0 ? (
          <span className="text-indigo-400">
            固定: {frozenRows}行 {frozenCols}列
          </span>
        ) : null}
      </div>
    </div>
  )
})
