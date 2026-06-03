/**
 * Export a design canvas element to PNG.
 *
 * html2canvas is not available in this project, so we use the native Canvas API
 * to serialise the DOM element via an SVG foreignObject. This works for most
 * CSS-styled content but has limitations with external images (CORS).
 */
export async function exportDesignToPNG(
  canvasElement: HTMLElement,
  width: number,
  height: number,
  filename: string = 'design.png',
): Promise<void> {
  try {
    // Serialise the element to an SVG foreignObject
    const serializer = new XMLSerializer()
    const clone = canvasElement.cloneNode(true) as HTMLElement
    // Inline computed styles for the clone
    clone.style.transform = 'none'
    clone.style.width = `${width}px`
    clone.style.height = `${height}px`

    const svgNS = 'http://www.w3.org/2000/svg'
    const svg = document.createElementNS(svgNS, 'svg')
    svg.setAttribute('xmlns', svgNS)
    svg.setAttribute('width', String(width * 2))
    svg.setAttribute('height', String(height * 2))
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`)

    const fo = document.createElementNS(svgNS, 'foreignObject')
    fo.setAttribute('width', '100%')
    fo.setAttribute('height', '100%')
    fo.appendChild(clone)
    svg.appendChild(fo)

    const svgString = serializer.serializeToString(svg)
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
    const svgUrl = URL.createObjectURL(svgBlob)

    const img = new Image()
    img.crossOrigin = 'anonymous'

    await new Promise<void>((resolve, reject) => {
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = width * 2
        canvas.height = height * 2
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0)
        URL.revokeObjectURL(svgUrl)

        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('PNG blob creation failed'))
            return
          }
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = filename
          a.click()
          URL.revokeObjectURL(url)
          resolve()
        }, 'image/png')
      }
      img.onerror = () => {
        URL.revokeObjectURL(svgUrl)
        reject(new Error('SVG to image conversion failed'))
      }
      img.src = svgUrl
    })
  } catch {
    // Fallback: show a message
    throw new Error('PNG エクスポートに失敗しました。ブラウザのスクリーンショット機能をご利用ください。')
  }
}
