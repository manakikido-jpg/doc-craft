'use client'

import { useRef, useEffect, useState } from 'react'
import type { SlideTextElement, SlideTheme } from '@/types'

interface Props {
  element: SlideTextElement
  theme: SlideTheme
  isEditing: boolean
  onFocus: () => void
  onBlur: (content: string) => void
}

export default function SlideTextBlock({ element, theme, isEditing, onFocus, onBlur }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [autoScale, setAutoScale] = useState(1)

  useEffect(() => {
    if (!ref.current) return
    if (!isEditing && ref.current.innerHTML !== element.content) {
      ref.current.innerHTML = element.content
    }
  }, [element.content, isEditing])

  // Auto-fit: reduce font size if text overflows container
  useEffect(() => {
    if (!ref.current || isEditing) return
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
  }, [element.content, element.fontSize, isEditing])

  const color = element.color || (element.type === 'title' ? theme.titleColor : theme.bodyColor)
  const placeholder = element.type === 'title' ? 'タイトルを入力' : 'テキストを入力'
  const effectiveFontSize = isEditing ? element.fontSize : element.fontSize * autoScale

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        color,
        fontSize: `clamp(10px, ${effectiveFontSize * 0.055}vw, ${effectiveFontSize}px)`,
        fontWeight: element.fontWeight,
        fontFamily: element.fontFamily || 'inherit',
        textAlign: element.align,
        lineHeight: element.lineHeight ?? 1.3,
        letterSpacing: element.letterSpacing ? `${element.letterSpacing}em` : undefined,
        textShadow: element.textShadow ? '2px 2px 4px rgba(0,0,0,0.5)' : undefined,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        cursor: isEditing ? 'text' : 'inherit',
        borderRadius: '4px',
        padding: '4px',
        outline: isEditing ? `2px solid ${theme.accentColor}40` : 'none',
        transition: 'outline 0.15s, font-size 0.2s',
        overflow: 'hidden',
      }}
      ref={ref}
      contentEditable={isEditing}
      suppressContentEditableWarning
      data-placeholder={placeholder}
      onMouseDown={(e) => {
        if (isEditing) e.stopPropagation()
      }}
      onClick={(e) => {
        if (isEditing) e.stopPropagation()
      }}
      onKeyDown={(e) => {
        if (isEditing) e.stopPropagation()
      }}
      onFocus={onFocus}
      onBlur={(e) => onBlur(e.currentTarget.innerHTML)}
    />
  )
}
