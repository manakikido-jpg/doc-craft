import type PptxGenJS from 'pptxgenjs'
import type {
  SlidesDocument,
  SlideElement,
  SlideTextElement,
  SlideImageElement,
  SlideShapeElement,
  SlideTableElement,
  SlideChartElement,
  SlideConnectorElement,
  SlideVideoElement,
} from '@/types'
import { SLIDE_THEMES } from '../themes'

async function getPptxGenJS() {
  const { default: PptxGenJS } = await import('pptxgenjs')
  return PptxGenJS
}

// Slide dimensions in inches (standard 16:9)
const SLIDE_W = 10
const SLIDE_H = 5.625

/** Convert percentage position/size to inches */
function pctToInch(pct: number, total: number): number {
  return (pct / 100) * total
}

/** Parse a CSS color to hex (strip alpha if needed) */
function toHex(color: string): string {
  if (!color) return '363636'
  // Remove # prefix for pptxgenjs
  if (color.startsWith('#')) return color.slice(1)
  // Handle rgb/rgba
  const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1]).toString(16).padStart(2, '0')
    const g = parseInt(rgbMatch[2]).toString(16).padStart(2, '0')
    const b = parseInt(rgbMatch[3]).toString(16).padStart(2, '0')
    return `${r}${g}${b}`
  }
  return '363636'
}

/** Extract a solid color from a background string (gradient or solid) */
function extractBgColor(bg: string): string {
  if (!bg) return '0f172a'
  // Solid hex
  if (bg.startsWith('#')) return bg.slice(1)
  // Extract first color from gradient
  const match = bg.match(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})/)
  if (match) return match[1]
  return '0f172a'
}

/** Map shape names to pptxgenjs shape types */
function getPptxShape(shapeName: string): string | null {
  const map: Record<string, string> = {
    rect: 'rect',
    circle: 'ellipse',
    triangle: 'triangle',
    diamond: 'diamond',
    star: 'star5',
    hexagon: 'hexagon',
    pentagon: 'pentagon',
    heart: 'heart',
    cross: 'plus',
    'arrow-right': 'rightArrow',
    'arrow-left': 'leftArrow',
    'arrow-up': 'upArrow',
    'arrow-down': 'downArrow',
  }
  return map[shapeName] || null
}

function addTextElement(pptxSlide: PptxGenJS.Slide, el: SlideTextElement, theme: { titleColor: string; bodyColor: string }) {
  const color = el.color || (el.type === 'title' ? theme.titleColor : theme.bodyColor)
  const alignMap: Record<string, PptxGenJS.HAlign> = { left: 'left', center: 'center', right: 'right' }

  pptxSlide.addText(el.content || '', {
    x: pctToInch(el.x, SLIDE_W),
    y: pctToInch(el.y, SLIDE_H),
    w: pctToInch(el.w, SLIDE_W),
    h: pctToInch(el.h, SLIDE_H),
    fontSize: Math.round(el.fontSize * 0.75), // px to pt approximation
    fontFace: el.fontFamily || 'Arial',
    bold: parseInt(el.fontWeight) >= 700,
    color: toHex(color),
    align: alignMap[el.align] || 'left',
    valign: 'top',
    wrap: true,
    rotate: el.rotation || 0,
  })
}

function addImageElement(pptxSlide: PptxGenJS.Slide, el: SlideImageElement) {
  // Only support base64 data URLs
  if (!el.src) return
  try {
    pptxSlide.addImage({
      data: el.src,
      x: pctToInch(el.x, SLIDE_W),
      y: pctToInch(el.y, SLIDE_H),
      w: pctToInch(el.w, SLIDE_W),
      h: pctToInch(el.h, SLIDE_H),
      rotate: el.rotation || 0,
    })
  } catch {
    // Skip images that can't be embedded
  }
}

