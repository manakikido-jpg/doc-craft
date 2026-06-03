/**
 * Image compression utility for DocCraft.
 * Compresses images before inserting them into slides to reduce storage usage.
 */

const DEFAULT_MAX_WIDTH = 1920
const DEFAULT_QUALITY = 0.8

/**
 * Compress an image from a data URL.
 *
 * - Resizes if the image width exceeds maxWidth (preserving aspect ratio)
 * - Compresses to JPEG at the given quality level
 * - Preserves PNG transparency by keeping the PNG format for images with alpha
 *
 * @param dataUrl - A base64 data URL (data:image/...) to compress
 * @param maxWidth - Maximum width in pixels (default 1920)
 * @param quality - JPEG compression quality 0-1 (default 0.8)
 * @returns The compressed image as a data URL
 */
export async function compressImage(
  dataUrl: string,
  maxWidth: number = DEFAULT_MAX_WIDTH,
  quality: number = DEFAULT_QUALITY,
): Promise<string> {
  // Detect if the source is PNG (may have transparency)
  const isPng = dataUrl.startsWith('data:image/png')

  const img = await loadImage(dataUrl)

  let targetWidth = img.naturalWidth
  let targetHeight = img.naturalHeight

  // Resize if wider than maxWidth
  if (targetWidth > maxWidth) {
    const ratio = maxWidth / targetWidth
    targetWidth = maxWidth
    targetHeight = Math.round(targetHeight * ratio)
  }

  // If the image is already small enough and is JPEG, check if recompression is needed
  if (targetWidth === img.naturalWidth && !isPng) {
    // Estimate: if data URL is under 200KB, skip recompression
    if (dataUrl.length < 200_000) {
      return dataUrl
    }
  }

  // Use OffscreenCanvas if available, else fall back to regular canvas
  let canvas: HTMLCanvasElement | OffscreenCanvas
  let ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null

  if (typeof OffscreenCanvas !== 'undefined') {
    canvas = new OffscreenCanvas(targetWidth, targetHeight)
    ctx = canvas.getContext('2d')
  } else {
    const htmlCanvas = document.createElement('canvas')
    htmlCanvas.width = targetWidth
    htmlCanvas.height = targetHeight
    canvas = htmlCanvas
    ctx = htmlCanvas.getContext('2d')
  }

  if (!ctx) {
    throw new Error('Failed to get canvas 2d context')
  }

  ctx.drawImage(img, 0, 0, targetWidth, targetHeight)

  // For PNG images, check if there is actual transparency
  if (isPng) {
    const hasAlpha = checkAlphaChannel(ctx, targetWidth, targetHeight)
    if (hasAlpha) {
      // Keep as PNG to preserve transparency
      return canvasToDataUrl(canvas, 'image/png')
    }
  }

  // Compress as JPEG
  return canvasToDataUrl(canvas, 'image/jpeg', quality)
}

/** Load an image from a data URL and return it when ready */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Failed to load image for compression'))
    img.src = src
  })
}

/** Check if any pixel in the canvas has a non-opaque alpha value */
function checkAlphaChannel(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  width: number,
  height: number,
): boolean {
  // Sample a subset of pixels for performance on large images
  const sampleSize = Math.min(width * height, 50_000)
  const step = Math.max(1, Math.floor((width * height) / sampleSize))

  const imageData = ctx.getImageData(0, 0, width, height)
  const data = imageData.data

  for (let i = 3; i < data.length; i += 4 * step) {
    if (data[i] < 255) {
      return true
    }
  }
  return false
}

/** Convert a canvas (regular or offscreen) to a data URL */
async function canvasToDataUrl(
  canvas: HTMLCanvasElement | OffscreenCanvas,
  type: string,
  quality?: number,
): Promise<string> {
  if (canvas instanceof HTMLCanvasElement) {
    return canvas.toDataURL(type, quality)
  }

  // OffscreenCanvas: use convertToBlob
  const blob = await canvas.convertToBlob({ type, quality })
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Failed to read compressed blob'))
    reader.readAsDataURL(blob)
  })
}

// ── Image CDN Optimization (WebP + multi-size) ──

export interface OptimizedImageSet {
  thumbnail: string  // 200px wide
  medium: string     // 800px wide
  full: string       // 1920px wide
  original: {
    width: number
    height: number
  }
}

const SIZE_THUMBNAIL = 200
const SIZE_MEDIUM = 800
const SIZE_FULL = 1920
const WEBP_QUALITY = 0.85

/**
 * Resize an image to a given width, preserving aspect ratio.
 * Attempts WebP first, falls back to JPEG.
 */
async function resizeToWidth(
  img: HTMLImageElement,
  targetWidth: number,
  quality: number = WEBP_QUALITY,
): Promise<string> {
  const actualWidth = Math.min(targetWidth, img.naturalWidth)
  const ratio = actualWidth / img.naturalWidth
  const actualHeight = Math.round(img.naturalHeight * ratio)

  let canvas: HTMLCanvasElement | OffscreenCanvas
  let ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null

  if (typeof OffscreenCanvas !== 'undefined') {
    canvas = new OffscreenCanvas(actualWidth, actualHeight)
    ctx = canvas.getContext('2d')
  } else {
    const htmlCanvas = document.createElement('canvas')
    htmlCanvas.width = actualWidth
    htmlCanvas.height = actualHeight
    canvas = htmlCanvas
    ctx = htmlCanvas.getContext('2d')
  }

  if (!ctx) throw new Error('Failed to get canvas 2d context')

  ctx.drawImage(img, 0, 0, actualWidth, actualHeight)

  // Try WebP first
  try {
    const webp = await canvasToDataUrl(canvas, 'image/webp', quality)
    if (webp && webp.startsWith('data:image/webp')) {
      return webp
    }
  } catch {
    // WebP not supported, fall through
  }

  // Fallback to JPEG
  return canvasToDataUrl(canvas, 'image/jpeg', quality)
}

/**
 * Compress and optimize an image file, generating multiple sizes.
 * Returns thumbnail (200px), medium (800px), and full (1920px) versions
 * in WebP format (with JPEG fallback).
 *
 * Components can use these with srcset for responsive images.
 *
 * @param file - The image File to process
 * @returns An OptimizedImageSet with data URLs for each size
 */
export async function compressAndOptimize(file: File): Promise<OptimizedImageSet> {
  const dataUrl = await fileToDataUrl(file)
  const img = await loadImage(dataUrl)

  const [thumbnail, medium, full] = await Promise.all([
    resizeToWidth(img, SIZE_THUMBNAIL, WEBP_QUALITY),
    resizeToWidth(img, SIZE_MEDIUM, WEBP_QUALITY),
    resizeToWidth(img, SIZE_FULL, WEBP_QUALITY),
  ])

  return {
    thumbnail,
    medium,
    full,
    original: {
      width: img.naturalWidth,
      height: img.naturalHeight,
    },
  }
}

/** Convert a File to a data URL */
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}
