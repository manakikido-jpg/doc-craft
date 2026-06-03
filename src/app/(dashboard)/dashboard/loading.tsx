export default function DashboardLoading() {
  return (
    <div className="p-8 animate-pulse">
      <div className="flex items-center justify-between mb-8">
        <div className="h-8 w-48 bg-slate-800 rounded" />
        <div className="h-9 w-28 bg-slate-800 rounded" />
      </div>
      <div className="flex gap-2 mb-6">
        {[1,2,3,4].map(i => <div key={i} className="h-8 w-20 bg-slate-800 rounded-full" />)}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({length: 8}).map((_, i) => (
          <div key={i} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="h-36 bg-slate-800" />
            <div className="p-3 space-y-2">
              <div className="h-4 w-3/4 bg-slate-800 rounded" />
              <div className="h-3 w-1/2 bg-slate-800/60 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
