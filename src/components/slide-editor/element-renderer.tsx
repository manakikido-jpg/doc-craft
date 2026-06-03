'use client'

import type {
  SlideElement,
  SlideTableElement,
  SlideConnectorElement,
  SlideImageElement,
  SlideShapeElement,
  SlideVideoElement,
  SlideAudioElement,
  SlideChartElement,
  SlideTheme,
} from '@/types'
import ChartRenderer from './chart-renderer'
import { getElementTransform, getElementFilterStyle } from '@/lib/canvas-helpers'
import { sanitizeHtml } from '@/lib/sanitize'

// ─── Shared helpers ───

export function getColorFilterCSS(filter?: string): string {
  switch (filter) {
    case 'grayscale': return 'grayscale(100%)'
    case 'sepia': return 'sepia(100%)'
    case 'high-contrast': return 'contrast(150%) saturate(130%)'
    case 'washout': return 'brightness(130%) opacity(70%)'
    case 'cool': return 'hue-rotate(180deg) saturate(80%)'
    case 'warm': return 'sepia(30%) saturate(140%)'
    case 'vintage': return 'sepia(40%) contrast(90%) brightness(110%)'
    case 'duotone': return 'grayscale(100%) sepia(100%) hue-rotate(180deg)'
    default: return ''
  }
}

export function getMaskClipPath(mask?: string): string | undefined {
  switch (mask) {
    case 'circle': return 'circle(50% at 50% 50%)'
    case 'triangle': return 'polygon(50% 0%, 0% 100%, 100% 100%)'
    case 'star': return 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)'
    case 'hexagon': return 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)'
    case 'rounded-rect': return 'inset(0 round 15%)'
    default: return undefined
  }
}

/** SVG shape map used for presentation mode (dangerouslySetInnerHTML approach) */
export const SHAPE_SVG_MAP: Record<string, string> = {
  rect: '<rect x="0" y="0" width="100" height="100" rx="__CORNER_RADIUS__" />',
  circle: '<ellipse cx="50" cy="50" rx="50" ry="50" />',
  triangle: '<polygon points="50,5 95,95 5,95" />',
  'arrow-right': '<polygon points="0,25 65,25 65,5 100,50 65,95 65,75 0,75" />',
  'arrow-left': '<polygon points="100,25 35,25 35,5 0,50 35,95 35,75 100,75" />',
  'arrow-up': '<polygon points="25,100 25,35 5,35 50,0 95,35 75,35 75,100" />',
  'arrow-down': '<polygon points="25,0 25,65 5,65 50,100 95,65 75,65 75,0" />',
  star: '<polygon points="50,2 63,38 98,38 70,60 80,95 50,74 20,95 30,60 2,38 37,38" />',
  diamond: '<polygon points="50,2 98,50 50,98 2,50" />',
  hexagon: '<polygon points="25,6 75,6 100,50 75,94 25,94 0,50" />',
  pentagon: '<polygon points="50,2 97,38 80,95 20,95 3,38" />',
  heart: '<path d="M50,88 C25,65 2,45 2,28 A22,22,0,0,1,50,20 A22,22,0,0,1,98,28 C98,45 75,65 50,88Z" />',
  callout: '<path d="M5,5 H95 V65 H45 L25,90 L30,65 H5 Z" />',
  cross: '<polygon points="35,0 65,0 65,35 100,35 100,65 65,65 65,100 35,100 35,65 0,65 0,35 35,35" />',
}

