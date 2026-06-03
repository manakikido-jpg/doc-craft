'use client'

// Export individual slides as PNG/JPEG images
// Uses html2canvas if available, otherwise falls back to a DOM-to-canvas approach

interface ExportOptions {
  width?: number
  height?: number
  format?: 'png' | 'jpeg'
  quality?: number
}

const DEFAULT_WIDTH = 1920
const DEFAULT_HEIGHT = 1080

export async function exportSlideToImage(
  slideElement: HTMLElement,
  options?: ExportOptions,
): Promise<Blob> {
  const width = options?.width || DEFAULT_WIDTH
  const height = options?.height || DEFAULT_HEIGHT
  const format = options?.format || 'png'
  const quality = options?.quality ?? 0.92

  // Try html2canvas first (may be available via html2pdf.js dependency)
  try {
    const html2canvas = (await import('html2canvas')).default
    const canvas = await html2canvas(slideElement, {
      width,
      height,
      scale: 1,
      useCORS: true,
      allowTaint: true,
      backgroundColor: null,
      logging: false,
    })

    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob)
          else reject(new Error('Failed to create image blob'))
        },
        `image/${format}`,
        quality,
      )
    })
  } catch {
    // Fallback: use native canvas rendering via SVG foreignObject
    return renderViaForeignObject(slideElement, { width, height, format, quality })
  }
}

async function renderViaForeignObject(
  element: HTMLElement,
  opts: { width: number; height: number; format: string; quality: number },
): Promise<Blob> {
  const { width, height, format, quality } = opts

  // Clone the element to avoid modifying the original
  const clone = element.cloneNode(true) as HTMLElement
  clone.style.width = `${width}px`
  clone.style.height = `${height}px`
  clone.style.position = 'absolute'
  clone.style.left = '-9999px'
  clone.style.top = '-9999px'
  document.body.appendChild(clone)

  // Get computed styles and inline them
  const computedStyle = window.getComputedStyle(element)
  const bgColor = computedStyle.backgroundColor || '#0f172a'

  // Serialize the HTML
  const serializer = new XMLSerializer()
  const htmlString = serializer.serializeToString(clone)
  document.body.removeChild(clone)

  // Create SVG with foreignObject
  const svgString = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <foreignObject width="100%" height="100%">
        <div xmlns="http://www.w3.org/1999/xhtml" style="width:${width}px;height:${height}px;background:${bgColor};overflow:hidden">
          ${htmlString}
        </div>
      </foreignObject>
    </svg>
  `

  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(svgBlob)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Cannot get canvas context')

  return new Promise<Blob>((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      ctx.drawImage(img, 0, 0, width, height)
      URL.revokeObjectURL(url)
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob)
          else reject(new Error('Failed to create image blob'))
        },
        `image/${format}`,
        quality,
      )
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to render slide image'))
    }
    img.src = url
  })
}

export async function exportAllSlidesToImages(
  slideElements: HTMLElement[],
  options?: ExportOptions,
): Promise<Blob[]> {
  const blobs: Blob[] = []
  for (const el of slideElements) {
    const blob = await exportSlideToImage(el, options)
    blobs.push(blob)
  }
  return blobs
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
