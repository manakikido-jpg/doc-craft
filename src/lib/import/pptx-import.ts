'use client'

import type { SlideElement, SlideThemeKey } from '@/types'
import { generateId } from '@/lib/utils'

interface ImportedSlide {
  elements: SlideElement[]
  themeKey?: SlideThemeKey
}

// EMU (English Metric Unit) conversion: 1 inch = 914400 EMU
// Slide dimensions in EMU: default is 9144000 x 6858000 (10" x 7.5")
const SLIDE_WIDTH_EMU = 9144000
const SLIDE_HEIGHT_EMU = 6858000

function emuToPercent(emu: number, axis: 'x' | 'y'): number {
  const base = axis === 'x' ? SLIDE_WIDTH_EMU : SLIDE_HEIGHT_EMU
  return Math.round((emu / base) * 100 * 100) / 100
}

function emuToPercentSize(emu: number, axis: 'x' | 'y'): number {
  const base = axis === 'x' ? SLIDE_WIDTH_EMU : SLIDE_HEIGHT_EMU
  return Math.round((emu / base) * 100 * 100) / 100
}

function parseColorFromNode(node: Element | null): string | null {
  if (!node) return null
  // Check <a:srgbClr val="RRGGBB" />
  const srgb = node.getElementsByTagName('a:srgbClr')[0]
  if (srgb) {
    const val = srgb.getAttribute('val')
    if (val) return `#${val}`
  }
  // Check <a:schemeClr val="..." />
  const scheme = node.getElementsByTagName('a:schemeClr')[0]
  if (scheme) {
    // Map common scheme colors to reasonable defaults
    const schemeMap: Record<string, string> = {
      dk1: '#000000', dk2: '#1f2937', lt1: '#ffffff', lt2: '#f3f4f6',
      accent1: '#3b82f6', accent2: '#8b5cf6', accent3: '#10b981',
      accent4: '#f59e0b', accent5: '#ef4444', accent6: '#ec4899',
    }
    const val = scheme.getAttribute('val')
    if (val && schemeMap[val]) return schemeMap[val]
  }
  return null
}

export async function importPPTX(file: File): Promise<ImportedSlide[]> {
  // Dynamically import JSZip
  const JSZip = (await import('jszip')).default
  const zip = await JSZip.loadAsync(file)

  const slides: ImportedSlide[] = []

  // Find all slide files
  const slideFiles = Object.keys(zip.files)
    .filter(name => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => {
      const numA = parseInt(a.match(/slide(\d+)/)?.[1] || '0')
      const numB = parseInt(b.match(/slide(\d+)/)?.[1] || '0')
      return numA - numB
    })

  // Pre-load image relationships and media files
  const imageCache = new Map<string, string>() // rId -> base64 data URL

  for (const slideFile of slideFiles) {
    const slideNum = slideFile.match(/slide(\d+)/)?.[1] || '1'
    const relsPath = `ppt/slides/_rels/slide${slideNum}.xml.rels`
    const xml = await zip.files[slideFile].async('text')

    // Load relationship file for this slide
    const imageRels = new Map<string, string>() // rId -> target path
    const relsFile = zip.files[relsPath]
    if (relsFile) {
      const relsXml = await relsFile.async('text')
      const relsParser = new DOMParser()
      const relsDoc = relsParser.parseFromString(relsXml, 'text/xml')
      const relationships = relsDoc.getElementsByTagName('Relationship')
      for (let i = 0; i < relationships.length; i++) {
        const rel = relationships[i]
        const rId = rel.getAttribute('Id') || ''
        const target = rel.getAttribute('Target') || ''
        const type = rel.getAttribute('Type') || ''
        if (type.includes('/image')) {
          // Target is relative to ppt/slides/, e.g. ../media/image1.png
          const resolvedPath = target.startsWith('../')
            ? `ppt/${target.substring(3)}`
            : target.startsWith('/')
              ? target.substring(1)
              : `ppt/slides/${target}`
          imageRels.set(rId, resolvedPath)
        }
      }
    }

    // Load images as base64
    for (const [rId, mediaPath] of imageRels.entries()) {
      if (!imageCache.has(rId + '_' + slideNum)) {
        const mediaFile = zip.files[mediaPath]
        if (mediaFile) {
          try {
            const data = await mediaFile.async('base64')
            const ext = mediaPath.split('.').pop()?.toLowerCase() || 'png'
            const mimeMap: Record<string, string> = {
              png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
              gif: 'image/gif', svg: 'image/svg+xml', bmp: 'image/bmp',
              tiff: 'image/tiff', webp: 'image/webp', emf: 'image/emf',
              wmf: 'image/wmf',
            }
            const mime = mimeMap[ext] || 'image/png'
            imageCache.set(rId + '_' + slideNum, `data:${mime};base64,${data}`)
          } catch {
            // Skip unreadable media files
          }
        }
      }
    }

    const elements = parseSlideXML(xml, imageRels, imageCache, slideNum)
    slides.push({ elements, themeKey: 'dark-blue' })
  }

  return slides.length > 0 ? slides : [{ elements: [], themeKey: 'dark-blue' }]
}

