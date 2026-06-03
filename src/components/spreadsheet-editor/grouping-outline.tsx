'use client'

import { useCallback } from 'react'
import type { Sheet } from '@/types'
import type { SpreadsheetAction } from '@/hooks/use-spreadsheet'
import type { UndoableAction } from '@/lib/undoable'

interface Props {
  sheet: Sheet
  dispatch: (action: UndoableAction<SpreadsheetAction>) => void
  orientation: 'row' | 'col'
}

export default function GroupingOutline({ sheet, dispatch, orientation }: Props) {
  const groups = orientation === 'row' ? (sheet.rowGroups ?? []) : (sheet.colGroups ?? [])

  const handleToggle = useCallback(
    (index: number) => {
      dispatch({
        type: 'TOGGLE_GROUP_COLLAPSE',
        sheetId: sheet.id,
        groupType: orientation,
        index,
      })
    },
    [dispatch, sheet.id, orientation],
  )

  if (groups.length === 0) return null

  if (orientation === 'row') {
    return (
      <div className="absolute left-0 top-0 w-5 h-full z-10 pointer-events-none">
        {groups.map((group, idx) => {
          const topPx = group.start * 28
          const heightPx = (group.end - group.start + 1) * 28
          return (
            <div
              key={idx}
              className="absolute pointer-events-auto"
              style={{ top: topPx + 28, left: 0, height: heightPx, width: 18 }}
            >
              {/* Vertical line */}
              <div className="absolute left-2 top-0 w-px h-full bg-slate-500" />
              {/* Bottom bracket */}
              <div className="absolute left-2 bottom-0 w-2 h-px bg-slate-500" />
              {/* Top bracket */}
              <div className="absolute left-2 top-0 w-2 h-px bg-slate-500" />
              {/* Toggle button */}
              <button
                onClick={() => handleToggle(idx)}
                className="absolute -left-0.5 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center bg-slate-800 border border-slate-600 rounded text-[9px] text-slate-300 hover:bg-slate-700 hover:text-white"
                title={group.collapsed ? '展開' : '折りたたみ'}
              >
                {group.collapsed ? '+' : '−'}
              </button>
            </div>
          )
        })}
      </div>
    )
  }

  // Column orientation
  return (
    <div className="absolute left-0 top-0 w-full h-5 z-10 pointer-events-none">
      {groups.map((group, idx) => {
        const leftPx = group.start * 80
        const widthPx = (group.end - group.start + 1) * 80
        return (
          <div
            key={idx}
            className="absolute pointer-events-auto"
            style={{ left: leftPx + 40, top: 0, width: widthPx, height: 18 }}
          >
            {/* Horizontal line */}
            <div className="absolute top-2 left-0 w-full h-px bg-slate-500" />
            {/* Left bracket */}
            <div className="absolute top-2 left-0 w-px h-2 bg-slate-500" />
            {/* Right bracket */}
            <div className="absolute top-2 right-0 w-px h-2 bg-slate-500" />
            {/* Toggle button */}
            <button
              onClick={() => handleToggle(idx)}
              className="absolute left-1/2 -translate-x-1/2 -top-0.5 w-4 h-4 flex items-center justify-center bg-slate-800 border border-slate-600 rounded text-[9px] text-slate-300 hover:bg-slate-700 hover:text-white"
              title={group.collapsed ? '展開' : '折りたたみ'}
            >
              {group.collapsed ? '+' : '−'}
            </button>
          </div>
        )
      })}
    </div>
  )
}
