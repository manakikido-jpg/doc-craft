'use client'

import { useState, useEffect } from 'react'
import { X, Move, Maximize2, RotateCw } from 'lucide-react'
import type { SlideElement } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  element: SlideElement | null
  slideId: string
  onUpdate: (props: { x?: number; y?: number; w?: number; h?: number; rotation?: number }) => void
}

export default function ElementInspector({ open, onClose, element, slideId, onUpdate }: Props) {
  const [values, setValues] = useState({ x: 0, y: 0, w: 10, h: 10, rotation: 0 })

  useEffect(() => {
    if (element) {
      setValues({
        x: Math.round(('x' in element ? element.x : 0) * 10) / 10,
        y: Math.round(('y' in element ? element.y : 0) * 10) / 10,
        w: Math.round(('w' in element ? element.w : 10) * 10) / 10,
        h: Math.round(('h' in element ? element.h : 10) * 10) / 10,
        rotation: element.rotation || 0,
      })
    }
  }, [element])

  if (!open || !element) return null

  function handleChange(key: keyof typeof values, val: string) {
    const num = parseFloat(val)
    if (isNaN(num)) return
    const newValues = { ...values, [key]: num }
    setValues(newValues)

    if (key === 'rotation') {
      onUpdate({ rotation: num })
    } else if (key === 'x' || key === 'y') {
      onUpdate({ x: newValues.x, y: newValues.y })
    } else {
      onUpdate({ w: newValues.w, h: newValues.h })
    }
  }

  function handleStep(key: keyof typeof values, delta: number) {
    const newVal = Math.round((values[key] + delta) * 10) / 10
    handleChange(key, String(newVal))
  }

  return (
    <div className="fixed right-4 top-32 z-50 w-56 rounded-lg border border-slate-700 bg-slate-900 shadow-2xl">
      <div className="flex items-center justify-between border-b border-slate-700 px-3 py-2">
        <h3 className="text-xs font-semibold text-slate-200">要素プロパティ</h3>
        <button onClick={onClose} className="rounded p-0.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200">
          <X size={14} />
        </button>
      </div>

      <div className="p-3 space-y-3">
        {/* Position */}
        <div>
          <div className="flex items-center gap-1 text-[10px] text-slate-500 mb-1">
            <Move size={10} /> 位置 (%)
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-slate-500">X</label>
              <div className="flex items-center">
                <button onClick={() => handleStep('x', -1)} className="px-1 text-slate-500 hover:text-white text-xs">−</button>
                <input
                  type="number"
                  value={values.x}
                  onChange={e => handleChange('x', e.target.value)}
                  step={0.5}
                  className="w-full rounded border border-slate-700 bg-slate-800 px-1.5 py-1 text-xs text-slate-100 text-center outline-none focus:border-indigo-500"
                />
                <button onClick={() => handleStep('x', 1)} className="px-1 text-slate-500 hover:text-white text-xs">+</button>
              </div>
            </div>
            <div>
              <label className="text-[10px] text-slate-500">Y</label>
              <div className="flex items-center">
                <button onClick={() => handleStep('y', -1)} className="px-1 text-slate-500 hover:text-white text-xs">−</button>
                <input
                  type="number"
                  value={values.y}
                  onChange={e => handleChange('y', e.target.value)}
                  step={0.5}
                  className="w-full rounded border border-slate-700 bg-slate-800 px-1.5 py-1 text-xs text-slate-100 text-center outline-none focus:border-indigo-500"
                />
                <button onClick={() => handleStep('y', 1)} className="px-1 text-slate-500 hover:text-white text-xs">+</button>
              </div>
            </div>
          </div>
        </div>

        {/* Size */}
        <div>
          <div className="flex items-center gap-1 text-[10px] text-slate-500 mb-1">
            <Maximize2 size={10} /> サイズ (%)
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-slate-500">W</label>
              <div className="flex items-center">
                <button onClick={() => handleStep('w', -1)} className="px-1 text-slate-500 hover:text-white text-xs">−</button>
                <input
                  type="number"
                  value={values.w}
                  onChange={e => handleChange('w', e.target.value)}
                  step={0.5}
                  min={1}
                  className="w-full rounded border border-slate-700 bg-slate-800 px-1.5 py-1 text-xs text-slate-100 text-center outline-none focus:border-indigo-500"
                />
                <button onClick={() => handleStep('w', 1)} className="px-1 text-slate-500 hover:text-white text-xs">+</button>
              </div>
            </div>
            <div>
              <label className="text-[10px] text-slate-500">H</label>
              <div className="flex items-center">
                <button onClick={() => handleStep('h', -1)} className="px-1 text-slate-500 hover:text-white text-xs">−</button>
                <input
                  type="number"
                  value={values.h}
                  onChange={e => handleChange('h', e.target.value)}
                  step={0.5}
                  min={1}
                  className="w-full rounded border border-slate-700 bg-slate-800 px-1.5 py-1 text-xs text-slate-100 text-center outline-none focus:border-indigo-500"
                />
                <button onClick={() => handleStep('h', 1)} className="px-1 text-slate-500 hover:text-white text-xs">+</button>
              </div>
            </div>
          </div>
        </div>

        {/* Rotation */}
        <div>
          <div className="flex items-center gap-1 text-[10px] text-slate-500 mb-1">
            <RotateCw size={10} /> 回転
          </div>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={-180}
              max={180}
              value={values.rotation}
              onChange={e => handleChange('rotation', e.target.value)}
              className="flex-1 accent-indigo-500"
            />
            <div className="flex items-center">
              <input
                type="number"
                value={values.rotation}
                onChange={e => handleChange('rotation', e.target.value)}
                step={15}
                className="w-14 rounded border border-slate-700 bg-slate-800 px-1.5 py-1 text-xs text-slate-100 text-center outline-none focus:border-indigo-500"
              />
              <span className="text-[10px] text-slate-500 ml-0.5">°</span>
            </div>
          </div>
          {/* Quick rotation presets */}
          <div className="flex gap-1 mt-1">
            {[0, 45, 90, 135, 180, -90, -45].map(deg => (
              <button
                key={deg}
                onClick={() => handleChange('rotation', String(deg))}
                className={`px-1.5 py-0.5 rounded text-[10px] transition ${
                  values.rotation === deg ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-500 hover:text-slate-200'
                }`}
              >
                {deg}°
              </button>
            ))}
          </div>
        </div>

        {/* Opacity */}
        <div>
          <label className="text-[10px] text-slate-500 mb-1 block">不透明度</label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={0}
              max={100}
              value={element.opacity ?? 100}
              onChange={e => onUpdate({ opacity: Number(e.target.value) } as any)}
              className="flex-1 accent-indigo-500"
            />
            <span className="text-xs text-slate-300 w-8 text-right">{element.opacity ?? 100}%</span>
          </div>
        </div>
      </div>
    </div>
  )
}
