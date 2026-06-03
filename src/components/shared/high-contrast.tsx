'use client'

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { Eye } from 'lucide-react'

const HC_STORAGE_KEY = 'doccraft:high-contrast'

interface HighContrastContextValue {
  highContrast: boolean
  toggleHighContrast: () => void
}

const HighContrastContext = createContext<HighContrastContextValue>({
  highContrast: false,
  toggleHighContrast: () => {},
})

export function HighContrastProvider({ children }: { children: ReactNode }) {
  const [highContrast, setHighContrast] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(HC_STORAGE_KEY)
    if (stored === 'true') {
      setHighContrast(true)
    }
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('high-contrast', highContrast)
    localStorage.setItem(HC_STORAGE_KEY, String(highContrast))
  }, [highContrast])

  const toggleHighContrast = useCallback(() => {
    setHighContrast((prev) => !prev)
  }, [])

  return (
    <HighContrastContext.Provider value={{ highContrast, toggleHighContrast }}>
      {children}
    </HighContrastContext.Provider>
  )
}

export function useHighContrast() {
  return useContext(HighContrastContext)
}

/**
 * Toggle button for high contrast mode.
 * Can be placed in settings or theme switcher.
 */
export function HighContrastToggle() {
  const { highContrast, toggleHighContrast } = useHighContrast()

  return (
    <button
      onClick={toggleHighContrast}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
        highContrast
          ? 'border-amber-500 bg-amber-500/15 text-amber-300'
          : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-500'
      }`}
      aria-pressed={highContrast}
      aria-label="ハイコントラストモード"
      title="ハイコントラストモード"
    >
      <Eye size={16} />
      ハイコントラスト
    </button>
  )
}
