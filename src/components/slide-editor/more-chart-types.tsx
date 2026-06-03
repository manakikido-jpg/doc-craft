'use client'

import { X } from 'lucide-react'

interface MoreChartTypesProps {
  open: boolean
  onClose: () => void
  onSelectChart: (chartType: string) => void
}

type ChartDef = { key: string; label: string; icon: React.ReactNode }
type ChartCategory = { category: string; charts: ChartDef[] }

const I = (children: React.ReactNode) => (
  <svg width="44" height="44" viewBox="0 0 48 48" fill="none">{children}</svg>
)

// Excel-parity chart gallery. Every `key` maps directly to a real renderer
// chartType (no approximations).
const CHART_CATEGORIES: ChartCategory[] = [
  {
    category: '縦棒・横棒',
    charts: [
      { key: 'bar', label: '集合縦棒', icon: I(<><rect x="6" y="28" width="8" height="14" rx="1" fill="#6366f1" /><rect x="18" y="16" width="8" height="26" rx="1" fill="#818cf8" /><rect x="30" y="22" width="8" height="20" rx="1" fill="#a5b4fc" /><line x1="4" y1="44" x2="44" y2="44" stroke="#64748b" strokeWidth="1.5" /></>) },
      { key: 'stackedBar', label: '積み上げ縦棒', icon: I(<><rect x="8" y="26" width="10" height="16" fill="#6366f1" /><rect x="8" y="16" width="10" height="10" fill="#a5b4fc" /><rect x="26" y="30" width="10" height="12" fill="#6366f1" /><rect x="26" y="18" width="10" height="12" fill="#a5b4fc" /><line x1="4" y1="44" x2="44" y2="44" stroke="#64748b" strokeWidth="1.5" /></>) },
      { key: 'stackedBar100', label: '100%積み上げ', icon: I(<><rect x="8" y="22" width="10" height="20" fill="#6366f1" /><rect x="8" y="8" width="10" height="14" fill="#a5b4fc" /><rect x="26" y="28" width="10" height="14" fill="#6366f1" /><rect x="26" y="8" width="10" height="20" fill="#a5b4fc" /><line x1="4" y1="44" x2="44" y2="44" stroke="#64748b" strokeWidth="1.5" /></>) },
      { key: 'horizontalBar', label: '横棒', icon: I(<><rect x="6" y="8" width="22" height="7" rx="1" fill="#6366f1" /><rect x="6" y="20" width="32" height="7" rx="1" fill="#818cf8" /><rect x="6" y="32" width="16" height="7" rx="1" fill="#a5b4fc" /><line x1="5" y1="6" x2="5" y2="42" stroke="#64748b" strokeWidth="1.5" /></>) },
      { key: 'waterfall', label: 'ウォーターフォール', icon: I(<><rect x="6" y="30" width="7" height="12" fill="#22c55e" /><rect x="15" y="22" width="7" height="8" fill="#22c55e" /><rect x="24" y="22" width="7" height="10" fill="#ef4444" /><rect x="33" y="14" width="7" height="8" fill="#22c55e" /><line x1="4" y1="44" x2="44" y2="44" stroke="#64748b" strokeWidth="1" /></>) },
    ],
  },
  {
    category: '折れ線・面',
    charts: [
      { key: 'line', label: '折れ線', icon: I(<><polyline points="6,36 16,20 26,28 36,12 44,18" stroke="#6366f1" strokeWidth="2.5" fill="none" strokeLinejoin="round" /><line x1="4" y1="44" x2="44" y2="44" stroke="#64748b" strokeWidth="1.5" /></>) },
      { key: 'smoothLine', label: 'スムーズ折れ線', icon: I(<><path d="M6 36 Q16 12 26 26 T44 16" stroke="#6366f1" strokeWidth="2.5" fill="none" /><line x1="4" y1="44" x2="44" y2="44" stroke="#64748b" strokeWidth="1.5" /></>) },
      { key: 'steppedLine', label: 'ステップ', icon: I(<><polyline points="6,34 16,34 16,20 28,20 28,28 40,28 40,14" stroke="#6366f1" strokeWidth="2" fill="none" /><line x1="4" y1="44" x2="44" y2="44" stroke="#64748b" strokeWidth="1.5" /></>) },
      { key: 'area', label: '面', icon: I(<><polygon points="6,36 16,20 26,28 36,12 44,18 44,42 6,42" fill="#6366f1" fillOpacity="0.4" /><polyline points="6,36 16,20 26,28 36,12 44,18" stroke="#6366f1" strokeWidth="2" fill="none" /></>) },
      { key: 'stackedArea', label: '積み上げ面', icon: I(<><polygon points="6,30 24,22 42,26 42,42 6,42" fill="#a5b4fc" fillOpacity="0.5" /><polygon points="6,38 24,32 42,36 42,42 6,42" fill="#6366f1" fillOpacity="0.7" /></>) },
      { key: 'combo', label: '複合(棒+線)', icon: I(<><rect x="8" y="24" width="8" height="18" fill="#6366f1" /><rect x="26" y="20" width="8" height="22" fill="#818cf8" /><polyline points="6,28 24,16 42,22" stroke="#f97316" strokeWidth="2.5" fill="none" /></>) },
    ],
  },
  {
    category: '円・割合',
    charts: [
      { key: 'pie', label: '円', icon: I(<><circle cx="24" cy="24" r="18" fill="#334155" /><path d="M24 6 A18 18 0 0 1 42 24 L24 24 Z" fill="#6366f1" /><path d="M42 24 A18 18 0 0 1 24 42 L24 24 Z" fill="#818cf8" /><path d="M24 42 A18 18 0 0 1 6 24 L24 24 Z" fill="#a5b4fc" /><path d="M6 24 A18 18 0 0 1 24 6 L24 24 Z" fill="#c7d2fe" /></>) },
      { key: 'donut', label: 'ドーナツ', icon: I(<><circle cx="24" cy="24" r="18" fill="#334155" /><path d="M24 6 A18 18 0 0 1 42 24 L24 24 Z" fill="#6366f1" /><path d="M42 24 A18 18 0 0 1 24 42 L24 24 Z" fill="#818cf8" /><path d="M24 42 A18 18 0 0 1 6 24 L24 24 Z" fill="#a5b4fc" /><path d="M6 24 A18 18 0 0 1 24 6 L24 24 Z" fill="#c7d2fe" /><circle cx="24" cy="24" r="9" fill="#1e293b" /></>) },
      { key: 'funnel', label: 'ファネル', icon: I(<><path d="M8 8 L40 8 L34 18 L14 18 Z" fill="#6366f1" /><path d="M14 20 L34 20 L29 30 L19 30 Z" fill="#818cf8" /><path d="M19 32 L29 32 L26 40 L22 40 Z" fill="#a5b4fc" /></>) },
      { key: 'radar', label: 'レーダー', icon: I(<><polygon points="24,6 42,18 38,38 10,38 6,18" fill="none" stroke="#64748b" strokeWidth="1" /><polygon points="24,10 38,20 34,36 14,36 10,20" fill="#6366f1" fillOpacity="0.3" stroke="#6366f1" strokeWidth="2" /></>) },
    ],
  },
  {
    category: '分布',
    charts: [
      { key: 'scatter', label: '散布図', icon: I(<><circle cx="10" cy="32" r="3" fill="#6366f1" /><circle cx="18" cy="20" r="3" fill="#818cf8" /><circle cx="26" cy="26" r="3" fill="#6366f1" /><circle cx="34" cy="14" r="3" fill="#818cf8" /><circle cx="40" cy="10" r="3" fill="#a5b4fc" /><line x1="4" y1="44" x2="44" y2="44" stroke="#64748b" strokeWidth="1.5" /></>) },
      { key: 'bubble', label: 'バブル', icon: I(<><circle cx="12" cy="32" r="5" fill="#6366f1" fillOpacity="0.6" /><circle cx="26" cy="20" r="8" fill="#818cf8" fillOpacity="0.6" /><circle cx="38" cy="28" r="4" fill="#a5b4fc" fillOpacity="0.6" /><line x1="4" y1="44" x2="44" y2="44" stroke="#64748b" strokeWidth="1.5" /></>) },
    ],
  },
]

export default function MoreChartTypes({ open, onClose, onSelectChart }: MoreChartTypesProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-xl bg-slate-800 p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">グラフの種類</h2>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-700 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-5">
          {CHART_CATEGORIES.map((cat) => (
            <div key={cat.category}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">{cat.category}</h3>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                {cat.charts.map((chart) => (
                  <button
                    key={chart.key}
                    onClick={() => { onSelectChart(chart.key); onClose() }}
                    className="flex flex-col items-center gap-2 rounded-lg border border-slate-600 bg-slate-700/50 p-3 transition-colors hover:border-indigo-500 hover:bg-slate-700"
                  >
                    {chart.icon}
                    <span className="text-center text-xs leading-tight text-slate-200">{chart.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
