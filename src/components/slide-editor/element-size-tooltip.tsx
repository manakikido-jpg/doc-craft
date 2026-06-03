'use client'

interface Props {
  visible: boolean
  x: number
  y: number
  width: number
  height: number
  unit?: 'px' | '%'
}

export default function ElementSizeTooltip({ visible, x, y, width, height, unit = '%' }: Props) {
  if (!visible) return null
  return (
    <div
      className="fixed z-[200] px-2 py-1 bg-black/80 text-white text-[10px] font-mono rounded shadow-lg pointer-events-none whitespace-nowrap"
      style={{ left: x + 16, top: y + 16 }}
    >
      W: {width.toFixed(1)}{unit} H: {height.toFixed(1)}{unit}
    </div>
  )
}
