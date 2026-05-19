'use client'

import { useCallback } from 'react'

interface Props {
  x: number
  y: number
  w: number
  h: number
  rotation?: number
  canvasRef: React.RefObject<HTMLDivElement | null>
  onResize: (x: number, y: number, w: number, h: number) => void
  onRotate?: (rotation: number) => void
}

type HandlePosition = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'

const HANDLE_CURSORS: Record<HandlePosition, string> = {
  nw: 'nwse-resize',
  n: 'ns-resize',
  ne: 'nesw-resize',
  e: 'ew-resize',
  se: 'nwse-resize',
  s: 'ns-resize',
  sw: 'nesw-resize',
  w: 'ew-resize',
}

export default function ResizeHandles({ x, y, w, h, rotation: _rotation, canvasRef, onResize, onRotate }: Props) {
  const handleSize = 8

  const startResize = useCallback(
    (e: React.MouseEvent, handle: HandlePosition) => {
      e.stopPropagation()
      e.preventDefault()
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const startX = e.clientX
      const startY = e.clientY
      const origX = x,
        origY = y,
        origW = w,
        origH = h

      const aspect = origW / (origH || 1)

      function onMouseMove(ev: MouseEvent) {
        const dx = ((ev.clientX - startX) / rect.width) * 100
        const dy = ((ev.clientY - startY) / rect.height) * 100
        let nx = origX,
          ny = origY,
          nw = origW,
          nh = origH

        if (handle.includes('e')) {
          nw = Math.max(5, origW + dx)
        }
        if (handle.includes('w')) {
          nx = origX + dx
          nw = Math.max(5, origW - dx)
        }
        if (handle.includes('s')) {
          nh = Math.max(5, origH + dy)
        }
        if (handle.includes('n')) {
          ny = origY + dy
          nh = Math.max(5, origH - dy)
        }

        if (ev.shiftKey && (handle === 'se' || handle === 'nw' || handle === 'ne' || handle === 'sw')) {
          nh = nw / aspect
          if (handle.includes('n')) ny = origY + origH - nh
        }

        nx = Math.max(0, Math.min(95, nx))
        ny = Math.max(0, Math.min(95, ny))
        onResize(nx, ny, nw, nh)
      }

      function onMouseUp() {
        document.removeEventListener('mousemove', onMouseMove)
        document.removeEventListener('mouseup', onMouseUp)
      }
      document.addEventListener('mousemove', onMouseMove)
      document.addEventListener('mouseup', onMouseUp)
    },
    [x, y, w, h, canvasRef, onResize],
  )

  const startRotate = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      e.preventDefault()
      if (!onRotate || !canvasRef.current) return
      const canvas = canvasRef.current
      const rect = canvas.getBoundingClientRect()
      const centerX = rect.left + ((x + w / 2) / 100) * rect.width
      const centerY = rect.top + ((y + (h || 0) / 2) / 100) * rect.height

      function onMouseMove(ev: MouseEvent) {
        const angle = Math.atan2(ev.clientY - centerY, ev.clientX - centerX) * (180 / Math.PI) + 90
        onRotate!(Math.round(angle))
      }
      function onMouseUp() {
        document.removeEventListener('mousemove', onMouseMove)
        document.removeEventListener('mouseup', onMouseUp)
      }
      document.addEventListener('mousemove', onMouseMove)
      document.addEventListener('mouseup', onMouseUp)
    },
    [x, y, w, h, canvasRef, onRotate],
  )

  const handles: HandlePosition[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']

  function getHandleStyle(pos: HandlePosition): React.CSSProperties {
    const base: React.CSSProperties = {
      position: 'absolute',
      width: handleSize,
      height: handleSize,
      background: 'white',
      border: '1.5px solid #6366f1',
      borderRadius: 2,
      cursor: HANDLE_CURSORS[pos],
      zIndex: 9999,
    }
    const half = handleSize / 2
    switch (pos) {
      case 'nw':
        return { ...base, top: -half, left: -half }
      case 'n':
        return { ...base, top: -half, left: '50%', marginLeft: -half }
      case 'ne':
        return { ...base, top: -half, right: -half }
      case 'e':
        return { ...base, top: '50%', right: -half, marginTop: -half }
      case 'se':
        return { ...base, bottom: -half, right: -half }
      case 's':
        return { ...base, bottom: -half, left: '50%', marginLeft: -half }
      case 'sw':
        return { ...base, bottom: -half, left: -half }
      case 'w':
        return { ...base, top: '50%', left: -half, marginTop: -half }
    }
  }

  return (
    <>
      {handles.map((pos) => (
        <div key={pos} style={getHandleStyle(pos)} onMouseDown={(e) => startResize(e, pos)} />
      ))}
      {onRotate && (
        <div
          style={{
            position: 'absolute',
            top: -28,
            left: '50%',
            marginLeft: -6,
            width: 12,
            height: 12,
            borderRadius: '50%',
            background: '#6366f1',
            border: '2px solid white',
            cursor: 'crosshair',
            zIndex: 9999,
          }}
          onMouseDown={startRotate}
          title="回転"
        />
      )}
    </>
  )
}
