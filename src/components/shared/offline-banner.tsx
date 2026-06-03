'use client'

import { WifiOff } from 'lucide-react'
import { useOnlineStatus } from '@/hooks/use-online-status'
import { useI18n } from '@/lib/i18n'

export default function OfflineBanner() {
  const isOnline = useOnlineStatus()
  const { t } = useI18n()

  if (isOnline) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-[200] bg-amber-600 text-white text-xs text-center py-1.5 flex items-center justify-center gap-2 shadow-lg">
      <WifiOff size={12} />
      <span>{t('offline.message')}</span>
    </div>
  )
}
