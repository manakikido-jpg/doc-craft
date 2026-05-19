'use client'

import { useState, useRef, useEffect } from 'react'
import type { Sheet } from '@/types'
import type { SpreadsheetAction } from '@/hooks/use-spreadsheet'
import type { UndoableAction } from '@/lib/undoable'
import { Plus } from 'lucide-react'

interface Props {
  sheets: Sheet[]
  activeSheetId: string
  dispatch: (action: UndoableAction<SpreadsheetAction>) => void
}

export default function SheetTabs({ sheets, activeSheetId, dispatch }: Props) {
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; sheetId: string } | null>(null)
  const renameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (renamingId && renameInputRef.current) {
      renameInputRef.current.focus()
      renameInputRef.current.select()
    }
  }, [renamingId])

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

  return (
    <div className="flex items-center border-t border-slate-800 bg-slate-900 shrink-0 px-2 py-1 gap-1 overflow-x-auto no-scrollbar">
      {sheets.map((sheet) => (
        <div key={sheet.id} className="relative">
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
              }}
              className={`h-7 px-3 text-xs rounded transition-colors whitespace-nowrap ${
                sheet.id === activeSheetId
                  ? 'bg-slate-700 text-white font-medium'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {sheet.name}
            </button>
          )}
        </div>
      ))}

      <button
        onClick={() => dispatch({ type: 'ADD_SHEET' })}
        className="w-7 h-7 flex items-center justify-center rounded text-slate-500 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
        title="シート追加"
      >
        <Plus size={14} />
      </button>

      {/* Context menu for sheet tabs */}
      {contextMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setContextMenu(null)} />
          <div
            className="fixed z-50 bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-1 w-36 text-sm"
            style={{ left: contextMenu.x, top: contextMenu.y - 120 }}
          >
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
            <button
              onClick={() => {
                dispatch({ type: 'DUPLICATE_SHEET', id: contextMenu.sheetId })
                setContextMenu(null)
              }}
              className="w-full text-left px-3 py-1.5 text-slate-300 hover:bg-slate-700 hover:text-white"
            >
              複製
            </button>
            {sheets.length > 1 && (
              <button
                onClick={() => {
                  dispatch({ type: 'DELETE_SHEET', id: contextMenu.sheetId })
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
