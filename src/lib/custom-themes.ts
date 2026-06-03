import type { SlideTheme, SlideThemeKey } from '@/types'

const STORAGE_KEY = 'doccraft-custom-themes'

export interface CustomThemeEntry {
  id: string
  name: string
  theme: Partial<SlideTheme>
  createdAt: string
}

export function getCustomThemes(): CustomThemeEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveCustomTheme(name: string, theme: Partial<SlideTheme>): CustomThemeEntry {
  const themes = getCustomThemes()
  const entry: CustomThemeEntry = {
    id: `custom-${Date.now()}`,
    name,
    theme,
    createdAt: new Date().toISOString(),
  }
  themes.push(entry)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(themes))
  return entry
}

export function deleteCustomTheme(id: string): void {
  const themes = getCustomThemes().filter(t => t.id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(themes))
}
