import type { Metadata, Viewport } from 'next'
import { Geist, Noto_Sans_JP } from 'next/font/google'
import { ComposeProviders, type ProviderWithProps } from '@/components/shared/compose-providers'
import { ThemeProvider } from '@/lib/theme-context'
import { ColorModeProvider } from '@/components/shared/color-mode-provider'
import { AuthProvider } from '@/lib/auth-context'
import { I18nProvider } from '@/lib/i18n'
import { ToastProvider } from '@/components/shared/toast'
import { TooltipProvider } from '@/components/shared/tooltip'
import { ConfirmDialogProvider } from '@/components/shared/confirm-dialog'
import { HighContrastProvider } from '@/components/shared/high-contrast'
import { AnnounceProvider } from '@/components/shared/aria-helpers'
import { KeyboardNavProvider } from '@/components/shared/keyboard-manager'
import OfflineBanner from '@/components/shared/offline-banner'
import PWARegister from '@/components/shared/pwa-register'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import './globals.css'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist-sans' })

const notoSansJP = Noto_Sans_JP({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-noto-sans-jp',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'DocCraft — 資料作成ツール',
  description: 'スライドとドキュメントを一つのツールで作成できる汎用資料作成ツール',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/icon.svg',
  },
}

export const viewport: Viewport = {
  themeColor: '#6366f1',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}

const providers: ProviderWithProps[] = [
  [I18nProvider],
  [AuthProvider],
  [ColorModeProvider],
  [ThemeProvider],
  [HighContrastProvider],
  [KeyboardNavProvider],
  [AnnounceProvider],
  [TooltipProvider],
  [ConfirmDialogProvider],
  [ToastProvider],
]

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className={`${geist.variable} ${notoSansJP.variable}`}>
      <head />
      <body>
        <ComposeProviders providers={providers}>
          <OfflineBanner />
          {children}
          <PWARegister />
        </ComposeProviders>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