/** Build SVG shape JSX elements for canvas mode (no dangerouslySetInnerHTML) */
export function buildShapeJSX(
  el: SlideShapeElement,
  useFill: string,
  sw: number,
  dashArray?: string,
): Record<string, React.ReactNode> {
  return {
    rect: (
      <rect
        x="2" y="2" width="96" height="96"
        rx={el.cornerRadius ?? 4}
        fill={useFill} stroke={el.stroke || 'none'} strokeWidth={sw} strokeDasharray={dashArray}
      />
    ),
    circle: (
      <ellipse
        cx="50" cy="50" rx="48" ry="48"
        fill={useFill} stroke={el.stroke || 'none'} strokeWidth={sw} strokeDasharray={dashArray}
      />
    ),
    triangle: (
      <polygon
        points="50,5 95,95 5,95"
        fill={useFill} stroke={el.stroke || 'none'} strokeWidth={sw} strokeDasharray={dashArray}
      />
    ),
    'arrow-right': (
      <polygon
        points="0,25 65,25 65,5 100,50 65,95 65,75 0,75"
        fill={useFill} stroke={el.stroke || 'none'} strokeWidth={sw} strokeDasharray={dashArray}
      />
    ),
    'arrow-left': (
      <polygon
        points="100,25 35,25 35,5 0,50 35,95 35,75 100,75"
        fill={useFill} stroke={el.stroke || 'none'} strokeWidth={sw} strokeDasharray={dashArray}
      />
    ),
    'arrow-up': (
      <polygon
        points="25,100 25,35 5,35 50,0 95,35 75,35 75,100"
        fill={useFill} stroke={el.stroke || 'none'} strokeWidth={sw} strokeDasharray={dashArray}
      />
    ),
    'arrow-down': (
      <polygon
        points="25,0 25,65 5,65 50,100 95,65 75,65 75,0"
        fill={useFill} stroke={el.stroke || 'none'} strokeWidth={sw} strokeDasharray={dashArray}
      />
    ),
    line: <line x1="0" y1="50" x2="100" y2="50" stroke={el.fill} strokeWidth="4" strokeDasharray={dashArray} />,
    star: (
      <polygon
        points="50,5 61,35 95,35 68,57 79,90 50,70 21,90 32,57 5,35 39,35"
        fill={useFill} stroke={el.stroke || 'none'} strokeWidth={sw} strokeDasharray={dashArray}
      />
    ),
    diamond: (
      <polygon
        points="50,2 98,50 50,98 2,50"
        fill={useFill} stroke={el.stroke || 'none'} strokeWidth={sw} strokeDasharray={dashArray}
      />
    ),
    hexagon: (
      <polygon
        points="25,5 75,5 98,50 75,95 25,95 2,50"
        fill={useFill} stroke={el.stroke || 'none'} strokeWidth={sw} strokeDasharray={dashArray}
      />
    ),
    pentagon: (
      <polygon
        points="50,5 97,38 80,95 20,95 3,38"
        fill={useFill} stroke={el.stroke || 'none'} strokeWidth={sw} strokeDasharray={dashArray}
      />
    ),
    heart: (
      <path
        d="M50,88 C25,65 2,45 2,28 C2,12 15,2 28,2 C38,2 46,8 50,18 C54,8 62,2 72,2 C85,2 98,12 98,28 C98,45 75,65 50,88Z"
        fill={useFill} stroke={el.stroke || 'none'} strokeWidth={sw} strokeDasharray={dashArray}
      />
    ),
    callout: (
      <>
        <rect
          x="2" y="2" width="96" height="70" rx="8"
          fill={useFill} stroke={el.stroke || 'none'} strokeWidth={sw} strokeDasharray={dashArray}
        />
        <polygon points="20,72 35,95 45,72" fill={useFill} />
      </>
    ),
    cross: (
      <polygon
        points="35,2 65,2 65,35 98,35 98,65 65,65 65,98 35,98 35,65 2,65 2,35 35,35"
        fill={useFill} stroke={el.stroke || 'none'} strokeWidth={sw} strokeDasharray={dashArray}
      />
    ),
  }
}

// ─── Presentation-mode helpers ───

export function getElementAnimationStyle(
  el: SlideElement,
  transitionIdle: boolean,
): React.CSSProperties {
  if (!('animation' in el) || !el.animation || !transitionIdle) return {}
  const { type, delay = 0, duration = 0.5 } = el.animation
  const animMap: Record<string, string> = {
    fadeIn: 'fadeIn',
    slideInLeft: 'slideInLeft',
    slideInRight: 'slideInRight',
    slideInUp: 'slideInUp',
    slideInDown: 'slideInDown',
    zoomIn: 'zoomIn',
    bounceIn: 'bounceIn',
    fadeOut: 'fadeOut',
    slideOutLeft: 'slideOutLeft',
    slideOutRight: 'slideOutRight',
    slideOutUp: 'slideOutUp',
    slideOutDown: 'slideOutDown',
    zoomOut: 'zoomOut',
    pulse: 'pulse',
    bounce: 'bounceEmphasis',
    shake: 'shake',
    spin: 'spin',
  }
  const isEntrance = !type.includes('Out') && !['pulse', 'bounce', 'shake', 'spin'].includes(type)
  return {
    opacity: isEntrance ? 0 : 1,
    animation: `${animMap[type] || 'fadeIn'} ${duration}s ${delay}s forwards`,
  }
}

export function getPresentationTransform(el: SlideElement): string {
  const parts: string[] = []
  if ('rotation' in el && el.rotation) parts.push(`rotate(${el.rotation}deg)`)
  if ('flipH' in el && el.flipH) parts.push('scaleX(-1)')
  if ('flipV' in el && el.flipV) parts.push('scaleY(-1)')
  return parts.join(' ') || 'none'
}

export function getPresentationFilterStyle(el: SlideElement): React.CSSProperties {
  const style: React.CSSProperties = {}
  if ('opacity' in el && el.opacity != null && el.opacity < 100) style.opacity = el.opacity / 100
  if ('shadow' in el && el.shadow)
    style.filter = `drop-shadow(${el.shadow.offsetX}px ${el.shadow.offsetY}px ${el.shadow.blur}px ${el.shadow.color})`
  return style
}

// ─── Image filter builder ───