function addShapeElement(pptxSlide: PptxGenJS.Slide, el: SlideShapeElement, pptx: PptxGenJS) {
  const shapeType = getPptxShape(el.shape)

  if (el.shape === 'line') {
    pptxSlide.addShape(pptx.ShapeType.line, {
      x: pctToInch(el.x, SLIDE_W),
      y: pctToInch(el.y, SLIDE_H),
      w: pctToInch(el.w, SLIDE_W),
      h: 0,
      line: { color: toHex(el.fill), width: el.strokeWidth || 2 },
      rotate: el.rotation || 0,
    })
    return
  }

  // Map shape names to pptxgenjs ShapeType
  const shapeTypeMap: Record<string, keyof typeof pptx.ShapeType> = {
    rect: 'rect',
    circle: 'ellipse',
    triangle: 'triangle',
    diamond: 'diamond',
    star: 'star5',
    hexagon: 'hexagon',
    'arrow-right': 'rightArrow',
    'arrow-left': 'leftArrow',
    'arrow-up': 'upArrow',
    'arrow-down': 'downArrow',
  }

  const sType = shapeTypeMap[el.shape]
  if (!sType) {
    // Fallback to rect
    pptxSlide.addShape(pptx.ShapeType.rect, {
      x: pctToInch(el.x, SLIDE_W),
      y: pctToInch(el.y, SLIDE_H),
      w: pctToInch(el.w, SLIDE_W),
      h: pctToInch(el.h, SLIDE_H),
      fill: { color: toHex(el.fill) },
      rotate: el.rotation || 0,
    })
    return
  }

  const opts: PptxGenJS.ShapeProps = {
    x: pctToInch(el.x, SLIDE_W),
    y: pctToInch(el.y, SLIDE_H),
    w: pctToInch(el.w, SLIDE_W),
    h: pctToInch(el.h, SLIDE_H),
    fill: { color: toHex(el.fill) },
    rotate: el.rotation || 0,
  }

  if (el.stroke) {
    opts.line = { color: toHex(el.stroke), width: el.strokeWidth || 1 }
  }

  pptxSlide.addShape(pptx.ShapeType[sType], opts)

  // Add text overlay if present
  if (el.textContent) {
    pptxSlide.addText(el.textContent, {
      x: pctToInch(el.x, SLIDE_W),
      y: pctToInch(el.y, SLIDE_H),
      w: pctToInch(el.w, SLIDE_W),
      h: pctToInch(el.h, SLIDE_H),
      color: toHex(el.textColor || '#ffffff'),
      fontSize: Math.round((el.textFontSize || 16) * 0.75),
      align: 'center',
      valign: 'middle',
    })
  }
}

function addTableElement(pptxSlide: PptxGenJS.Slide, el: SlideTableElement, bodyColor: string) {
  const tableRows: PptxGenJS.TableRow[] = el.rows.map((row, ri) =>
    row.map((cell) => ({
      text: cell,
      options: {
        fontSize: 10,
        color: toHex(bodyColor),
        bold: ri === 0 && el.headerRow,
        fill: ri === 0 && el.headerRow ? { color: 'FFFFFF', transparency: 80 } : undefined,
        border: { type: 'solid' as const, pt: 0.5, color: 'FFFFFF' },
      },
    })),
  )

  pptxSlide.addTable(tableRows, {
    x: pctToInch(el.x, SLIDE_W),
    y: pctToInch(el.y, SLIDE_H),
    w: pctToInch(el.w, SLIDE_W),
    h: pctToInch(el.h, SLIDE_H),
  })
}

