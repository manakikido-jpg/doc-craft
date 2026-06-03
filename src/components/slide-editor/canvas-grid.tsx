'use client'

interface Props {
  visible: boolean
  gridSize?: number
  color?: string
}

export default function CanvasGrid({
  visible,
  gridSize = 5,
  color = 'rgba(148, 163, 184, 0.15)',
}: Props) {
  if (!visible) return null

  const sizePercent = `${gridSize}%`

  return (
    <div
      className="absolute inset-0 w-full h-full"
      style={{
        pointerEvents: 'none',
        zIndex: 1,
        backgroundImage: `
          linear-gradient(to right, ${color} 1px, transparent 1px),
          linear-gradient(to bottom, ${color} 1px, transparent 1px)
        `,
        backgroundSize: `${sizePercent} ${sizePercent}`,
      }}
    />
  )
}
