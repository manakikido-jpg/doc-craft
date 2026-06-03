export default function SlidesLoading() {
  return (
    <div className="min-h-screen bg-slate-950 animate-pulse">
      <div className="sticky top-0 flex items-center gap-2 px-4 py-2.5 border-b border-slate-800 bg-slate-950">
        <div className="h-5 w-12 bg-slate-800 rounded" />
        <div className="h-5 flex-1 bg-slate-800 rounded" />
        <div className="flex gap-1.5">
          {Array.from({length: 5}).map((_, i) => <div key={i} className="w-7 h-7 bg-slate-800 rounded" />)}
        </div>
      </div>
      <div className="flex">
        <div className="w-48 border-r border-slate-800 p-3 space-y-2">
          {Array.from({length: 4}).map((_, i) => <div key={i} className="h-20 bg-slate-800 rounded" />)}
        </div>
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-3xl aspect-video bg-slate-800 rounded-lg" />
        </div>
      </div>
    </div>
  )
}
