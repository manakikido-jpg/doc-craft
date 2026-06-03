'use client'

interface Props {
  x: number  // percentage position
  y: number  // percentage position
  count: number  // number of comments at this position
  onClick: () => void
  isActive?: boolean
}

export default function SlideCommentAnchor({ x, y, count, onClick, isActive }: Props) {
  return (
    <button
      onClick={onClick}
      className="absolute flex items-center justify-center rounded-full text-white text-xs font-bold shadow-lg transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:ring-offset-1"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        width: 24,
        height: 24,
        transform: 'translate(-50%, -50%)',
        backgroundColor: isActive ? '#d97706' : '#f59e0b',
        animation: isActive ? 'comment-anchor-pulse 1.5s ease-in-out infinite' : undefined,
        zIndex: 20,
        cursor: 'pointer',
        border: '2px solid rgba(255, 255, 255, 0.5)',
      }}
      title={`${count} comment${count !== 1 ? 's' : ''}`}
    >
      {count}
      <style>{`
        @keyframes comment-anchor-pulse {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.6);
          }
          50% {
            box-shadow: 0 0 0 8px rgba(245, 158, 11, 0);
          }
        }
      `}</style>
    </button>
  )
}
