'use client'

import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
  animationType: 'none' | 'grow' | 'fade' | 'slide-up' | 'cascade'
  duration?: number
  delay?: number
}

export default function ChartAnimation({
  children,
  animationType,
  duration = 600,
  delay = 0,
}: Props) {
  if (animationType === 'none') {
    return <>{children}</>
  }

  const durationSec = `${duration}ms`
  const delaySec = `${delay}ms`

  const animationClassMap: Record<string, string> = {
    grow: 'chart-anim-grow',
    fade: 'chart-anim-fade',
    'slide-up': 'chart-anim-slide-up',
    cascade: 'chart-anim-cascade',
  }

  const animClass = animationClassMap[animationType] || ''

  return (
    <>
      <style>{`
        @keyframes chartGrow {
          from {
            transform: scaleY(0);
            opacity: 0.3;
          }
          to {
            transform: scaleY(1);
            opacity: 1;
          }
        }

        @keyframes chartFade {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes chartSlideUp {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @keyframes chartCascadeItem {
          from {
            transform: scaleY(0);
            opacity: 0;
          }
          to {
            transform: scaleY(1);
            opacity: 1;
          }
        }

        .chart-anim-grow {
          animation: chartGrow ${durationSec} ${delaySec} ease-out both;
          transform-origin: bottom center;
        }

        .chart-anim-fade {
          animation: chartFade ${durationSec} ${delaySec} ease-out both;
        }

        .chart-anim-slide-up {
          animation: chartSlideUp ${durationSec} ${delaySec} ease-out both;
        }

        .chart-anim-cascade > * {
          transform-origin: bottom center;
          opacity: 0;
          animation: chartCascadeItem ${durationSec} ease-out both;
        }

        ${Array.from({ length: 20 }, (_, i) =>
          `.chart-anim-cascade > *:nth-child(${i + 1}) { animation-delay: ${delay + i * 80}ms; }`
        ).join('\n')}
      `}</style>
      <div className={animClass}>
        {children}
      </div>
    </>
  )
}
