'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { SpreadsheetDocument } from '@/types'
import { getSpreadsheetDoc } from '@/lib/document-store'
import SpreadsheetEditor from './spreadsheet-editor'
import { ErrorBoundary } from '@/components/shared/error-boundary'

export default function SpreadsheetEditorLoader({ id }: { id: string }) {
  const [doc, setDoc] = useState<SpreadsheetDocument | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const d = getSpreadsheetDoc(id)
    if (!d) {
      router.push('/dashboard')
    } else {
      setDoc(d)
    }
    setLoading(false)
  }, [id])

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
