'use client'

import Sidebar from '@/components/layout/sidebar'
import { ColorModeProvider, useColorMode } from '@/components/shared/color-mode-provider'

function DashboardInner({ children }: { children: React.ReactNode }) {
  const { colorMode, setColorMode } = useColorMode()

  return (
    <div className={`flex min-h-screen ${colorMode === 'light' ? 'bg-gray-50' : 'bg-slate-950'}`}>
      <Sidebar colorMode={colorMode} onColorModeChange={setColorMode} />
      <main className="flex-1 ml-56 max-md:ml-14">{children}</main>
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
