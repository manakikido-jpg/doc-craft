'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutGrid, Clock, Settings } from 'lucide-react'
import SettingsModal from '../shared/settings-modal'
import { t } from '@/lib/i18n'

interface Props {
  colorMode?: 'dark' | 'light'
  onColorModeChange?: (mode: 'dark' | 'light') => void
}

export default function Sidebar({ colorMode = 'dark', onColorModeChange }: Props) {
  const pathname = usePathname()
  const [settingsOpen, setSettingsOpen] = useState(false)

  return (
    <>
      <aside className="fixed left-0 top-0 h-full w-56 flex flex-col border-r border-slate-800/50 bg-[#0a0f1e] z-20 no-print max-md:w-14 max-md:overflow-hidden">
        {/* Logo area */}
        <div className="flex items-center gap-2 px-4 py-5 max-md:px-2 max-md:justify-center">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 shadow-lg shadow-indigo-500/20 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            D
          </div>
          <span className="font-semibold text-white text-sm tracking-tight max-md:hidden">DocCraft</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 pt-4 space-y-1 max-md:px-1 max-md:pt-2">
          <p className="text-[10px] uppercase tracking-widest text-slate-600 px-3 mb-2 max-md:hidden">Navigation</p>
          <NavItem href="/dashboard" active={pathname === '/dashboard'} icon={<LayoutGrid size={18} />}>
            {t('nav.home')}
          </NavItem>
          <NavItem href="/dashboard" active={false} icon={<Clock size={18} />}>
            {t('nav.recent')}
          </NavItem>
        </nav>

        {/* Bottom section */}
        <div className="p-3 space-y-1 max-md:p-1">
          {/* Gradient separator */}
          <div className="h-px mb-2 bg-gradient-to-r from-transparent via-slate-700/50 to-transparent" />

          <button
            onClick={() => setSettingsOpen(true)}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-800/60 hover:shadow-sm hover:shadow-indigo-500/5 transition-all duration-150 max-md:justify-center max-md:px-0"
            aria-label="設定"
          >
            <Settings size={18} />
            <span className="max-md:hidden">設定</span>
          </button>
          <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-800/60 cursor-pointer transition-all duration-150 max-md:justify-center max-md:p-1">
            <div className="relative flex-shrink-0">
              <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-bold">
                U
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-[#0a0f1e]" />
            </div>
            <span className="text-sm text-slate-400 max-md:hidden">ユーザー</span>
          </div>
        </div>
      </aside>

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        colorMode={colorMode}
        onColorModeChange={onColorModeChange || (() => {})}
      />
    </>
  )
}

function NavItem({
  href,
  active,
  icon,
  children,
}: {
  href: string
  active: boolean
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-200 max-md:justify-center max-md:px-0 ${
        active
          ? 'bg-indigo-500/10 text-indigo-400 font-medium border-l-2 border-indigo-500'
          : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
      }`}
    >
      <span className="flex-shrink-0">{icon}</span>
      <span className="max-md:hidden">{children}</span>
    </Link>
  )
}
