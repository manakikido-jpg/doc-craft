'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import type { Sheet } from '@/types'
import type { SpreadsheetAction } from '@/hooks/use-spreadsheet'
import type { UndoableAction } from '@/lib/undoable'
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import { generateId } from '@/lib/utils'

interface Props {
  sheets: Sheet[]
  activeSheetId: string
  dispatch: (action: UndoableAction<SpreadsheetAction>) => void
}

const TAB_COLORS = [
  { label: '赤', value: '#ef4444' },
  { label: 'オレンジ', value: '#f97316' },
  { label: '黄', value: '#eab308' },
  { label: '緑', value: '#22c55e' },
  { label: '青', value: '#3b82f6' },
  { label: '紫', value: '#a855f7' },
  { label: 'ピンク', value: '#ec4899' },
  { label: 'グレー', value: '#6b7280' },
]

export default function SheetTabs({ sheets, activeSheetId, dispatch }: Props) {
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; sheetId: string } | null>(null)
  const [colorSubmenuOpen, setColorSubmenuOpen] = useState(false)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [dragSourceIndex, setDragSourceIndex] = useState<number | null>(null)
  const [showLeftArrow, setShowLeftArrow] = useState(false)
  const [showRightArrow, setShowRightArrow] = useState(false)
  const [sheetListMenu, setSheetListMenu] = useState<{ x: number; y: number } | null>(null)
  const renameInputRef = useRef<HTMLInputElement>(null)
  const tabsContainerRef = useRef<HTMLDivElement>(null)
  const tabsInnerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (renamingId && renameInputRef.current) {
      renameInputRef.current.focus()
      renameInputRef.current.select()
    }
  }, [renamingId])

  // Check scroll overflow and arrow visibility
  const checkOverflow = useCallback(() => {
    const container = tabsContainerRef.current
    if (!container) return
    const hasOverflow = container.scrollWidth > container.clientWidth + 1
    setShowLeftArrow(hasOverflow && container.scrollLeft > 1)
    setShowRightArrow(
      hasOverflow && container.scrollLeft < container.scrollWidth - container.clientWidth - 1
    )
  }, [])

  useEffect(() => {
    checkOverflow()
    const container = tabsContainerRef.current
    if (!container) return

    const ro = new ResizeObserver(checkOverflow)
    ro.observe(container)

    container.addEventListener('scroll', checkOverflow, { passive: true })
    return () => {
      ro.disconnect()
      container.removeEventListener('scroll', checkOverflow)
    }
  }, [sheets.length, checkOverflow])

  function handleDoubleClick(sheet: Sheet) {
    setRenamingId(sheet.id)
    setRenameValue(sheet.name)
  }

  function commitRename() {
    if (renamingId && renameValue.trim()) {
      dispatch({ type: 'RENAME_SHEET', id: renamingId, name: renameValue.trim() })
    }
    setRenamingId(null)
  }

  function scrollTabs(direction: 'left' | 'right') {
    const container = tabsContainerRef.current
    if (container) {
      const amount = 150
      container.scrollBy({ left: direction === 'left' ? -amount : amount, behavior: 'smooth' })
    }
  }

  // Right-click on scroll arrow to show sheet list
  function handleArrowContextMenu(e: React.MouseEvent) {
    e.preventDefault()
    setSheetListMenu({ x: e.clientX, y: e.clientY })
  }

  // Double-click on empty tab area to add new sheet
  function handleEmptyAreaDoubleClick(e: React.MouseEvent) {
    // Make sure the click is on the container itself, not on a tab
    if (e.target === tabsContainerRef.current || e.target === tabsInnerRef.current) {
      dispatch({ type: 'ADD_SHEET' })
    }
  }

  // ── Drag and drop handlers ──

  function handleDragStart(e: React.DragEvent, index: number) {
    setDragSourceIndex(index)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(index))
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragSourceIndex !== null && index !== dragSourceIndex) {
      setDragOverIndex(index)
    }
  }

  function handleDragLeave() {
    setDragOverIndex(null)
  }

  function handleDrop(e: React.DragEvent, toIndex: number) {
    e.preventDefault()
    const fromIndex = dragSourceIndex
    setDragOverIndex(null)
    setDragSourceIndex(null)
    if (fromIndex !== null && fromIndex !== toIndex) {
      dispatch({ type: 'REORDER_SHEETS', fromIndex, toIndex })
    }
  }

  function handleDragEnd() {
    setDragOverIndex(null)
    setDragSourceIndex(null)
  }

  // ── Context menu helpers ──

  function insertSheetAt(index: number) {
    const newSheet: Sheet = {
      id: generateId(),
      name: `Sheet${sheets.length + 1}`,
      cells: {},
      colWidths: {},
      rowHeights: {},
      mergedCells: [],
      rowCount: 50,
      colCount: 52,
    }
    dispatch({ type: 'INSERT_SHEET_AT', sheet: newSheet, atIndex: index })
  }

  return (
    <div className="flex items-center border-t border-slate-800 bg-slate-900 shrink-0 px-1 py-1 gap-0">
      {/* Left scroll arrow */}
      {showLeftArrow && (
        <button
          onClick={() => scrollTabs('left')}
          onContextMenu={handleArrowContextMenu}
          className="w-6 h-7 flex items-center justify-center rounded text-slate-500 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
          title="左にスクロール（右クリックでシート一覧）"
        >
          <ChevronLeft size={14} />
        </button>
      )}

      {/* Tabs container */}
      <div
        ref={tabsContainerRef}
        className="flex items-center gap-1 overflow-x-hidden flex-1 px-1 scroll-smooth"
        onDoubleClick={handleEmptyAreaDoubleClick}
      >
        <div ref={tabsInnerRef} className="flex items-center gap-1">
          {sheets.map((sheet, index) => (
            <div
              key={sheet.id}
              className="relative flex items-center"
              draggable={renamingId !== sheet.id}
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
            >
              {/* Drag insertion marker - left side */}
              {dragOverIndex === index && dragSourceIndex !== null && dragSourceIndex > index && (
                <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-indigo-400 rounded-full z-10 -translate-x-1" />
              )}

              {renamingId === sheet.id ? (
                <input
                  ref={renameInputRef}
                  type="text"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitRename()
                    if (e.key === 'Escape') setRenamingId(null)
                  }}
                  onBlur={commitRename}
                  className="h-7 px-3 text-xs bg-slate-800 text-white border border-indigo-500 rounded outline-none min-w-[60px]"
                />
              ) : (
                <button
                  onClick={() => dispatch({ type: 'SET_ACTIVE', id: sheet.id })}
                  onDoubleClick={() => handleDoubleClick(sheet)}
                  onContextMenu={(e) => {
                    e.preventDefault()
                    setContextMenu({ x: e.clientX, y: e.clientY, sheetId: sheet.id })
                    setColorSubmenuOpen(false)
                  }}
                  className={`h-7 px-3 text-xs rounded transition-colors whitespace-nowrap select-none ${
                    sheet.id === activeSheetId
                      ? 'bg-slate-700 text-white font-medium'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  } ${dragSourceIndex === index ? 'opacity-40' : ''}`}
                  style={{ borderBottom: sheet.color ? `3px solid ${sheet.color}` : undefined }}
                >
                  {sheet.name}
                </button>
              )}

              {/* Drag insertion marker - right side */}
              {dragOverIndex === index && dragSourceIndex !== null && dragSourceIndex < index && (
                <div className="absolute right-0 top-0 bottom-0 w-0.5 bg-indigo-400 rounded-full z-10 translate-x-1" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Right scroll arrow */}
      {showRightArrow && (
        <button
          onClick={() => scrollTabs('right')}
          onContextMenu={handleArrowContextMenu}
          className="w-6 h-7 flex items-center justify-center rounded text-slate-500 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
          title="右にスクロール（右クリックでシート一覧）"
        >
          <ChevronRight size={14} />
        </button>
      )}

      {/* Add sheet button */}
      <button
        onClick={() => dispatch({ type: 'ADD_SHEET' })}
        className="w-7 h-7 flex items-center justify-center rounded text-slate-500 hover:text-white hover:bg-slate-800 transition-colors shrink-0 ml-1"
        title="シート追加"
      >
        <Plus size={14} />
      </button>

      {/* Sheet list popup (right-click on scroll arrows) */}
      {sheetListMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setSheetListMenu(null)} />
          <div
            className="fixed z-50 bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-1 w-44 text-sm max-h-60 overflow-y-auto"
            style={{ left: sheetListMenu.x, top: sheetListMenu.y - Math.min(sheets.length * 28 + 8, 240) }}
          >
            <div className="text-[10px] text-slate-500 font-medium px-3 py-1">シート一覧</div>
            {sheets.map((sheet) => (
              <button
                key={sheet.id}
                onClick={() => {
                  dispatch({ type: 'SET_ACTIVE', id: sheet.id })
                  setSheetListMenu(null)
                  // Scroll tab into view
                  const idx = sheets.findIndex((s) => s.id === sheet.id)
                  const container = tabsContainerRef.current
                  const inner = tabsInnerRef.current
                  if (container && inner && idx >= 0) {
                    const tab = inner.children[idx] as HTMLElement
                    if (tab) {
                      tab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
                    }
                  }
                }}
                className={`w-full text-left px-3 py-1.5 transition-colors flex items-center gap-2 ${
                  sheet.id === activeSheetId
                    ? 'text-indigo-400 bg-slate-700 font-medium'
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                {sheet.color && (
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: sheet.color }}
                  />
                )}
                <span className="truncate">{sheet.name}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Context menu for sheet tabs */}
      {contextMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setContextMenu(null)} />
          <div
            className="fixed z-50 bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-1 w-40 text-sm"
            style={{ left: contextMenu.x, top: contextMenu.y - 200 }}
          >
            {/* 名前変更 */}
            <button
              onClick={() => {
                const sheet = sheets.find((s) => s.id === contextMenu.sheetId)
                if (sheet) {
                  setRenamingId(sheet.id)
                  setRenameValue(sheet.name)
                }
                setContextMenu(null)
              }}
              className="w-full text-left px-3 py-1.5 text-slate-300 hover:bg-slate-700 hover:text-white"
            >
              名前変更
            </button>

            {/* タブの色 */}
            <div className="relative">
              <button
                onClick={() => setColorSubmenuOpen((v) => !v)}
                className="w-full text-left px-3 py-1.5 text-slate-300 hover:bg-slate-700 hover:text-white flex items-center justify-between"
              >
                タブの色
                <span className="text-[10px]">&#9654;</span>
              </button>
              {colorSubmenuOpen && (
                <div className="absolute left-full top-0 ml-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-2 px-2 w-[120px] z-50">
                  <div className="grid grid-cols-4 gap-1.5 mb-2">
                    {TAB_COLORS.map((c) => (
                      <button
                        key={c.value}
                        title={c.label}
                        onClick={() => {
                          dispatch({ type: 'SET_SHEET_COLOR', id: contextMenu.sheetId, color: c.value })
                          setContextMenu(null)
                          setColorSubmenuOpen(false)
                        }}
                        className="w-6 h-6 rounded-full border border-slate-600 hover:scale-110 transition-transform"
                        style={{ backgroundColor: c.value }}
                      />
                    ))}
                  </div>
                  <button
                    onClick={() => {
                      dispatch({ type: 'SET_SHEET_COLOR', id: contextMenu.sheetId, color: '' })
                      setContextMenu(null)
                      setColorSubmenuOpen(false)
                    }}
                    className="w-full text-left px-1 py-1 text-xs text-slate-400 hover:bg-slate-700 hover:text-white rounded"
                  >
                    色をリセット
                  </button>
                </div>
              )}
            </div>

            <div className="border-t border-slate-700 my-1" />

            {/* 複製 */}
            <button
              onClick={() => {
                dispatch({ type: 'DUPLICATE_SHEET', id: contextMenu.sheetId })
                setContextMenu(null)
              }}
              className="w-full text-left px-3 py-1.5 text-slate-300 hover:bg-slate-700 hover:text-white"
            >
              複製
            </button>

            {/* 左に挿入 */}
            <button
              onClick={() => {
                const idx = sheets.findIndex((s) => s.id === contextMenu.sheetId)
                if (idx >= 0) insertSheetAt(idx)
                setContextMenu(null)
              }}
              className="w-full text-left px-3 py-1.5 text-slate-300 hover:bg-slate-700 hover:text-white"
            >
              左に挿入
            </button>

            {/* 右に挿入 */}
            <button
              onClick={() => {
                const idx = sheets.findIndex((s) => s.id === contextMenu.sheetId)
                if (idx >= 0) insertSheetAt(idx + 1)
                setContextMenu(null)
              }}
              className="w-full text-left px-3 py-1.5 text-slate-300 hover:bg-slate-700 hover:text-white"
            >
              右に挿入
            </button>

            <div className="border-t border-slate-700 my-1" />

            {/* 非表示 */}
            {sheets.length > 1 && (
              <button
                onClick={() => {
                  setContextMenu(null)
                }}
                className="w-full text-left px-3 py-1.5 text-slate-400 hover:bg-slate-700 cursor-not-allowed"
                title="この機能は未対応です"
              >
                非表示
              </button>
            )}

            {/* 削除 */}
            {sheets.length > 1 && (
              <button
                onClick={() => {
                  if (sheets.length > 1) {
                    const ok = window.confirm('このシートを削除しますか？')
                    if (ok) {
                      dispatch({ type: 'DELETE_SHEET', id: contextMenu.sheetId })
                    }
                  }
                  setContextMenu(null)
                }}
                className="w-full text-left px-3 py-1.5 text-red-400 hover:bg-slate-700 hover:text-red-300"
              >
                削除
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
