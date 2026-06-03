'use client'

import { useMemo } from 'react'

interface Props {
  width: number
  height: number
  zoom: number
  visible: boolean
  unit?: 'percent' | 'px'
}

const RULER_SIZE = 20

export default function CanvasRuler({ width, height, zoom, visible, unit = 'percent' }: Props) {
  if (!visible) return null

  const majorInterval = unit === 'percent' ? 10 : 100
  const totalUnits = unit === 'percent' ? 100 : width

  const hTicks = useMemo(() => {
    const ticks: React.ReactNode[] = []
    const max = unit === 'percent' ? 100 : width
    for (let i = 0; i <= max; i += (unit === 'percent' ? 5 : 50)) {
      const isMajor = i % majorInterval === 0
      const pos = unit === 'percent' ? `${i}%` : `${(i / width) * 100}%`
      ticks.push(
        <div key={`h-${i}`} className="absolute top-0" style={{ left: pos }}>
          <div
            className="bg-slate-600"
            style={{ width: 1, height: isMajor ? 12 : 6 }}
          />
          {isMajor && (
            <span className="absolute top-0.5 left-[3px] text-[7px] text-slate-500 select-none leading-none">
              {i}{unit === 'percent' ? '%' : ''}
            </span>
          )}
        </div>,
      )
    }
    return ticks
  }, [width, unit, majorInterval])

  const vTicks = useMemo(() => {
    const ticks: React.ReactNode[] = []
    const max = unit === 'percent' ? 100 : height
    for (let i = 0; i <= max; i += (unit === 'percent' ? 5 : 50)) {
      const isMajor = i % majorInterval === 0
      const pos = unit === 'percent' ? `${i}%` : `${(i / height) * 100}%`
      ticks.push(
        <div key={`v-${i}`} className="absolute left-0" style={{ top: pos }}>
          <div
            className="bg-slate-600"
            style={{ height: 1, width: isMajor ? 12 : 6 }}
          />
          {isMajor && (
            <span
              className="absolute left-[2px] top-[2px] text-[7px] text-slate-500 select-none leading-none"
              style={{ writingMode: 'vertical-lr' }}
            >
              {i}{unit === 'percent' ? '%' : ''}
            </span>
          )}
        </div>,
      )
    }
    return ticks
  }, [height, unit, majorInterval])

  return (
    <>
      {/* Horizontal ruler - along the top of the canvas */}
      <div
        className="bg-slate-800 border-b border-slate-700 select-none overflow-hidden relative"
        style={{ height: RULER_SIZE, marginLeft: RULER_SIZE }}
      >
        <div className="relative w-full h-full">{hTicks}</div>
      </div>

      {/* Vertical ruler - along the left of the canvas, positioned absolutely */}
      <div
        className="absolute bg-slate-800 border-r border-slate-700 select-none overflow-hidden"
        style={{
          width: RULER_SIZE,
          top: RULER_SIZE,
          left: 0,
          bottom: 0,
        }}
      >
        <div className="relative w-full h-full">{vTicks}</div>
      </div>

      {/* Corner square where rulers meet */}
      <div
        className="absolute top-0 left-0 bg-slate-800 border-r border-b border-slate-700"
        style={{ width: RULER_SIZE, height: RULER_SIZE, zIndex: 1 }}
      />
    </>
  )
}
