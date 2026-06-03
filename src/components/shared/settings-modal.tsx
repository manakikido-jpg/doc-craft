'use client'

import { useState, useEffect, useCallback } from 'react'
import { Settings, Moon, Sun, X } from 'lucide-react'
import { getLocale, setLocale, getAvailableLocales, type Locale } from '@/lib/i18n'

interface Props {
  open: boolean
  onClose: () => void
  colorMode: 'dark' | 'light'
  onColorModeChange: (mode: 'dark' | 'light') => void
}

// ─── Accessibility & notification setting keys ───
const LS_FONT_SIZE = 'doccraft:fontSize'
const LS_HIGH_CONTRAST = 'doccraft:highContrast'
const LS_REDUCED_MOTION = 'doccraft:reducedMotion'
const LS_KEYBOARD_HINTS = 'doccraft:keyboardHints'
const LS_DESKTOP_NOTIFICATIONS = 'doccraft:desktopNotifications'
const LS_SOUND_EFFECTS = 'doccraft:soundEffects'

type FontSizeOption = '12' | '14' | '16' | '18'

function readBool(key: string): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(key) === 'true'
}

function writeBool(key: string, value: boolean): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(key, String(value))
}

function readFontSize(): FontSizeOption {
  if (typeof window === 'undefined') return '14'
  const v = localStorage.getItem(LS_FONT_SIZE)
  if (v === '12' || v === '14' || v === '16' || v === '18') return v
  return '14'
}

/** Apply CSS classes to <html> based on current settings */
function applyCssClasses(): void {
  if (typeof document === 'undefined') return
  const html = document.documentElement

  // High contrast
  if (readBool(LS_HIGH_CONTRAST)) {
    html.classList.add('high-contrast')
  } else {
    html.classList.remove('high-contrast')
  }

  // Reduced motion
  if (readBool(LS_REDUCED_MOTION)) {
    html.classList.add('reduced-motion')
  } else {
    html.classList.remove('reduced-motion')
  }

  // Font size
  const fs = readFontSize()
  html.style.fontSize = `${fs}px`
}

