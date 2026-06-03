'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { DocDocument } from '@/types'
import { getDocDoc } from '@/lib/storage/cloud-store'
import { normalizeDocDoc } from '@/lib/storage/validate-doc'
import DocEditor from './doc-editor'
import { ErrorBoundary } from '@/components/shared/error-boundary'

export default function DocEditorLoader({ id }: { id: string }) {
  const [doc, setDoc] = useState<DocDocument | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    let cancelled = false
    // Hard safety net: even if getDocDoc hangs, stop the spinner after 12s
    // and show a recoverable error instead of an infinite loading screen.
    const watchdog = setTimeout(() => {
      if (!cancelled) { setLoadError(true); setLoading(false) }
    }, 12000)

    getDocDoc(id)
      .then((d) => {
        if (cancelled) return
        const safe = normalizeDocDoc(d)
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
          <p className="text-slate-300 text-sm mb-4">ドキュメントの読み込みに時間がかかっています。接続を確認してもう一度お試しください。</p>
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
    <ErrorBoundary fallbackMessage="ドキュメントエディタでエラーが発生しました。">
      <DocEditor initialDoc={doc} />
    </ErrorBoundary>
  )
}
