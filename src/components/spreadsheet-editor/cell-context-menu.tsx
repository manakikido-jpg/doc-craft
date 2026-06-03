'use client'

import { useState, useRef, useEffect } from 'react'
import type { Cell, Sheet } from '@/types'
import type { SelectionRange } from './spreadsheet-editor'
import { colIndexToLetter } from '@/lib/formula-engine'

interface CellContextMenuProps {
  x: number
  y: number
  selectedCell: { row: number; col: number }
  normalizedRange: SelectionRange | null
  activeSheet: Sheet
  clipboardRef: React.MutableRefObject<{ data: Record<string, Cell>; width: number; height: number } | null>
  computedValues: Record<string, string | number>
  dispatch: React.Dispatch<any>
  onClose: () => void
  onCut?: (range: SelectionRange) => void
  onPasteSpecial?: () => void
}

/* ─── Icons (inline SVG, 14×14) ────────────────────────────────────── */

function IconCut() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" />
      <line x1="20" y1="4" x2="8.12" y2="15.88" /><line x1="14.47" y1="14.48" x2="20" y2="20" />
      <line x1="8.12" y1="8.12" x2="12" y2="12" />
    </svg>
  )
}

function IconCopy() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  )
}

function IconPaste() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" />
    </svg>
  )
}

function IconTrash() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  )
}

function IconInsertRow() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  )
}

function IconChevronRight() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}

/* ─── Divider ──────────────────────────────────────────────────────── */

function Divider() {
  return <div className="border-t border-slate-700 my-1" />
}

/* ─── MenuItem ─────────────────────────────────────────────────────── */

function MenuItem({
  label,
  onClick,
  danger = false,
  shortcut,
  icon,
  disabled = false,
}: {
  label: string
  onClick: () => void
  danger?: boolean
  shortcut?: string
  icon?: React.ReactNode
  disabled?: boolean
}) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`w-full text-left px-3 py-1.5 text-sm flex items-center gap-2 ${
        disabled
          ? 'text-slate-600 cursor-default'
          : danger
            ? 'text-red-400 hover:bg-slate-700 hover:text-red-300'
            : 'text-slate-300 hover:bg-slate-700 hover:text-white'
      }`}
    >
      <span className="w-4 flex items-center justify-center">{icon ?? null}</span>
      <span className="flex-1 truncate">{label}</span>
      {shortcut && <span className="text-[10px] text-slate-500 ml-auto pl-4 whitespace-nowrap">{shortcut}</span>}
    </button>
  )
}

/* ─── SubMenu (hover-reveal) ───────────────────────────────────────── */

function SubMenu({
  label,
  icon,
  children,
}: {
  label: string
  icon?: React.ReactNode
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleEnter = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setOpen(true)
  }
  const handleLeave = () => {
    timerRef.current = setTimeout(() => setOpen(false), 150)
  }

  // Position submenu: try right, fall back to left
  const [flipX, setFlipX] = useState(false)
  useEffect(() => {
    if (open && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      if (rect.right + 200 > window.innerWidth) {
        setFlipX(true)
      } else {
        setFlipX(false)
      }
    }
  }, [open])

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <button className="w-full text-left px-3 py-1.5 text-sm flex items-center gap-2 text-slate-300 hover:bg-slate-700 hover:text-white">
        <span className="w-4 flex items-center justify-center">{icon ?? null}</span>
        <span className="flex-1 truncate">{label}</span>
        <IconChevronRight />
      </button>
      {open && (
        <div
          className="absolute top-0 bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-1 w-44 z-[60]"
          style={flipX ? { right: '100%' } : { left: '100%' }}
        >
          {children}
        </div>
      )}
    </div>
  )
}

/* ─── Main Component ───────────────────────────────────────────────── */

