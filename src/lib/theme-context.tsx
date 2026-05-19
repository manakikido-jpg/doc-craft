'use client'

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'

type AppTheme = 'dark' | 'light'

interface ThemeContextValue {
  theme: AppTheme
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue>({ theme: 'dark', toggleTheme: () => {} })

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<AppTheme>('dark')

  useEffect(() => {
    const stored = localStorage.getItem('app-theme') as AppTheme | null
    if (stored === 'light' || stored === 'dark') {
      setTheme(stored)
    }
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('light-theme', theme === 'light')
    localStorage.setItem('app-theme', theme)
  }, [theme])

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'))
  }, [])

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  return useContext(ThemeContext)
}
