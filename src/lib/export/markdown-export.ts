import type {
  SlidesDocument,
  Slide,
  SlideElement,
  SlideTextElement,
  SlideImageElement,
  SlideTableElement,
  SlideChartElement,
} from '@/types'

/**
 * Strip HTML tags from content, preserving line breaks.
 */
function stripHtml(content: string): string {
  if (!content) return ''
  return content
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
}

/**
 * Convert a single element to Markdown.
 */
function elementToMarkdown(el: SlideElement): string {
  switch (el.type) {
    case 'title': {
      const text = stripHtml((el as SlideTextElement).content)
      return text ? `# ${text}` : ''
    }
    case 'subtitle': {
      const text = stripHtml((el as SlideTextElement).content)
      return text ? `## ${text}` : ''
    }
    case 'body':
    case 'label': {
      const textEl = el as SlideTextElement
      const text = stripHtml(textEl.content)
      if (!text) return ''

      // Handle bullet content
      if (textEl.bulletType && textEl.bulletType !== 'none') {
        const lines = text.split('\n').filter((l) => l.trim())
        const indent = '  '.repeat(textEl.indentLevel || 0)
        if (textEl.bulletType === 'decimal' || textEl.bulletType === 'alpha' || textEl.bulletType === 'roman') {
          return lines.map((line, i) => `${indent}${i + 1}. ${line.replace(/^[•\-\d.]+\s*/, '')}`).join('\n')
        }
        return lines.map((line) => `${indent}- ${line.replace(/^[•\-]\s*/, '')}`).join('\n')
      }

      // Check if text contains bullet-like content
      const lines = text.split('\n').filter((l) => l.trim())
      const allBullets = lines.length > 1 && lines.every((l) => /^[•\-\*]\s/.test(l.trim()))
      if (allBullets) {
        return lines.map((line) => `- ${line.replace(/^[•\-\*]\s*/, '').trim()}`).join('\n')
      }

      return text
    }
    case 'image': {
      const img = el as SlideImageElement
      return `![${img.alt || ''}](${img.src})`
    }
    case 'table': {
      const table = el as SlideTableElement
      if (!table.rows || table.rows.length === 0) return ''

      const cleanRow = (row: string[]) => row.map((cell) => stripHtml(cell))

      const headerRow = cleanRow(table.rows[0])
      const header = `| ${headerRow.join(' | ')} |`
      const separator = `| ${headerRow.map(() => '---').join(' | ')} |`

      if (table.rows.length === 1) {
        return `${header}\n${separator}`
      }

      const bodyRows = table.rows
        .slice(1)
        .map((row) => `| ${cleanRow(row).join(' | ')} |`)
        .join('\n')

      return `${header}\n${separator}\n${bodyRows}`
    }
    case 'chart': {
      const chart = el as SlideChartElement
      const chartTitle = chart.title || chart.chartType
      return `[Chart: ${chart.chartType} - ${chartTitle}]`
    }
    case 'shape': {
      const shape = el as import('@/types').SlideShapeElement
      if (shape.textContent) {
        return stripHtml(shape.textContent)
      }
      return ''
    }
    case 'connector':
    case 'video':
    case 'audio':
      return ''
    default:
      return ''
  }
}

/**
 * Convert a single slide to Markdown.
 */
function slideToMarkdown(slide: Slide, index: number): string {
  const parts: string[] = []

  // Sort elements by position (top to bottom, left to right)
  const sorted = [...slide.elements].sort((a, b) => {
    if ('y' in a && 'y' in b) {
      const yDiff = (a as any).y - (b as any).y
      if (Math.abs(yDiff) > 5) return yDiff
      return (a as any).x - (b as any).x
    }
    return 0
  })

  for (const el of sorted) {
    const md = elementToMarkdown(el)
    if (md) parts.push(md)
  }

  // Slide notes
  if (slide.notes) {
    const noteText = stripHtml(slide.notes)
    if (noteText) {
      parts.push('')
      parts.push(`> Note: ${noteText}`)
    }
  }

  return parts.join('\n\n')
}

/**
 * Export a SlidesDocument to Markdown format.
 * Each slide is separated by `---`.
 */
export function exportSlidesToMarkdown(doc: SlidesDocument): string {
  const title = doc.meta.title || 'Untitled Presentation'
  const slideSections = doc.slides.map((slide, i) => slideToMarkdown(slide, i)).filter((s) => s.trim())

  return `# ${title}\n\n${slideSections.join('\n\n---\n\n')}\n`
}
