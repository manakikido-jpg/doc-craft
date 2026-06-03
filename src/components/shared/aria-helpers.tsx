'use client'

import {
  forwardRef,
  createContext,
  useContext,
  useCallback,
  useRef,
  useState,
  useEffect,
  type ReactNode,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
} from 'react'

// ── AriaButton ──

interface AriaButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Accessible label for screen readers */
  'aria-label': string
  /** Whether the button controls an expandable element */
  expanded?: boolean
  /** ID of the element this button controls */
  controls?: string
  /** Whether the button is currently pressed (toggle buttons) */
  pressed?: boolean
}

export const AriaButton = forwardRef<HTMLButtonElement, AriaButtonProps>(
  function AriaButton({ expanded, controls, pressed, children, ...props }, ref) {
    return (
      <button
        ref={ref}
        role="button"
        aria-expanded={expanded}
        aria-controls={controls}
        aria-pressed={pressed}
        tabIndex={0}
        {...props}
      >
        {children}
      </button>
    )
  },
)

// ── AriaDialog ──

interface AriaDialogProps extends HTMLAttributes<HTMLDivElement> {
  /** Whether the dialog is currently open */
  open: boolean
  /** Label for the dialog */
  label: string
  /** ID of the element that labels this dialog */
  labelledBy?: string
  /** ID of the element that describes this dialog */
  describedBy?: string
  /** Whether this is a modal dialog (traps focus) */
  modal?: boolean
  children: ReactNode
}

export const AriaDialog = forwardRef<HTMLDivElement, AriaDialogProps>(
  function AriaDialog({ open, label, labelledBy, describedBy, modal = true, children, ...props }, ref) {
    if (!open) return null

    return (
      <div
        ref={ref}
        role="dialog"
        aria-modal={modal}
        aria-label={labelledBy ? undefined : label}
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        tabIndex={-1}
        {...props}
      >
        {children}
      </div>
    )
  },
)

// ── AriaMenu ──

interface AriaMenuProps extends HTMLAttributes<HTMLDivElement> {
  /** Label for the menu */
  label: string
  children: ReactNode
}

export const AriaMenu = forwardRef<HTMLDivElement, AriaMenuProps>(
  function AriaMenu({ label, children, ...props }, ref) {
    return (
      <div ref={ref} role="menu" aria-label={label} tabIndex={-1} {...props}>
        {children}
      </div>
    )
  },
)

interface AriaMenuItemProps extends HTMLAttributes<HTMLDivElement> {
  disabled?: boolean
  children: ReactNode
}

export const AriaMenuItem = forwardRef<HTMLDivElement, AriaMenuItemProps>(
  function AriaMenuItem({ disabled, children, ...props }, ref) {
    return (
      <div
        ref={ref}
        role="menuitem"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        {...props}
      >
        {children}
      </div>
    )
  },
)

// ── AriaToolbar ──

interface AriaToolbarProps extends HTMLAttributes<HTMLDivElement> {
  /** Label for the toolbar */
  label: string
  /** Orientation of the toolbar */
  orientation?: 'horizontal' | 'vertical'
  children: ReactNode
}

export const AriaToolbar = forwardRef<HTMLDivElement, AriaToolbarProps>(
  function AriaToolbar({ label, orientation = 'horizontal', children, ...props }, ref) {
    return (
      <div
        ref={ref}
        role="toolbar"
        aria-label={label}
        aria-orientation={orientation}
        tabIndex={0}
        {...props}
      >
        {children}
      </div>
    )
  },
)

// ── Live Region for screen reader announcements ──

interface AnnounceContextValue {
  announce: (message: string, priority?: 'polite' | 'assertive') => void
}

const AnnounceContext = createContext<AnnounceContextValue | null>(null)

export function AnnounceProvider({ children }: { children: ReactNode }) {
  const [politeMessage, setPoliteMessage] = useState('')
  const [assertiveMessage, setAssertiveMessage] = useState('')
  const politeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const assertiveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const announce = useCallback(
    (message: string, priority: 'polite' | 'assertive' = 'polite') => {
      if (priority === 'assertive') {
        setAssertiveMessage(message)
        if (assertiveTimerRef.current) clearTimeout(assertiveTimerRef.current)
        assertiveTimerRef.current = setTimeout(() => setAssertiveMessage(''), 3000)
      } else {
        setPoliteMessage(message)
        if (politeTimerRef.current) clearTimeout(politeTimerRef.current)
        politeTimerRef.current = setTimeout(() => setPoliteMessage(''), 3000)
      }
    },
    [],
  )

  useEffect(() => {
    return () => {
      if (politeTimerRef.current) clearTimeout(politeTimerRef.current)
      if (assertiveTimerRef.current) clearTimeout(assertiveTimerRef.current)
    }
  }, [])

  return (
    <AnnounceContext.Provider value={{ announce }}>
      {children}
      {/* Live regions for screen readers */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {politeMessage}
      </div>
      <div
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      >
        {assertiveMessage}
      </div>
    </AnnounceContext.Provider>
  )
}

/**
 * Hook to announce messages to screen readers via an aria-live region.
 *
 * Usage:
 *   const announce = useAnnounce()
 *   announce('Document saved', 'polite')
 *   announce('Error: connection lost', 'assertive')
 */
export function useAnnounce() {
  const ctx = useContext(AnnounceContext)
  if (!ctx) {
    // Fallback: no-op if provider is missing
    return (_message: string, _priority?: 'polite' | 'assertive') => {}
  }
  return ctx.announce
}
