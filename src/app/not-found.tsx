import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-center max-w-md px-6">
        <div className="text-7xl font-bold text-slate-700 mb-2">404</div>
        <h1 className="text-xl font-bold text-white mb-2">ページが見つかりません</h1>
        <p className="text-sm text-slate-400 mb-6">
          お探しのページは存在しないか、移動された可能性があります。
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
        >
          ダッシュボードへ戻る
        </Link>
      </div>
    </div>
  )
}