export function buildImageFilter(el: SlideImageElement): string | undefined {
  const colorF = getColorFilterCSS(el.colorFilter)
  const parts = [
    el.brightness !== undefined && el.brightness !== 100 ? `brightness(${el.brightness}%)` : '',
    el.contrast !== undefined && el.contrast !== 100 ? `contrast(${el.contrast}%)` : '',
    el.blur ? `blur(${el.blur}px)` : '',
    colorF,
  ].filter(Boolean)
  return parts.length > 0 ? parts.join(' ') : undefined
}

// ─── Render functions per mode ───

export type ElementMode = 'canvas' | 'presentation'

export interface CanvasCallbacks {
  onMouseDown: (e: React.MouseEvent, el: SlideElement) => void
  onClick: (id: string, e: React.MouseEvent) => void
  onDoubleClick: (id: string) => void
  onContextMenu: (e: React.MouseEvent) => void
  onConnectorEndpointMouseDown: (e: React.MouseEvent, connId: string, mode: 'from' | 'to') => void
  onTableEdit: (id: string) => void
  onTableCellBlur: (elementId: string, row: number, col: number, value: string) => void
  isEditingTable: (id: string) => boolean
  selectedIds: Set<string>
  draggingId: string | null
  theme: SlideTheme
  connectorDragId: string | null
  connectorDragMode: 'from' | 'to' | null
  connectorDragPoint: { x: number; y: number } | null
  colResizeDrag: { elementId: string; col: number; startX: number; startWidth: number; currentX: number; tableLeft: number; tableWidth: number } | null
  onColResizeStart: (e: React.MouseEvent, elementId: string, col: number, startWidth: number) => void
}

export interface PresentationCallbacks {
  theme: SlideTheme
  transitionIdle: boolean
}

/**
 * Renders a connector element. Shared between canvas and presentation modes.
 */
export function renderConnector(
  el: SlideConnectorElement,
  mode: ElementMode,
  callbacks: CanvasCallbacks | PresentationCallbacks,
): React.ReactNode {
  const conn = el
  const isCanvas = mode === 'canvas'
  const canvasCb = isCanvas ? callbacks as CanvasCallbacks : null
  const isSelected = canvasCb ? canvasCb.selectedIds.has(el.id) : false
  const singleSelected = isSelected && canvasCb ? canvasCb.selectedIds.size === 1 : false

  const fromPt = canvasCb && canvasCb.connectorDragId === conn.id && canvasCb.connectorDragMode === 'from' && canvasCb.connectorDragPoint
    ? canvasCb.connectorDragPoint
    : conn.fromPoint
  const toPt = canvasCb && canvasCb.connectorDragId === conn.id && canvasCb.connectorDragMode === 'to' && canvasCb.connectorDragPoint
    ? canvasCb.connectorDragPoint
    : conn.toPoint

  const markerIdPrefix = isCanvas ? 'arrow' : 'pres-arrow'

  if (!isCanvas) {
    // Presentation mode: simpler connector rendering
    const presCb = callbacks as PresentationCallbacks
    const animStyle = getElementAnimationStyle(el, presCb.transitionIdle)

    // Presentation mode renders all connector styles (straight, curved, elbow)
    return (
      <svg
        key={el.id}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: conn.zIndex ?? 0,
          opacity: conn.opacity != null ? conn.opacity / 100 : 1,
          ...animStyle,
        }}
      >
        <defs>
          {conn.arrowHead && (
            <marker id={`pres-arrow-${conn.id}`} markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill={conn.stroke} />
            </marker>
          )}
        </defs>
        <line
          x1={`${conn.fromPoint.x}%`}
          y1={`${conn.fromPoint.y}%`}
          x2={`${conn.toPoint.x}%`}
          y2={`${conn.toPoint.y}%`}
          stroke={conn.stroke}
          strokeWidth={conn.strokeWidth || 2}
          markerEnd={conn.arrowHead ? `url(#pres-arrow-${conn.id})` : undefined}
        />
      </svg>
    )
  }

  // Canvas mode: full connector rendering with styles and endpoint handles
  return (
    <svg
      key={el.id}
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: conn.zIndex ?? 0,
      }}
    >
      <defs>
        {conn.arrowHead && (
          <marker id={`${markerIdPrefix}-${conn.id}`} markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill={conn.stroke} />
          </marker>
        )}
      </defs>
      {conn.style === 'curved' ? (
        <path
          d={`M${fromPt.x}%,${fromPt.y}% C${fromPt.x}%,${(fromPt.y + toPt.y) / 2}% ${toPt.x}%,${(fromPt.y + toPt.y) / 2}% ${toPt.x}%,${toPt.y}%`}
          fill="none"
          stroke={conn.stroke}
          strokeWidth={conn.strokeWidth || 2}
          markerEnd={conn.arrowHead ? `url(#${markerIdPrefix}-${conn.id})` : undefined}
          style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
          onClick={(e) => canvasCb!.onClick(el.id, e as any)}
        />
      ) : conn.style === 'elbow' ? (
        <path
          d={`M${fromPt.x}%,${fromPt.y}% L${fromPt.x}%,${(fromPt.y + toPt.y) / 2}% L${toPt.x}%,${(fromPt.y + toPt.y) / 2}% L${toPt.x}%,${toPt.y}%`}
          fill="none"
          stroke={conn.stroke}
          strokeWidth={conn.strokeWidth || 2}
          markerEnd={conn.arrowHead ? `url(#${markerIdPrefix}-${conn.id})` : undefined}
          style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
          onClick={(e) => canvasCb!.onClick(el.id, e as any)}
        />
      ) : (
        <line
          x1={`${fromPt.x}%`}
          y1={`${fromPt.y}%`}
          x2={`${toPt.x}%`}
          y2={`${toPt.y}%`}
          stroke={conn.stroke}
          strokeWidth={conn.strokeWidth || 2}
          markerEnd={conn.arrowHead ? `url(#${markerIdPrefix}-${conn.id})` : undefined}
          style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
          onClick={(e) => canvasCb!.onClick(el.id, e as any)}
        />
      )}
      {/* Draggable endpoint handles when selected */}
      {singleSelected && (
        <>
          <circle
            cx={`${fromPt.x}%`}
            cy={`${fromPt.y}%`}
            r="5"
            fill={conn.fromElementId ? '#3b82f6' : '#ffffff'}
            stroke="#3b82f6"
            strokeWidth="2"
            style={{ pointerEvents: 'all', cursor: 'crosshair' }}
            onMouseDown={(e) => canvasCb!.onConnectorEndpointMouseDown(e as any, conn.id, 'from')}
          />
          <circle
            cx={`${toPt.x}%`}
            cy={`${toPt.y}%`}
            r="5"
            fill={conn.toElementId ? '#3b82f6' : '#ffffff'}
            stroke="#3b82f6"
            strokeWidth="2"
            style={{ pointerEvents: 'all', cursor: 'crosshair' }}
            onMouseDown={(e) => canvasCb!.onConnectorEndpointMouseDown(e as any, conn.id, 'to')}
          />
        </>
      )}
    </svg>
  )
}

