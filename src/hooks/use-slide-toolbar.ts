import { useState, useRef, useEffect } from 'react'

export function useSlideToolbar() {
  const [presConfig, setPresConfig] = useState({
    loop: false,
    autoPlay: false,
    autoPlayInterval: 5,
    showControls: true,
    startFromCurrent: true,
    penColor: '#ef4444',
    penWidth: 3,
  })
  const [watermarkConfig, setWatermarkConfig] = useState<{
    enabled: boolean
    text: string
    fontSize: number
    color: string
    opacity: number
    rotation: number
    position: 'center' | 'diagonal' | 'bottom-right'
  }>({
    enabled: false,
    text: 'CONFIDENTIAL',
    fontSize: 48,
    color: '#94a3b8',
    opacity: 15,
    rotation: -30,
    position: 'diagonal',
  })
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved')
  const saveStatusTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Dark/Light theme
  const [docThemeMode, setDocThemeMode] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('doccraft_theme') as 'dark' | 'light') || 'dark'
    }
    return 'dark'
  })

  // Dark/Light theme class switching
  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('theme-dark', 'theme-light')
    root.classList.add(docThemeMode === 'light' ? 'theme-light' : 'theme-dark')
    localStorage.setItem('doccraft_theme', docThemeMode)
  }, [docThemeMode])

  const updateSaveStatus = (slides: unknown[], meta: { id: string }, activeSlideId: string) => {
    if (!meta.id || !(slides as unknown[]).length) return
    setSaveStatus('saving')
    if (saveStatusTimer.current) clearTimeout(saveStatusTimer.current)
    saveStatusTimer.current = setTimeout(() => {
      setSaveStatus('saved')
    }, 1000)
  }

  const cleanupSaveTimer = () => {
    if (saveStatusTimer.current) clearTimeout(saveStatusTimer.current)
  }

  return {
    presConfig, setPresConfig,
    watermarkConfig, setWatermarkConfig,
    saveStatus, setSaveStatus,
    docThemeMode, setDocThemeMode,
    updateSaveStatus,
    cleanupSaveTimer,
  }
}
