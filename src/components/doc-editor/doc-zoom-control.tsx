'use client'

import { Minus, Plus } from 'lucide-react'

interface Props {
  zoom: number
  onZoomChange: (zoom: number) => void
}

const ZOOM_LEVELS = [50, 75, 100, 125, 150, 175, 200]

export default function DocZoomControl({ zoom, onZoomChange }: Props) {
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => {
          const idx = ZOOM_LEVELS.findIndex((z) => z >= zoom)
          const prev = idx > 0 ? ZOOM_LEVELS[idx - 1] : ZOOM_LEVELS[0]
          onZoomChange(prev)
        }}
        disabled={zoom <= 50}
        className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 transition-colors"
        title="縮小"
      >
        <Minus size={12} />
      </button>
      <button
        onClick={() => onZoomChange(100)}
        className="text-xs text-slate-400 hover:text-white px-1 min-w-[36px] text-center"
        title="100%にリセット"
      >
        {zoom}%
      </button>
      <button
        onClick={() => {
          const idx = ZOOM_LEVELS.findIndex((z) => z > zoom)
          const next = idx !== -1 ? ZOOM_LEVELS[idx] : ZOOM_LEVELS[ZOOM_LEVELS.length - 1]
          onZoomChange(next)
        }}
        disabled={zoom >= 200}
        className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 transition-colors"
        title="拡大"
      >
        <Plus size={12} />
      </button>
    </div>
  )
}
