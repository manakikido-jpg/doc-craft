'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { SpreadsheetDocument } from '@/types'
import { getSpreadsheetDoc } from '@/lib/storage/cloud-store'
import { normalizeSpreadsheetDoc } from '@/lib/storage/validate-doc'
import SpreadsheetEditor from './spreadsheet-editor'
import { ErrorBoundary } from '@/components/shared/error-boundary'

export default function SpreadsheetEditorLoader({ id }: { id: string }) {
  const [doc, setDoc] = useState<SpreadsheetDocument | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    let cancelled = false
    // Hard safety net: even if getSpreadsheetDoc hangs, stop the spinner after 12s
    // and show a recoverable error instead of an infinite loading screen.
    const watchdog = setTimeout(() => {
      if (!cancelled) { setLoadError(true); setLoading(false) }
    }, 12000)

    getSpreadsheetDoc(id)
      .then((d) => {
        if (cancelled) return
        const safe = normalizeSpreadsheetDoc(d)
        if (!safe) {
          router.push('/dashboard')
        } else {
          setDoc(safe)
        }
      })
      .catch(() => { if (!cancelled) setLoadError(true) })
      .finally(() => { if (!cancelled) { clearTimeout(watchdog); setLoading(false) } })

    return () => { cancelled = true; clearTimeout(watchdog) }
  }, [id])

  if (loadError && !doc) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <div className="text-center max-w-sm px-6">
          <p className="text-slate-300 text-sm mb-4">スプレッドシートの読み込みに時間がかかっています。接続を確認してもう一度お試しください。</p>
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-sm transition-colors"
            >
              再読み込み
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm transition-colors"
            >
              ダッシュボード
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (loading || !doc) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <div className="text-slate-400 text-sm animate-pulse">読み込み中...</div>
      </div>
    )
  }

  return (
    <ErrorBoundary fallbackMessage="スプレッドシートエディタでエラーが発生しました。">
      <SpreadsheetEditor initialDoc={doc} />
    </ErrorBoundary>
  )
}
