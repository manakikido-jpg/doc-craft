'use client'

import { useState, useRef, useEffect, useCallback, memo } from 'react'

interface Props {
  src: string
  alt?: string
  className?: string
  style?: React.CSSProperties
  onLoad?: () => void
}

function LazySlideImage({ src, alt = '', className = '', style, onLoad }: Props) {
  const [isInView, setIsInView] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setIsInView(true)
            observer.unobserve(el)
          }
        }
      },
      { rootMargin: '100px' },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Reset loaded/error state when src changes
  useEffect(() => {
    setIsLoaded(false)
    setHasError(false)
  }, [src])

  const handleLoad = useCallback(() => {
    setIsLoaded(true)
    onLoad?.()
  }, [onLoad])

  const handleError = useCallback(() => {
    setHasError(true)
  }, [])

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
      style={style}
    >
      {/* Shimmer placeholder - visible while loading */}
      {(!isLoaded || !isInView) && !hasError && (
        <div className="absolute inset-0 bg-slate-700">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-600/20 to-transparent animate-pulse" />
        </div>
      )}

      {/* Error state */}
      {hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-800 text-slate-500">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="mb-1"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="M21 15l-5-5L5 21" />
            <line x1="4" y1="4" x2="20" y2="20" strokeWidth="2" />
          </svg>
          <span className="text-[10px]">読込失敗</span>
        </div>
      )}

      {/* Actual image - only rendered when in viewport */}
      {isInView && !hasError && (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onLoad={handleLoad}
          onError={handleError}
          className="w-full h-full object-contain"
          draggable={false}
          style={{
            opacity: isLoaded ? 1 : 0,
            transition: 'opacity 0.3s ease-in-out',
          }}
        />
      )}
    </div>
  )
}

export default memo(LazySlideImage)
