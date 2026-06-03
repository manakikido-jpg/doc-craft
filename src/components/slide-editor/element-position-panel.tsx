'use client'

import { useState, useCallback } from 'react'
import { Lock, Unlock, FlipHorizontal, FlipVertical, X } from 'lucide-react'
import type { SlideElement } from '@/types'

interface Props {
  element: SlideElement
  slideId: string
  dispatch: React.Dispatch<any>
  onClose: () => void
}

function isPositionable(el: SlideElement): el is Exclude<SlideElement, { type: 'connector' }> {
  return el.type !== 'connector'
}

export default function ElementPositionPanel({ element, slideId, dispatch, onClose }: Props) {
  const [lockAspect, setLockAspect] = useState(false)

  if (!isPositionable(element)) return null

  const { x, y, w, h, rotation = 0, opacity = 100, flipH = false, flipV = false, locked = false } = element

  const aspectRatio = w / (h || 1)

  function dispatchUpdate(props: Record<string, unknown>) {
    dispatch({
      type: 'UPDATE_ELEMENT_PROPS',
      slideId,
      elementId: element.id,
      props,
    })
  }

  function dispatchPosition(newX: number, newY: number) {
    dispatch({
      type: 'UPDATE_ELEMENT_POSITION',
      slideId,
      elementId: element.id,
      x: newX,
      y: newY,
    })
  }

  function dispatchSize(newW: number, newH: number) {
    dispatch({
      type: 'UPDATE_ELEMENT_SIZE',
      slideId,
      elementId: element.id,
      w: newW,
      h: newH,
    })
  }

  const handleNumericField = useCallback(
    (
      field: 'x' | 'y' | 'w' | 'h' | 'rotation' | 'opacity',
      value: string,
    ) => {
      const num = parseFloat(value)
      if (isNaN(num)) return

      switch (field) {
        case 'x':
          dispatchPosition(num, y)
          break
        case 'y':
          dispatchPosition(x, num)
          break
        case 'w': {
          const newH = lockAspect ? num / aspectRatio : h
          dispatchSize(num, newH)
          break
        }
        case 'h': {
          const newW = lockAspect ? num * aspectRatio : w
          dispatchSize(newW, num)
          break
        }
        case 'rotation':
          dispatchUpdate({ rotation: Math.max(0, Math.min(360, num)) })
          break
        case 'opacity':
          dispatchUpdate({ opacity: Math.max(0, Math.min(100, num)) })
          break
      }
    },
    [x, y, w, h, lockAspect, aspectRatio, slideId, element.id],
  )

  function NumInput({
    label,
    value,
    field,
    min,
    max,
    suffix = '%',
  }: {
    label: string
    value: number
    field: 'x' | 'y' | 'w' | 'h' | 'rotation' | 'opacity'
    min?: number
    max?: number
    suffix?: string
  }) {
    const [localVal, setLocalVal] = useState(value.toFixed(1))

    const commit = () => handleNumericField(field, localVal)

    return (
      <div className="flex items-center gap-2">
        <label className="text-[10px] text-slate-500 w-5 text-right font-medium">{label}</label>
        <div className="flex-1 flex items-center">
          <input
            type="number"
            value={localVal}
            onChange={(e) => setLocalVal(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => e.key === 'Enter' && commit()}
            min={min}
            max={max}
            step={0.1}
            className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-slate-300 focus:outline-none focus:border-blue-500 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
          />
          <span className="text-[9px] text-slate-600 ml-1 w-4">{suffix}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="w-56 bg-slate-900 border border-slate-800 rounded-lg shadow-xl p-3 space-y-3 text-slate-300">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-400">Position & Size</span>
        <button
          onClick={onClose}
          className="p-0.5 rounded hover:bg-slate-800 text-slate-500 hover:text-slate-300 transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      {/* Position */}
      <div className="space-y-1.5">
        <span className="text-[10px] text-slate-500 uppercase tracking-wide">Position</span>
        <NumInput label="X" value={x} field="x" suffix="%" />
        <NumInput label="Y" value={y} field="y" suffix="%" />
      </div>

      {/* Size */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-slate-500 uppercase tracking-wide">Size</span>
          <button
            onClick={() => setLockAspect(!lockAspect)}
            className="p-0.5 rounded hover:bg-slate-800 text-slate-500 hover:text-slate-300 transition-colors"
            title={lockAspect ? 'Unlock aspect ratio' : 'Lock aspect ratio'}
          >
            {lockAspect ? <Lock size={12} /> : <Unlock size={12} />}
          </button>
        </div>
        <NumInput label="W" value={w} field="w" min={0.1} suffix="%" />
        <NumInput label="H" value={h} field="h" min={0.1} suffix="%" />
      </div>

      {/* Rotation */}
      <div className="space-y-1.5">
        <span className="text-[10px] text-slate-500 uppercase tracking-wide">Rotation</span>
        <NumInput label="°" value={rotation} field="rotation" min={0} max={360} suffix="deg" />
      </div>

      {/* Opacity */}
      <div className="space-y-1.5">
        <span className="text-[10px] text-slate-500 uppercase tracking-wide">Opacity</span>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={0}
            max={100}
            value={opacity}
            onChange={(e) => dispatchUpdate({ opacity: parseInt(e.target.value) })}
            className="flex-1 accent-blue-500 h-1"
          />
          <span className="text-xs text-slate-400 w-8 text-right">{opacity}%</span>
        </div>
      </div>

      {/* Flip & Lock */}
      <div className="flex items-center gap-1 pt-1 border-t border-slate-800">
        <button
          onClick={() => dispatchUpdate({ flipH: !flipH })}
          className={`p-1.5 rounded transition-colors ${flipH ? 'bg-blue-600/20 text-blue-400' : 'text-slate-500 hover:bg-slate-800 hover:text-slate-300'}`}
          title="Flip Horizontal"
        >
          <FlipHorizontal size={14} />
        </button>
        <button
          onClick={() => dispatchUpdate({ flipV: !flipV })}
          className={`p-1.5 rounded transition-colors ${flipV ? 'bg-blue-600/20 text-blue-400' : 'text-slate-500 hover:bg-slate-800 hover:text-slate-300'}`}
          title="Flip Vertical"
        >
          <FlipVertical size={14} />
        </button>
        <div className="flex-1" />
        <button
          onClick={() => dispatchUpdate({ locked: !locked })}
          className={`p-1.5 rounded transition-colors ${locked ? 'bg-amber-600/20 text-amber-400' : 'text-slate-500 hover:bg-slate-800 hover:text-slate-300'}`}
          title={locked ? 'Unlock element' : 'Lock element'}
        >
          {locked ? <Lock size={14} /> : <Unlock size={14} />}
        </button>
      </div>
    </div>
  )
}
