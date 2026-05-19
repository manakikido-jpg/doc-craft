/**
 * Image utilities for DocCraft
 * Handles file-to-base64 conversion with resizing for localStorage storage.
 */

const MAX_DIMENSION = 1200
const JPEG_QUALITY = 0.7

/** Convert a File to a resized base64 data URL */
export function fileToDataURL(file: File, maxDim = MAX_DIMENSION): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width)
            width = maxDim
          } else {
            width = Math.round((width * maxDim) / height)
            height = maxDim
          }
        }

        // Draw onto canvas and export
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Canvas not supported'))
          return
        }
        ctx.drawImage(img, 0, 0, width, height)

        // Use JPEG for photos, PNG for transparency
        const isTransparent = file.type === 'image/png' || file.type === 'image/gif'
        const dataUrl = isTransparent ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', JPEG_QUALITY)
        resolve(dataUrl)
      }
      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = reader.result as string
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

/** Get current localStorage usage in bytes */
export function getLocalStorageUsage(): { usedMB: number; limitMB: number } {
  let total = 0
  for (const key of Object.keys(localStorage)) {
    total += key.length + (localStorage.getItem(key)?.length ?? 0)
  }
  // Each char = 2 bytes in UTF-16
  return { usedMB: (total * 2) / (1024 * 1024), limitMB: 5 }
}

/** Check if localStorage is approaching limit */
export function isStorageNearLimit(): boolean {
  const { usedMB, limitMB } = getLocalStorageUsage()
  return usedMB > limitMB * 0.8
}
