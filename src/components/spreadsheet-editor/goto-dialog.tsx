'use client'

import { useState } from 'react'

interface GoToDialogProps {
  onGoTo: (ref: string) => void
  onClose: () => void
}

export function GoToDialog({ onGoTo, onClose }: GoToDialogProps) {
  const [goToInput, setGoToInput] = useState('')

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && goToInput.trim()) {
      onGoTo(goToInput.trim())
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="セルへ移動"
        className="relative z-10 bg-slate-800 border border-slate-700 rounded-lg shadow-xl p-4 w-80"
      >
        <h3 className="text-sm font-medium text-slate-200 mb-3">セルへ移動</h3>
        <input
          type="text"
          autoFocus
          value={goToInput}
          onChange={(e) => setGoToInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="セル参照 (例: A1, Z50)"
          className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded text-sm text-slate-200 font-mono placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
        />
        <div className="flex justify-end gap-2 mt-3">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm text-slate-300 bg-slate-700 hover:bg-slate-600 rounded transition-colors"
          >
            キャンセル
          </button>
          <button
            onClick={() => {
              if (goToInput.trim()) {
                onGoTo(goToInput.trim())
              }
            }}
            className="px-3 py-1.5 text-sm text-white bg-blue-600 hover:bg-blue-500 rounded transition-colors"
          >
            移動
          </button>
        </div>
      </div>
    </div>
  )
}
