'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import type { SlideTextElement, SlideTheme } from '@/types'

interface Props {
  element: SlideTextElement
  theme: SlideTheme
  isEditing: boolean
  onFocus: () => void
  onBlur: (content: string) => void
  onResize?: (newH: number) => void
}

export default function SlideTextBlock({ element, theme, isEditing, onFocus, onBlur, onResize }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [autoScale, setAutoScale] = useState(1)
  const contentBeforeEdit = useRef(element.content)
  const originalH = useRef(element.h ?? 0)

  // Track content at edit start for Escape cancel
  useEffect(() => {
    if (isEditing) {
      contentBeforeEdit.current = element.content
      // Focus and select all on edit start
      requestAnimationFrame(() => {
        if (ref.current) {
          ref.current.focus()
        }
      })
    }
  }, [isEditing])

  useEffect(() => {
    if (!ref.current) return
    if (!isEditing && ref.current.innerHTML !== element.content) {
      ref.current.innerHTML = element.content
    }
  }, [element.content, isEditing])

  // Auto-fit: reduce font size if text overflows container
  useEffect(() => {
    if (!ref.current || isEditing) return
    // Skip auto-scaling for 'none' and 'grow' modes
    if (element.autoSize === 'none' || element.autoSize === 'grow') {
      setAutoScale(1)
      return
    }
    const el = ref.current
    const parent = el.parentElement
    if (!parent) return
    // Reset to check natural size
    setAutoScale(1)
    requestAnimationFrame(() => {
      if (el.scrollHeight > parent.clientHeight + 2 && parent.clientHeight > 0) {
        const scale = Math.max(0.5, parent.clientHeight / el.scrollHeight)
        setAutoScale(scale)
      } else {
        setAutoScale(1)
      }
    })
  }, [element.content, element.fontSize, element.autoSize, isEditing])

  // Store original height when element first mounts or h changes externally
  useEffect(() => {
    if (element.h !== undefined && element.h > 0) {
      // Only update originalH if it hasn't been set or if element.h decreased (external resize)
      if (originalH.current === 0) {
        originalH.current = element.h
      }
    }
  }, [element.h])

  // Auto-grow: expand height when content overflows (autoSize === 'grow')
  const handleAutoGrow = useCallback(() => {
    if (!ref.current || !onResize || element.autoSize !== 'grow') return
    const el = ref.current
    const parent = el.parentElement
    if (!parent) return
    // Find the canvas container (the element with percentage-based dimensions)
    const canvasEl = parent.closest('[class*="relative"]') as HTMLElement | null
    if (!canvasEl) return
    const canvasHeight = canvasEl.clientHeight
    if (canvasHeight <= 0) return

    // Check if content overflows
    if (el.scrollHeight > el.clientHeight + 2) {
      // Convert the needed pixel height to percentage
      const neededPxHeight = el.scrollHeight + 8 // small padding
      const neededPercentH = (neededPxHeight / canvasHeight) * 100
      // Only grow, never shrink below original
      const minH = originalH.current || (element.h ?? 0)
      const newH = Math.max(minH, neededPercentH)
      if (newH > (element.h ?? 0) + 0.5) {
        onResize(newH)
      }
    }
  }, [element.autoSize, element.h, onResize])

  // Run auto-grow after content changes when not editing
  useEffect(() => {
    if (element.autoSize !== 'grow' || !onResize) return
    requestAnimationFrame(handleAutoGrow)
  }, [element.content, element.fontSize, handleAutoGrow])

  const color = element.color || (element.type === 'title' ? theme.titleColor : theme.bodyColor)
  const placeholder = element.type === 'title' ? 'タイトルを入力' : 'テキストを入力'
  const fontSize = element.superscript || element.subscript ? element.fontSize * 0.75 : element.fontSize
  const effectiveFontSize = isEditing ? fontSize : fontSize * autoScale
  const hasBullet = !!element.bulletType && element.bulletType !== 'none'

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isEditing) return
    e.stopPropagation()

    // Escape: cancel editing, revert to original content
    if (e.key === 'Escape') {
      e.preventDefault()
      if (ref.current) {
        ref.current.innerHTML = contentBeforeEdit.current
      }
      onBlur(contentBeforeEdit.current)
      return
    }

    // Ctrl+Enter or Cmd+Enter: confirm and exit editing
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      if (ref.current) {
        onBlur(ref.current.innerHTML)
      }
      return
    }
  }, [isEditing, onBlur])

  const containerStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    color: element.wordArtStyle === 'outline' ? 'transparent' : color,
    fontSize: `clamp(10px, ${effectiveFontSize * 0.055}vw, ${effectiveFontSize}px)`,
    fontWeight: element.fontWeight,
    fontFamily: element.fontFamily || 'inherit',
    textAlign: element.align,
    lineHeight: element.lineHeight ?? 1.3,
    letterSpacing: element.letterSpacing ? `${element.letterSpacing}em` : undefined,
    textShadow: element.wordArtStyle === 'glow'
      ? '0 0 10px currentColor, 0 0 20px currentColor, 0 0 30px currentColor'
      : element.wordArtStyle === 'shadow3d'
      ? '2px 2px 0 rgba(0,0,0,0.3), 4px 4px 0 rgba(0,0,0,0.15)'
      : element.textShadow ? '2px 2px 4px rgba(0,0,0,0.5)' : undefined,
    textDecoration: [element.underline && 'underline', element.strikethrough && 'line-through'].filter(Boolean).join(' ') || undefined,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    cursor: isEditing ? 'text' : 'inherit',
    borderRadius: '4px',
    padding: '4px',
    outline: isEditing ? `2px solid ${theme.accentColor}` : 'none',
    background: isEditing ? 'rgba(255,255,255,0.05)' : undefined,
    transition: 'outline 0.15s, font-size 0.2s, background 0.15s',
    overflow: element.autoSize === 'none' ? 'hidden' : element.autoSize === 'grow' ? 'visible' : 'hidden',

    // Superscript / subscript baseline shift
    ...(element.superscript ? { verticalAlign: 'super' as const } : {}),
    ...(element.subscript ? { verticalAlign: 'sub' as const } : {}),

    // Writing mode
    ...(element.writingMode === 'vertical' ? { writingMode: 'vertical-rl' as const, textOrientation: 'mixed' as const } : {}),

    // Padding (overrides default 4px)
    ...(element.padding ? {
      paddingTop: element.padding.top,
      paddingRight: element.padding.right,
      paddingBottom: element.padding.bottom,
      paddingLeft: element.padding.left,
    } : {}),

    // Text columns
    ...(element.textColumns && element.textColumns > 1 ? {
      columnCount: element.textColumns,
      columnGap: '8px',
    } : {}),

    // Indent (adds to any existing paddingLeft)
    ...(element.indentLevel ? { paddingLeft: `${(element.indentLevel || 0) * 24}px` } : {}),

    // WordArt outline stroke
    ...(element.wordArtStyle === 'outline' ? {
      WebkitTextStroke: '1px currentColor',
    } : {}),
  }

  return (
    <div className={hasBullet ? 'flex items-start' : undefined} style={{ width: '100%', height: '100%' }}>
      {hasBullet && !isEditing && (
        <span className="inline-block mr-1 flex-shrink-0 select-none" style={{ fontSize: fontSize * autoScale, color }}>
          {element.bulletType === 'disc' ? '●' :
           element.bulletType === 'circle' ? '○' :
           element.bulletType === 'square' ? '■' :
           element.bulletType === 'decimal' ? '1.' :
           element.bulletType === 'alpha' ? 'a.' :
           element.bulletType === 'roman' ? 'i.' : ''}
        </span>
      )}
      <div
        style={containerStyle}
        ref={ref}
        contentEditable={isEditing}
        spellCheck={true}
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onMouseDown={(e) => {
          if (isEditing) e.stopPropagation()
        }}
        onClick={(e) => {
          if (isEditing) e.stopPropagation()
        }}
        onKeyDown={handleKeyDown}
        onFocus={onFocus}
        onBlur={(e) => onBlur(e.currentTarget.innerHTML)}
        onInput={handleAutoGrow}
      />
    </div>
  )
}
