'use client'

import { X } from 'lucide-react'

interface FindReplaceDialogProps {
  mode: 'find' | 'replace'
  onModeChange: (mode: 'find' | 'replace') => void
  onClose: () => void
  findText: string
  onFindTextChange: (text: string) => void
  replaceText: string
  onReplaceTextChange: (text: string) => void
  findResults: { row: number; col: number }[]
  findIndex: number
  onFind: () => void
  onFindNext: () => void
  onFindPrev: () => void
  onReplace: () => void
  onReplaceAll: () => void
}

export function FindReplaceDialog({
  mode,
  onModeChange,
  onClose,
  findText,
  onFindTextChange,
  replaceText,
  onReplaceTextChange,
  findResults,
  findIndex,
  onFind,
  onFindNext,
  onFindPrev,
  onReplace,
  onReplaceAll,
}: FindReplaceDialogProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="検索と置換"
      className="absolute top-2 right-2 z-50 bg-slate-800 border border-slate-600 rounded-lg shadow-xl p-3 w-80"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex gap-1">
          <button
            className={`px-3 py-1 text-xs rounded ${
              mode === 'find' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
            onClick={() => onModeChange('find')}
          >
            検索
          </button>
          <button
            className={`px-3 py-1 text-xs rounded ${
              mode === 'replace' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
            onClick={() => onModeChange('replace')}
          >
            置換
          </button>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-white">
          <X size={16} />
        </button>
      </div>

      <div className="space-y-2">
        <div className="flex gap-1">
          <input
            type="text"
            value={findText}
            onChange={(e) => onFindTextChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                if (findResults.length > 0) {
                  onFindNext()
                } else {
                  onFind()
                }
              } else if (e.key === 'Escape') {
                onClose()
              }
            }}
            placeholder="検索テキスト..."
            className="flex-1 px-2 py-1 text-sm bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
            autoFocus
          />
          <button onClick={onFind} className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">
            検索
          </button>
        </div>

        {mode === 'replace' && (
          <div className="flex gap-1">
            <input
              type="text"
              value={replaceText}
              onChange={(e) => onReplaceTextChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  onClose()
                }
              }}
              placeholder="置換テキスト..."
              className="flex-1 px-2 py-1 text-sm bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={onReplace}
              className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
            >
              置換
            </button>
            <button
              onClick={onReplaceAll}
              className="px-2 py-1 text-xs bg-orange-600 text-white rounded hover:bg-orange-700"
            >
              全置換
            </button>
          </div>
        )}

        {findResults.length > 0 && (
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span>
              {findIndex + 1} / {findResults.length} 件
            </span>
            <div className="flex gap-1">
              <button onClick={onFindPrev} className="px-2 py-0.5 bg-slate-700 rounded hover:bg-slate-600">
                ▲
              </button>
              <button onClick={onFindNext} className="px-2 py-0.5 bg-slate-700 rounded hover:bg-slate-600">
                ▼
              </button>
            </div>
          </div>
        )}

        {findText && findResults.length === 0 && <div className="text-xs text-red-400">一致なし</div>}
      </div>
    </div>
  )
}
