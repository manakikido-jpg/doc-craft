'use client'

import { useState } from 'react'
import { X } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
  onSelectShape: (shape: string, fill: string) => void
}

const DEFAULT_FILL = '#4F46E5'

interface ShapeItem {
  name: string
  label: string
  svg: string
}

const CATEGORIES: { key: string; label: string; shapes: ShapeItem[] }[] = [
  {
    key: 'basic',
    label: '基本図形',
    shapes: [
      { name: 'rect', label: '四角形', svg: '<rect x="10" y="10" width="80" height="80" rx="4" />' },
      { name: 'circle', label: '円', svg: '<ellipse cx="50" cy="50" rx="40" ry="40" />' },
      { name: 'triangle', label: '三角形', svg: '<polygon points="50,10 90,90 10,90" />' },
      { name: 'diamond', label: 'ひし形', svg: '<polygon points="50,5 95,50 50,95 5,50" />' },
      { name: 'star', label: '星', svg: '<polygon points="50,5 63,38 98,38 70,60 80,95 50,74 20,95 30,60 2,38 37,38" />' },
      { name: 'hexagon', label: '六角形', svg: '<polygon points="25,10 75,10 100,50 75,90 25,90 0,50" />' },
      { name: 'pentagon', label: '五角形', svg: '<polygon points="50,5 95,38 80,90 20,90 5,38" />' },
      { name: 'heart', label: 'ハート', svg: '<path d="M50,85 C25,65 5,45 5,30 A20,20,0,0,1,50,22 A20,20,0,0,1,95,30 C95,45 75,65 50,85Z" />' },
    ],
  },
  {
    key: 'flowchart',
    label: 'フローチャート',
    shapes: [
      { name: 'rect', label: '処理', svg: '<rect x="8" y="20" width="84" height="60" rx="4" />' },
      { name: 'diamond', label: '判断', svg: '<polygon points="50,8 95,50 50,92 5,50" />' },
      { name: 'circle', label: '端子', svg: '<ellipse cx="50" cy="50" rx="40" ry="30" />' },
      { name: 'callout', label: 'データ', svg: '<path d="M10,15 H90 V65 H45 L25,85 L30,65 H10 Z" />' },
      { name: 'cross', label: '結合', svg: '<polygon points="35,5 65,5 65,35 95,35 95,65 65,65 65,95 35,95 35,65 5,65 5,35 35,35" />' },
    ],
  },
  {
    key: 'arrows',
    label: '矢印',
    shapes: [
      { name: 'arrow-right', label: '右矢印', svg: '<polygon points="5,30 60,30 60,10 95,50 60,90 60,70 5,70" />' },
      { name: 'arrow-up', label: '上矢印', svg: '<polygon points="30,95 30,40 10,40 50,5 90,40 70,40 70,95" />' },
      { name: 'arrow-down', label: '下矢印', svg: '<polygon points="30,5 30,60 10,60 50,95 90,60 70,60 70,5" />' },
      { name: 'arrow-left', label: '左矢印', svg: '<polygon points="95,30 40,30 40,10 5,50 40,90 40,70 95,70" />' },
    ],
  },
]

export default function MoreShapesPanel({ open, onClose, onSelectShape }: Props) {
  const [activeCategory, setActiveCategory] = useState('basic')

  if (!open) return null

  const currentCategory = CATEGORIES.find((c) => c.key === activeCategory) || CATEGORIES[0]

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="w-[500px] max-h-[80vh] bg-slate-800 rounded-xl shadow-2xl border border-slate-700 flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
          <span className="text-white text-sm font-semibold">図形の挿入</span>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Category tabs */}
        <div className="flex px-5 pt-3 gap-1 border-b border-slate-700">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className={`px-3 py-2 text-xs rounded-t-lg transition-colors ${
                activeCategory === cat.key
                  ? 'bg-slate-700 text-white border-b-2 border-indigo-500'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Shapes grid */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="grid grid-cols-4 gap-3">
            {currentCategory.shapes.map((shape) => (
              <button
                key={shape.name + shape.label}
                onClick={() => onSelectShape(shape.name, DEFAULT_FILL)}
                className="flex flex-col items-center gap-2 px-3 py-3 rounded-xl border border-slate-600 bg-slate-700/50 text-slate-300 hover:border-indigo-500 hover:bg-indigo-500/10 hover:text-white transition-all group"
              >
                <svg
                  viewBox="0 0 100 100"
                  className="w-10 h-10"
                  fill="currentColor"
                  opacity={0.7}
                >
                  <g dangerouslySetInnerHTML={{ __html: shape.svg }} />
                </svg>
                <span className="text-[10px]">{shape.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
