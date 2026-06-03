'use client'

import {
  useState,
  useCallback,
  createContext,
  useContext,
  useRef,
  useEffect,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, Info, AlertCircle, X } from 'lucide-react'

// ── Types ──

type ConfirmVariant = 'danger' | 'warning' | 'info'

interface ConfirmOptions {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: ConfirmVariant
}

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>
}

// ── Context ──

const ConfirmContext = createContext<ConfirmContextValue | null>(null)

// ── Provider ──

export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{
    options: ConfirmOptions
    resolve: (value: boolean) => void
  } | null>(null)

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({ options, resolve })
    })
  }, [])

  const handleResult = useCallback(
    (result: boolean) => {
      if (state) {
        state.resolve(result)
        setState(null)
      }
    },
    [state],
  )

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {state && (
        <ConfirmDialogPortal
          options={state.options}
          onConfirm={() => handleResult(true)}
          onCancel={() => handleResult(false)}
        />
      )}
    </ConfirmContext.Provider>
  )
}

// ── Hook ──

/**
 * Hook for showing confirmation dialogs.
 *
 * Usage:
 *   const confirm = useConfirm()
 *   const ok = await confirm({ title: '削除の確認', message: '本当に削除しますか？', variant: 'danger' })
 *   if (ok) { ... }
 */
export function useConfirm() {
  const ctx = useContext(ConfirmContext)
  if (!ctx) {
    throw new Error('useConfirm must be used within ConfirmDialogProvider')
  }
  return ctx.confirm
}

// ── Portal-rendered dialog ──

function ConfirmDialogPortal({
  options,
  onConfirm,
  onCancel,
}: {
  options: ConfirmOptions
  onConfirm: () => void
  onCancel: () => void
}) {
  const [mounted, setMounted] = useState(false)
  const confirmBtnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Focus the confirm button on mount for keyboard accessibility
  useEffect(() => {
    if (mounted && confirmBtnRef.current) {
      confirmBtnRef.current.focus()
    }
  }, [mounted])

  const dialogRef = useRef<HTMLDivElement>(null)

  // Handle Escape to cancel and focus trap
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        onCancel()
        return
      }
      // Focus trap: cycle focus within dialog
      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
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
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onCancel])

  const {
    title,
    message,
    confirmLabel = '確認',
    cancelLabel = 'キャンセル',
    variant = 'warning',
  } = options

  const variantConfig: Record<
    ConfirmVariant,
    { icon: ReactNode; confirmClass: string; iconClass: string }
  > = {
    danger: {
      icon: <AlertCircle size={20} />,
      confirmClass: 'bg-red-600 hover:bg-red-500 text-white',
      iconClass: 'text-red-400',
    },
    warning: {
      icon: <AlertTriangle size={20} />,
      confirmClass: 'bg-amber-600 hover:bg-amber-500 text-white',
      iconClass: 'text-amber-400',
    },
    info: {
      icon: <Info size={20} />,
      confirmClass: 'bg-indigo-600 hover:bg-indigo-500 text-white',
      iconClass: 'text-indigo-400',
    },
  }

  const config = variantConfig[variant]

  if (!mounted) return null

  return createPortal(
    <div
      ref={dialogRef}
      className="fixed inset-0 z-[99999] flex items-center justify-center"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-message"
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onCancel}
      />
      <div className="relative bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm mx-4 shadow-2xl animate-scale-in">
        <div className="p-6">
          <div className="flex items-start gap-3 mb-1">
            <div className={`mt-0.5 shrink-0 ${config.iconClass}`}>{config.icon}</div>
            <div className="flex-1 min-w-0">
              <h3
                id="confirm-dialog-title"
                className="text-base font-semibold text-white mb-2"
              >
                {title}
              </h3>
              <p
                id="confirm-dialog-message"
                className="text-sm text-slate-300 leading-relaxed"
              >
                {message}
              </p>
            </div>
            <button
              onClick={onCancel}
              className="shrink-0 w-6 h-6 flex items-center justify-center rounded text-slate-500 hover:text-white transition-colors"
              aria-label="閉じる"
            >
              <X size={16} />
            </button>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-6 pb-5">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmBtnRef}
            onClick={onConfirm}
            className={`px-4 py-2 text-sm rounded-lg transition-colors ${config.confirmClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