function addConnectorElement(pptxSlide: PptxGenJS.Slide, el: SlideConnectorElement, pptx: PptxGenJS) {
  const x1 = pctToInch(el.fromPoint.x, SLIDE_W)
  const y1 = pctToInch(el.fromPoint.y, SLIDE_H)
  const x2 = pctToInch(el.toPoint.x, SLIDE_W)
  const y2 = pctToInch(el.toPoint.y, SLIDE_H)

  // Calculate bounding box for the line
  const minX = Math.min(x1, x2)
  const minY = Math.min(y1, y2)
  const w = Math.abs(x2 - x1) || 0.01
  const h = Math.abs(y2 - y1) || 0.01

  const opts: PptxGenJS.ShapeProps = {
    x: minX,
    y: minY,
    w,
    h,
    line: { color: toHex(el.stroke), width: el.strokeWidth || 2 },
    rotate: el.rotation || 0,
  }

  // Flip direction if needed so the line connects correctly
  if (x2 < x1) opts.flipH = true
  if (y2 < y1) opts.flipV = true

  pptxSlide.addShape(pptx.ShapeType.line, opts)
}

function addVideoElement(pptxSlide: PptxGenJS.Slide, el: SlideVideoElement) {
  // PPTX cannot embed video directly in a portable way, so add a placeholder with the URL
  const displayText = el.embedType === 'youtube'
    ? `[Video] ${el.src}`
    : `[Video] ${el.src}`

  pptxSlide.addText(displayText, {
    x: pctToInch(el.x, SLIDE_W),
    y: pctToInch(el.y, SLIDE_H),
    w: pctToInch(el.w, SLIDE_W),
    h: pctToInch(el.h, SLIDE_H),
    fontSize: 12,
    color: '94A3B8',
    align: 'center',
    valign: 'middle',
    fill: { color: '1E293B' },
    shape: 'rect' as unknown as PptxGenJS.ShapeType,
    hyperlink: { url: el.src },
  })
}

function addChartElement(pptxSlide: PptxGenJS.Slide, el: SlideChartElement, pptx: PptxGenJS) {
  if (!el.data.labels.length || !el.data.datasets.length) return

  // Map our chart types to the closest pptxgenjs native chart + options so every
  // type exports (rather than being silently dropped).
  const CT = pptx.ChartType
  const extra: Record<string, unknown> = {}
  let chartType: PptxGenJS.CHART_NAME
  switch (el.chartType) {
    case 'bar':
      chartType = CT.bar; extra.barDir = 'col'; break
    case 'stackedBar':
      chartType = CT.bar; extra.barDir = 'col'; extra.barGrouping = 'stacked'; break
    case 'stackedBar100':
      chartType = CT.bar; extra.barDir = 'col'; extra.barGrouping = 'percentStacked'; break
    case 'horizontalBar':
    case 'funnel': // no native funnel — closest is a horizontal bar
    case 'waterfall': // no native waterfall — approximate with a column chart
      chartType = CT.bar; extra.barDir = el.chartType === 'waterfall' ? 'col' : 'bar'; break
    case 'line':
    case 'smoothLine':
    case 'steppedLine':
    case 'combo': // combo approximated as line (pptx combo needs multi-type config)
      chartType = CT.line; break
    case 'area':
    case 'stackedArea':
      chartType = CT.area; if (el.chartType === 'stackedArea') extra.barGrouping = 'stacked'; break
    case 'pie':
      chartType = CT.pie; break
    case 'donut':
      chartType = CT.doughnut; extra.holeSize = 50; break
    case 'scatter':
    case 'bubble':
      chartType = CT.scatter; break
    case 'radar':
      chartType = CT.radar; break
    default:
      chartType = CT.bar; extra.barDir = 'col'
  }

  const chartData = el.data.datasets.map((ds) => ({
    name: ds.label,
    labels: el.data.labels,
    values: ds.values,
  }))

  try {
    pptxSlide.addChart(chartType, chartData, {
      x: pctToInch(el.x, SLIDE_W),
      y: pctToInch(el.y, SLIDE_H),
      w: pctToInch(el.w, SLIDE_W),
      h: pctToInch(el.h, SLIDE_H),
      showTitle: !!el.title,
      title: el.title || '',
      showLegend: el.showLegend ?? false,
      showValue: el.showValues ?? false,
      ...extra,
    })
  } catch {
    // Skip charts that fail
  }
}

