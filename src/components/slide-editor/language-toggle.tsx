'use client'

import { useI18n } from '@/lib/i18n'

export default function LanguageToggle() {
  const { locale, setLocale } = useI18n()

  function toggle() {
    setLocale(locale === 'ja' ? 'en' : 'ja')
  }

  return (
    <button
      onClick={toggle}
      className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium transition-colors bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 hover:border-slate-600"
      title={locale === 'ja' ? 'Switch to English' : '日本語に切り替え'}
      aria-label={locale === 'ja' ? 'Switch to English' : '日本語に切り替え'}
    >
      <span>{locale === 'ja' ? '🇯🇵' : '🇺🇸'}</span>
      <span>{locale === 'ja' ? 'JA' : 'EN'}</span>
    </button>
  )
}
