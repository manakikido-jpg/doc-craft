export default function SpreadsheetLoading() {
  return (
    <div className="min-h-screen bg-slate-950 animate-pulse">
      <div className="sticky top-0 flex items-center gap-2 px-4 py-2.5 border-b border-slate-800 bg-slate-950">
        <div className="h-5 w-12 bg-slate-800 rounded" />
        <div className="h-5 flex-1 bg-slate-800 rounded" />
      </div>
      <div className="h-8 border-b border-slate-800 flex items-center gap-1 px-2">
        {Array.from({length: 8}).map((_, i) => <div key={i} className="w-7 h-5 bg-slate-800 rounded" />)}
      </div>
      <div className="h-8 border-b border-slate-800 flex items-center px-2 gap-2">
        <div className="w-12 h-5 bg-slate-800 rounded" />
        <div className="flex-1 h-5 bg-slate-800 rounded" />
      </div>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(10, 100px)' }}>
        {Array.from({length: 100}).map((_, i) => <div key={i} className="h-7 border-r border-b border-slate-800/50" />)}
      </div>
    </div>
  )
}
