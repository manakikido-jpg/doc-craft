import type { DocumentType } from '@/types'
import {
  createDocument,
  getDocDoc, saveDocDoc,
  getSlideDoc, saveSlideDoc,
  getSpreadsheetDoc, saveSpreadsheetDoc,
  getDesignDoc, saveDesignDoc,
} from '@/lib/storage/cloud-store'
import { DOC_TEMPLATES } from '@/lib/templates/doc-templates'
import { SLIDE_TEMPLATES } from '@/lib/templates/slide-templates'
import { SPREADSHEET_TEMPLATES } from '@/lib/templates/spreadsheet-templates'
import { DESIGN_TEMPLATES } from '@/lib/templates/design-templates'

/** Editor route for a freshly created document of the given type. */
export function routeForDoc(type: DocumentType, id: string): string {
  return type === 'slides'
    ? '/slides/' + id
    : type === 'spreadsheet'
      ? '/spreadsheets/' + id
      : type === 'design'
        ? '/designs/' + id
        : '/docs/' + id
}

/**
 * Create a new document of `type` and apply the template identified by
 * `templateId` ('blank' = no template). Returns the new document id, or null if
 * creation failed. Shared by the create-modal and the template gallery so a
 * single code path stays in sync.
 */
export async function createDocFromTemplate(
  type: DocumentType,
  templateId: string,
  title = '',
): Promise<string | null> {
  const meta = await createDocument(type, title)
  if (!meta) return null

  if (templateId === 'blank') return meta.id

  try {
    if (type === 'doc') {
      const tpl = DOC_TEMPLATES.find((t) => t.id === templateId)
      if (tpl) {
        const existing = await getDocDoc(meta.id)
        if (existing) {
          existing.blocks = tpl.buildDoc()
          if (title && existing.blocks[0]) existing.blocks[0].content = title
          await saveDocDoc(existing)
        }
      }
    } else if (type === 'slides') {
      const tpl = SLIDE_TEMPLATES.find((t) => t.id === templateId)
      if (tpl?.buildSlides) {
        const existing = await getSlideDoc(meta.id)
        if (existing) {
          existing.slides = tpl.buildSlides()
          existing.activeSlideId = existing.slides[0]?.id ?? ''
          await saveSlideDoc(existing)
        }
      }
    } else if (type === 'spreadsheet') {
      const tpl = SPREADSHEET_TEMPLATES.find((t) => t.id === templateId)
      if (tpl) {
        const existing = await getSpreadsheetDoc(meta.id)
        if (existing) {
          const { cells, colWidths } = tpl.buildCells()
          existing.sheets[0].cells = cells
          if (colWidths) existing.sheets[0].colWidths = colWidths
          await saveSpreadsheetDoc(existing)
        }
      }
    } else if (type === 'design') {
      const tpl = DESIGN_TEMPLATES.find((t) => t.id === templateId)
      if (tpl) {
        const existing = await getDesignDoc(meta.id)
        if (existing) {
          const { canvas, canvasSize } = tpl.buildCanvas()
          existing.canvas = canvas
          existing.canvasSize = canvasSize
          await saveDesignDoc(existing)
        }
      }
    }
  } catch {
    // Template application failed — still return the (blank) document so the
    // user gets a usable file rather than nothing.
  }

  return meta.id
}