/**
 * Renders an image element.
 */
export function renderImage(
  el: SlideImageElement,
  mode: ElementMode,
  callbacks: CanvasCallbacks | PresentationCallbacks,
): React.ReactNode {
  const imgFilter = buildImageFilter(el)
  const isCanvas = mode === 'canvas'

  if (!isCanvas) {
    const presCb = callbacks as PresentationCallbacks
    const animStyle = getElementAnimationStyle(el, presCb.transitionIdle)
    const transform = getPresentationTransform(el)
    const filterStyle = getPresentationFilterStyle(el)

    return (
      <div
        key={el.id}
        style={{
          position: 'absolute',
          left: `${el.x}%`,
          top: `${el.y}%`,
          width: `${el.w}%`,
          height: `${el.h}%`,
          zIndex: el.zIndex ?? 0,
          transform,
          clipPath: getMaskClipPath(el.maskShape),
          ...filterStyle,
          ...animStyle,
        }}
      >
        {el.crop && (el.crop.w < 100 || el.crop.h < 100 || el.crop.x > 0 || el.crop.y > 0) ? (
          <div style={{ overflow: 'hidden', width: '100%', height: '100%', position: 'relative' }}>
            <img
              src={el.src}
              alt={el.alt || ''}
              draggable={false}
              style={{
                position: 'absolute',
                left: `${-el.crop.x * (100 / el.crop.w)}%`,
                top: `${-el.crop.y * (100 / el.crop.h)}%`,
                width: `${10000 / el.crop.w}%`,
                height: `${10000 / el.crop.h}%`,
                objectFit: 'cover',
                filter: imgFilter,
              }}
            />
          </div>
        ) : (
          <img
            src={el.src}
            alt={el.alt || ''}
            className="w-full h-full object-contain"
            draggable={false}
            style={{ filter: imgFilter }}
          />
        )}
      </div>
    )
  }

  // Canvas mode
  const canvasCb = callbacks as CanvasCallbacks
  const isSelected = canvasCb.selectedIds.has(el.id)

  return (
    <div
      key={el.id}
      style={{
        position: 'absolute',
        left: `${el.x}%`,
        top: `${el.y}%`,
        width: `${el.w}%`,
        height: `${el.h}%`,
        cursor: canvasCb.draggingId === el.id ? 'grabbing' : 'grab',
        opacity: canvasCb.draggingId === el.id ? 0.8 : 1,
        boxShadow: canvasCb.draggingId === el.id ? '0 0 0 2px rgba(99,102,241,0.5)' : undefined,
        outline: isSelected ? `2px solid ${canvasCb.theme.accentColor}` : 'none',
        borderRadius: '4px',
        overflow: 'hidden',
        zIndex: el.zIndex ?? 0,
        transform: getElementTransform(el),
        ...getElementFilterStyle(el),
      }}
      onMouseDown={(e) => canvasCb.onMouseDown(e, el)}
      onClick={(e) => canvasCb.onClick(el.id, e)}
      onDoubleClick={() => canvasCb.onDoubleClick(el.id)}
      onContextMenu={canvasCb.onContextMenu}
    >
      {el.crop && el.crop.w < 100 || el.crop && el.crop.h < 100 || el.crop && el.crop.x > 0 || el.crop && el.crop.y > 0 ? (
        <div style={{ overflow: 'hidden', width: '100%', height: '100%', position: 'relative' }}>
          <img
            src={el.src}
            alt={el.alt || ''}
            className="pointer-events-none"
            draggable={false}
            style={{
              position: 'absolute',
              left: `${-el.crop!.x * (100 / el.crop!.w)}%`,
              top: `${-el.crop!.y * (100 / el.crop!.h)}%`,
              width: `${10000 / el.crop!.w}%`,
              height: `${10000 / el.crop!.h}%`,
              objectFit: 'cover',
              filter: imgFilter,
              clipPath: getMaskClipPath(el.maskShape),
            }}
          />
        </div>
      ) : (
        <img
          src={el.src}
          alt={el.alt || ''}
          className="w-full h-full object-contain pointer-events-none"
          draggable={false}
          style={{ filter: imgFilter, clipPath: getMaskClipPath(el.maskShape) }}
        />
      )}
      {el.locked && <LockedBadge />}
    </div>
  )
}

