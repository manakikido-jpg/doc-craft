'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { DesignDocument } from '@/types'
import { getDesignDoc } from '@/lib/storage/cloud-store'
import { normalizeDesignDoc } from '@/lib/storage/validate-doc'
import DesignEditor from './design-editor'
import { ErrorBoundary } from '@/components/shared/error-boundary'

export default function DesignEditorLoader({ id }: { id: string }) {
  const [doc, setDoc] = useState<DesignDocument | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    let cancelled = false
    // Hard safety net: even if getDesignDoc hangs, stop the spinner after 12s
    // and show a recoverable error instead of an infinite loading screen.
    const watchdog = setTimeout(() => {
      if (!cancelled) { setLoadError(true); setLoading(false) }
    }, 12000)

    getDesignDoc(id)
      .then((d) => {
        if (cancelled) return
        // Normalize/repair the stored doc so a corrupt payload yields a usable
        // (possibly empty) document instead of crashing the editor.
        const safe = normalizeDesignDoc(d)
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
          <p className="text-slate-300 text-sm mb-4">デザインの読み込みに時間がかかっています。接続を確認してもう一度お試しください。</p>
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
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-400 text-sm">デザインを読み込み中...</p>
        </div>
      </div>
    )
  }

  return (
    <ErrorBoundary fallbackMessage="デザインエディタでエラーが発生しました。">
      <DesignEditor initialDoc={doc} />
    </ErrorBoundary>
  )
}
