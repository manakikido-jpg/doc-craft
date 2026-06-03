import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  ImageRun,
  ExternalHyperlink,
  Packer,
  ShadingType,
  TabStopPosition,
  TabStopType,
} from 'docx'
import { saveAs } from 'file-saver'
import type { DocDocument, Block } from '@/types'

function htmlToTextRuns(html: string, baseOptions?: { color?: string }): TextRun[] {
  if (!html || html.trim() === '') return [new TextRun('')]

  // Create a temporary DOM element to parse HTML
  const div = document.createElement('div')
  div.innerHTML = html

  const runs: TextRun[] = []

  function walkNode(node: Node, inherited: { bold?: boolean; italic?: boolean; underline?: boolean; color?: string }) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || ''
      if (text) {
        runs.push(
          new TextRun({
            text,
            bold: inherited.bold,
            italics: inherited.italic,
            underline: inherited.underline ? {} : undefined,
            color: inherited.color?.replace('#', '') || baseOptions?.color?.replace('#', '') || undefined,
          }),
        )
      }
      return
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement
      const tag = el.tagName.toLowerCase()
      const newInherited = { ...inherited }

      if (tag === 'b' || tag === 'strong') newInherited.bold = true
      if (tag === 'i' || tag === 'em') newInherited.italic = true
      if (tag === 'u') newInherited.underline = true
      if (tag === 'span') {
        const style = el.getAttribute('style') || ''
        const colorMatch = style.match(/color:\s*([^;]+)/)
        if (colorMatch) newInherited.color = colorMatch[1].trim()
      }
      if (tag === 'br') {
        runs.push(new TextRun({ text: '', break: 1 }))
        return
      }

      for (const child of Array.from(node.childNodes)) {
        walkNode(child, newInherited)
      }
    }
  }

  for (const child of Array.from(div.childNodes)) {
    walkNode(child, {})
  }

  return runs.length > 0 ? runs : [new TextRun('')]
}

function getAlignment(align?: string): (typeof AlignmentType)[keyof typeof AlignmentType] | undefined {
  switch (align) {
    case 'left':
      return AlignmentType.LEFT
    case 'center':
      return AlignmentType.CENTER
    case 'right':
      return AlignmentType.RIGHT
    case 'justify':
      return AlignmentType.JUSTIFIED
    default:
      return undefined
  }
}

function stripHtml(html: string): string {
  const div = document.createElement('div')
  div.innerHTML = html
  return div.textContent || div.innerText || ''
}

