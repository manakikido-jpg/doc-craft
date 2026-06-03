'use client'

interface Props {
  recentColors: string[]
  onSelectColor: (color: string) => void
}

export default function RecentColors({ recentColors, onSelectColor }: Props) {
  const colors = recentColors.slice(0, 12)

  if (colors.length === 0) return null

  return (
    <div>
      <p className="text-xs text-slate-400 mb-1.5">最近の色</p>
      <div className="flex flex-wrap gap-1.5">
        {colors.map((color, i) => (
          <button
            key={`${color}-${i}`}
            onClick={() => onSelectColor(color)}
            className="w-5 h-5 rounded border border-slate-600 hover:border-indigo-400 hover:scale-110 transition-all"
            style={{ backgroundColor: color }}
            title={color}
          />
        ))}
      </div>
    </div>
  )
}