export async function exportSlidesToPPTX(doc: SlidesDocument): Promise<void> {
  const PptxGenJSClass = await getPptxGenJS()
  const pptx = new PptxGenJSClass()
  pptx.layout = 'LAYOUT_WIDE' // 13.33 x 7.5 - but we use custom
  pptx.defineLayout({ name: 'CUSTOM', width: SLIDE_W, height: SLIDE_H })
  pptx.layout = 'CUSTOM'
  pptx.title = doc.meta.title || 'Presentation'

  for (let slideIndex = 0; slideIndex < doc.slides.length; slideIndex++) {
    const slide = doc.slides[slideIndex]
    const baseTheme = SLIDE_THEMES[slide.themeKey]
    const theme = slide.customTheme ? { ...baseTheme, ...slide.customTheme } : baseTheme
    const bgColor = extractBgColor(theme.background)

    const pptxSlide = pptx.addSlide()

    // Background: prefer background image, fall back to color
    if (slide.backgroundImage) {
      try {
        pptxSlide.background = { data: slide.backgroundImage }
      } catch {
        pptxSlide.background = { color: bgColor }
      }
    } else {
      pptxSlide.background = { color: bgColor }
    }

    // Slide transition
    if (slide.transition && slide.transition !== 'none') {
      const transitionMap: Record<string, string> = {
        fade: 'fade',
        'slide-left': 'push',
        'slide-up': 'push',
        zoom: 'zoom',
        dissolve: 'fade',
        'wipe-left': 'wipe',
        'wipe-up': 'wipe',
        flip: 'fade',
        cube: 'fade',
      }
      const transType = transitionMap[slide.transition] || 'fade'
      ;(pptxSlide as any).transition = {
        type: transType as 'fade' | 'push' | 'wipe' | 'zoom' | 'none',
        speed: slide.transitionDuration ? (slide.transitionDuration / 1000) : undefined,
      }
    }

    // Speaker notes
    if (slide.notes) {
      pptxSlide.addNotes(slide.notes)
    }

    // Sort elements by z-index
    const sortedElements = [...slide.elements].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0))

    for (const el of sortedElements) {
      switch (el.type) {
        case 'title':
        case 'subtitle':
        case 'body':
        case 'label':
          addTextElement(pptxSlide, el as SlideTextElement, theme)
          break
        case 'image':
          addImageElement(pptxSlide, el as SlideImageElement)
          break
        case 'shape':
          addShapeElement(pptxSlide, el as SlideShapeElement, pptx)
          break
        case 'table':
          addTableElement(pptxSlide, el as SlideTableElement, theme.bodyColor)
          break
        case 'chart':
          addChartElement(pptxSlide, el as SlideChartElement, pptx)
          break
        case 'connector':
          addConnectorElement(pptxSlide, el as SlideConnectorElement, pptx)
          break
        case 'video':
          addVideoElement(pptxSlide, el as SlideVideoElement)
          break
        // audio is skipped in pptx export
      }
    }

    // Global footer
    if (doc.globalFooter) {
      const parts: string[] = []
      if (doc.globalFooter.showDate) parts.push(new Date().toLocaleDateString('ja-JP'))
      if (doc.globalFooter.text) parts.push(doc.globalFooter.text)
      if (doc.globalFooter.showSlideNumber) parts.push(`${slideIndex + 1} / ${doc.slides.length}`)
      if (parts.length) {
        pptxSlide.addText(parts.join(' | '), {
          x: 0,
          y: SLIDE_H - 0.35,
          w: SLIDE_W,
          h: 0.3,
          fontSize: 8,
          color: toHex(theme.bodyColor),
          align: 'center',
          valign: 'middle',
          transparency: 50,
        })
      }
    }
  }

  await pptx.writeFile({ fileName: `${doc.meta.title || 'presentation'}.pptx` })
}
