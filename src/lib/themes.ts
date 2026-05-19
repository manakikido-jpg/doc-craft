import type { SlideTheme, SlideThemeKey } from '@/types'

export const SLIDE_THEMES: Record<SlideThemeKey, SlideTheme> = {
  'dark-blue': {
    key: 'dark-blue',
    label: 'ダークブルー',
    background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)',
    titleColor: '#ffffff',
    bodyColor: '#94a3b8',
    accentColor: '#3b82f6',
  },
  'violet-slate': {
    key: 'violet-slate',
    label: 'バイオレット',
    background: 'linear-gradient(135deg, #1e1b4b 0%, #4c1d95 100%)',
    titleColor: '#ffffff',
    bodyColor: '#c4b5fd',
    accentColor: '#8b5cf6',
  },
  emerald: {
    key: 'emerald',
    label: 'エメラルド',
    background: 'linear-gradient(135deg, #064e3b 0%, #065f46 100%)',
    titleColor: '#ffffff',
    bodyColor: '#6ee7b7',
    accentColor: '#10b981',
  },
  amber: {
    key: 'amber',
    label: 'アンバー',
    background: 'linear-gradient(135deg, #451a03 0%, #92400e 100%)',
    titleColor: '#fef3c7',
    bodyColor: '#fcd34d',
    accentColor: '#f59e0b',
  },
  'rose-pink': {
    key: 'rose-pink',
    label: 'ローズ',
    background: 'linear-gradient(135deg, #4c0519 0%, #9f1239 100%)',
    titleColor: '#fff1f2',
    bodyColor: '#fda4af',
    accentColor: '#f43f5e',
  },
  'white-clean': {
    key: 'white-clean',
    label: 'クリーン',
    background: '#ffffff',
    titleColor: '#0f172a',
    bodyColor: '#475569',
    accentColor: '#6366f1',
  },
  midnight: {
    key: 'midnight',
    label: 'ミッドナイト',
    background: '#0a0a0a',
    titleColor: '#f8fafc',
    bodyColor: '#94a3b8',
    accentColor: '#e2e8f0',
  },
  ocean: {
    key: 'ocean',
    label: 'オーシャン',
    background: 'linear-gradient(135deg, #0c4a6e 0%, #0369a1 100%)',
    titleColor: '#f0f9ff',
    bodyColor: '#7dd3fc',
    accentColor: '#38bdf8',
  },
}

export const THEME_KEYS = Object.keys(SLIDE_THEMES) as SlideThemeKey[]
