'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { SlideElement } from '@/types'

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
  onCrop?: () => void
  onSetOpacity?: (opacity: number) => void
  currentOpacity?: number
  element?: SlideElement
  slideId?: string
  onUpdateProps?: (slideId: string, elementId: string, props: Record<string, unknown>) => void
}

type MenuItem =
  | { divider: true }
  | { label: string; shortcut?: string; action?: () => void; danger?: boolean }
  | { label: string; submenu: true; id: string }

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
  onCrop,
  onSetOpacity,
  currentOpacity,
  element,
  slideId,
  onUpdateProps,
}: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null)
  const [adjustedPos, setAdjustedPos] = useState<{ x: number; y: number }>({ x, y })
  const [visible, setVisible] = useState(false)

  useLayoutEffect(() => {
    if (!ref.current) return
    const menu = ref.current
    const menuW = menu.offsetWidth
    const menuH = menu.offsetHeight
    let newX = x
    let newY = y
    const viewportW = window.innerWidth
    const viewportH = window.innerHeight
    // Ensure menu doesn't overflow right (also account for potential submenu width ~144px)
    if (newX + menuW > viewportW) {
      newX = viewportW - menuW - 4
    }
    // Ensure menu doesn't overflow bottom
    if (newY + menuH > viewportH) {
      newY = viewportH - menuH - 4
    }
    // Clamp to top-left edges
    newX = Math.max(4, newX)
    newY = Math.max(4, newY)
    setAdjustedPos({ x: newX, y: newY })
    setVisible(true)
  }, [x, y])

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

  const opacityPresets = [
    { label: '100%', value: 1 },
    { label: '75%', value: 0.75 },
    { label: '50%', value: 0.5 },
    { label: '25%', value: 0.25 },
  ]

  const items: MenuItem[] = [
    // Edit group
    { label: 'コピー', shortcut: 'Ctrl+C', action: onCopy },
    { label: '複製', shortcut: 'Ctrl+D', action: onDuplicate },
    { divider: true },

    // Z-order group
    { label: '最前面へ', action: onBringToFront },
    { label: '一つ前へ', action: onBringForward },
    { label: '一つ後ろへ', action: onSendBackward },
    { label: '最背面へ', action: onSendToBack },
    { divider: true },

    // Group/Ungroup
    ...(onGroup ? [{ label: 'グループ化', shortcut: 'Ctrl+G', action: onGroup } as MenuItem] : []),
    ...(onUngroup && hasGroup
      ? [{ label: 'グループ解除', shortcut: 'Ctrl+Shift+G', action: onUngroup } as MenuItem]
      : []),
    ...(onGroup || (onUngroup && hasGroup) ? [{ divider: true } as MenuItem] : []),

    // Flip submenu
    ...(onFlipH || onFlipV
      ? [{ label: '反転', submenu: true, id: 'flip' } as MenuItem, { divider: true } as MenuItem]
      : []),

    // Opacity submenu
    ...(onSetOpacity
      ? [{ label: '不透明度', submenu: true, id: 'opacity' } as MenuItem, { divider: true } as MenuItem]
      : []),

    // Lock/Unlock
    ...(isLocked && onUnlock
      ? [{ label: '🔓 ロック解除', action: onUnlock } as MenuItem]
      : []),
    ...(!isLocked && onLock ? [{ label: '🔒 ロック', action: onLock } as MenuItem] : []),
    { divider: true },

    // Utilities
    ...(onCrop ? [{ label: 'クロップ', action: onCrop } as MenuItem] : []),
    ...(onProperties ? [{ label: 'プロパティ', action: onProperties } as MenuItem] : []),

    // Alt text for images
    ...(element?.type === 'image' && slideId && onUpdateProps
      ? [{
          label: '📝 Altテキスト',
          action: () => {
            const alt = prompt('画像の代替テキスト（Alt）:', (element as any).alt || '')
            if (alt !== null) {
              onUpdateProps(slideId, element.id, { alt })
            }
          },
        } as MenuItem]
      : []),

    // Delete
    { label: '削除', shortcut: 'Delete', action: onDelete, danger: true },
  ]

  // Remove consecutive/trailing dividers
  const cleanedItems: MenuItem[] = []
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const isDivider = 'divider' in item && item.divider
    if (isDivider) {
      // Skip if first, last, or previous was also a divider
      if (
        cleanedItems.length === 0 ||
        i === items.length - 1 ||
        ('divider' in cleanedItems[cleanedItems.length - 1] &&
          (cleanedItems[cleanedItems.length - 1] as { divider: true }).divider)
      ) {
        continue
      }
    }
    cleanedItems.push(item)
  }
  // Remove trailing divider
  if (
    cleanedItems.length > 0 &&
    'divider' in cleanedItems[cleanedItems.length - 1] &&
    (cleanedItems[cleanedItems.length - 1] as { divider: true }).divider
  ) {
    cleanedItems.pop()
  }

  return (
    <div
      ref={ref}
      className={`fixed z-[9999] bg-slate-900 border border-slate-700 rounded-lg shadow-2xl py-1 w-52 text-sm animate-slide-up transition-opacity ${visible ? 'opacity-100' : 'opacity-0'}`}
      style={{ top: adjustedPos.y, left: adjustedPos.x }}
    >
      {cleanedItems.map((item, i) => {
        if ('divider' in item && item.divider) {
          return <div key={i} className="h-px bg-slate-700 my-1" />
        }

        // Submenu items
        if ('submenu' in item && item.submenu) {
          const submenuId = item.id
          return (
            <div key={i} className="relative">
              <button
                className="w-full text-left px-3 py-1.5 flex items-center justify-between text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                onMouseEnter={() => setOpenSubmenu(submenuId)}
                onClick={() => setOpenSubmenu(openSubmenu === submenuId ? null : submenuId)}
              >
                <span className="text-xs">{item.label}</span>
                <span className="text-[10px] text-slate-500">&#9654;</span>
              </button>

              {openSubmenu === submenuId && submenuId === 'flip' && (
                <div className={`absolute top-0 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl py-1 w-36 z-50 ${adjustedPos.x + 208 + 144 > window.innerWidth ? 'right-full mr-1' : 'left-full ml-1'}`}>
                  {onFlipH && (
                    <button
                      className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                      onClick={() => {
                        onFlipH()
                        onClose()
                      }}
                    >
                      左右反転
                    </button>
                  )}
                  {onFlipV && (
                    <button
                      className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                      onClick={() => {
                        onFlipV()
                        onClose()
                      }}
                    >
                      上下反転
                    </button>
                  )}
                </div>
              )}

              {openSubmenu === submenuId && submenuId === 'opacity' && onSetOpacity && (
                <div className={`absolute top-0 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl py-1 w-36 z-50 ${adjustedPos.x + 208 + 144 > window.innerWidth ? 'right-full mr-1' : 'left-full ml-1'}`}>
                  {opacityPresets.map((preset) => (
                    <button
                      key={preset.value}
                      className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
                        currentOpacity !== undefined && Math.abs(currentOpacity - preset.value) < 0.01
                          ? 'text-indigo-400 bg-slate-800'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                      onClick={() => {
                        onSetOpacity(preset.value)
                        onClose()
                      }}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        }

        // Regular items
        const menuItem = item as { label: string; shortcut?: string; action?: () => void; danger?: boolean }
        return (
          <button
            key={i}
            className={`w-full text-left px-3 py-1.5 flex items-center justify-between transition-colors ${
              menuItem.danger
                ? 'text-red-400 hover:bg-red-500/10'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
            onClick={() => {
              menuItem.action?.()
              onClose()
            }}
          >
            <span className="text-xs">{menuItem.label}</span>
            {menuItem.shortcut && <span className="text-[10px] text-slate-500">{menuItem.shortcut}</span>}
          </button>
        )
      })}
    </div>
  )
}