/**
 * Renders a shape element.
 */
export function renderShape(
  el: SlideShapeElement,
  mode: ElementMode,
  callbacks: CanvasCallbacks | PresentationCallbacks,
): React.ReactNode {
  const isCanvas = mode === 'canvas'
  const fillId = `${isCanvas ? 'grad' : 'pres-grad'}-${el.id}`
  const useFill = el.gradientFill ? `url(#${fillId})` : el.fill
  const sw = el.strokeWidth ?? 2
  const dashArray = el.strokeDash === 'dashed' ? '8,4' : el.strokeDash === 'dotted' ? '2,4' : undefined

  if (!isCanvas) {
    const presCb = callbacks as PresentationCallbacks
    const animStyle = getElementAnimationStyle(el, presCb.transitionIdle)
    const transform = getPresentationTransform(el)
    const filterStyle = getPresentationFilterStyle(el)
    const gradId = fillId

    if (el.shape === 'line') {
      return (
        <div
          key={el.id}
          style={{
            position: 'absolute',
            left: `${el.x}%`,
            top: `${el.y}%`,
            width: `${el.w}%`,
            height: `${el.h}%`,
            zIndex: el.zIndex ?? 0,
            transform,
            ...filterStyle,
            ...animStyle,
          }}
        >
          <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
            <line
              x1="0" y1="50" x2="100" y2="50"
              stroke={el.fill}
              strokeWidth={el.strokeWidth || 4}
              strokeDasharray={el.strokeDash === 'dashed' ? '8,4' : el.strokeDash === 'dotted' ? '2,3' : undefined}
            />
          </svg>
        </div>
      )
    }

    const rawSvgPath = SHAPE_SVG_MAP[el.shape] || SHAPE_SVG_MAP.rect
    const svgPath = rawSvgPath.replace('__CORNER_RADIUS__', String(el.cornerRadius ?? 4))
    const presDashArray = el.strokeDash === 'dashed' ? '8,4' : el.strokeDash === 'dotted' ? '2,3' : undefined

    return (
      <div
        key={el.id}
        style={{
          position: 'absolute',
          left: `${el.x}%`,
          top: `${el.y}%`,
          width: `${el.w}%`,
          height: `${el.h}%`,
          zIndex: el.zIndex ?? 0,
          transform,
          ...filterStyle,
          ...animStyle,
        }}
      >
        <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
          {el.gradientFill && (
            <defs>
              {el.gradientType === 'radial' ? (
                <radialGradient id={gradId}>
                  <stop offset="0%" stopColor={el.gradientFill.color1} />
                  <stop offset="100%" stopColor={el.gradientFill.color2} />
                </radialGradient>
              ) : (
                <linearGradient id={gradId} gradientTransform={`rotate(${el.gradientFill.angle})`}>
                  <stop offset="0%" stopColor={el.gradientFill.color1} />
                  <stop offset="100%" stopColor={el.gradientFill.color2} />
                </linearGradient>
              )}
            </defs>
          )}
          <g
            fill={el.gradientFill ? `url(#${gradId})` : el.fill}
            stroke={el.stroke || 'none'}
            strokeWidth={el.strokeWidth || 0}
            strokeDasharray={presDashArray}
            dangerouslySetInnerHTML={{ __html: svgPath }}
          />
        </svg>
        {el.textContent && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: el.textColor || '#fff',
              fontSize: el.textFontSize ? `${el.textFontSize * 0.065}vw` : '1.2vw',
              textAlign: 'center',
              padding: '8%',
              wordBreak: 'break-word',
            }}
          >
            {el.textContent}
          </div>
        )}
      </div>
    )
  }

  // Canvas mode
  const canvasCb = callbacks as CanvasCallbacks
  const isSelected = canvasCb.selectedIds.has(el.id)
  const shapeMap = buildShapeJSX(el, useFill, sw, dashArray)

  return (
    <div
      key={el.id}
      style={{
        position: 'absolute',
        left: `${el.x}%`,
        top: `${el.y}%`,
        width: `${el.w}%`,
        height: `${el.h}%`,
        cursor: canvasCb.draggingId === el.id ? 'grabbing' : 'grab',
        opacity: canvasCb.draggingId === el.id ? 0.8 : 1,
        boxShadow: canvasCb.draggingId === el.id ? '0 0 0 2px rgba(99,102,241,0.5)' : undefined,
        outline: isSelected ? `2px solid ${canvasCb.theme.accentColor}` : 'none',
        zIndex: el.zIndex ?? 0,
        transform: getElementTransform(el),
        ...getElementFilterStyle(el),
      }}
      onMouseDown={(e) => canvasCb.onMouseDown(e, el)}
      onClick={(e) => canvasCb.onClick(el.id, e)}
      onContextMenu={canvasCb.onContextMenu}
    >
      {el.locked && <LockedBadge />}
      <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
        {el.gradientFill && (
          <defs>
            {el.gradientType === 'radial' ? (
              <radialGradient id={fillId}>
                <stop offset="0%" stopColor={el.gradientFill.color1} />
                <stop offset="100%" stopColor={el.gradientFill.color2} />
              </radialGradient>
            ) : (
              <linearGradient id={fillId} gradientTransform={`rotate(${el.gradientFill.angle})`}>
                <stop offset="0%" stopColor={el.gradientFill.color1} />
                <stop offset="100%" stopColor={el.gradientFill.color2} />
              </linearGradient>
            )}
          </defs>
        )}
        {shapeMap[el.shape] || shapeMap.rect}
      </svg>
      {el.textContent && (
        <div
          className="absolute inset-0 flex items-center justify-center p-1"
          style={{
            color: el.textColor || '#ffffff',
            fontSize: `clamp(8px, ${(el.textFontSize || 14) * 0.055}vw, ${el.textFontSize || 14}px)`,
            textAlign: 'center',
            wordBreak: 'break-word',
            overflow: 'hidden',
          }}
        >
          {el.textContent}
        </div>
      )}
    </div>
  )
}

