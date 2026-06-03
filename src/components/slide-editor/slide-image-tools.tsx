'use client'

import { useState } from 'react'
import type { SlideImageElement } from '@/types'
import { X, Sun, Contrast, Droplets, Image, Palette, Archive } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
  element: SlideImageElement | null
  onUpdateProps: (props: Partial<SlideImageElement>) => void
}

const MASK_SHAPES: { value: SlideImageElement['maskShape']; label: string; icon: string }[] = [
  { value: 'none', label: 'なし', icon: '▭' },
  { value: 'circle', label: '円', icon: '●' },
  { value: 'triangle', label: '三角', icon: '▲' },
  { value: 'star', label: '星', icon: '★' },
  { value: 'hexagon', label: '六角', icon: '⬡' },
  { value: 'rounded-rect', label: '角丸', icon: '▢' },
]

const COLOR_FILTERS: { value: SlideImageElement['colorFilter']; label: string; style: React.CSSProperties }[] = [
  { value: 'none', label: 'なし', style: {} },
  { value: 'grayscale', label: 'グレー', style: { filter: 'grayscale(100%)' } },
  { value: 'sepia', label: 'セピア', style: { filter: 'sepia(100%)' } },
  { value: 'high-contrast', label: '高コントラスト', style: { filter: 'contrast(150%) saturate(130%)' } },
  { value: 'washout', label: 'ウォッシュ', style: { filter: 'brightness(130%) opacity(70%)' } },
  { value: 'cool', label: 'クール', style: { filter: 'hue-rotate(180deg) saturate(80%)' } },
  { value: 'warm', label: 'ウォーム', style: { filter: 'sepia(30%) saturate(140%)' } },
  { value: 'vintage', label: 'ヴィンテージ', style: { filter: 'sepia(40%) contrast(90%) brightness(110%)' } },
  { value: 'duotone', label: 'デュオトーン', style: { filter: 'grayscale(100%) sepia(100%) hue-rotate(180deg)' } },
]

export default function SlideImageTools({ open, onClose, element, onUpdateProps }: Props) {
  const [toastVisible, setToastVisible] = useState(false)

  if (!open || !element) return null

  const brightness = element.brightness ?? 100
  const contrast = element.contrast ?? 100
  const blur = element.blur ?? 0

  function handleCompress() {
    setToastVisible(true)
    setTimeout(() => setToastVisible(false), 2500)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-[480px] max-h-[85vh] bg-slate-800 rounded-xl shadow-2xl border border-slate-700 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <Image size={18} className="text-indigo-400" />
            <span className="text-white text-sm font-semibold">画像ツール</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Brightness */}
          <div>
            <label className="text-xs text-slate-400 flex items-center justify-between mb-1.5">
              <span className="flex items-center gap-1.5">
                <Sun size={13} />
                明るさ
              </span>
              <span className="text-slate-500">{((brightness / 100) * 1).toFixed(2)}</span>
            </label>
            <input
              type="range"
              min={50}
              max={150}
              value={brightness}
              onChange={(e) => onUpdateProps({ brightness: Number(e.target.value) })}
              className="w-full accent-indigo-500"
            />
          </div>

          {/* Contrast */}
          <div>
            <label className="text-xs text-slate-400 flex items-center justify-between mb-1.5">
              <span className="flex items-center gap-1.5">
                <Contrast size={13} />
                コントラスト
              </span>
              <span className="text-slate-500">{((contrast / 100) * 1).toFixed(2)}</span>
            </label>
            <input
              type="range"
              min={50}
              max={150}
              value={contrast}
              onChange={(e) => onUpdateProps({ contrast: Number(e.target.value) })}
              className="w-full accent-indigo-500"
            />
          </div>

          {/* Blur */}
          <div>
            <label className="text-xs text-slate-400 flex items-center justify-between mb-1.5">
              <span className="flex items-center gap-1.5">
                <Droplets size={13} />
                ぼかし
              </span>
              <span className="text-slate-500">{blur}px</span>
            </label>
            <input
              type="range"
              min={0}
              max={10}
              value={blur}
              onChange={(e) => onUpdateProps({ blur: Number(e.target.value) })}
              className="w-full accent-indigo-500"
            />
          </div>

          {/* Mask shape */}
          <div>
            <p className="text-xs text-slate-400 mb-2 flex items-center gap-1.5">
              <Palette size={13} />
              マスク形状
            </p>
            <div className="grid grid-cols-6 gap-2">
              {MASK_SHAPES.map((shape) => (
                <button
                  key={shape.value}
                  onClick={() => onUpdateProps({ maskShape: shape.value })}
                  className={`flex flex-col items-center gap-1 px-2 py-2 rounded-lg border text-xs transition-colors ${
                    (element.maskShape || 'none') === shape.value
                      ? 'border-indigo-500 bg-indigo-500/10 text-white'
                      : 'border-slate-600 bg-slate-700/50 text-slate-300 hover:border-slate-500'
                  }`}
                >
                  <span className="text-lg">{shape.icon}</span>
                  <span className="text-[10px]">{shape.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Color filter */}
          <div>
            <p className="text-xs text-slate-400 mb-2 flex items-center gap-1.5">
              <Palette size={13} />
              カラーフィルター
            </p>
            <div className="grid grid-cols-3 gap-2">
              {COLOR_FILTERS.map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => onUpdateProps({ colorFilter: filter.value })}
                  className={`flex items-center justify-center px-2 py-2 rounded-lg border text-xs transition-colors ${
                    (element.colorFilter || 'none') === filter.value
                      ? 'border-indigo-500 bg-indigo-500/10 text-white'
                      : 'border-slate-600 bg-slate-700/50 text-slate-300 hover:border-slate-500'
                  }`}
                >
                  <div
                    className="w-6 h-6 rounded bg-gradient-to-br from-orange-400 to-purple-500 mr-2 flex-shrink-0"
                    style={filter.style}
                  />
                  <span>{filter.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Compress button */}
          <div className="pt-2">
            <button
              onClick={handleCompress}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-slate-600 bg-slate-700 text-slate-300 text-sm hover:border-slate-500 hover:text-white transition-colors"
            >
              <Archive size={15} />
              画像を圧縮
            </button>
          </div>

          {/* Reset */}
          <button
            onClick={() =>
              onUpdateProps({
                brightness: 100,
                contrast: 100,
                blur: 0,
                maskShape: 'none',
                colorFilter: 'none',
              })
            }
            className="w-full px-3 py-1.5 rounded border border-slate-700 bg-slate-800 text-slate-300 text-xs hover:border-slate-500 hover:text-white transition-colors"
          >
            すべてリセット
          </button>
        </div>
      </div>

      {/* Toast */}
      {toastVisible && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[9999] px-5 py-2.5 bg-slate-700 text-white text-sm rounded-lg shadow-lg border border-slate-600">
          画像圧縮は準備中です
        </div>
      )}
    </div>
  )
}
