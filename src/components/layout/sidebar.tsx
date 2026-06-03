'use client'

import { Suspense, useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { LayoutGrid, Clock, Settings, BookTemplate, Activity, Bell } from 'lucide-react'
import SettingsModal from '../shared/settings-modal'
import { t } from '@/lib/i18n'

interface Props {
  colorMode?: 'dark' | 'light'
  onColorModeChange?: (mode: 'dark' | 'light') => void
}

export default function Sidebar(props: Props) {
  return (
    <Suspense>
      <SidebarInner {...props} />
    </Suspense>
  )
}

function SidebarInner({ colorMode = 'dark', onColorModeChange }: Props) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const currentView = searchParams.get('view')

  // Read unread comment count from localStorage and listen for changes
  const refreshUnread = useCallback(() => {
    try {
      const count = parseInt(localStorage.getItem('doccraft-unread-comments') || '0', 10)
      setUnreadCount(count)
    } catch (e) { console.warn('Failed to read unread comment count from localStorage:', e) }
  }, [])

  useEffect(() => {
    refreshUnread()
    const handleAdded = () => refreshUnread()
    const handleRead = () => setUnreadCount(0)
    window.addEventListener('doccraft-comment-added', handleAdded)
    window.addEventListener('doccraft-comments-read', handleRead)
    window.addEventListener('storage', refreshUnread)
    return () => {
      window.removeEventListener('doccraft-comment-added', handleAdded)
      window.removeEventListener('doccraft-comments-read', handleRead)
      window.removeEventListener('storage', refreshUnread)
    }
  }, [refreshUnread])

  return (
    <>
      <aside className="fixed left-0 top-0 h-full w-56 flex flex-col border-r theme-border-primary z-20 no-print max-md:w-14 max-md:overflow-hidden" style={{ backgroundColor: 'var(--sidebar-bg)' }}>
        {/* Logo area */}
        <div className="flex items-center gap-2 px-4 py-5 max-md:px-2 max-md:justify-center">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 shadow-lg shadow-indigo-500/20 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            D
          </div>
          <span className="font-semibold theme-text-primary text-sm tracking-tight max-md:hidden">DocCraft</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 pt-4 space-y-1 max-md:px-1 max-md:pt-2">
          <p className="text-[10px] uppercase tracking-widest theme-text-muted px-3 mb-2 max-md:hidden">Navigation</p>
          <NavItem href="/dashboard" active={pathname === '/dashboard' && !currentView} icon={<LayoutGrid size={18} />}>
            {t('nav.home')}
          </NavItem>
          <NavItem href="/dashboard?view=templates" active={currentView === 'templates'} icon={<BookTemplate size={18} />}>
            テンプレート
          </NavItem>
          <NavItem href="/dashboard?view=activity" active={currentView === 'activity'} icon={<Activity size={18} />}>
            アクティビティ
          </NavItem>
          <NavItem href="/dashboard" active={false} icon={<Clock size={18} />}>
            {t('nav.recent')}
          </NavItem>

          {/* Notification bell with unread badge */}
          <div className="relative">
            <NavItem
              href="/dashboard?view=activity"
              active={false}
              icon={
                <div className="relative">
                  <Bell size={18} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center px-1 animate-scale-in">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </div>
              }
            >
              通知
            </NavItem>
          </div>
        </nav>

        {/* Bottom section */}
        <div className="p-3 space-y-1 max-md:p-1">
          {/* Gradient separator */}
          <div className="h-px mb-2 theme-border-primary" style={{ backgroundColor: 'var(--border-primary)', opacity: 0.5 }} />

          <button
            onClick={() => setSettingsOpen(true)}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm theme-text-secondary hover:brightness-125 transition-all duration-150 max-md:justify-center max-md:px-0"
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
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2" style={{ borderColor: 'var(--sidebar-bg)' }} />
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
          : 'theme-text-secondary'
      }`}
      style={!active ? { ['--hover-color' as string]: 'var(--text-primary)' } : undefined}
    >
      <span className="flex-shrink-0">{icon}</span>
      <span className="max-md:hidden">{children}</span>
    </Link>
  )
}
