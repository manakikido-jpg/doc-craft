import type {
  SlidesDocument,
  DocDocument,
  SpreadsheetDocument,
  SlideElement,
  SlideTableElement,
  SlideConnectorElement,
  SlideShapeElement,
  SlideVideoElement,
  SlideChartElement,
  CellFormat,
  BlockType,
} from '@/types'
import { SLIDE_THEMES } from '../themes'
import { evaluateCell, colIndexToLetter, formatCellValue } from '../formula-engine'

const CHART_COLORS = ['#6366f1', '#f97316', '#22c55e', '#eab308', '#ec4899', '#06b6d4', '#8b5cf6', '#ef4444']

/** Heading block types in document order, and helper to map them to a 0-based outline level. */
const HEADING_TYPES: BlockType[] = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']
function headingLevel(type: BlockType): number {
  const i = HEADING_TYPES.indexOf(type)
  return i < 0 ? 0 : i
}

function renderChartSVG(chart: SlideChartElement): string {
  const { chartType, data, showLegend, showValues, title } = chart
  if (!data.labels.length || !data.datasets.length)
    return '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:12px">No data</div>'

  const padding = { top: title ? 24 : 8, right: 12, bottom: 28, left: 36 }
  const allValues = data.datasets.flatMap((d) => d.values)
  const maxVal = Math.max(...allValues, 1)
  const minVal = Math.min(0, ...allValues)
  const range = maxVal - minVal || 1

  if (chartType === 'pie' || chartType === 'donut') {
    const values = data.datasets[0]?.values || []
    const total = values.reduce((a, b) => a + b, 0) || 1
    let cumAngle = -90
    let paths = ''
    values.forEach((val, i) => {
      const angle = (val / total) * 360
      const startRad = (cumAngle * Math.PI) / 180
      const endRad = ((cumAngle + angle) * Math.PI) / 180
      cumAngle += angle
      const cx = 100,
        cy = 105,
        r = chartType === 'donut' ? 55 : 70
      const innerR = chartType === 'donut' ? 35 : 0
      const x1 = cx + r * Math.cos(startRad),
        y1 = cy + r * Math.sin(startRad)
      const x2 = cx + r * Math.cos(endRad),
        y2 = cy + r * Math.sin(endRad)
      const large = angle > 180 ? 1 : 0
      const color = CHART_COLORS[i % CHART_COLORS.length]
      if (chartType === 'donut') {
        const ix1 = cx + innerR * Math.cos(startRad),
          iy1 = cy + innerR * Math.sin(startRad)
        const ix2 = cx + innerR * Math.cos(endRad),
          iy2 = cy + innerR * Math.sin(endRad)
        paths += `<path d="M${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2} L${ix2},${iy2} A${innerR},${innerR} 0 ${large},0 ${ix1},${iy1} Z" fill="${color}" stroke="#0f172a" stroke-width="1"/>`
      } else if (values.length === 1) {
        paths += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}"/>`
      } else {
        paths += `<path d="M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2} Z" fill="${color}" stroke="#0f172a" stroke-width="1"/>`
      }
    })
    let legend = ''
    if (showLegend) {
      data.labels.forEach((label, i) => {
        legend += `<rect x="10" y="${180 - (data.labels.length - i - 1) * 12}" width="8" height="8" rx="1" fill="${CHART_COLORS[i % CHART_COLORS.length]}"/>`
        legend += `<text x="22" y="${187 - (data.labels.length - i - 1) * 12}" fill="#94a3b8" font-size="7">${escapeHtml(label)}</text>`
      })
    }
    return `<svg viewBox="0 0 200 200" style="width:100%;height:100%">${title ? `<text x="100" y="16" text-anchor="middle" fill="#cbd5e1" font-size="10" font-weight="600">${escapeHtml(title)}</text>` : ''}${paths}${legend}</svg>`
  }

  const chartW = 200 - padding.left - padding.right
  const chartH = 200 - padding.top - padding.bottom
  const barGroupW = chartW / data.labels.length
  const barW = barGroupW / (data.datasets.length + 0.5)
  let svg = ''
  if (title)
    svg += `<text x="100" y="14" text-anchor="middle" fill="#cbd5e1" font-size="10" font-weight="600">${escapeHtml(title)}</text>`
  ;[0, 0.25, 0.5, 0.75, 1].forEach((t) => {
    const y = padding.top + chartH * (1 - t)
    const val = minVal + range * t
    svg += `<line x1="${padding.left}" y1="${y}" x2="${padding.left + chartW}" y2="${y}" stroke="#334155" stroke-width="0.5"/>`
    svg += `<text x="${padding.left - 3}" y="${y + 3}" text-anchor="end" fill="#64748b" font-size="6">${Math.round(val)}</text>`
  })
  data.labels.forEach((label, i) => {
    svg += `<text x="${padding.left + barGroupW * i + barGroupW / 2}" y="${200 - padding.bottom + 12}" text-anchor="middle" fill="#94a3b8" font-size="6">${escapeHtml(label.length > 6 ? label.slice(0, 6) + '..' : label)}</text>`
  })
  data.datasets.forEach((ds, di) => {
    const color = ds.color || CHART_COLORS[di % CHART_COLORS.length]
    if (chartType === 'line') {
      const points = ds.values
        .map(
          (v, i) =>
            `${padding.left + barGroupW * i + barGroupW / 2},${padding.top + chartH * (1 - (v - minVal) / range)}`,
        )
        .join(' ')
      svg += `<polyline points="${points}" fill="none" stroke="${color}" stroke-width="2"/>`
      ds.values.forEach((v, i) => {
        svg += `<circle cx="${padding.left + barGroupW * i + barGroupW / 2}" cy="${padding.top + chartH * (1 - (v - minVal) / range)}" r="3" fill="${color}"/>`
      })
    } else {
      ds.values.forEach((v, i) => {
        const x = padding.left + barGroupW * i + barW * di + barGroupW * 0.15
        const h = chartH * ((v - minVal) / range)
        const y = padding.top + chartH - h
        svg += `<rect x="${x}" y="${y}" width="${barW * 0.85}" height="${h}" fill="${color}" rx="1"/>`
        if (showValues)
          svg += `<text x="${x + barW * 0.42}" y="${y - 2}" text-anchor="middle" fill="#94a3b8" font-size="5">${v}</text>`
      })
    }
  })
  if (showLegend && data.datasets.length > 1) {
    data.datasets.forEach((ds, i) => {
      svg += `<rect x="${padding.left + i * 50}" y="${padding.top - 10}" width="6" height="6" rx="1" fill="${ds.color || CHART_COLORS[i % CHART_COLORS.length]}"/>`
      svg += `<text x="${padding.left + i * 50 + 9}" y="${padding.top - 5}" fill="#94a3b8" font-size="6">${escapeHtml(ds.label)}</text>`
    })
  }
  return `<svg viewBox="0 0 200 200" style="width:100%;height:100%">${svg}</svg>`
}

