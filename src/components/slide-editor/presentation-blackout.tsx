'use client'

export default function PresentationBlackout({ mode }: { mode: 'black' | 'white' | null }) {
  if (!mode) return null
  return (
    <div
      className={`fixed inset-0 z-[9998] flex items-center justify-center text-2xl transition-opacity duration-300 ${
        mode === 'black' ? 'bg-black text-white/30' : 'bg-white text-black/30'
      }`}
    >
      <span className="animate-pulse">任意のキーで再開</span>
    </div>
  )
}