function blockToParagraphs(block: Block, footnoteCount: { value: number }): (Paragraph | Table)[] {
  const alignment = getAlignment(block.align)
  const colorHex = block.textColor?.replace('#', '') || undefined
  const indent = block.indent ? { left: block.indent * 720 } : undefined

  switch (block.type) {
    case 'h1':
      return [
        new Paragraph({
          children: htmlToTextRuns(block.content, { color: block.textColor }),
          heading: HeadingLevel.HEADING_1,
          alignment,
          indent,
        }),
      ]
    case 'h2':
      return [
        new Paragraph({
          children: htmlToTextRuns(block.content, { color: block.textColor }),
          heading: HeadingLevel.HEADING_2,
          alignment,
          indent,
        }),
      ]
    case 'h3':
      return [
        new Paragraph({
          children: htmlToTextRuns(block.content, { color: block.textColor }),
          heading: HeadingLevel.HEADING_3,
          alignment,
          indent,
        }),
      ]
    case 'h4':
      return [
        new Paragraph({
          children: htmlToTextRuns(block.content, { color: block.textColor }),
          heading: HeadingLevel.HEADING_4,
          alignment,
          indent,
        }),
      ]
    case 'h5':
      return [
        new Paragraph({
          children: htmlToTextRuns(block.content, { color: block.textColor }),
          heading: HeadingLevel.HEADING_5,
          alignment,
          indent,
        }),
      ]
    case 'h6':
      return [
        new Paragraph({
          children: htmlToTextRuns(block.content, { color: block.textColor }),
          heading: HeadingLevel.HEADING_6,
          alignment,
          indent,
        }),
      ]

    case 'paragraph':
      return [
        new Paragraph({
          children: htmlToTextRuns(block.content, { color: block.textColor }),
          alignment,
          indent,
          shading: block.bgColor
            ? { type: ShadingType.SOLID, color: block.bgColor.replace('#', ''), fill: block.bgColor.replace('#', '') }
            : undefined,
        }),
      ]

    case 'bullet':
      return [
        new Paragraph({
          children: htmlToTextRuns(block.content, { color: block.textColor }),
          bullet: { level: block.indent || 0 },
          alignment,
        }),
      ]

    case 'numbered':
      return [
        new Paragraph({
          children: htmlToTextRuns(block.content, { color: block.textColor }),
          numbering: { reference: 'default-numbering', level: block.indent || 0 },
          alignment,
        }),
      ]

    case 'quote':
      return [
        new Paragraph({
          children: htmlToTextRuns(block.content, { color: block.textColor || '#64748b' }),
          indent: { left: 720 },
          border: {
            left: { style: BorderStyle.SINGLE, size: 6, color: '6366f1', space: 8 },
          },
          alignment,
        }),
      ]

    case 'code':
      return [
        new Paragraph({
          children: [
            new TextRun({
              text: stripHtml(block.content),
              font: 'Consolas',
              size: 20,
            }),
          ],
          shading: { type: ShadingType.SOLID, color: '1e293b', fill: '1e293b' },
          indent,
        }),
      ]

    case 'table': {
      try {
        const rows: string[][] = JSON.parse(block.data?.tableData || '[]')
        if (rows.length === 0) return []
        const hasHeader = block.data?.hasHeader !== 'false'
        const tableRows = rows.map(
          (row, ri) =>
            new TableRow({
              children: row.map(
                (cell) =>
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun(cell)] })],
                    shading:
                      hasHeader && ri === 0
                        ? { type: ShadingType.SOLID, color: 'f1f5f9', fill: 'f1f5f9' }
                        : undefined,
                  }),
              ),
            }),
        )
        return [
          new Table({
            rows: tableRows,
            width: { size: 100, type: WidthType.PERCENTAGE },
          }),
        ]
      } catch {
        return []
      }
    }

    case 'image': {
      // Images as data URLs can be embedded if they are base64
      if (block.data?.src?.startsWith('data:image/')) {
        try {
          const base64 = block.data.src.split(',')[1]
          const mimeMatch = block.data.src.match(/data:(image\/\w+);/)
          const mime = mimeMatch?.[1] || 'image/png'
          const binaryStr = atob(base64)
          const bytes = new Uint8Array(binaryStr.length)
          for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i)

          const paragraphs: (Paragraph | Table)[] = [
            new Paragraph({
              children: [
                new ImageRun({
                  data: bytes,
                  transformation: { width: 400, height: 300 },
                  type: mime === 'image/png' ? 'png' : mime === 'image/gif' ? 'gif' : 'jpg',
                }),
              ],
              alignment: getAlignment(block.data?.imageAlign) || AlignmentType.LEFT,
            }),
          ]
          if (block.data?.caption) {
            paragraphs.push(
              new Paragraph({
                children: [new TextRun({ text: block.data.caption, italics: true, size: 18, color: '64748b' })],
                alignment: AlignmentType.CENTER,
              }),
            )
          }
          return paragraphs
        } catch {
          return [
            new Paragraph({
              children: [new TextRun({ text: `[画像: ${block.data?.alt || ''}]`, italics: true, color: '94a3b8' })],
            }),
          ]
        }
      }
      return [
        new Paragraph({
          children: [new TextRun({ text: `[画像: ${block.data?.alt || ''}]`, italics: true, color: '94a3b8' })],
        }),
      ]
    }

    case 'checklist':
      return [
        new Paragraph({
          children: [
            new TextRun({ text: block.checked ? '☑ ' : '☐ ' }),
            ...htmlToTextRuns(block.content, { color: block.textColor }),
          ],
          alignment,
          indent,
        }),
      ]

    case 'divider':
      return [
        new Paragraph({
          border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: 'e2e8f0', space: 4 } },
          children: [new TextRun('')],
        }),
      ]

    case 'callout': {
      const icons: Record<string, string> = { info: 'ℹ️', warning: '⚠️', success: '✅', error: '❌' }
      const v = block.calloutVariant || 'info'
      return [
        new Paragraph({
          children: [new TextRun({ text: `${icons[v]} ` }), ...htmlToTextRuns(block.content)],
          indent: { left: 360 },
          border: {
            left: { style: BorderStyle.SINGLE, size: 6, color: v === 'info' ? '3b82f6' : v === 'warning' ? 'f59e0b' : v === 'success' ? '10b981' : 'ef4444', space: 8 },
          },
          alignment,
        }),
      ]
    }

    case 'footnote': {
      footnoteCount.value++
      return [
        new Paragraph({
          children: [
            new TextRun({ text: `[${footnoteCount.value}] `, superScript: true, size: 18 }),
            ...htmlToTextRuns(block.content, { color: '#64748b' }),
          ],
          indent: { left: 360 },
          border: { left: { style: BorderStyle.SINGLE, size: 2, color: '475569', space: 8 } },
        }),
      ]
    }

    case 'page-break':
      return [
        new Paragraph({
          children: [new TextRun('')],
          pageBreakBefore: true,
        }),
      ]

    default:
      if (block.content) {
        return [
          new Paragraph({
            children: htmlToTextRuns(block.content, { color: block.textColor }),
            alignment,
            indent,
          }),
        ]
      }
      return []
  }
}

export async function exportDocToDOCX(doc: DocDocument): Promise<void> {
  const footnoteCount = { value: 0 }

  const children: (Paragraph | Table)[] = [
    new Paragraph({
      children: [new TextRun({ text: doc.meta.title || 'Document', bold: true, size: 48 })],
      heading: HeadingLevel.TITLE,
      spacing: { after: 400 },
    }),
  ]

  for (const block of doc.blocks) {
    const elements = blockToParagraphs(block, footnoteCount)
    children.push(...elements)
  }

  const docFile = new Document({
    numbering: {
      config: [
        {
          reference: 'default-numbering',
          levels: [
            { level: 0, format: 'decimal', text: '%1.', alignment: AlignmentType.LEFT },
            { level: 1, format: 'decimal', text: '%1.%2.', alignment: AlignmentType.LEFT },
            { level: 2, format: 'decimal', text: '%1.%2.%3.', alignment: AlignmentType.LEFT },
          ],
        },
      ],
    },
    sections: [
      {
        children,
      },
    ],
  })

  const blob = await Packer.toBlob(docFile)
  saveAs(blob, `${doc.meta.title || 'document'}.docx`)
}
