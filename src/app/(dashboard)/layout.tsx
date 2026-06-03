'use client'

import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import Sidebar from '@/components/layout/sidebar'
import { ColorModeProvider, useColorMode } from '@/components/shared/color-mode-provider'

function DashboardInner({ children }: { children: React.ReactNode }) {
  const { colorMode, setColorMode } = useColorMode()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className={`flex min-h-screen ${colorMode === 'light' ? 'bg-gray-50' : 'bg-slate-950'}`}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar - always visible on desktop, toggleable on mobile */}
      <div className={`max-md:fixed max-md:z-40 max-md:transition-transform max-md:duration-200 ${
        sidebarOpen ? 'max-md:translate-x-0' : 'max-md:-translate-x-full'
      }`}>
        <Sidebar colorMode={colorMode} onColorModeChange={setColorMode} />
      </div>

      <main id="main-content" className="flex-1 ml-56 max-md:ml-0">
        {/* Mobile header bar */}
        <div className="sticky top-0 z-20 md:hidden flex items-center gap-2 px-3 py-2 bg-slate-950 border-b border-slate-800">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-8 h-8 flex items-center justify-center rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
          <div className="w-6 h-6 rounded bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white font-bold text-[10px]">D</div>
          <span className="text-sm font-medium text-white">DocCraft</span>
        </div>
        {children}
      </main>
    </div>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ColorModeProvider>
      <DashboardInner>{children}</DashboardInner>
    </ColorModeProvider>
  )
}