/**
 * Renders a video element.
 */
export function renderVideo(
  el: SlideVideoElement,
  mode: ElementMode,
  callbacks: CanvasCallbacks | PresentationCallbacks,
): React.ReactNode {
  const isCanvas = mode === 'canvas'

  if (!isCanvas) {
    const presCb = callbacks as PresentationCallbacks
    const animStyle = getElementAnimationStyle(el, presCb.transitionIdle)
    const transform = getPresentationTransform(el)
    const filterStyle = getPresentationFilterStyle(el)

    return (
      <div
        key={el.id}
        style={{
          position: 'absolute',
          left: `${el.x}%`,
          top: `${el.y}%`,
          width: `${el.w}%`,
          height: `${el.h}%`,
          zIndex: el.zIndex ?? 0,
          transform,
          ...filterStyle,
          ...animStyle,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {el.embedType === 'youtube' ? (
          <iframe
            src={el.src}
            className="w-full h-full"
            allow="autoplay; encrypted-media"
            allowFullScreen
            style={{ border: 'none' }}
          />
        ) : (
          <video src={el.src} className="w-full h-full" controls autoPlay={el.autoplay} />
        )}
      </div>
    )
  }

  // Canvas mode
  const canvasCb = callbacks as CanvasCallbacks
  const isSelected = canvasCb.selectedIds.has(el.id)

  return (
    <div
      key={el.id}
      style={{
        position: 'absolute',
        left: `${el.x}%`,
        top: `${el.y}%`,
        width: `${el.w}%`,
        height: `${el.h}%`,
        zIndex: el.zIndex ?? 0,
        transform: getElementTransform(el),
        outline: isSelected ? `2px solid ${canvasCb.theme.accentColor}` : 'none',
        cursor: canvasCb.draggingId === el.id ? 'grabbing' : 'grab',
        opacity: canvasCb.draggingId === el.id ? 0.8 : 1,
        boxShadow: canvasCb.draggingId === el.id ? '0 0 0 2px rgba(99,102,241,0.5)' : undefined,
        ...getElementFilterStyle(el),
      }}
      onMouseDown={(e) => canvasCb.onMouseDown(e, el)}
      onClick={(e) => canvasCb.onClick(el.id, e)}
      onContextMenu={canvasCb.onContextMenu}
    >
      {el.locked && <LockedBadge />}
      {el.embedType === 'youtube' ? (
        <iframe src={el.src} className="w-full h-full rounded pointer-events-none" allowFullScreen />
      ) : (
        <video src={el.src} className="w-full h-full rounded object-contain" controls={isSelected} />
      )}
    </div>
  )
}

/**
 * Renders an audio element.
 */
export function renderAudio(
  el: SlideAudioElement,
  mode: ElementMode,
  callbacks: CanvasCallbacks | PresentationCallbacks,
): React.ReactNode {
  const isCanvas = mode === 'canvas'

  if (!isCanvas) {
    const presCb = callbacks as PresentationCallbacks
    const animStyle = getElementAnimationStyle(el, presCb.transitionIdle)
    const filterStyle = getPresentationFilterStyle(el)

    return (
      <div
        key={el.id}
        style={{
          position: 'absolute',
          left: `${el.x}%`,
          top: `${el.y}%`,
          width: `${el.w}%`,
          height: `${el.h}%`,
          zIndex: el.zIndex ?? 0,
          ...filterStyle,
          ...animStyle,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <audio src={el.src} controls className="w-full" />
      </div>
    )
  }

  // Canvas mode
  const canvasCb = callbacks as CanvasCallbacks
  const isSelected = canvasCb.selectedIds.has(el.id)

  return (
    <div
      key={el.id}
      style={{
        position: 'absolute',
        left: `${el.x}%`,
        top: `${el.y}%`,
        width: `${el.w}%`,
        height: `${el.h}%`,
        zIndex: el.zIndex ?? 0,
        outline: isSelected ? `2px solid ${canvasCb.theme.accentColor}` : 'none',
        cursor: canvasCb.draggingId === el.id ? 'grabbing' : 'grab',
        opacity: canvasCb.draggingId === el.id ? 0.8 : 1,
        boxShadow: canvasCb.draggingId === el.id ? '0 0 0 2px rgba(99,102,241,0.5)' : undefined,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(15,23,42,0.6)',
        borderRadius: '8px',
        ...getElementFilterStyle(el),
      }}
      onMouseDown={(e) => canvasCb.onMouseDown(e, el)}
      onClick={(e) => canvasCb.onClick(el.id, e)}
      onContextMenu={canvasCb.onContextMenu}
    >
      {el.locked && <LockedBadge />}
      <audio src={el.src} controls className="w-[90%]" />
    </div>
  )
}

/**
 * Renders a chart element.
 */
export function renderChart(
  el: SlideChartElement,
  mode: ElementMode,
  callbacks: CanvasCallbacks | PresentationCallbacks,
): React.ReactNode {
  const isCanvas = mode === 'canvas'

  if (!isCanvas) {
    const presCb = callbacks as PresentationCallbacks
    const animStyle = getElementAnimationStyle(el, presCb.transitionIdle)
    const transform = getPresentationTransform(el)
    const filterStyle = getPresentationFilterStyle(el)

    return (
      <div
        key={el.id}
        style={{
          position: 'absolute',
          left: `${el.x}%`,
          top: `${el.y}%`,
          width: `${el.w}%`,
          height: `${el.h}%`,
          zIndex: el.zIndex ?? 0,
          transform,
          ...filterStyle,
          ...animStyle,
        }}
      >
        <ChartRenderer chart={el} />
      </div>
    )
  }

  // Canvas mode
  const canvasCb = callbacks as CanvasCallbacks
  const isSelected = canvasCb.selectedIds.has(el.id)

  return (
    <div
      key={el.id}
      style={{
        position: 'absolute',
        left: `${el.x}%`,
        top: `${el.y}%`,
        width: `${el.w}%`,
        height: `${el.h}%`,
        zIndex: el.zIndex ?? 0,
        transform: getElementTransform(el),
        outline: isSelected ? `2px solid ${canvasCb.theme.accentColor}` : 'none',
        cursor: canvasCb.draggingId === el.id ? 'grabbing' : 'grab',
        opacity: canvasCb.draggingId === el.id ? 0.8 : 1,
        boxShadow: canvasCb.draggingId === el.id ? '0 0 0 2px rgba(99,102,241,0.5)' : undefined,
        ...getElementFilterStyle(el),
      }}
      onMouseDown={(e) => canvasCb.onMouseDown(e, el)}
      onClick={(e) => canvasCb.onClick(el.id, e)}
      onDoubleClick={() => canvasCb.onDoubleClick(el.id)}
      onContextMenu={canvasCb.onContextMenu}
    >
      {el.locked && <LockedBadge />}
      <ChartRenderer chart={el} />
    </div>
  )
}

/**
 * Renders a table element.
 */
export function renderTable(
  el: SlideTableElement,
  mode: ElementMode,
  callbacks: CanvasCallbacks | PresentationCallbacks,
): React.ReactNode {
  const isCanvas = mode === 'canvas'

  if (!isCanvas) {
    const presCb = callbacks as PresentationCallbacks
    const animStyle = getElementAnimationStyle(el, presCb.transitionIdle)
    const transform = getPresentationTransform(el)
    const filterStyle = getPresentationFilterStyle(el)

    return (
      <div
        key={el.id}
        style={{
          position: 'absolute',
          left: `${el.x}%`,
          top: `${el.y}%`,
          width: `${el.w}%`,
          height: `${el.h}%`,
          zIndex: el.zIndex ?? 0,
          transform,
          ...filterStyle,
          ...animStyle,
        }}
      >
        <table className="w-full h-full border-collapse" style={{ fontSize: `${1.2}vw` }}>
          <tbody>
            {el.rows.map((row, ri) => (
              <tr key={ri}>
                {row.map((cell, ci) => (
                  <td
                    key={ci}
                    className={`border border-white/20 px-2 py-1 ${ri === 0 && el.headerRow ? 'font-semibold bg-white/10' : ''}`}
                    style={{ color: presCb.theme.bodyColor }}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  // Canvas mode: full table with editing, col resize, etc.
  // This is handled inline in slide-canvas.tsx because it has deep integration
  // with editing state, column resize drag, and other canvas-specific features.
  // We return null here; canvas mode renders tables directly.
  return null
}

/**
 * Renders a text element in presentation mode.
 */
export function renderPresentationText(
  el: SlideElement,
  callbacks: PresentationCallbacks,
): React.ReactNode {
  if (el.type === 'connector') return null
  const presCb = callbacks
  const animStyle = getElementAnimationStyle(el, presCb.transitionIdle)
  const transform = getPresentationTransform(el)
  const filterStyle = getPresentationFilterStyle(el)

  const color = (el as any).color || (el.type === 'title' ? presCb.theme.titleColor : presCb.theme.bodyColor)
  const bullet = (el as any).bulletType
  const bulletChar = bullet === 'disc' ? '● ' : bullet === 'circle' ? '○ ' : bullet === 'square' ? '■ ' : bullet === 'decimal' ? '1. ' : bullet === 'alpha' ? 'a. ' : bullet === 'roman' ? 'i. ' : ''
  const textContent = bulletChar + ((el as any).content || (el.type === 'title' ? 'タイトル' : ''))

  return (
    <div
      key={el.id}
      style={{
        position: 'absolute',
        left: `${el.x}%`,
        top: `${el.y}%`,
        width: `${el.w}%`,
        color,
        fontSize: `${(el as any).fontSize * 0.065}vw`,
        fontWeight: (el as any).fontWeight,
        fontFamily: (el as any).fontFamily || 'inherit',
        textAlign: (el as any).align as any,
        lineHeight: (el as any).lineHeight ?? 1.3,
        letterSpacing: (el as any).letterSpacing ? `${(el as any).letterSpacing}em` : undefined,
        textShadow: (el as any).textShadow ? '2px 2px 4px rgba(0,0,0,0.5)' : undefined,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        writingMode: (el as any).writingMode === 'vertical' ? 'vertical-rl' : undefined,
        zIndex: el.zIndex ?? 0,
        transform,
        ...filterStyle,
        ...animStyle,
      }}
      dangerouslySetInnerHTML={{ __html: sanitizeHtml(textContent) }}
    />
  )
}

/**
 * Main dispatch function: renders any SlideElement in the given mode.
 * For canvas mode, text and table elements are NOT handled here
 * because they require deep integration with canvas-specific editing state.
 * Returns null for those types in canvas mode.
 */
export function renderSlideElement(
  el: SlideElement,
  mode: ElementMode,
  callbacks: CanvasCallbacks | PresentationCallbacks,
): React.ReactNode {
  if (el.type === 'connector') {
    return renderConnector(el as SlideConnectorElement, mode, callbacks)
  }
  if (el.type === 'image') {
    return renderImage(el as SlideImageElement, mode, callbacks)
  }
  if (el.type === 'shape') {
    return renderShape(el as SlideShapeElement, mode, callbacks)
  }
  if (el.type === 'video') {
    return renderVideo(el as SlideVideoElement, mode, callbacks)
  }
  if (el.type === 'audio') {
    return renderAudio(el as SlideAudioElement, mode, callbacks)
  }
  if (el.type === 'chart') {
    return renderChart(el as SlideChartElement, mode, callbacks)
  }
  if (el.type === 'table') {
    return renderTable(el as SlideTableElement, mode, callbacks)
  }

  // Text elements
  if (mode === 'presentation') {
    return renderPresentationText(el, callbacks as PresentationCallbacks)
  }

  // Canvas text elements are not handled here (return null)
  return null
}

// ─── Small shared UI components ───

function LockedBadge() {
  return (
    <div className="absolute top-0 right-0 p-0.5 bg-slate-800/80 rounded-bl z-10" title="ロック中">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-400">
        <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    </div>
  )
}

export { LockedBadge }