export function exportSlidesToHTML(doc: SlidesDocument): string {
  const slides = doc.slides
    .map((slide, i) => {
      const baseTheme = SLIDE_THEMES[slide.themeKey]
      const theme = slide.customTheme ? { ...baseTheme, ...slide.customTheme } : baseTheme

      const sortedElements = [...slide.elements].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0))
      const shapePathMap: Record<string, string> = {
        rect: '<rect x="0" y="0" width="100" height="100" rx="4" />',
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

      function getElTransform(el: SlideElement): string {
        const parts: string[] = []
        if ('rotation' in el && el.rotation) parts.push(`rotate(${el.rotation}deg)`)
        if ('flipH' in el && el.flipH) parts.push('scaleX(-1)')
        if ('flipV' in el && el.flipV) parts.push('scaleY(-1)')
        return parts.length ? `transform:${parts.join(' ')};` : ''
      }

      function getElFilter(el: SlideElement): string {
        const parts: string[] = []
        if ('opacity' in el && el.opacity != null && el.opacity < 100) parts.push(`opacity:${el.opacity / 100};`)
        if ('shadow' in el && el.shadow)
          parts.push(
            `filter:drop-shadow(${el.shadow.offsetX}px ${el.shadow.offsetY}px ${el.shadow.blur}px ${el.shadow.color});`,
          )
        return parts.join('')
      }

      const elements = sortedElements
        .map((el) => {
          const trans = getElTransform(el)
          const filter = getElFilter(el)
          const zIndex = el.zIndex ? `z-index:${el.zIndex};` : ''

          if (el.type === 'connector') {
            const conn = el as SlideConnectorElement
            return `<svg style="position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;${zIndex}">
          ${conn.arrowHead ? `<defs><marker id="a${conn.id}" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto"><polygon points="0 0,10 3.5,0 7" fill="${conn.stroke}"/></marker></defs>` : ''}
          <line x1="${conn.fromPoint.x}%" y1="${conn.fromPoint.y}%" x2="${conn.toPoint.x}%" y2="${conn.toPoint.y}%" stroke="${conn.stroke}" stroke-width="${conn.strokeWidth || 2}"${conn.arrowHead ? ` marker-end="url(#a${conn.id})"` : ''}/>
        </svg>`
          }

          if (el.type === 'table') {
            const tableEl = el as SlideTableElement
            const rows = tableEl.rows
              .map(
                (r, ri) =>
                  `<tr>${r.map((c) => (ri === 0 && tableEl.headerRow ? `<th style="border:1px solid rgba(255,255,255,0.2);padding:4px 8px;font-weight:600;background:rgba(255,255,255,0.1)">${escapeHtml(c)}</th>` : `<td style="border:1px solid rgba(255,255,255,0.2);padding:4px 8px">${escapeHtml(c)}</td>`)).join('')}</tr>`,
              )
              .join('')
            return `<div style="position:absolute;left:${el.x}%;top:${el.y}%;width:${el.w}%;height:${el.h}%;${trans}${filter}${zIndex}color:${theme.bodyColor}"><table style="width:100%;height:100%;border-collapse:collapse;font-size:14px">${rows}</table></div>`
          }

          if (el.type === 'image') {
            const imgFilters: string[] = []
            if (el.brightness != null && el.brightness !== 100) imgFilters.push(`brightness(${el.brightness}%)`)
            if (el.contrast != null && el.contrast !== 100) imgFilters.push(`contrast(${el.contrast}%)`)
            if (el.blur) imgFilters.push(`blur(${el.blur}px)`)
            const imgFilter = imgFilters.length ? `filter:${imgFilters.join(' ')};` : ''
            return `<div style="position:absolute;left:${el.x}%;top:${el.y}%;width:${el.w}%;height:${el.h}%;${trans}${filter}${zIndex}"><img src="${el.src}" style="width:100%;height:100%;object-fit:contain;${imgFilter}" /></div>`
          }

          if (el.type === 'shape') {
            const s = el as SlideShapeElement
            if (s.shape === 'line') {
              const dash =
                s.strokeDash === 'dashed'
                  ? ' stroke-dasharray="8,4"'
                  : s.strokeDash === 'dotted'
                    ? ' stroke-dasharray="2,3"'
                    : ''
              return `<div style="position:absolute;left:${el.x}%;top:${el.y}%;width:${el.w}%;height:${el.h}%;${trans}${filter}${zIndex}"><svg viewBox="0 0 100 100" style="width:100%;height:100%" preserveAspectRatio="none"><line x1="0" y1="50" x2="100" y2="50" stroke="${s.fill}" stroke-width="${s.strokeWidth || 4}"${dash}/></svg></div>`
            }
            const path = shapePathMap[s.shape] || shapePathMap.rect
            const gradDef = s.gradientFill
              ? `<defs><linearGradient id="g${el.id}" gradientTransform="rotate(${s.gradientFill.angle})"><stop offset="0%" stop-color="${s.gradientFill.color1}"/><stop offset="100%" stop-color="${s.gradientFill.color2}"/></linearGradient></defs>`
              : ''
            const fill = s.gradientFill ? `url(#g${el.id})` : s.fill
            const stroke = s.stroke ? ` stroke="${s.stroke}" stroke-width="${s.strokeWidth || 2}"` : ''
            const dash =
              s.strokeDash === 'dashed'
                ? ' stroke-dasharray="8,4"'
                : s.strokeDash === 'dotted'
                  ? ' stroke-dasharray="2,3"'
                  : ''
            const svgInner = path.replace('/>', ` fill="${fill}"${stroke}${dash}/>`)
            const textOverlay = s.textContent
              ? `<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:${s.textColor || '#fff'};font-size:${s.textFontSize || 16}px;text-align:center;padding:8%">${escapeHtml(s.textContent)}</div>`
              : ''
            return `<div style="position:absolute;left:${el.x}%;top:${el.y}%;width:${el.w}%;height:${el.h}%;${trans}${filter}${zIndex}"><svg viewBox="0 0 100 100" style="width:100%;height:100%" preserveAspectRatio="none">${gradDef}${svgInner}</svg>${textOverlay}</div>`
          }

          if (el.type === 'video') {
            const v = el as SlideVideoElement
            const content =
              v.embedType === 'youtube'
                ? `<iframe src="${v.src}" style="width:100%;height:100%;border:none" allow="autoplay;encrypted-media" allowfullscreen></iframe>`
                : `<video src="${v.src}" style="width:100%;height:100%" controls${v.autoplay ? ' autoplay' : ''}></video>`
            return `<div style="position:absolute;left:${el.x}%;top:${el.y}%;width:${el.w}%;height:${el.h}%;${trans}${filter}${zIndex}">${content}</div>`
          }

          if (el.type === 'audio') {
            return `<div style="position:absolute;left:${el.x}%;top:${el.y}%;width:${el.w}%;height:${el.h}%;${filter}${zIndex}"><audio src="${el.src}" controls style="width:100%"></audio></div>`
          }

          if (el.type === 'chart') {
            const ch = el as SlideChartElement
            return `<div style="position:absolute;left:${el.x}%;top:${el.y}%;width:${el.w}%;height:${el.h}%;${trans}${filter}${zIndex}">${renderChartSVG(ch)}</div>`
          }

          const color = el.color || (el.type === 'title' ? theme.titleColor : theme.bodyColor)
          const letterSp = el.letterSpacing ? `letter-spacing:${el.letterSpacing}em;` : ''
          const lineH = el.lineHeight ? `line-height:${el.lineHeight};` : 'line-height:1.3;'
          const txtShadow = el.textShadow ? 'text-shadow:2px 2px 4px rgba(0,0,0,0.5);' : ''
          return `<div style="position:absolute;left:${el.x}%;top:${el.y}%;width:${el.w}%;color:${color};font-size:${el.fontSize}px;font-weight:${el.fontWeight};text-align:${el.align};${lineH}white-space:pre-wrap;${el.fontFamily ? `font-family:${el.fontFamily};` : ''}${letterSp}${txtShadow}${trans}${filter}${zIndex}">${escapeHtml(el.content)}</div>`
        })
        .join('\n')

      let bgStyle = `background:${theme.background};`
      if (slide.backgroundImage) {
        bgStyle += `background-image:url(${slide.backgroundImage});background-size:${slide.backgroundFit === 'stretch' ? '100% 100%' : slide.backgroundFit || 'cover'};background-position:center;background-repeat:no-repeat;`
      }

      // Footer
      let footer = ''
      if (doc.globalFooter) {
        const parts: string[] = []
        if (doc.globalFooter.showDate) parts.push(new Date().toLocaleDateString('ja-JP'))
        if (doc.globalFooter.text) parts.push(escapeHtml(doc.globalFooter.text))
        if (doc.globalFooter.showSlideNumber) parts.push(`${i + 1} / ${doc.slides.length}`)
        if (parts.length) {
          footer = `<div style="position:absolute;bottom:8px;left:0;right:0;text-align:center;font-size:11px;color:${theme.bodyColor};opacity:0.5">${parts.join(' | ')}</div>`
        }
      }

      // Notes for print
      const notesHtml = slide.notes
        ? `<div class="slide-notes" style="display:none;page-break-before:avoid;padding:12px 20px;font-size:12px;color:#475569;border-top:1px solid #e2e8f0;max-width:960px;margin:0 auto"><strong>ノート:</strong> ${escapeHtml(slide.notes)}</div>`
        : ''

      return `<div class="slide" style="${bgStyle}width:960px;height:540px;position:relative;page-break-after:always;margin:0 auto 20px;border-radius:8px;overflow:hidden">${elements}${footer}</div>${notesHtml}`
    })
    .join('\n')

  return `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<title>${escapeHtml(doc.meta.title)}</title>
<style>
  body { margin:0; padding:20px; background:#0f172a; font-family:system-ui,-apple-system,sans-serif }
  .slide-notes { display: none; }
  @media print {
    body{background:white;padding:0}
    .slide{margin:0!important;border-radius:0!important;page-break-after:always}
    .slide-notes{display:block!important;page-break-inside:avoid}
  }
</style>
</head><body>${slides}</body></html>`
}

