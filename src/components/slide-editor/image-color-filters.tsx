'use client'

import { useState } from 'react'
import type { SlideImageElement } from '@/types'
import { X, RotateCcw } from 'lucide-react'

interface ImageColorFiltersProps {
  element: SlideImageElement
  slideId: string
  dispatch: React.Dispatch<any>
  onClose: () => void
}

interface FilterPreset {
  label: string
  brightness: number
  contrast: number
  blur: number
  cssFilter: string
}

const FILTER_PRESETS: FilterPreset[] = [
  { label: 'オリジナル', brightness: 100, contrast: 100, blur: 0, cssFilter: 'none' },
  { label: 'グレースケール', brightness: 100, contrast: 100, blur: 0, cssFilter: 'grayscale(100%)' },
  { label: 'セピア', brightness: 100, contrast: 100, blur: 0, cssFilter: 'sepia(100%)' },
  { label: '高コントラスト', brightness: 100, contrast: 150, blur: 0, cssFilter: 'contrast(150%) saturate(130%)' },
  { label: 'ウォッシュアウト', brightness: 130, contrast: 100, blur: 0, cssFilter: 'brightness(130%) opacity(70%)' },
  { label: 'クール', brightness: 100, contrast: 100, blur: 0, cssFilter: 'hue-rotate(180deg) saturate(80%)' },
  { label: 'ウォーム', brightness: 100, contrast: 100, blur: 0, cssFilter: 'sepia(30%) saturate(140%)' },
  { label: 'ヴィンテージ', brightness: 110, contrast: 90, blur: 0, cssFilter: 'sepia(40%) contrast(90%) brightness(110%)' },
  { label: 'デュオトーン', brightness: 100, contrast: 100, blur: 0, cssFilter: 'grayscale(100%) sepia(100%) hue-rotate(180deg)' },
]

export default function ImageColorFilters({ element, slideId, dispatch, onClose }: ImageColorFiltersProps) {
  const [brightness, setBrightness] = useState(element.brightness ?? 100)
  const [contrast, setContrast] = useState(element.contrast ?? 100)
  const [blur, setBlur] = useState(element.blur ?? 0)

  function applyPreset(preset: FilterPreset) {
    setBrightness(preset.brightness)
    setContrast(preset.contrast)
    setBlur(preset.blur)
    dispatch({
      type: 'UPDATE_ELEMENT_PROPS',
      slideId,
      elementId: element.id,
      props: {
        brightness: preset.brightness,
        contrast: preset.contrast,
        blur: preset.blur,
        colorFilter: preset.cssFilter === 'none' ? undefined : preset.cssFilter,
      } as any,
    })
  }

  function updateSlider(field: 'brightness' | 'contrast' | 'blur', value: number) {
    if (field === 'brightness') setBrightness(value)
    else if (field === 'contrast') setContrast(value)
    else setBlur(value)

    const updated: Record<string, number> = { brightness, contrast, blur }
    updated[field] = value
    dispatch({
      type: 'UPDATE_ELEMENT_PROPS',
      slideId,
      elementId: element.id,
      props: {
        brightness: updated.brightness,
        contrast: updated.contrast,
        blur: updated.blur,
      },
    })
  }

  function handleReset() {
    setBrightness(100)
    setContrast(100)
    setBlur(0)
    dispatch({
      type: 'UPDATE_ELEMENT_PROPS',
      slideId,
      elementId: element.id,
      props: {
        brightness: 100,
        contrast: 100,
        blur: 0,
        colorFilter: undefined,
      } as any,
    })
  }

  return (
    <div className="absolute right-0 top-0 w-72 h-full bg-slate-900 border-l border-slate-700 z-40 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
        <span className="text-white text-sm font-medium">カラーフィルター</span>
        <button onClick={onClose} className="text-slate-400 hover:text-white">
          <X size={16} />
        </button>
      </div>

      {/* Preset grid */}
      <div className="p-3">
        <div className="grid grid-cols-3 gap-2">
          {FILTER_PRESETS.map((preset) => (
            <button
              key={preset.label}
              onClick={() => applyPreset(preset)}
              className="flex flex-col items-center gap-1 p-1 rounded-lg border border-slate-700 hover:border-indigo-500 transition-colors group"
            >
              <div className="w-full aspect-square rounded overflow-hidden bg-slate-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={element.src}
                  alt={preset.label}
                  className="w-full h-full object-cover"
                  style={{ filter: preset.cssFilter === 'none' ? undefined : preset.cssFilter }}
                />
              </div>
              <span className="text-[10px] text-slate-400 group-hover:text-white leading-tight text-center">
                {preset.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Custom sliders */}
      <div className="px-4 pb-4 space-y-3 border-t border-slate-700 pt-3">
        <div>
          <label className="text-xs text-slate-400 flex items-center justify-between mb-1">
            <span>明るさ</span>
            <span className="text-slate-500">{brightness}%</span>
          </label>
          <input
            type="range"
            min={0}
            max={200}
            value={brightness}
            onChange={(e) => updateSlider('brightness', Number(e.target.value))}
            className="w-full accent-indigo-500"
          />
        </div>

        <div>
          <label className="text-xs text-slate-400 flex items-center justify-between mb-1">
            <span>コントラスト</span>
            <span className="text-slate-500">{contrast}%</span>
          </label>
          <input
            type="range"
            min={0}
            max={200}
            value={contrast}
            onChange={(e) => updateSlider('contrast', Number(e.target.value))}
            className="w-full accent-indigo-500"
          />
        </div>

        <div>
          <label className="text-xs text-slate-400 flex items-center justify-between mb-1">
            <span>ぼかし</span>
            <span className="text-slate-500">{blur}px</span>
          </label>
          <input
            type="range"
            min={0}
            max={20}
            value={blur}
            onChange={(e) => updateSlider('blur', Number(e.target.value))}
            className="w-full accent-indigo-500"
          />
        </div>

        <button
          onClick={handleReset}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded border border-slate-700 bg-slate-800 text-slate-300 text-xs hover:border-slate-500 hover:text-white transition-colors"
        >
          <RotateCcw size={12} />
          リセット
        </button>
      </div>
    </div>
  )
}
