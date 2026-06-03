'use client'

import { useState, useEffect, useCallback, createContext, useContext } from 'react'
import { X, CheckCircle2, AlertTriangle, Info, XCircle } from 'lucide-react'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: string
  message: string
  type: ToastType
  duration?: number
}

interface ToastContextValue {
  addToast: (message: string, type?: ToastType, duration?: number) => void
  confirm: (message: string) => Promise<boolean>
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

let globalToastId = 0

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const [confirmState, setConfirmState] = useState<{
    message: string
    resolve: (value: boolean) => void
  } | null>(null)

  const addToast = useCallback((message: string, type: ToastType = 'info', duration = 4000) => {
    const id = `toast-${++globalToastId}`
    setToasts((prev) => [...prev, { id, message, type, duration }])
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const confirm = useCallback((message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmState({ message, resolve })
    })
  }, [])

  const handleConfirm = useCallback((value: boolean) => {
    if (confirmState) {
      confirmState.resolve(value)
      setConfirmState(null)
    }
  }, [confirmState])

  return (
    <ToastContext.Provider value={{ addToast, confirm }}>
      {children}

      {/* Toast notifications */}
      <div className="fixed top-4 right-4 z-[99999] flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </div>

      {/* Confirm dialog */}
      {confirmState && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-6 max-w-sm mx-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3 mb-5">
              <AlertTriangle size={20} className="text-amber-400 mt-0.5 shrink-0" />
              <p className="text-sm text-slate-200 leading-relaxed">{confirmState.message}</p>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => handleConfirm(false)}
                className="px-4 py-2 text-sm text-slate-400 hover:text-white bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={() => handleConfirm(true)}
                className="px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-500 rounded-lg transition-colors"
              >
                確認
              </button>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  )
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const [fading, setFading] = useState(false)

  useEffect(() => {
    if (toast.duration && toast.duration > 0) {
      const fadeTimer = setTimeout(() => setFading(true), toast.duration - 300)
      const removeTimer = setTimeout(() => onRemove(toast.id), toast.duration)
      return () => { clearTimeout(fadeTimer); clearTimeout(removeTimer) }
    }
  }, [toast.id, toast.duration, onRemove])

  const icons: Record<ToastType, React.ReactNode> = {
    success: <CheckCircle2 size={16} className="text-emerald-400" />,
    error: <XCircle size={16} className="text-red-400" />,
    warning: <AlertTriangle size={16} className="text-amber-400" />,
    info: <Info size={16} className="text-blue-400" />,
  }

  const borderColors: Record<ToastType, string> = {
    success: 'border-emerald-500/30',
    error: 'border-red-500/30',
    warning: 'border-amber-500/30',
    info: 'border-blue-500/30',
  }

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`pointer-events-auto flex items-center gap-2.5 px-4 py-3 bg-slate-800/95 backdrop-blur-sm border ${borderColors[toast.type]} rounded-lg shadow-xl min-w-[280px] max-w-[400px] animate-in slide-in-from-right-5 fade-in duration-200 transition-opacity ${fading ? 'opacity-0 duration-300' : 'opacity-100'}`}
    >
      {icons[toast.type]}
      <span className="text-sm text-slate-200 flex-1">{toast.message}</span>
      <button
        onClick={() => onRemove(toast.id)}
        className="text-slate-500 hover:text-slate-300 transition-colors shrink-0"
      >
        <X size={14} />
      </button>
    </div>
  )
}
