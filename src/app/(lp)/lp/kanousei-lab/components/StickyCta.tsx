'use client'

import { useEffect, useState } from 'react'
import { CtaButton } from './CtaButton'
import { CTA_PRIMARY_LABEL } from '../copy'

/**
 * S11 — StickyCta
 * Client Component. Uses IntersectionObserver to watch a sentinel element placed
 * immediately after the Hero section. Appears when the sentinel scrolls out of view.
 *
 * - Mobile: fixed bottom bar with safe-area inset
 * - Desktop: floating button, bottom-right
 * - prefers-reduced-motion: skips slide animation, shows/hides instantly
 */
export function StickyCta() {
  const [visible, setVisible] = useState(false)
  const prefersReduced =
    typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false

  useEffect(() => {
    const sentinel = document.getElementById('sticky-cta-sentinel')
    if (!sentinel) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        // Show sticky CTA when sentinel is NOT intersecting (hero scrolled past)
        setVisible(!entry.isIntersecting)
      },
      { threshold: 0, rootMargin: '0px' },
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [])

  if (!visible) return null

  const transition = prefersReduced ? 'none' : 'transform 0.3s ease, opacity 0.3s ease'

  return (
    <>
      {/*
       * Mobile: full-width bar pinned to bottom.
       * Uses env(safe-area-inset-bottom) for notched devices.
       */}
      <div
        className="md:hidden fixed left-0 right-0 z-50"
        style={{
          bottom: 0,
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          backgroundColor: 'var(--lp-bg)',
          borderTop: '1px solid var(--lp-line)',
          boxShadow: '0 -4px 20px rgba(42,38,34,0.08)',
          transition,
        }}
        role="region"
        aria-label="固定CTA"
      >
        <div className="px-4 py-3">
          <CtaButton variant="primary" className="w-full justify-center text-base" eventName="sticky_cta_mobile">
            {CTA_PRIMARY_LABEL}
          </CtaButton>
        </div>
      </div>

      {/*
       * Desktop: floating button, bottom-right corner.
       */}
      <div
        className="hidden md:block fixed z-50"
        style={{
          bottom: '2rem',
          right: '2rem',
          transition,
        }}
        role="region"
        aria-label="固定CTA"
      >
        <CtaButton variant="primary" size="default" eventName="sticky_cta_desktop">
          {CTA_PRIMARY_LABEL}
        </CtaButton>
      </div>
    </>
  )
}

/**
 * Sentinel element — place this immediately after the Hero section in page.tsx.
 * The StickyCta watches this element via IntersectionObserver.
 */
export function StickyCtaSentinel() {
  return <div id="sticky-cta-sentinel" aria-hidden="true" style={{ height: '1px', margin: 0 }} />
}