export function CellContextMenu({
  x,
  y,
  selectedCell,
  normalizedRange,
  activeSheet,
  clipboardRef,
  computedValues,
  dispatch,
  onClose,
  onCut,
  onPasteSpecial,
}: CellContextMenuProps) {
  const { row, col } = selectedCell
  const sheetId = activeSheet.id
  const menuRef = useRef<HTMLDivElement>(null)

  const rangeSpansMultiple =
    normalizedRange != null &&
    (normalizedRange.endRow > normalizedRange.startRow || normalizedRange.endCol > normalizedRange.startCol)

  const isMergedCell = activeSheet.mergedCells?.some((mc) => mc.startRow === row && mc.startCol === col)

  // Calculate how many rows/cols are selected
  const selectedRowCount = normalizedRange
    ? normalizedRange.endRow - normalizedRange.startRow + 1
    : 1
  const selectedColCount = normalizedRange
    ? normalizedRange.endCol - normalizedRange.startCol + 1
    : 1

  /* ── Viewport-safe positioning ──────────────────────────────────── */
  const [pos, setPos] = useState({ left: x, top: y })
  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect()
      const pad = 8
      let left = x
      let top = y
      if (x + rect.width + pad > window.innerWidth) left = window.innerWidth - rect.width - pad
      if (y + rect.height + pad > window.innerHeight) top = window.innerHeight - rect.height - pad
      if (left < pad) left = pad
      if (top < pad) top = pad
      setPos({ left, top })
    }
  }, [x, y])

  /* ── Clipboard helpers ──────────────────────────────────────────── */

  const copyRange = (range: SelectionRange) => {
    const data: Record<string, Cell> = {}
    const tsvRows: string[] = []
    for (let r = range.startRow; r <= range.endRow; r++) {
      const rowVals: string[] = []
      for (let c = range.startCol; c <= range.endCol; c++) {
        const key = `${r}-${c}`
        if (activeSheet.cells[key]) {
          data[`${r - range.startRow}-${c - range.startCol}`] = { ...activeSheet.cells[key] }
        }
        const cv = computedValues[key]
        rowVals.push(cv != null ? String(cv) : activeSheet.cells[key]?.value || '')
      }
      tsvRows.push(rowVals.join('\t'))
    }
    clipboardRef.current = {
      data,
      width: range.endCol - range.startCol + 1,
      height: range.endRow - range.startRow + 1,
    }
    try { navigator.clipboard.writeText(tsvRows.join('\n')) } catch (e) { console.warn('Clipboard write failed:', e) }
  }

  const handleCopy = () => {
    if (!normalizedRange) { onClose(); return }
    copyRange(normalizedRange)
    onClose()
  }

  const handleCut = () => {
    if (!normalizedRange) { onClose(); return }
    copyRange(normalizedRange)
    onCut?.(normalizedRange)
    onClose()
  }

  const handlePaste = () => {
    navigator.clipboard.readText().then((text) => {
      if (text && text.includes('\t')) {
        const rows = text.split(/\r?\n/).filter((r) => r.length > 0)
        const extData: Record<string, Cell> = {}
        rows.forEach((rowStr, ri) => {
          rowStr.split('\t').forEach((val, ci) => {
            if (val) extData[`${ri}-${ci}`] = { value: val }
          })
        })
        dispatch({ type: 'PASTE_CELLS', sheetId, startRow: row, startCol: col, data: extData })
      } else if (clipboardRef.current) {
        dispatch({ type: 'PASTE_CELLS', sheetId, startRow: row, startCol: col, data: clipboardRef.current.data })
      } else if (text) {
        dispatch({ type: 'SET_CELL_VALUE', sheetId, row, col, value: text.trim() })
      }
    }).catch(() => {
      if (clipboardRef.current) {
        dispatch({ type: 'PASTE_CELLS', sheetId, startRow: row, startCol: col, data: clipboardRef.current.data })
      }
    })
    onClose()
  }

  const handleClear = () => {
    if (!normalizedRange) { onClose(); return }
    dispatch({
      type: 'CLEAR_CELLS',
      sheetId,
      startRow: normalizedRange.startRow,
      startCol: normalizedRange.startCol,
      endRow: normalizedRange.endRow,
      endCol: normalizedRange.endCol,
    })
    onClose()
  }

  /* ── Multi-row / multi-col insert helpers ────────────────────────── */

  const insertRows = (atRow: number, count: number) => {
    // Insert from bottom-up so indices stay valid
    for (let i = 0; i < count; i++) {
      dispatch({ type: 'INSERT_ROW', sheetId, atRow })
    }
    onClose()
  }

  const deleteRows = (startRow: number, count: number) => {
    // Delete from bottom-up so indices stay valid
    for (let i = count - 1; i >= 0; i--) {
      dispatch({ type: 'DELETE_ROW', sheetId, row: startRow + i })
    }
    onClose()
  }

  const insertCols = (atCol: number, count: number) => {
    for (let i = 0; i < count; i++) {
      dispatch({ type: 'INSERT_COL', sheetId, atCol })
    }
    onClose()
  }

  const deleteCols = (startCol: number, count: number) => {
    for (let i = count - 1; i >= 0; i--) {
      dispatch({ type: 'DELETE_COL', sheetId, col: startCol + i })
    }
    onClose()
  }

  /* ── Number format helper ───────────────────────────────────────── */

  const applyNumberFormat = (numberFormat: 'plain' | 'number' | 'currency' | 'percent' | 'date') => {
    if (normalizedRange) {
      dispatch({
        type: 'SET_RANGE_FORMAT',
        sheetId,
        startRow: normalizedRange.startRow,
        startCol: normalizedRange.startCol,
        endRow: normalizedRange.endRow,
        endCol: normalizedRange.endCol,
        format: { numberFormat },
      })
    } else {
      dispatch({ type: 'SET_CELL_FORMAT', sheetId, row, col, format: { numberFormat } })
    }
    onClose()
  }

  /* ── Render ─────────────────────────────────────────────────────── */

  const startRow = normalizedRange?.startRow ?? row
  const startCol = normalizedRange?.startCol ?? col

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        ref={menuRef}
        className="fixed z-50 bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-1 w-56 text-sm"
        style={{ left: pos.left, top: pos.top }}
      >
        {/* ── Clipboard group ─────────────────────────────────────── */}
        <MenuItem label="切り取り" onClick={handleCut} icon={<IconCut />} shortcut="Ctrl+X" />
        <MenuItem label="コピー" onClick={handleCopy} icon={<IconCopy />} shortcut="Ctrl+C" />
        <MenuItem label="貼り付け" onClick={handlePaste} icon={<IconPaste />} shortcut="Ctrl+V" />
        <MenuItem
          label="形式を選択して貼り付け..."
          onClick={() => { onPasteSpecial?.(); onClose() }}
          shortcut="Ctrl+Shift+V"
        />
        <MenuItem label="内容をクリア" onClick={handleClear} icon={<IconTrash />} shortcut="Del" />

        <Divider />

        {/* ── Insert rows/cols ─────────────────────────────────────── */}
        {selectedRowCount > 1 ? (
          <>
            <MenuItem
              label={`上に${selectedRowCount}行を挿入`}
              onClick={() => insertRows(startRow, selectedRowCount)}
              icon={<IconInsertRow />}
            />
            <MenuItem
              label={`下に${selectedRowCount}行を挿入`}
              onClick={() => insertRows(startRow + selectedRowCount, selectedRowCount)}
              icon={<IconInsertRow />}
            />
          </>
        ) : (
          <>
            <MenuItem
              label="上に行を挿入"
              onClick={() => { dispatch({ type: 'INSERT_ROW', sheetId, atRow: row }); onClose() }}
              icon={<IconInsertRow />}
            />
            <MenuItem
              label="下に行を挿入"
              onClick={() => { dispatch({ type: 'INSERT_ROW', sheetId, atRow: row + 1 }); onClose() }}
              icon={<IconInsertRow />}
            />
          </>
        )}
        {selectedColCount > 1 ? (
          <>
            <MenuItem
              label={`左に${selectedColCount}列を挿入`}
              onClick={() => insertCols(startCol, selectedColCount)}
              icon={<IconInsertRow />}
            />
            <MenuItem
              label={`右に${selectedColCount}列を挿入`}
              onClick={() => insertCols(startCol + selectedColCount, selectedColCount)}
              icon={<IconInsertRow />}
            />
          </>
        ) : (
          <>
            <MenuItem
              label="左に列を挿入"
              onClick={() => { dispatch({ type: 'INSERT_COL', sheetId, atCol: col }); onClose() }}
              icon={<IconInsertRow />}
            />
            <MenuItem
              label="右に列を挿入"
              onClick={() => { dispatch({ type: 'INSERT_COL', sheetId, atCol: col + 1 }); onClose() }}
              icon={<IconInsertRow />}
            />
          </>
        )}

        <Divider />

        {/* ── Delete rows/cols ─────────────────────────────────────── */}
        {selectedRowCount > 1 ? (
          <MenuItem
            label={`${selectedRowCount}行を削除`}
            onClick={() => deleteRows(startRow, selectedRowCount)}
            danger
          />
        ) : (
          <MenuItem
            label="行を削除"
            onClick={() => { dispatch({ type: 'DELETE_ROW', sheetId, row }); onClose() }}
            danger
          />
        )}
        {selectedColCount > 1 ? (
          <MenuItem
            label={`${selectedColCount}列を削除`}
            onClick={() => deleteCols(startCol, selectedColCount)}
            danger
          />
        ) : (
          <MenuItem
            label="列を削除"
            onClick={() => { dispatch({ type: 'DELETE_COL', sheetId, col }); onClose() }}
            danger
          />
        )}

        {/* ── Merge / Unmerge ─────────────────────────────────────── */}
        {rangeSpansMultiple && (
          <>
            <Divider />
            <MenuItem
              label="セルを結合"
              onClick={() => {
                dispatch({
                  type: 'MERGE_CELLS',
                  sheetId,
                  startRow: normalizedRange!.startRow,
                  startCol: normalizedRange!.startCol,
                  endRow: normalizedRange!.endRow,
                  endCol: normalizedRange!.endCol,
                })
                onClose()
              }}
            />
          </>
        )}
        {isMergedCell && (
          <MenuItem
            label="結合解除"
            onClick={() => {
              dispatch({ type: 'UNMERGE_CELLS', sheetId, startRow: row, startCol: col })
              onClose()
            }}
          />
        )}

        <Divider />

        {/* ── Number format submenu ────────────────────────────────── */}
        <SubMenu label="表示形式">
          <MenuItem label="標準" onClick={() => applyNumberFormat('plain')} />
          <MenuItem label="数値 (1,234.56)" onClick={() => applyNumberFormat('number')} />
          <MenuItem label="通貨 (¥1,234)" onClick={() => applyNumberFormat('currency')} />
          <MenuItem label="パーセント (50.0%)" onClick={() => applyNumberFormat('percent')} />
          <MenuItem label="日付 (2025/01/01)" onClick={() => applyNumberFormat('date')} />
        </SubMenu>

        <Divider />

        {/* ── Hide / Show rows/cols ────────────────────────────────── */}
        <MenuItem
          label={selectedRowCount > 1 ? `${selectedRowCount}行を非表示` : `行 ${row + 1} を非表示`}
          onClick={() => {
            const rows = normalizedRange
              ? Array.from({ length: normalizedRange.endRow - normalizedRange.startRow + 1 }, (_, i) => normalizedRange.startRow + i)
              : [row]
            dispatch({ type: 'HIDE_ROWS', sheetId, rows })
            onClose()
          }}
        />
        <MenuItem
          label={selectedColCount > 1 ? `${selectedColCount}列を非表示` : `列 ${colIndexToLetter(col)} を非表示`}
          onClick={() => {
            const cols = normalizedRange
              ? Array.from({ length: normalizedRange.endCol - normalizedRange.startCol + 1 }, (_, i) => normalizedRange.startCol + i)
              : [col]
            dispatch({ type: 'HIDE_COLS', sheetId, cols })
            onClose()
          }}
        />
        {(activeSheet.hiddenRows?.length ?? 0) > 0 && (
          <MenuItem
            label={`非表示の行を表示 (${activeSheet.hiddenRows!.length}行)`}
            onClick={() => {
              dispatch({ type: 'SHOW_ROWS', sheetId, rows: activeSheet.hiddenRows! })
              onClose()
            }}
          />
        )}
        {(activeSheet.hiddenCols?.length ?? 0) > 0 && (
          <MenuItem
            label={`非表示の列を表示 (${activeSheet.hiddenCols!.length}列)`}
            onClick={() => {
              dispatch({ type: 'SHOW_COLS', sheetId, cols: activeSheet.hiddenCols! })
              onClose()
            }}
          />
        )}

        <Divider />

        {/* ── Hyperlink & Comment ──────────────────────────────────── */}
        {(() => {
          const cellKey = `${row}-${col}`
          const currentCell = activeSheet.cells[cellKey]
          const hasComment = !!currentCell?.comment
          const hasHyperlink = !!currentCell?.hyperlink
          return (
            <>
              <MenuItem
                label="ハイパーリンクを挿入"
                onClick={() => {
                  const url = window.prompt('URLを入力:', currentCell?.hyperlink?.url || '')
                  if (url !== null && url.trim()) {
                    const label = window.prompt('表示テキスト (空欄でセルの値を使用):', currentCell?.hyperlink?.label || '')
                    dispatch({ type: 'SET_CELL_HYPERLINK', sheetId, row, col, url: url.trim(), label: label || undefined })
                  }
                  onClose()
                }}
              />
              {hasHyperlink && (
                <MenuItem
                  label="ハイパーリンクを削除"
                  onClick={() => {
                    dispatch({ type: 'REMOVE_CELL_HYPERLINK', sheetId, row, col })
                    onClose()
                  }}
                  danger
                />
              )}
              <Divider />
              <MenuItem
                label={hasComment ? 'コメントを編集' : 'コメントを追加'}
                onClick={() => {
                  const comment = window.prompt('コメントを入力:', currentCell?.comment || '')
                  if (comment !== null) {
                    dispatch({ type: 'SET_CELL_COMMENT', sheetId, row, col, comment })
                  }
                  onClose()
                }}
              />
              {hasComment && (
                <MenuItem
                  label="コメントを削除"
                  onClick={() => {
                    dispatch({ type: 'DELETE_CELL_COMMENT', sheetId, row, col })
                    onClose()
                  }}
                  danger
                />
              )}
            </>
          )
        })()}
      </div>
    </>
  )
}
