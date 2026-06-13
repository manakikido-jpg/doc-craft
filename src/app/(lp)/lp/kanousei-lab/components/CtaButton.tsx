'use client'

import { LINE_FRIEND_URL, SECONDARY_BOOKING_URL } from '../constants'
import { GTM_EVENT_LINE, GTM_EVENT_BOOKING } from '../copy'

interface CtaButtonProps {
  variant: 'primary' | 'secondary'
  children: React.ReactNode
  /** GTM event name pushed to window.dataLayer on click. No-op if dataLayer absent. */
  eventName?: string
  /** Override the default href derived from variant. */
  href?: string
  className?: string
  /** Render as a large hero-sized button */
  size?: 'default' | 'lg'
}

/**
 * CtaButton — single CTA component for the entire LP.
 * - primary → LINE friend-add URL, green background
 * - secondary → booking URL, text link style
 * - dataLayer push is no-op safe (window.dataLayer may not exist)
 * - href defaults: primary = LINE_FRIEND_URL, secondary = SECONDARY_BOOKING_URL
 */
export function CtaButton({ variant, children, eventName, href, className = '', size = 'default' }: CtaButtonProps) {
  const defaultHref = variant === 'primary' ? LINE_FRIEND_URL : SECONDARY_BOOKING_URL
  const defaultEvent = variant === 'primary' ? GTM_EVENT_LINE : GTM_EVENT_BOOKING
  const resolvedHref = href ?? defaultHref
  const resolvedEvent = eventName ?? defaultEvent

  function handleClick() {
    try {
      // dataLayer push — no-op safe when GTM is not loaded
      if (typeof window !== 'undefined' && Array.isArray((window as any).dataLayer)) {
        ;(window as any).dataLayer.push({ event: resolvedEvent })
      }
    } catch {
      // silently ignore — never block navigation
    }
  }

  if (variant === 'primary') {
    return (
      <a
        href={resolvedHref}
        data-gtm-event={resolvedEvent}
        onClick={handleClick}
        target="_blank"
        rel="noopener noreferrer"
        className={['lp-btn-primary', size === 'lg' ? 'text-lg px-8 py-5 rounded-2xl' : 'text-base', className]
          .filter(Boolean)
          .join(' ')}
      >
        {children}
      </a>
    )
  }

  return (
    <a
      href={resolvedHref}
      data-gtm-event={resolvedEvent}
      onClick={handleClick}
      target="_blank"
      rel="noopener noreferrer"
      className={['lp-btn-secondary', className].filter(Boolean).join(' ')}
    >
      {children}
    </a>
  )
}
