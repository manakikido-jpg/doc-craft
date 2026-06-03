'use client'

import { logError } from '@/lib/error-logger'
import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    logError(error, 'global-error-boundary')
  }, [error])

  return (
    <html>
      <body className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <div className="text-5xl mb-4">&#x26A0;&#xFE0F;</div>
          <h1 className="text-xl font-bold text-white mb-2">予期しないエラーが発生しました</h1>
          <p className="text-sm text-slate-400 mb-6">
            アプリケーションでエラーが発生しました。再試行してください。
          </p>
          <button
            onClick={reset}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
          >
            再試行
          </button>
        </div>
      </body>
    </html>
  )
}
