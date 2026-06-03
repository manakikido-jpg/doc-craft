'use client'

import { useState, useEffect, useCallback } from 'react'

interface Props {
  active: boolean
  onPickColor: (color: string) => void
  onCancel: () => void
}

export default function EyedropperTool({ active, onPickColor, onCancel }: Props) {
  const [previewColor, setPreviewColor] = useState<string | null>(null)
  const [position, setPosition] = useState({ x: 0, y: 0 })

  const getColorAtPoint = useCallback(async (x: number, y: number): Promise<string> => {
    // Try EyeDropper API first (Chrome 95+)
    if ('EyeDropper' in window) {
      try {
        const eyeDropper = new (window as any).EyeDropper()
        const result = await eyeDropper.open()
        return result.sRGBHex
      } catch {
        // User cancelled
        return ''
      }
    }
    // Fallback: use canvas to sample pixel
    try {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) return '#000000'
      canvas.width = 1
      canvas.height = 1
      // Draw a small area from the screen
      const el = document.elementFromPoint(x, y)
      if (el) {
        const style = getComputedStyle(el)
        return style.backgroundColor || style.color || '#000000'
      }
      return '#000000'
    } catch {
      return '#000000'
    }
  }, [])

  useEffect(() => {
    if (!active) return

    document.body.style.cursor = 'crosshair'

    async function handleClick(e: MouseEvent) {
      e.preventDefault()
      e.stopPropagation()

      // Try native EyeDropper API
      if ('EyeDropper' in window) {
        try {
          const eyeDropper = new (window as any).EyeDropper()
          const result = await eyeDropper.open()
          onPickColor(result.sRGBHex)
        } catch {
          onCancel()
        }
        return
      }

      // Fallback: get computed color
      const el = document.elementFromPoint(e.clientX, e.clientY)
      if (el) {
        const style = getComputedStyle(el)
        const bg = style.backgroundColor
        if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
          onPickColor(rgbToHex(bg))
        } else {
          onPickColor(rgbToHex(style.color))
        }
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel()
    }

    // Small delay to avoid picking from the button click
    const timer = setTimeout(() => {
      document.addEventListener('click', handleClick, { capture: true, once: true })
    }, 100)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      clearTimeout(timer)
      document.removeEventListener('click', handleClick, true)
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.cursor = ''
    }
  }, [active, onPickColor, onCancel])

  return null
}

function rgbToHex(rgb: string): string {
  const match = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
  if (!match) return rgb.startsWith('#') ? rgb : '#000000'
  const r = parseInt(match[1]).toString(16).padStart(2, '0')
  const g = parseInt(match[2]).toString(16).padStart(2, '0')
  const b = parseInt(match[3]).toString(16).padStart(2, '0')
  return `#${r}${g}${b}`
}
