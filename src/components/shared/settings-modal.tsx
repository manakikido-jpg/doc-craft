'use client'

import { useState, useEffect } from 'react'
import { Settings, Moon, Sun, X } from 'lucide-react'
import { getLocale, setLocale, getAvailableLocales, type Locale } from '@/lib/i18n'

interface Props {
  open: boolean
  onClose: () => void
  colorMode: 'dark' | 'light'
  onColorModeChange: (mode: 'dark' | 'light') => void
}

export default function SettingsModal({ open, onClose, colorMode, onColorModeChange }: Props) {
  const [locale, setLocaleState] = useState<Locale>(getLocale())

  useEffect(() => {
    if (open) setLocaleState(getLocale())
  }, [open])

  function handleLocaleChange(newLocale: Locale) {
    setLocaleState(newLocale)
    setLocale(newLocale)
    window.location.reload()
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm mx-4 shadow-2xl p-6 animate-scale-in">
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

          <div className="text-center pt-3 border-t border-slate-800">
            <p className="text-xs text-slate-500">DocCraft v1.0.0</p>
            <p className="text-xs text-slate-500">Built with Next.js, React, Tailwind</p>
          </div>
        </div>
      </div>
    </div>
  )
}
