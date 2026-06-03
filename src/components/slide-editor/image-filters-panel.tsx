'use client'

import type { SlideImageElement } from '@/types'
import { X, Crop } from 'lucide-react'

interface Props {
  element: SlideImageElement
  onUpdate: (props: Partial<SlideImageElement>) => void
  onClose: () => void
  onCrop?: () => void
}

export default function ImageFiltersPanel({ element, onUpdate, onClose, onCrop }: Props) {
  return (
    <div className="absolute right-0 top-0 w-60 h-full bg-slate-900 border-l border-slate-700 z-40 overflow-y-auto">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
        <span className="text-white text-sm font-medium">画像フィルター</span>
        <button onClick={onClose} className="text-slate-400 hover:text-white">
          <X size={16} />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {onCrop && (
          <button
            onClick={onCrop}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 text-xs hover:border-indigo-500 hover:text-white transition-colors"
          >
            <Crop size={14} />
            クロップ
          </button>
        )}

        <div>
          <label className="text-xs text-slate-400 flex items-center justify-between mb-1">
            <span>明るさ</span>
            <span className="text-slate-500">{element.brightness ?? 100}%</span>
          </label>
          <input
            type="range"
            min="0"
            max="200"
            value={element.brightness ?? 100}
            onChange={(e) => onUpdate({ brightness: Number(e.target.value) })}
            className="w-full accent-indigo-500"
          />
        </div>

        <div>
          <label className="text-xs text-slate-400 flex items-center justify-between mb-1">
            <span>コントラスト</span>
            <span className="text-slate-500">{element.contrast ?? 100}%</span>
          </label>
          <input
            type="range"
            min="0"
            max="200"
            value={element.contrast ?? 100}
            onChange={(e) => onUpdate({ contrast: Number(e.target.value) })}
            className="w-full accent-indigo-500"
          />
        </div>

        <div>
          <label className="text-xs text-slate-400 flex items-center justify-between mb-1">
            <span>ぼかし</span>
            <span className="text-slate-500">{element.blur ?? 0}px</span>
          </label>
          <input
            type="range"
            min="0"
            max="20"
            value={element.blur ?? 0}
            onChange={(e) => onUpdate({ blur: Number(e.target.value) })}
            className="w-full accent-indigo-500"
          />
        </div>

        <div>
          <label className="text-xs text-slate-400 flex items-center justify-between mb-1">
            <span>透明度</span>
            <span className="text-slate-500">{element.opacity ?? 100}%</span>
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={element.opacity ?? 100}
            onChange={(e) => onUpdate({ opacity: Number(e.target.value) })}
            className="w-full accent-indigo-500"
          />
        </div>

        <button
          onClick={() => onUpdate({ brightness: 100, contrast: 100, blur: 0, opacity: 100 })}
          className="w-full px-3 py-1.5 rounded border border-slate-700 bg-slate-800 text-slate-300 text-xs hover:border-slate-500 hover:text-white transition-colors"
        >
          リセット
        </button>
      </div>
    </div>
  )
}
