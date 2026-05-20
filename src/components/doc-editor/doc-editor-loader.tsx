'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { DocDocument } from '@/types'
import { getDocDoc } from '@/lib/cloud-store'
import DocEditor from './doc-editor'
import { ErrorBoundary } from '@/components/shared/error-boundary'

export default function DocEditorLoader({ id }: { id: string }) {
  const [doc, setDoc] = useState<DocDocument | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    getDocDoc(id).then((d) => {
      if (!d) {
        router.push('/dashboard')
      } else {
        setDoc(d)
      }
      setLoading(false)
    })
  }, [id])

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