export function exportDocToHTML(doc: DocDocument): string {
  let footnoteCount = 0
  const content = doc.blocks
    .map((b) => {
      const indent = b.indent ? `margin-left:${b.indent * 2}em;` : ''
      const lineHeight = b.lineSpacing ? `line-height:${b.lineSpacing * 1.4};` : ''
      const cols = b.columns && b.columns > 1 ? `column-count:${b.columns};` : ''
      const align = b.align ? `text-align:${b.align};` : ''
      const textColor = b.textColor ? `color:${b.textColor};` : ''
      const bgColor = b.bgColor ? `background:${b.bgColor};padding:2px 6px;border-radius:4px;` : ''
      const borderDeco =
        b.borderStyle && b.borderStyle !== 'none'
          ? `border:${b.borderWidth || 1}px ${b.borderStyle} ${b.borderColor || '#475569'};padding:8px 12px;border-radius:4px;`
          : ''
      const dropCap = b.dropCap ? '--drop-cap:1;' : ''
      const allStyles = [indent, lineHeight, cols, align, textColor, bgColor, borderDeco, dropCap]
        .filter(Boolean)
        .join('')
      const style = allStyles ? ` style="${allStyles}"` : ''

      switch (b.type) {
        case 'h1':
          return `<h1 id="heading-${b.id}"${style}>${safeContent(b.content)}</h1>`
        case 'h2':
          return `<h2 id="heading-${b.id}"${style}>${safeContent(b.content)}</h2>`
        case 'h3':
          return `<h3 id="heading-${b.id}"${style}>${safeContent(b.content)}</h3>`
        case 'h4':
          return `<h4 id="heading-${b.id}"${style}>${safeContent(b.content)}</h4>`
        case 'h5':
          return `<h5 id="heading-${b.id}"${style}>${safeContent(b.content)}</h5>`
        case 'h6':
          return `<h6 id="heading-${b.id}"${style}>${safeContent(b.content)}</h6>`
        case 'paragraph':
          return `<p${style}>${safeContent(b.content)}</p>`
        case 'bullet':
          return `<ul${style}><li>${safeContent(b.content)}</li></ul>`
        case 'numbered':
          return `<ol${style}><li>${safeContent(b.content)}</li></ol>`
        case 'quote':
          return `<blockquote${style}>${safeContent(b.content)}</blockquote>`
        case 'divider':
          return `<hr />`
        case 'page-break':
          return `<div style="page-break-before:always"></div>`
        case 'toc': {
          const headings = doc.blocks.filter((h) => HEADING_TYPES.includes(h.type))
          if (headings.length === 0) return '<div style="color:#94a3b8;font-style:italic">目次（見出しがありません）</div>'
          const tocItems = headings.map((h) => {
            const level = headingLevel(h.type)
            const text = h.content.replace(/<[^>]+>/g, '') || '無題'
            const slug = `heading-${h.id}`
            return `<div style="margin-left:${level * 1.5}em;padding:2px 0"><a href="#${slug}" style="color:#6366f1;text-decoration:none">${escapeHtml(text)}</a></div>`
          }).join('')
          return `<nav style="margin:1.5em 0;padding:16px 20px;border:1px solid #e2e8f0;border-radius:8px"><div style="font-weight:600;margin-bottom:8px;font-size:1.1em">目次</div>${tocItems}</nav>`
        }
        case 'image': {
          if (!b.data?.src) return ''
          const imgAlign = b.data?.imageAlign || 'left'
          const imgW = b.data?.width ? `width:${b.data.width};` : ''
          const alignStyle =
            imgAlign === 'center' ? 'text-align:center;' : imgAlign === 'right' ? 'text-align:right;' : ''
          const caption = b.data?.caption
            ? `<figcaption style="text-align:center;font-size:0.85em;color:#64748b;margin-top:4px">${escapeHtml(b.data.caption)}</figcaption>`
            : ''
          return `<figure style="margin:1em 0;${alignStyle}"><img src="${b.data.src}" alt="${escapeHtml(b.data?.alt || '')}" style="max-width:100%;border-radius:8px;${imgW}" />${caption}</figure>`
        }
        case 'code':
          return `<pre style="background:#1e293b;color:#6ee7b7;padding:16px;border-radius:8px;overflow-x:auto;font-family:monospace"><code>${safeContent(b.content)}</code></pre>`
        case 'callout': {
          const colors: Record<string, string> = {
            info: '#3b82f6',
            warning: '#f59e0b',
            success: '#10b981',
            error: '#ef4444',
          }
          const icons: Record<string, string> = { info: 'ℹ️', warning: '⚠️', success: '✅', error: '❌' }
          const v = b.calloutVariant || 'info'
          return `<div style="border-left:4px solid ${colors[v]};background:${colors[v]}10;padding:12px 16px;border-radius:4px;margin:1em 0">${icons[v]} ${safeContent(b.content)}</div>`
        }
        case 'checklist':
          return `<div style="display:flex;align-items:center;gap:8px;margin:4px 0"><input type="checkbox"${b.checked ? ' checked' : ''} disabled /><span${b.checked ? ' style="text-decoration:line-through;color:#94a3b8"' : ''}>${safeContent(b.content)}</span></div>`
        case 'footnote': {
          footnoteCount++
          return `<div style="font-size:0.85em;color:#64748b;border-left:2px solid #475569;padding-left:12px;margin:8px 0"><sup>[${footnoteCount}]</sup> ${safeContent(b.content)}</div>`
        }
        case 'math':
          return `<div style="text-align:center;font-size:1.3em;font-family:serif;margin:1em 0;padding:8px">${safeContent(b.content)}</div>`
        case 'table': {
          try {
            const rows: string[][] = JSON.parse(b.data?.tableData || '[]')
            const hasHeader = b.data?.hasHeader !== 'false'
            const borderStyle = b.data?.borderStyle || 'solid'
            const border = borderStyle === 'none' ? 'border:none' : `border:1px ${borderStyle} #e2e8f0`
            let cellStyles: Record<string, { bgColor?: string; bold?: boolean; italic?: boolean }> = {}
            try {
              cellStyles = b.data?.cellStyles ? JSON.parse(b.data.cellStyles) : {}
            } catch (e) { console.warn('Failed to parse cellStyles JSON:', e) }
            type MergedCell = { startRow: number; startCol: number; rowSpan: number; colSpan: number }
            let merges: MergedCell[] = []
            try {
              merges = b.data?.mergedCells ? JSON.parse(b.data.mergedCells) : []
            } catch (e) { console.warn('Failed to parse mergedCells JSON:', e) }
            const isMergeHidden = (r: number, c: number) =>
              merges.some((m) => {
                if (r === m.startRow && c === m.startCol) return false
                return r >= m.startRow && r < m.startRow + m.rowSpan && c >= m.startCol && c < m.startCol + m.colSpan
              })
            const getMerge = (r: number, c: number) => merges.find((m) => m.startRow === r && m.startCol === c)
            const html = rows
              .map(
                (r, ri) =>
                  `<tr>${r
                    .map((c, ci) => {
                      if (isMergeHidden(ri, ci)) return ''
                      const cs = cellStyles[`${ri}-${ci}`]
                      const bg = cs?.bgColor
                        ? `background:${cs.bgColor};`
                        : hasHeader && ri === 0
                          ? 'background:#f1f5f9;'
                          : ''
                      const fw = cs?.bold ? 'font-weight:bold;' : ''
                      const fi = cs?.italic ? 'font-style:italic;' : ''
                      const tag = hasHeader && ri === 0 ? 'th' : 'td'
                      const m = getMerge(ri, ci)
                      const span = m
                        ? `${m.rowSpan > 1 ? ` rowspan="${m.rowSpan}"` : ''}${m.colSpan > 1 ? ` colspan="${m.colSpan}"` : ''}`
                        : ''
                      return `<${tag}${span} style="${border};padding:8px 12px;${bg}${fw}${fi}">${escapeHtml(c)}</${tag}>`
                    })
                    .join('')}</tr>`,
              )
              .join('')
            return `<table style="width:100%;border-collapse:collapse;margin:1em 0;${border}">${html}</table>`
          } catch {
            return ''
          }
        }
        case 'textbox': {
          const tbBorder = b.data?.border || '1px solid #cbd5e1'
          const tbBg = b.data?.bg || 'transparent'
          const tbRadius = b.data?.radius || '8px'
          const tbShadow = b.data?.shadow || 'none'
          const tbPadding = b.data?.padding || '16px'
          return `<div style="border:${tbBorder};background:${tbBg};border-radius:${tbRadius};box-shadow:${tbShadow};padding:${tbPadding};margin:1em 0;${b.data?.extra || ''}">${safeContent(b.content)}</div>`
        }
        case 'columns': {
          try {
            const cols: string[] = JSON.parse(b.content)
            return `<div style="display:flex;gap:24px;margin:1em 0">${cols.map((c) => `<div style="flex:1">${safeContent(c)}</div>`).join('')}</div>`
          } catch {
            return ''
          }
        }
        case 'signature':
          return `<div style="max-width:300px;margin:2em 0;border-top:2px solid #334155;padding-top:12px"><div style="height:48px;border-bottom:1px dashed #475569;margin-bottom:8px"></div><div style="font-weight:500">${escapeHtml(b.data?.name || '')}</div><div style="font-size:0.85em;color:#64748b">${escapeHtml(b.data?.title || '')}</div><div style="font-size:0.85em;color:#64748b">${escapeHtml(b.data?.company || '')}</div><div style="font-size:0.8em;color:#94a3b8;margin-top:4px">${escapeHtml(b.data?.date || '')}</div></div>`
        case 'cover-page':
          return `<div style="page-break-after:always;min-height:80vh;display:flex;flex-direction:column;justify-content:center;padding:3em"><div style="width:64px;height:4px;background:#6366f1;border-radius:2px;margin-bottom:2em"></div><h1 style="font-size:2.5em;margin:0 0 0.3em">${escapeHtml(b.data?.coverTitle || '')}</h1><p style="font-size:1.3em;color:#64748b;margin:0 0 3em">${escapeHtml(b.data?.coverSubtitle || '')}</p><div style="margin-top:auto;padding-top:2em;border-top:1px solid #e2e8f0"><div style="font-weight:500">${escapeHtml(b.data?.coverAuthor || '')}</div><div style="font-size:0.85em;color:#64748b">${escapeHtml(b.data?.coverOrg || '')}</div><div style="font-size:0.85em;color:#94a3b8">${escapeHtml(b.data?.coverDate || '')}</div></div></div>`
        case 'drawing': {
          if (!b.strokes || b.strokes.length === 0) return '<div style="text-align:center;padding:2em;color:#94a3b8">[描画コンテンツ]</div>'
          const paths = b.strokes.map((s) => {
            if (s.points.length < 2) return ''
            if (s.tool === 'rect') {
              const x = Math.min(s.points[0].x, s.points[1].x)
              const y = Math.min(s.points[0].y, s.points[1].y)
              const w = Math.abs(s.points[1].x - s.points[0].x)
              const h = Math.abs(s.points[1].y - s.points[0].y)
              return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${s.fill || 'none'}" stroke="${s.color}" stroke-width="${s.width}"/>`
            }
            if (s.tool === 'circle') {
              const cx = (s.points[0].x + s.points[1].x) / 2
              const cy = (s.points[0].y + s.points[1].y) / 2
              const rx = Math.abs(s.points[1].x - s.points[0].x) / 2
              const ry = Math.abs(s.points[1].y - s.points[0].y) / 2
              return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${s.fill || 'none'}" stroke="${s.color}" stroke-width="${s.width}"/>`
            }
            const d = s.points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
            const marker = s.tool === 'arrow' ? ' marker-end="url(#arrowhead)"' : ''
            return `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="${s.width}" stroke-linecap="round" stroke-linejoin="round"${marker}/>`
          }).join('')
          return `<div style="margin:1em 0"><svg viewBox="0 0 800 400" style="width:100%;max-height:400px;border:1px solid #e2e8f0;border-radius:8px;background:#fafafa"><defs><marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto"><polygon points="0 0,10 3.5,0 7" fill="#334155"/></marker></defs>${paths}</svg></div>`
        }
        default:
          return `<p${style}>${safeContent(b.content)}</p>`
      }
    })
    .join('\n')

  let pageCSS = ''
  if (doc.pageSettings) {
    const ps = doc.pageSettings
    pageCSS = `@page { size: ${ps.size} ${ps.orientation}; margin: ${ps.marginTop}mm ${ps.marginRight}mm ${ps.marginBottom}mm ${ps.marginLeft}mm; }`
  }

  let headerFooterCSS = ''
  if (doc.headerFooter?.showPageNumbers) {
    headerFooterCSS = `@page { @bottom-${doc.headerFooter.pageNumberPosition || 'center'} { content: counter(page); } }`
  }

  let watermarkCSS = ''
  if (doc.watermark?.text) {
    const safeWatermark = doc.watermark.text.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/</g, '\\3c ').replace(/>/g, '\\3e ')
    watermarkCSS = `body::before{content:"${safeWatermark}";position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) rotate(${doc.watermark.rotation}deg);font-size:${doc.watermark.fontSize}px;opacity:${doc.watermark.opacity / 100};color:${doc.watermark.color};font-weight:bold;pointer-events:none;z-index:9999;white-space:nowrap}`
  }

  return `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<title>${escapeHtml(doc.meta.title)}</title>
<style>
  ${pageCSS}
  ${headerFooterCSS}
  ${watermarkCSS}
  body{max-width:720px;margin:40px auto;padding:0 20px;font-family:system-ui,-apple-system,sans-serif;color:#1e293b;line-height:1.7;position:relative}
  h1{font-size:2.2em;margin:1.5em 0 0.5em} h2{font-size:1.6em;margin:1.2em 0 0.4em} h3{font-size:1.3em;margin:1em 0 0.3em}
  h4{font-size:1.1em;font-weight:bold;margin:1em 0 0.3em} h5{font-size:1em;font-weight:bold;margin:0.8em 0 0.2em} h6{font-size:0.9em;font-weight:bold;text-transform:uppercase;letter-spacing:0.03em;margin:0.8em 0 0.2em}
  p{margin:0.6em 0} ul,ol{margin:0.5em 0;padding-left:1.5em}
  blockquote{border-left:4px solid #6366f1;margin:1em 0;padding:0.5em 1em;color:#64748b;font-style:italic}
  hr{border:none;border-top:1px solid #e2e8f0;margin:2em 0}
  table{border-collapse:collapse} th,td{border:1px solid #e2e8f0;padding:8px 12px;text-align:left} th{background:#f1f5f9;font-weight:600}
  pre{font-family:monospace} code{color:#10b981}
  @media print{body{max-width:100%}}
</style>
</head><body>
<h1>${escapeHtml(doc.meta.title)}</h1>
${content}
</body></html>`
}