export default function SettingsModal({ open, onClose, colorMode, onColorModeChange }: Props) {
  const [locale, setLocaleState] = useState<Locale>(getLocale())

  // Accessibility state
  const [fontSize, setFontSizeState] = useState<FontSizeOption>('14')
  const [highContrast, setHighContrast] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [keyboardHints, setKeyboardHints] = useState(false)

  // Notification state
  const [desktopNotifications, setDesktopNotifications] = useState(false)
  const [soundEffects, setSoundEffects] = useState(false)

  // Load settings from localStorage when modal opens
  useEffect(() => {
    if (!open) return
    setLocaleState(getLocale())
    setFontSizeState(readFontSize())
    setHighContrast(readBool(LS_HIGH_CONTRAST))
    setReducedMotion(readBool(LS_REDUCED_MOTION))
    setKeyboardHints(readBool(LS_KEYBOARD_HINTS))
    setDesktopNotifications(readBool(LS_DESKTOP_NOTIFICATIONS))
    setSoundEffects(readBool(LS_SOUND_EFFECTS))
  }, [open])

  // Apply CSS classes on mount (regardless of modal state)
  useEffect(() => {
    applyCssClasses()
  }, [])

  function handleLocaleChange(newLocale: Locale) {
    setLocaleState(newLocale)
    setLocale(newLocale)
    window.location.reload()
  }

  const handleFontSizeChange = useCallback((value: FontSizeOption) => {
    setFontSizeState(value)
    localStorage.setItem(LS_FONT_SIZE, value)
    applyCssClasses()
  }, [])

  const handleHighContrastChange = useCallback((value: boolean) => {
    setHighContrast(value)
    writeBool(LS_HIGH_CONTRAST, value)
    applyCssClasses()
  }, [])

  const handleReducedMotionChange = useCallback((value: boolean) => {
    setReducedMotion(value)
    writeBool(LS_REDUCED_MOTION, value)
    applyCssClasses()
  }, [])

  const handleKeyboardHintsChange = useCallback((value: boolean) => {
    setKeyboardHints(value)
    writeBool(LS_KEYBOARD_HINTS, value)
  }, [])

  const handleDesktopNotificationsChange = useCallback(async (value: boolean) => {
    if (value && typeof window !== 'undefined' && 'Notification' in window) {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        // Permission denied — don't enable the toggle
        return
      }
    }
    setDesktopNotifications(value)
    writeBool(LS_DESKTOP_NOTIFICATIONS, value)
  }, [])

  const handleSoundEffectsChange = useCallback((value: boolean) => {
    setSoundEffects(value)
    writeBool(LS_SOUND_EFFECTS, value)
  }, [])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm mx-4 shadow-2xl p-6 animate-scale-in max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 id="settings-title" className="text-lg font-semibold text-white flex items-center gap-2">
            <Settings size={18} className="text-slate-400" /> 設定
          </h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="閉じる"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-5">
          {/* ─── テーマ ─── */}
          <div>
            <label className="text-xs text-slate-400 font-medium mb-2 block">テーマ</label>
            <div className="flex gap-2">
              <button
                onClick={() => onColorModeChange('dark')}
                className={`flex-1 px-3 py-3 rounded-lg border text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                  colorMode === 'dark'
                    ? 'border-indigo-500 bg-indigo-500/10 text-white'
                    : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-500'
                }`}
              >
                <Moon size={16} /> ダーク
              </button>
              <button
                onClick={() => onColorModeChange('light')}
                className={`flex-1 px-3 py-3 rounded-lg border text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                  colorMode === 'light'
                    ? 'border-indigo-500 bg-indigo-500/10 text-white'
                    : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-500'
                }`}
              >
                <Sun size={16} /> ライト
              </button>
            </div>
          </div>

          {/* ─── 言語 ─── */}
          <div>
            <label className="text-xs text-slate-400 font-medium mb-2 block">言語 / Language</label>
            <div className="flex gap-2">
              {getAvailableLocales().map((loc) => (
                <button
                  key={loc.code}
                  onClick={() => handleLocaleChange(loc.code)}
                  className={`flex-1 px-3 py-3 rounded-lg border text-sm font-medium transition-all ${
                    locale === loc.code
                      ? 'border-indigo-500 bg-indigo-500/10 text-white'
                      : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  {loc.label}
                </button>
              ))}
            </div>
          </div>

          {/* ─── アクセシビリティ ─── */}
          <div>
            <label className="text-xs text-slate-400 font-medium mb-3 block">アクセシビリティ</label>
            <div className="space-y-3">
              {/* Font size */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-300">フォントサイズ</span>
                <select
                  value={fontSize}
                  onChange={(e) => handleFontSizeChange(e.target.value as FontSizeOption)}
                  className="bg-slate-800 border border-slate-700 rounded-md px-2 py-1 text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="12">小 (12px)</option>
                  <option value="14">標準 (14px)</option>
                  <option value="16">大 (16px)</option>
                  <option value="18">特大 (18px)</option>
                </select>
              </div>

              {/* High contrast */}
              <ToggleRow
                label="ハイコントラストモード"
                checked={highContrast}
                onChange={handleHighContrastChange}
              />

              {/* Reduced motion */}
              <ToggleRow
                label="モーション軽減"
                checked={reducedMotion}
                onChange={handleReducedMotionChange}
              />

              {/* Keyboard hints */}
              <ToggleRow
                label="キーボードナビゲーションヒント"
                checked={keyboardHints}
                onChange={handleKeyboardHintsChange}
              />
            </div>
          </div>

          {/* ─── 通知 ─── */}
          <div>
            <label className="text-xs text-slate-400 font-medium mb-3 block">通知</label>
            <div className="space-y-3">
              {/* Desktop notifications */}
              <ToggleRow
                label="デスクトップ通知"
                checked={desktopNotifications}
                onChange={handleDesktopNotificationsChange}
              />

              {/* Sound effects */}
              <ToggleRow
                label="効果音"
                checked={soundEffects}
                onChange={handleSoundEffectsChange}
              />
            </div>
          </div>

          <div className="text-center pt-3 border-t border-slate-800">
            <p className="text-xs text-slate-500">DocCraft v1.0.0</p>
            <p className="text-xs text-slate-500">Built with Next.js, React, Tailwind</p>
          </div>
        </div>
      </div>
    </div>
  )
}

/** Reusable toggle switch row */
function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-slate-300">{label}</span>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-9 h-5 rounded-full transition-colors ${
          checked ? 'bg-indigo-500' : 'bg-slate-700'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
            checked ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  )
}
