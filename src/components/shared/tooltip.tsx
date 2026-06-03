'use client'

import {
  useState,
  useRef,
  useCallback,
  useEffect,
  createContext,
  useContext,
  type ReactNode,
} from 'react'

// ── Tooltip Provider ──

interface TooltipContextValue {
  delay: number
}

const TooltipContext = createContext<TooltipContextValue>({ delay: 500 })

/**
 * Provider for consistent tooltip behavior across the app.
 * Wrap the app (or a subtree) to set default delay.
 */
export function TooltipProvider({
  children,
  delay = 500,
}: {
  children: ReactNode
  delay?: number
}) {
  return (
    <TooltipContext.Provider value={{ delay }}>
      {children}
    </TooltipContext.Provider>
  )
}

/**
 * Hook to access tooltip context values.
 */
export function useTooltip() {
  return useContext(TooltipContext)
}

// ── Auto-position detection ──

type TooltipPosition = 'top' | 'bottom' | 'left' | 'right'

function detectBestPosition(
  triggerRect: DOMRect,
  preferredPosition: TooltipPosition,
  tooltipWidth = 200,
  tooltipHeight = 32,
): TooltipPosition {
  const viewport = {
    width: window.innerWidth,
    height: window.innerHeight,
  }
  const margin = 12

  // Check if preferred position has enough space
  const spaceAbove = triggerRect.top
  const spaceBelow = viewport.height - triggerRect.bottom
  const spaceLeft = triggerRect.left
  const spaceRight = viewport.width - triggerRect.right

  if (preferredPosition === 'top' && spaceAbove > tooltipHeight + margin) return 'top'
  if (preferredPosition === 'bottom' && spaceBelow > tooltipHeight + margin) return 'bottom'
  if (preferredPosition === 'left' && spaceLeft > tooltipWidth + margin) return 'left'
  if (preferredPosition === 'right' && spaceRight > tooltipWidth + margin) return 'right'

  // Fallback: pick the side with the most space
  const spaces: [TooltipPosition, number][] = [
    ['top', spaceAbove],
    ['bottom', spaceBelow],
    ['left', spaceLeft],
    ['right', spaceRight],
  ]
  spaces.sort((a, b) => b[1] - a[1])
  return spaces[0][0]
}

// ── Tooltip Component ──

interface Props {
  text: string
  shortcut?: string
  children: React.ReactNode
  position?: TooltipPosition
  delay?: number
}

export default function Tooltip({ text, shortcut, children, position = 'top', delay: delayProp }: Props) {
  const ctx = useContext(TooltipContext)
  const delay = delayProp ?? ctx.delay

  const [visible, setVisible] = useState(false)
  const [actualPosition, setActualPosition] = useState<TooltipPosition>(position)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const triggerRef = useRef<HTMLDivElement>(null)

  const show = useCallback(() => {
    timerRef.current = setTimeout(() => {
      // Auto-detect best position
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect()
        setActualPosition(detectBestPosition(rect, position))
      }
      setVisible(true)
    }, delay)
  }, [delay, position])

  const hide = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    setVisible(false)
  }, [])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const positionStyles: Record<string, React.CSSProperties> = {
    top: { bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: 8 },
    bottom: { top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: 8 },
    left: { right: '100%', top: '50%', transform: 'translateY(-50%)', marginRight: 8 },
    right: { left: '100%', top: '50%', transform: 'translateY(-50%)', marginLeft: 8 },
  }

  return (
    <div
      ref={triggerRef}
      className="relative inline-flex"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {visible && (
        <div
          className="absolute z-[9999] pointer-events-none"
          style={positionStyles[actualPosition]}
          role="tooltip"
        >
          <div
            className="flex items-center gap-1.5 px-2 py-1 rounded shadow-lg bg-slate-800 text-white text-xs whitespace-nowrap"
            style={{
              animation: 'tooltipFadeIn 150ms ease-out forwards',
            }}
          >
            <span>{text}</span>
            {shortcut && (
              <kbd className="text-slate-400 text-[10px] font-mono bg-slate-700/50 px-1 py-0.5 rounded">
                {shortcut}
              </kbd>
            )}
          </div>
        </div>
      )}
      <style jsx global>{`
        @keyframes tooltipFadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
