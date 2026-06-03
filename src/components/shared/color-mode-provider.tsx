'use client'

import { createContext, useContext, useState, useEffect } from 'react'

type ColorMode = 'dark' | 'light'

interface ColorModeContextType {
  colorMode: ColorMode
  setColorMode: (mode: ColorMode) => void
}

const ColorModeContext = createContext<ColorModeContextType>({
  colorMode: 'dark',
  setColorMode: () => {},
})

export function useColorMode() {
  return useContext(ColorModeContext)
}

export function ColorModeProvider({ children }: { children: React.ReactNode }) {
  const [colorMode, setColorModeState] = useState<ColorMode>('dark')

  useEffect(() => {
    const saved = localStorage.getItem('doccraft:colorMode') as ColorMode | null
    if (saved === 'light' || saved === 'dark') {
      setColorModeState(saved)
    }
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('light-theme', colorMode === 'light')
  }, [colorMode])

  function setColorMode(mode: ColorMode) {
    setColorModeState(mode)
    localStorage.setItem('doccraft:colorMode', mode)
  }

  return <ColorModeContext.Provider value={{ colorMode, setColorMode }}>{children}</ColorModeContext.Provider>
}
