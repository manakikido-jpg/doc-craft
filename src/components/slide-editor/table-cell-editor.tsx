'use client'

import { useState, useRef, useEffect } from 'react'

interface Props {
  value: string
  isEditing: boolean
  isHeader: boolean
  cellStyle?: { bgColor?: string; textColor?: string }
  onStartEdit: () => void
  onEndEdit: (value: string) => void
  onContextMenu: (e: React.MouseEvent) => void
}

export default function TableCellEditor({
  value,
  isEditing,
  isHeader,
  cellStyle,
  onStartEdit,
  onEndEdit,
  onContextMenu,
}: Props) {
  const [editValue, setEditValue] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing) {
      setEditValue(value)
      // Focus the input after render
      requestAnimationFrame(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      })
    }
  }, [isEditing, value])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      onEndEdit(editValue)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onEndEdit(value) // revert to original
    }
  }

  const bgColor = cellStyle?.bgColor || 'transparent'
  const textColor = cellStyle?.textColor || '#e2e8f0'

  if (isEditing) {
    return (
      <td
        style={{ backgroundColor: bgColor }}
        className="p-0"
        onContextMenu={onContextMenu}
      >
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => onEndEdit(editValue)}
          className="w-full h-full px-2 py-1.5 bg-slate-900/80 text-white text-sm outline-none ring-2 ring-indigo-500 rounded-none"
          style={{ color: '#ffffff', minWidth: 60 }}
        />
      </td>
    )
  }

  return (
    <td
      style={{ backgroundColor: bgColor, color: textColor }}
      className={`px-2 py-1.5 text-sm cursor-text select-none truncate ${
        isHeader ? 'font-bold' : 'font-normal'
      }`}
      onDoubleClick={onStartEdit}
      onContextMenu={onContextMenu}
    >
      {value || ' '}
    </td>
  )
}