export function downloadFile(content: string, filename: string, type = 'text/html') {
  try {
    const blob = new Blob([content], { type })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error('[Export] Download failed:', error)
    throw new Error('ファイルのダウンロードに失敗しました。もう一度お試しください。')
  }
}

/**
 * Print-to-PDF via hidden iframe.
 * The browser's native print engine handles fonts (including CJK) perfectly.
 * html2canvas cannot reliably render Japanese text — it produces garbled output.
 */
function printViaIframe(html: string): Promise<void> {
  return new Promise((resolve) => {
    const iframe = document.createElement('iframe')
    iframe.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;border:none;visibility:hidden;'
    document.body.appendChild(iframe)

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
    if (!iframeDoc) {
      document.body.removeChild(iframe)
      resolve()
      return
    }

    iframeDoc.open()
    iframeDoc.write(html)
    iframeDoc.close()

    // Wait for content (including images) to load, then print
    const onReady = () => {
      setTimeout(() => {
        iframe.contentWindow?.print()
        // Clean up after print dialog closes
        setTimeout(() => {
          document.body.removeChild(iframe)
          resolve()
        }, 500)
      }, 300)
    }

    iframe.onload = onReady
  })
}

export async function exportDocToPDF(doc: DocDocument): Promise<void> {
  try {
    // Build a clean, print-styled offscreen container from the document blocks.
    const container = document.createElement('div')
    container.style.cssText =
      'width:170mm;margin:0 auto;font-family:system-ui,-apple-system,sans-serif;color:#1e293b;line-height:1.7;font-size:12pt;'
    container.innerHTML = `<h1 style="font-size:2em;margin:0 0 0.6em;color:#1e293b">${escapeHtml(
      doc.meta.title || 'document',
    )}</h1>${buildDocContentHTML(doc)}`

    // Respect page-setting margins if present, otherwise sensible A4 defaults (mm).
    const ps = doc.pageSettings
    const margin: [number, number, number, number] = ps
      ? [ps.marginTop, ps.marginRight, ps.marginBottom, ps.marginLeft]
      : [15, 15, 15, 15]

    const html2pdf = (await import('html2pdf.js')).default
    await html2pdf()
      .set({
        margin,
        filename: `${doc.meta.title || 'document'}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      })
      .from(container)
      .save()
  } catch (error) {
    console.error('[Export] PDF export failed:', error)
    throw new Error('PDFエクスポートに失敗しました。もう一度お試しください。')
  }
}

/** Build inner HTML content for PDF rendering (shared helper) */
function buildDocContentHTML(doc: DocDocument): string {
  let footnoteCount = 0
  return doc.blocks
    .map((b) => {
      const indent = b.indent ? `margin-left:${b.indent * 2}em;` : ''
      const lineHeight = b.lineSpacing ? `line-height:${b.lineSpacing * 1.4};` : ''
      const align = b.align ? `text-align:${b.align};` : ''
      const textColor = b.textColor ? `color:${b.textColor};` : ''
      const bgColor = b.bgColor ? `background:${b.bgColor};padding:2px 6px;border-radius:4px;` : ''
      const borderDeco =
        b.borderStyle && b.borderStyle !== 'none'
          ? `border:${b.borderWidth || 1}px ${b.borderStyle} ${b.borderColor || '#475569'};padding:8px 12px;border-radius:4px;`
          : ''
      const allStyles = [indent, lineHeight, align, textColor, bgColor, borderDeco].filter(Boolean).join('')
      const style = allStyles ? ` style="${allStyles}"` : ''

      switch (b.type) {
        case 'h1':
          return `<h1 style="font-size:1.8em;margin:1em 0 0.4em;color:#1e293b;${allStyles}">${safeContent(b.content)}</h1>`
        case 'h2':
          return `<h2 style="font-size:1.4em;margin:0.8em 0 0.3em;color:#1e293b;${allStyles}">${safeContent(b.content)}</h2>`
        case 'h3':
          return `<h3 style="font-size:1.2em;margin:0.6em 0 0.2em;color:#1e293b;${allStyles}">${safeContent(b.content)}</h3>`
        case 'h4':
          return `<h4 style="font-size:1.1em;font-weight:bold;margin:0.6em 0 0.2em;color:#1e293b;${allStyles}">${safeContent(b.content)}</h4>`
        case 'h5':
          return `<h5 style="font-size:1em;font-weight:bold;margin:0.5em 0 0.2em;color:#1e293b;${allStyles}">${safeContent(b.content)}</h5>`
        case 'h6':
          return `<h6 style="font-size:0.9em;font-weight:bold;text-transform:uppercase;letter-spacing:0.03em;margin:0.5em 0 0.2em;color:#334155;${allStyles}">${safeContent(b.content)}</h6>`
        case 'paragraph':
          return `<p style="margin:0.5em 0;color:#334155;${allStyles}">${safeContent(b.content)}</p>`
        case 'bullet':
          return `<ul style="margin:0.3em 0;padding-left:1.5em;${allStyles}"><li>${safeContent(b.content)}</li></ul>`
        case 'numbered':
          return `<ol style="margin:0.3em 0;padding-left:1.5em;${allStyles}"><li>${safeContent(b.content)}</li></ol>`
        case 'quote':
          return `<blockquote style="border-left:4px solid #6366f1;margin:0.8em 0;padding:0.5em 1em;color:#64748b;font-style:italic;${allStyles}">${safeContent(b.content)}</blockquote>`
        case 'divider':
          return `<hr style="border:none;border-top:1px solid #e2e8f0;margin:1.5em 0" />`
        case 'page-break':
          return `<div style="page-break-before:always"></div>`
        case 'toc':
          return ''
        case 'image': {
          if (!b.data?.src) return ''
          const imgAlign = b.data?.imageAlign || 'left'
          const imgW = b.data?.width ? `width:${b.data.width};` : 'max-width:100%;'
          const alignStyle =
            imgAlign === 'center' ? 'text-align:center;' : imgAlign === 'right' ? 'text-align:right;' : ''
          const caption = b.data?.caption
            ? `<figcaption style="text-align:center;font-size:0.85em;color:#64748b;margin-top:4px">${escapeHtml(b.data.caption)}</figcaption>`
            : ''
          return `<figure style="margin:1em 0;${alignStyle}"><img src="${b.data.src}" alt="${escapeHtml(b.data?.alt || '')}" style="${imgW}max-height:400px;border-radius:4px;" />${caption}</figure>`
        }
        case 'code':
          return `<pre style="background:#f1f5f9;color:#1e293b;padding:12px;border-radius:6px;overflow-x:auto;font-family:monospace;font-size:0.85em;border:1px solid #e2e8f0"><code>${safeContent(b.content)}</code></pre>`
        case 'callout': {
          const colors: Record<string, string> = { info: '#3b82f6', warning: '#f59e0b', success: '#10b981', error: '#ef4444' }
          const icons: Record<string, string> = { info: 'ℹ️', warning: '⚠️', success: '✅', error: '❌' }
          const v = b.calloutVariant || 'info'
          return `<div style="border-left:4px solid ${colors[v]};background:${colors[v]}10;padding:10px 14px;border-radius:4px;margin:0.8em 0">${icons[v]} ${safeContent(b.content)}</div>`
        }
        case 'checklist':
          return `<div style="display:flex;align-items:center;gap:6px;margin:3px 0"><span style="font-size:1.1em">${b.checked ? '☑' : '☐'}</span><span${b.checked ? ' style="text-decoration:line-through;color:#94a3b8"' : ''}>${safeContent(b.content)}</span></div>`
        case 'footnote': {
          footnoteCount++
          return `<div style="font-size:0.85em;color:#64748b;border-left:2px solid #475569;padding-left:12px;margin:8px 0"><sup>[${footnoteCount}]</sup> ${safeContent(b.content)}</div>`
        }
        case 'math':
          return `<div style="text-align:center;font-size:1.3em;font-family:serif;margin:1em 0;padding:8px">${safeContent(b.content)}</div>`
        case 'table': {
          try {
            const rows: string[][] = JSON.parse(b.data?.tableData || '[]')
            const hasHeader = b.data?.hasHeader !== 'false'
            const html = rows
              .map(
                (r, ri) =>
                  `<tr>${r.map((c, ci) => {
                    const tag = hasHeader && ri === 0 ? 'th' : 'td'
                    const bg = hasHeader && ri === 0 ? 'background:#f1f5f9;font-weight:600;' : ''
                    return `<${tag} style="border:1px solid #e2e8f0;padding:6px 10px;${bg}">${escapeHtml(c)}</${tag}>`
                  }).join('')}</tr>`,
              )
              .join('')
            return `<table style="width:100%;border-collapse:collapse;margin:0.8em 0;font-size:0.9em">${html}</table>`
          } catch {
            return ''
          }
        }
        case 'cover-page':
          return `<div style="page-break-after:always;min-height:60vh;display:flex;flex-direction:column;justify-content:center;padding:2em 0"><div style="width:64px;height:4px;background:#6366f1;border-radius:2px;margin-bottom:2em"></div><h1 style="font-size:2.5em;margin:0 0 0.3em;color:#1e293b">${escapeHtml(b.data?.coverTitle || '')}</h1><p style="font-size:1.3em;color:#64748b;margin:0 0 2em">${escapeHtml(b.data?.coverSubtitle || '')}</p><div style="margin-top:auto;padding-top:2em;border-top:1px solid #e2e8f0"><div style="font-weight:500">${escapeHtml(b.data?.coverAuthor || '')}</div><div style="font-size:0.85em;color:#64748b">${escapeHtml(b.data?.coverOrg || '')}</div><div style="font-size:0.85em;color:#94a3b8">${escapeHtml(b.data?.coverDate || '')}</div></div></div>`
        case 'signature':
          return `<div style="max-width:300px;margin:2em 0;border-top:2px solid #334155;padding-top:12px"><div style="height:48px;border-bottom:1px dashed #94a3b8;margin-bottom:8px"></div><div style="font-weight:500">${escapeHtml(b.data?.name || '')}</div><div style="font-size:0.85em;color:#64748b">${escapeHtml(b.data?.title || '')}</div></div>`
        case 'columns': {
          try {
            const cols: string[] = JSON.parse(b.content)
            return `<div style="display:flex;gap:24px;margin:1em 0">${cols.map((c) => `<div style="flex:1">${escapeHtml(c)}</div>`).join('')}</div>`
          } catch {
            return ''
          }
        }
        default:
          return `<p${style}>${safeContent(b.content)}</p>`
      }
    })
    .join('\n')
}

export async function exportSlidesToPDF(doc: SlidesDocument): Promise<void> {
  try {
    const html = exportSlidesToHTML(doc)
    await printViaIframe(html)
  } catch (error) {
    console.error('[Export] Slides PDF export failed:', error)
    throw new Error('スライドPDFエクスポートに失敗しました。もう一度お試しください。')
  }
}

export function exportSpreadsheetToHTML(doc: SpreadsheetDocument): string {
  const sheets = doc.sheets
    .map((sheet) => {
      const computed: Record<string, string | number> = {}
      for (const key of Object.keys(sheet.cells)) {
        computed[key] = evaluateCell(key, sheet.cells)
      }

      // Find used range
      let maxRow = 0
      let maxCol = 0
      for (const key of Object.keys(sheet.cells)) {
        const [r, c] = key.split('-').map(Number)
        if (r > maxRow) maxRow = r
        if (c > maxCol) maxCol = c
      }

      // Build header row
      let headerCols = '<th style="background:#1e293b;color:#94a3b8;padding:6px 12px;border:1px solid #334155;font-weight:600;min-width:40px"></th>'
      for (let c = 0; c <= maxCol; c++) {
        const w = sheet.colWidths[c] || 100
        headerCols += `<th style="background:#1e293b;color:#94a3b8;padding:6px 12px;border:1px solid #334155;font-weight:600;min-width:${w}px;width:${w}px">${colIndexToLetter(c)}</th>`
      }

      // Check if cell is hidden by merge
      const isMergeHidden = (row: number, col: number) =>
        sheet.mergedCells.some((m) => {
          if (row === m.startRow && col === m.startCol) return false
          return row >= m.startRow && row < m.startRow + m.rowSpan && col >= m.startCol && col < m.startCol + m.colSpan
        })
      const getMerge = (row: number, col: number) =>
        sheet.mergedCells.find((m) => m.startRow === row && m.startCol === col)

      // Build data rows
      let rows = ''
      for (let r = 0; r <= maxRow; r++) {
        let cells = `<td style="background:#1e293b;color:#94a3b8;padding:4px 8px;border:1px solid #334155;font-weight:600;text-align:center">${r + 1}</td>`
        for (let c = 0; c <= maxCol; c++) {
          if (isMergeHidden(r, c)) continue
          const key = `${r}-${c}`
          const cell = sheet.cells[key]
          const val = computed[key]
          const fmt = cell?.format || ({} as CellFormat)
          const merge = getMerge(r, c)

          // Build cell styles
          const styles: string[] = ['padding:4px 8px', 'border:1px solid #334155']
          if (fmt.bold) styles.push('font-weight:bold')
          if (fmt.italic) styles.push('font-style:italic')
          if (fmt.underline) styles.push('text-decoration:underline')
          if (fmt.strikethrough) styles.push('text-decoration:line-through')
          if (fmt.textColor) styles.push(`color:${fmt.textColor}`)
          if (fmt.bgColor) styles.push(`background:${fmt.bgColor}`)
          if (fmt.fontSize) styles.push(`font-size:${fmt.fontSize}px`)
          if (fmt.align) styles.push(`text-align:${fmt.align}`)
          if (fmt.verticalAlign) styles.push(`vertical-align:${fmt.verticalAlign}`)
          if (fmt.wrap) styles.push('white-space:pre-wrap;word-wrap:break-word')
          if (fmt.borderTop) styles.push(`border-top:${fmt.borderTop}`)
          if (fmt.borderRight) styles.push(`border-right:${fmt.borderRight}`)
          if (fmt.borderBottom) styles.push(`border-bottom:${fmt.borderBottom}`)
          if (fmt.borderLeft) styles.push(`border-left:${fmt.borderLeft}`)

          const displayVal = val !== undefined && val !== '' ? formatCellValue(val, fmt) : ''
          const spanAttr = merge
            ? `${merge.rowSpan > 1 ? ` rowspan="${merge.rowSpan}"` : ''}${merge.colSpan > 1 ? ` colspan="${merge.colSpan}"` : ''}`
            : ''
          cells += `<td${spanAttr} style="${styles.join(';')}">${escapeHtml(String(displayVal))}</td>`
        }
        rows += `<tr>${cells}</tr>`
      }

      return `<h2 style="color:#e2e8f0;font-size:16px;margin:24px 0 8px">${escapeHtml(sheet.name)}</h2>
<table style="border-collapse:collapse;font-family:system-ui,-apple-system,sans-serif;font-size:13px;color:#e2e8f0">
<thead><tr>${headerCols}</tr></thead>
<tbody>${rows}</tbody>
</table>`
    })
    .join('\n')

  return `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<title>${escapeHtml(doc.meta.title)}</title>
<style>
  body { margin:0; padding:20px; background:#0f172a; font-family:system-ui,-apple-system,sans-serif }
  table { border-collapse:collapse }
  @media print {
    body { background:white; color:#1e293b; padding:10px }
    h2 { color:#1e293b !important }
    table { color:#1e293b !important }
    td, th { border-color:#cbd5e1 !important; color:#1e293b !important; background:white !important }
    td[style*="background"] { print-color-adjust:exact; -webkit-print-color-adjust:exact }
  }
  @page { size:landscape; margin:10mm }
</style>
</head><body>
<h1 style="color:#f1f5f9;font-size:20px;margin-bottom:16px">${escapeHtml(doc.meta.title)}</h1>
${sheets}
</body></html>`
}

export async function exportSpreadsheetToPDF(doc: SpreadsheetDocument): Promise<void> {
  try {
    const html = exportSpreadsheetToHTML(doc)
    await printViaIframe(html)
  } catch (error) {
    console.error('[Export] Spreadsheet PDF export failed:', error)
    throw new Error('スプレッドシートPDFエクスポートに失敗しました。もう一度お試しください。')
  }
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

/**
 * Safely extract readable text from block content.
 * Block content may contain raw HTML from contentEditable paste operations.
 * This strips all tags and returns only the text, then escapes it for HTML output.
 */
function safeContent(content: string): string {
  if (!content) return ''
  // If content contains HTML tags, extract text only
  if (content.includes('<')) {
    if (typeof document !== 'undefined') {
      const tmp = document.createElement('div')
      tmp.innerHTML = content
      // Preserve line breaks: replace <br>, <div>, <p> with newlines
      tmp.querySelectorAll('br').forEach((br) => br.replaceWith('\n'))
      tmp.querySelectorAll('div, p').forEach((el) => {
        el.before('\n')
      })
      const text = tmp.textContent || ''
      // Clean up multiple newlines
      return escapeHtml(text.replace(/\n{3,}/g, '\n\n').trim())
    }
    // SSR fallback: strip tags with regex
    const text = content
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/?(div|p|h[1-6])[^>]*>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
    return escapeHtml(text)
  }
  return escapeHtml(content)
}

/**
 * Export all visible slide elements as PNG images and download them.
 * Accepts an array of DOM elements (one per slide) that represent the rendered slides.
 */
export async function exportSlidesToImages(
  slideElements: HTMLElement[],
  doc: SlidesDocument,
  options?: { width?: number; height?: number; format?: 'png' | 'jpeg'; quality?: number },
): Promise<void> {
  try {
    const { exportAllSlidesToImages, downloadBlob } = await import('./slide-image-export')
    const blobs = await exportAllSlidesToImages(slideElements, options)
    const format = options?.format || 'png'
    const title = doc.meta.title || 'slide'
    blobs.forEach((blob, i) => {
      downloadBlob(blob, `${title}_${i + 1}.${format}`)
    })
  } catch (error) {
    console.error('[Export] Image export failed:', error)
    throw new Error('画像エクスポートに失敗しました。もう一度お試しください。')
  }
}

/** Social media size presets for slide image export */
export const SLIDE_IMAGE_PRESETS = {
  'hd': { width: 1920, height: 1080, label: 'HD (1920x1080)' },
  'instagram': { width: 1080, height: 1080, label: 'Instagram (1080x1080)' },
  'twitter': { width: 1200, height: 675, label: 'Twitter (1200x675)' },
  'linkedin': { width: 1200, height: 627, label: 'LinkedIn (1200x627)' },
} as const

export type SlideImagePreset = keyof typeof SLIDE_IMAGE_PRESETS

/**
 * Export a single slide element as a PNG or JPG image blob.
 * Supports social media size presets.
 */
export async function exportSlideToImage(
  slideElement: HTMLElement,
  format: 'png' | 'jpg' = 'png',
  width?: number,
  height?: number,
  preset?: SlideImagePreset,
): Promise<Blob> {
  const { exportSlideToImage: doExport } = await import('./slide-image-export')

  let w = width || 1920
  let h = height || 1080

  if (preset && SLIDE_IMAGE_PRESETS[preset]) {
    w = SLIDE_IMAGE_PRESETS[preset].width
    h = SLIDE_IMAGE_PRESETS[preset].height
  }

  const imgFormat = format === 'jpg' ? 'jpeg' : 'png'
  return doExport(slideElement, { width: w, height: h, format: imgFormat, quality: 0.92 })
}

export function exportDocToMarkdown(doc: DocDocument): string {
  let footnoteCount = 0
  const lines = doc.blocks.map((b) => {
    const text = b.content ? b.content.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '') : ''
    const indent = b.indent ? '  '.repeat(b.indent) : ''
    switch (b.type) {
      case 'h1': return `# ${text}`
      case 'h2': return `## ${text}`
      case 'h3': return `### ${text}`
      case 'h4': return `#### ${text}`
      case 'h5': return `##### ${text}`
      case 'h6': return `###### ${text}`
      case 'paragraph': return `${indent}${text}`
      case 'bullet': return `${indent}- ${text}`
      case 'numbered': return `${indent}1. ${text}`
      case 'quote': return `> ${text}`
      case 'divider': return '---'
      case 'page-break': return '\n---\n'
      case 'code': return `\`\`\`\n${text}\n\`\`\``
      case 'checklist': return `- [${b.checked ? 'x' : ' '}] ${text}`
      case 'callout': {
        const icons: Record<string, string> = { info: 'ℹ️', warning: '⚠️', success: '✅', error: '❌' }
        return `> ${icons[b.calloutVariant || 'info']} ${text}`
      }
      case 'footnote': {
        footnoteCount++
        return `[^${footnoteCount}]: ${text}`
      }
      case 'image': {
        const alt = b.data?.alt || ''
        const caption = b.data?.caption || ''
        return `![${alt}](image)${caption ? `\n*${caption}*` : ''}`
      }
      case 'table': {
        try {
          const rows: string[][] = JSON.parse(b.data?.tableData || '[]')
          if (rows.length === 0) return ''
          const header = `| ${rows[0].join(' | ')} |`
          const sep = `| ${rows[0].map(() => '---').join(' | ')} |`
          const body = rows.slice(1).map((r) => `| ${r.join(' | ')} |`).join('\n')
          return `${header}\n${sep}\n${body}`
        } catch { return '' }
      }
      case 'toc': {
        const headings = doc.blocks.filter((h) => HEADING_TYPES.includes(h.type))
        return headings.map((h) => {
          const level = headingLevel(h.type)
          const hText = h.content ? h.content.replace(/<[^>]+>/g, '') : ''
          return `${'  '.repeat(level)}- ${hText}`
        }).join('\n')
      }
      case 'math': return `$$\n${text}\n$$`
      default: return text
    }
  })
  return `# ${doc.meta.title}\n\n${lines.join('\n\n')}`
}

export function exportDocToText(doc: DocDocument): string {
  const lines = doc.blocks.map((b) => {
    const text = b.content ? b.content.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '') : ''
    const indent = b.indent ? '  '.repeat(b.indent) : ''
    switch (b.type) {
      case 'h1': return text.toUpperCase()
      case 'h2':
      case 'h3':
      case 'h4':
      case 'h5':
      case 'h6': return text
      case 'paragraph': return `${indent}${text}`
      case 'bullet': return `${indent}• ${text}`
      case 'numbered': return `${indent}  ${text}`
      case 'quote': return `  "${text}"`
      case 'divider': return '────────────────────'
      case 'checklist': return `${b.checked ? '☑' : '☐'} ${text}`
      case 'code': return text
      case 'table': {
        try {
          const rows: string[][] = JSON.parse(b.data?.tableData || '[]')
          return rows.map((r) => r.join('\t')).join('\n')
        } catch { return '' }
      }
      default: return text
    }
  })
  return `${doc.meta.title}\n${'='.repeat(doc.meta.title.length)}\n\n${lines.join('\n\n')}`
}
