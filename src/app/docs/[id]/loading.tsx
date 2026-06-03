export default function DocLoading() {
  return (
    <div className="min-h-screen bg-slate-950 animate-pulse">
      <div className="sticky top-0 flex items-center gap-2 px-4 py-2.5 border-b border-slate-800 bg-slate-950">
        <div className="h-5 w-12 bg-slate-800 rounded" />
        <div className="h-5 w-px bg-slate-800" />
        <div className="h-5 flex-1 bg-slate-800 rounded" />
        <div className="flex gap-1.5">
          {Array.from({length: 6}).map((_, i) => <div key={i} className="w-7 h-7 bg-slate-800 rounded" />)}
        </div>
      </div>
      <div className="max-w-2xl mx-auto px-8 py-10 space-y-4">
        <div className="h-10 w-2/3 bg-slate-800 rounded" />
        <div className="h-6 w-full bg-slate-800/60 rounded" />
        <div className="h-6 w-5/6 bg-slate-800/60 rounded" />
        <div className="h-6 w-full bg-slate-800/40 rounded" />
        <div className="h-6 w-3/4 bg-slate-800/40 rounded" />
        <div className="h-6 w-full bg-slate-800/30 rounded" />
      </div>
    </div>
  )
}
