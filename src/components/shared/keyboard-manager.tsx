'use client'

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'

// ── Types ──

interface ShortcutEntry {
  id: string
  key: string // e.g. 'ctrl+s', 'escape', 'ctrl+shift+z'
  handler: (e: KeyboardEvent) => void
  description?: string
  /** If true, this shortcut only fires when inside the given scope */
  scope?: string
}

interface KeyboardNavContextValue {
  registerShortcut: (entry: ShortcutEntry) => () => void
  getShortcuts: () => ShortcutEntry[]
}

const KeyboardNavContext = createContext<KeyboardNavContextValue | null>(null)

// ── Helpers ──

function normalizeKey(e: KeyboardEvent): string {
  const parts: string[] = []
  if (e.ctrlKey || e.metaKey) parts.push('ctrl')
  if (e.shiftKey) parts.push('shift')
  if (e.altKey) parts.push('alt')
  const key = e.key.toLowerCase()
  if (!['control', 'shift', 'alt', 'meta'].includes(key)) {
    parts.push(key === ' ' ? 'space' : key)
  }
  return parts.join('+')
}

// ── Provider ──

export function KeyboardNavProvider({ children }: { children: ReactNode }) {
  const shortcutsRef = useRef<Map<string, ShortcutEntry>>(new Map())

  const registerShortcut = useCallback((entry: ShortcutEntry) => {
    shortcutsRef.current.set(entry.id, entry)
    return () => {
      shortcutsRef.current.delete(entry.id)
    }
  }, [])

  const getShortcuts = useCallback(() => {
    return Array.from(shortcutsRef.current.values())
  }, [])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const pressed = normalizeKey(e)
      for (const entry of shortcutsRef.current.values()) {
        if (entry.key === pressed) {
          entry.handler(e)
          // Don't break -- allow multiple handlers for the same key
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <KeyboardNavContext.Provider value={{ registerShortcut, getShortcuts }}>
      {children}
    </KeyboardNavContext.Provider>
  )
}

// ── Hooks ──

/**
 * Hook to register keyboard shortcuts. Returns a cleanup function.
 *
 * Usage:
 *   useKeyboardNav([
 *     { id: 'save', key: 'ctrl+s', handler: (e) => { e.preventDefault(); save() } },
 *     { id: 'undo', key: 'ctrl+z', handler: () => undo() },
 *   ])
 */
export function useKeyboardNav(shortcuts: Omit<ShortcutEntry, 'id'>[] | ShortcutEntry[]): void {
  const ctx = useContext(KeyboardNavContext)

  useEffect(() => {
    if (!ctx) {
      // Fallback: register directly on window
      function handleKeyDown(e: KeyboardEvent) {
        const pressed = normalizeKey(e)
        for (const s of shortcuts) {
          if (s.key === pressed) {
            s.handler(e)
          }
        }
      }
      window.addEventListener('keydown', handleKeyDown)
      return () => window.removeEventListener('keydown', handleKeyDown)
    }

    const cleanups = shortcuts.map((s) => {
      const entry: ShortcutEntry = {
        id: 'id' in s && s.id ? s.id : `shortcut-${s.key}-${Math.random().toString(36).slice(2, 6)}`,
        ...s,
      }
      return ctx.registerShortcut(entry)
    })

    return () => {
      for (const cleanup of cleanups) cleanup()
    }
  }, [ctx, shortcuts])
}

// ── Focus Trap ──

interface FocusTrapProps {
  active: boolean
  children: ReactNode
}

/**
 * Focus trap component for modals and dialogs.
 * Traps Tab focus within its children when active.
 */
export function FocusTrap({ active, children }: FocusTrapProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!active || !containerRef.current) return

    const container = containerRef.current
    const focusableSelector =
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

    function getFocusableElements(): HTMLElement[] {
      return Array.from(container.querySelectorAll<HTMLElement>(focusableSelector))
    }

    // Focus the first focusable element
    const elements = getFocusableElements()
    if (elements.length > 0) {
      elements[0].focus()
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Tab') return

      const focusable = getFocusableElements()
      if (focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    container.addEventListener('keydown', handleKeyDown)
    return () => container.removeEventListener('keydown', handleKeyDown)
  }, [active])

  return <div ref={containerRef}>{children}</div>
}

// ── Skip to Content ──

/**
 * Skip-to-content link for keyboard navigation.
 * Already present in layout.tsx but exported here for reuse.
 */
export function SkipToContent({
  targetId = 'main-content',
  label = 'メインコンテンツへスキップ',
}: {
  targetId?: string
  label?: string
}) {
  return (
    <a
      href={`#${targetId}`}
      className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-indigo-600 focus:text-white focus:rounded-lg focus:text-sm"
    >
      {label}
    </a>
  )
}
