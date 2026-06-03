'use client'

import { useState } from 'react'
import { X, Plus, Trash2, Ruler, ArrowRightLeft, ArrowUpDown } from 'lucide-react'

interface Guide {
  id: string
  type: 'horizontal' | 'vertical'
  position: number
}

interface Props {
  open: boolean
  onClose: () => void
  guides: Guide[]
  onAddGuide: (type: 'horizontal' | 'vertical', position: number) => void
  onDeleteGuide: (id: string) => void
  onClearGuides: () => void
}

export default function GuideManager({ open, onClose, guides, onAddGuide, onDeleteGuide, onClearGuides }: Props) {
  const [newType, setNewType] = useState<'horizontal' | 'vertical'>('horizontal')
  const [newPosition, setNewPosition] = useState(50)

  if (!open) return null

  const horizontalGuides = guides.filter((g) => g.type === 'horizontal')
  const verticalGuides = guides.filter((g) => g.type === 'vertical')

  const handleAdd = () => {
    if (newPosition < 0 || newPosition > 100) return
    onAddGuide(newType, newPosition)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-[420px] max-h-[80vh] bg-slate-800 rounded-xl shadow-2xl border border-slate-700 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <Ruler size={18} className="text-indigo-400" />
            <span className="text-white text-sm font-semibold">ガイド線の管理</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Add guide */}
        <div className="px-5 py-4 border-b border-slate-700">
          <p className="text-xs text-slate-400 mb-3">新しいガイドを追加</p>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg overflow-hidden border border-slate-600">
              <button
                onClick={() => setNewType('horizontal')}
                className={`flex items-center gap-1 px-3 py-1.5 text-xs transition-colors ${
                  newType === 'horizontal'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                <ArrowRightLeft size={12} />
                水平
              </button>
              <button
                onClick={() => setNewType('vertical')}
                className={`flex items-center gap-1 px-3 py-1.5 text-xs transition-colors ${
                  newType === 'vertical'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                <ArrowUpDown size={12} />
                垂直
              </button>
            </div>
            <div className="flex items-center gap-1 flex-1">
              <input
                type="number"
                min={0}
                max={100}
                value={newPosition}
                onChange={(e) => setNewPosition(Number(e.target.value))}
                className="w-20 px-2 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-xs focus:outline-none focus:border-indigo-500"
              />
              <span className="text-slate-400 text-xs">%</span>
            </div>
            <button
              onClick={handleAdd}
              className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs rounded-lg transition-colors"
            >
              <Plus size={14} />
              追加
            </button>
          </div>
        </div>

        {/* Guide lists */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Horizontal guides */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <ArrowRightLeft size={12} className="text-blue-400" />
              <span className="text-xs text-slate-400 font-medium">水平ガイド ({horizontalGuides.length})</span>
            </div>
            {horizontalGuides.length === 0 ? (
              <p className="text-xs text-slate-500 pl-5">なし</p>
            ) : (
              <div className="space-y-1">
                {horizontalGuides.map((g) => (
                  <div
                    key={g.id}
                    className="flex items-center justify-between px-3 py-1.5 bg-slate-700/50 rounded-lg group"
                  >
                    <span className="text-xs text-slate-300">{g.position}%</span>
                    <button
                      onClick={() => onDeleteGuide(g.id)}
                      className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Vertical guides */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <ArrowUpDown size={12} className="text-green-400" />
              <span className="text-xs text-slate-400 font-medium">垂直ガイド ({verticalGuides.length})</span>
            </div>
            {verticalGuides.length === 0 ? (
              <p className="text-xs text-slate-500 pl-5">なし</p>
            ) : (
              <div className="space-y-1">
                {verticalGuides.map((g) => (
                  <div
                    key={g.id}
                    className="flex items-center justify-between px-3 py-1.5 bg-slate-700/50 rounded-lg group"
                  >
                    <span className="text-xs text-slate-300">{g.position}%</span>
                    <button
                      onClick={() => onDeleteGuide(g.id)}
                      className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-700 flex items-center justify-between">
          <span className="text-xs text-slate-500">合計 {guides.length} 本</span>
          <button
            onClick={onClearGuides}
            disabled={guides.length === 0}
            className="px-3 py-1.5 text-xs rounded-lg border border-slate-600 text-slate-300 hover:border-red-500 hover:text-red-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            すべてクリア
          </button>
        </div>
      </div>
    </div>
  )
}
