'use client'

import { useEffect, useRef } from 'react'

interface Props {
  x: number
  y: number
  onClose: () => void
  onBringToFront: () => void
  onSendToBack: () => void
  onBringForward: () => void
  onSendBackward: () => void
  onDuplicate: () => void
  onDelete: () => void
  onCopy: () => void
  onGroup?: () => void
  onUngroup?: () => void
  hasGroup?: boolean
  onFlipH?: () => void
  onFlipV?: () => void
  onLock?: () => void
  onUnlock?: () => void
  isLocked?: boolean
  onProperties?: () => void
}

export default function ElementContextMenu({
  x,
  y,
  onClose,
  onBringToFront,
  onSendToBack,
  onBringForward,
  onSendBackward,
  onDuplicate,
  onDelete,
  onCopy,
  onGroup,
  onUngroup,
  hasGroup,
  onFlipH,
  onFlipV,
  onLock,
  onUnlock,
  isLocked,
  onProperties,
}: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [onClose])

  const items = [
    { label: 'コピー', shortcut: 'Ctrl+C', action: onCopy },
    { label: '複製', shortcut: '', action: onDuplicate },
    { divider: true },
    { label: '最前面へ', shortcut: '', action: onBringToFront },
    { label: '一つ前へ', shortcut: '', action: onBringForward },
    { label: '一つ後ろへ', shortcut: '', action: onSendBackward },
    { label: '最背面へ', shortcut: '', action: onSendToBack },
    { divider: true },
    ...(onGroup ? [{ label: 'グループ化', shortcut: 'Ctrl+G', action: onGroup }] : []),
    ...(onUngroup && hasGroup ? [{ label: 'グループ解除', shortcut: 'Ctrl+Shift+G', action: onUngroup }] : []),
    { divider: true },
    ...(onFlipH ? [{ label: '水平反転', shortcut: '', action: onFlipH }] : []),
    ...(onFlipV ? [{ label: '垂直反転', shortcut: '', action: onFlipV }] : []),
    ...(onFlipH || onFlipV ? [{ divider: true }] : []),
    ...(isLocked && onUnlock ? [{ label: 'ロック解除', shortcut: '', action: onUnlock }] : []),
    ...(!isLocked && onLock ? [{ label: 'ロック', shortcut: '', action: onLock }] : []),
    { divider: true },
    ...(onProperties ? [{ label: 'プロパティ', shortcut: '', action: onProperties }] : []),
    { label: '削除', shortcut: 'Delete', action: onDelete, danger: true },
  ]

  return (
    <div
      ref={ref}
      className="fixed z-[9999] bg-slate-900 border border-slate-700 rounded-lg shadow-2xl py-1 w-48 text-sm animate-slide-up"
      style={{ top: y, left: x }}
    >
      {items.map((item, i) => {
        if ('divider' in item && item.divider) {
          return <div key={i} className="h-px bg-slate-700 my-1" />
        }
        return (
          <button
            key={i}
            className={`w-full text-left px-3 py-1.5 flex items-center justify-between transition-colors ${
              (item as any).danger
                ? 'text-red-400 hover:bg-red-500/10'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
            onClick={() => {
              ;(item as any).action?.()
              onClose()
            }}
          >
            <span className="text-xs">{(item as any).label}</span>
            {(item as any).shortcut && <span className="text-[10px] text-slate-500">{(item as any).shortcut}</span>}
          </button>
        )
      })}
    </div>
  )
}
