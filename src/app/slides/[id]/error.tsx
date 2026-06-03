'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, ArrowLeft, RotateCcw } from 'lucide-react'

export default function SlidesError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error('[SlidesEditor] Unhandled error:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-center max-w-md px-6">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
          <AlertTriangle size={32} className="text-red-400" />
        </div>
        <h1 className="text-xl font-bold text-white mb-2">エラーが発生しました</h1>
        <p className="text-sm text-slate-400 mb-6">
          スライドの読み込み中にエラーが発生しました。再試行するか、ダッシュボードに戻ってください。
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
          >
            <RotateCcw size={14} /> 再試行
          </button>
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-700 hover:border-slate-500 text-slate-300 text-sm transition-colors"
          >
            <ArrowLeft size={14} /> ダッシュボードへ
          </Link>
        </div>
      </div>
    </div>
  )
}