function extractPosition(sp: Element): { x: number; y: number; w: number; h: number } | null {
  // Look for <a:off x="..." y="..." /> and <a:ext cx="..." cy="..." />
  // These can be inside <p:spPr> -> <a:xfrm>
  const xfrm = sp.getElementsByTagName('a:xfrm')[0]
  if (!xfrm) return null

  const off = xfrm.getElementsByTagName('a:off')[0]
  const ext = xfrm.getElementsByTagName('a:ext')[0]
  if (!off || !ext) return null

  const xEmu = parseInt(off.getAttribute('x') || '0', 10)
  const yEmu = parseInt(off.getAttribute('y') || '0', 10)
  const cxEmu = parseInt(ext.getAttribute('cx') || '0', 10)
  const cyEmu = parseInt(ext.getAttribute('cy') || '0', 10)

  if (isNaN(xEmu) || isNaN(yEmu) || isNaN(cxEmu) || isNaN(cyEmu)) return null

  return {
    x: emuToPercent(xEmu, 'x'),
    y: emuToPercent(yEmu, 'y'),
    w: emuToPercentSize(cxEmu, 'x'),
    h: emuToPercentSize(cyEmu, 'y'),
  }
}

function parseSlideXML(
  xml: string,
  imageRels: Map<string, string>,
  imageCache: Map<string, string>,
  slideNum: string,
): SlideElement[] {
  const elements: SlideElement[] = []
  const parser = new DOMParser()
  const doc = parser.parseFromString(xml, 'text/xml')

  // Parse <p:sp> elements for text content and shapes
  const spElements = doc.getElementsByTagName('p:sp')

  let yPos = 8
  for (let i = 0; i < spElements.length; i++) {
    const sp = spElements[i]

    // Extract position from XML if available
    const pos = extractPosition(sp)

    // Get all text runs
    const textNodes = sp.getElementsByTagName('a:t')
    let text = ''
    for (let j = 0; j < textNodes.length; j++) {
      text += textNodes[j].textContent || ''
    }

    if (text.trim()) {
      // Text element
      const phNode = sp.getElementsByTagName('p:ph')[0]
      const phType = phNode?.getAttribute('type') || ''

      const isTitle = phType === 'title' || phType === 'ctrTitle' || i === 0
      const isSubtitle = phType === 'subTitle' || phType === 'body'

      // Try to extract text color
      const rPr = sp.getElementsByTagName('a:rPr')[0]
      let textColor = '#ffffff'
      if (rPr) {
        const solidFill = rPr.getElementsByTagName('a:solidFill')[0]
        const parsed = parseColorFromNode(solidFill)
        if (parsed) textColor = parsed
      }

      // Try to extract font size (in hundredths of a point)
      let fontSize = isTitle ? 32 : 18
      if (rPr) {
        const szAttr = rPr.getAttribute('sz')
        if (szAttr) {
          const ptSize = parseInt(szAttr, 10) / 100
          if (!isNaN(ptSize) && ptSize > 0) fontSize = Math.round(ptSize)
        }
      }

      elements.push({
        id: generateId(),
        type: isTitle ? 'title' : 'body',
        content: text,
        x: pos ? pos.x : 5,
        y: pos ? pos.y : yPos,
        w: pos ? pos.w : 90,
        h: pos ? pos.h : (isTitle ? 15 : 10),
        fontSize,
        fontWeight: isTitle ? '700' : '400',
        align: isTitle ? 'center' : 'left',
        color: textColor,
      } as SlideElement)

      if (!pos) yPos += isTitle ? 18 : 12
    } else {
      // No text -- check for shape with solid fill
      const spPr = sp.getElementsByTagName('p:spPr')[0] || sp.getElementsByTagName('a:spPr')[0]
      if (spPr) {
        const solidFill = spPr.getElementsByTagName('a:solidFill')[0]
        const fillColor = parseColorFromNode(solidFill)
        if (fillColor && pos) {
          // Determine shape type from <a:prstGeom prst="..." />
          const prstGeom = spPr.getElementsByTagName('a:prstGeom')[0]
          const prst = prstGeom?.getAttribute('prst') || 'rect'
          const shapeMap: Record<string, string> = {
            rect: 'rect', roundRect: 'rect', ellipse: 'circle',
            triangle: 'triangle', diamond: 'diamond', hexagon: 'hexagon',
            pentagon: 'pentagon', star5: 'star', heart: 'heart',
            rightArrow: 'arrow-right', leftArrow: 'arrow-left',
            upArrow: 'arrow-up', downArrow: 'arrow-down',
            cross: 'cross', line: 'line',
          }
          const shape = shapeMap[prst] || 'rect'

          elements.push({
            id: generateId(),
            type: 'shape',
            shape,
            fill: fillColor,
            x: pos.x,
            y: pos.y,
            w: pos.w,
            h: pos.h,
          } as SlideElement)
        }
      }
    }
  }

  // Parse <p:pic> elements for images
  const picElements = doc.getElementsByTagName('p:pic')
  for (let i = 0; i < picElements.length; i++) {
    const pic = picElements[i]
    const pos = extractPosition(pic)

    // Get the relationship ID for the image
    const blipFill = pic.getElementsByTagName('p:blipFill')[0]
    const blip = blipFill?.getElementsByTagName('a:blip')[0]
    const rEmbed = blip?.getAttribute('r:embed') || ''

    if (rEmbed) {
      const cacheKey = rEmbed + '_' + slideNum
      const dataUrl = imageCache.get(cacheKey)
      if (dataUrl && pos) {
        elements.push({
          id: generateId(),
          type: 'image',
          src: dataUrl,
          alt: `Imported image ${i + 1}`,
          x: pos.x,
          y: pos.y,
          w: pos.w,
          h: pos.h,
        } as SlideElement)
      }
    }
  }

  return elements
}
