'use client'

import { useState, useCallback, useEffect } from 'react'

export interface FormatData {
  fontSize?: number
  fontWeight?: string
  fontFamily?: string
  color?: string
  align?: string
  letterSpacing?: number
  lineHeight?: number
  underline?: boolean
  strikethrough?: boolean
  highlightColor?: string
  textShadow?: boolean
  bulletType?: string
  indentLevel?: number
  fill?: string
  stroke?: string
  strokeWidth?: number
  strokeDash?: string
  opacity?: number
}

interface Props {
  active: boolean
  onActivate: () => void
  onDeactivate: () => void
  formatData: FormatData | null
  onApplyFormat: (targetElementId: string) => void
}

export default function FormatPainter({ active, onActivate, onDeactivate, formatData, onApplyFormat }: Props) {
  // This component is mostly state management — the UI is a button in the ribbon toolbar
  // When active, listen for clicks on elements and apply format

  useEffect(() => {
    if (!active) return
    function handleClick(e: MouseEvent) {
      const target = (e.target as HTMLElement).closest('[data-element-id]')
      if (target) {
        const elementId = target.getAttribute('data-element-id')
        if (elementId) {
          onApplyFormat(elementId)
          onDeactivate()
        }
      }
    }
    // Use capture to intercept before normal click handlers
    document.addEventListener('click', handleClick, true)
    return () => document.removeEventListener('click', handleClick, true)
  }, [active, onApplyFormat, onDeactivate])

  useEffect(() => {
    if (!active) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onDeactivate()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [active, onDeactivate])

  // Change cursor when active
  useEffect(() => {
    if (active) {
      document.body.style.cursor = 'crosshair'
      return () => { document.body.style.cursor = '' }
    }
  }, [active])

  return null // No visible UI — controlled by ribbon button
}
