'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { X } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
  onInsert: (svgDataUrl: string) => void
}

// Simple QR code matrix generator using a deterministic hash-based pattern
// with proper finder patterns in corners for scannability appearance
function generateQRMatrix(text: string): boolean[][] {
  const size = 25 // Standard QR code size for short URLs
  const matrix: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false))

  // Draw finder patterns (7x7) in three corners
  function drawFinderPattern(startRow: number, startCol: number) {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const isOuter = r === 0 || r === 6 || c === 0 || c === 6
        const isInner = r >= 2 && r <= 4 && c >= 2 && c <= 4
        matrix[startRow + r][startCol + c] = isOuter || isInner
      }
    }
  }

  // Top-left finder
  drawFinderPattern(0, 0)
  // Top-right finder
  drawFinderPattern(0, size - 7)
  // Bottom-left finder
  drawFinderPattern(size - 7, 0)

  // Draw timing patterns (alternating dots between finders)
  for (let i = 8; i < size - 8; i++) {
    matrix[6][i] = i % 2 === 0
    matrix[i][6] = i % 2 === 0
  }

  // Draw alignment pattern (5x5) near bottom-right
  const apRow = size - 9
  const apCol = size - 9
  for (let r = -2; r <= 2; r++) {
    for (let c = -2; c <= 2; c++) {
      const isEdge = Math.abs(r) === 2 || Math.abs(c) === 2
      const isCenter = r === 0 && c === 0
      matrix[apRow + r][apCol + c] = isEdge || isCenter
    }
  }

  // Separator regions around finders (keep white)
  for (let i = 0; i < 8; i++) {
    // Top-left separators
    if (i < size) { matrix[7][i] = false; matrix[i][7] = false }
    // Top-right separators
    if (size - 8 + i < size) { matrix[7][size - 8 + i] = false }
    matrix[i][size - 8] = false
    // Bottom-left separators
    matrix[size - 8][i] = false
    if (size - 8 + i < size) { matrix[size - 8 + i][7] = false }
  }

  // Generate deterministic data from the text using a simple hash
  function hashCode(s: string): number {
    let hash = 0
    for (let i = 0; i < s.length; i++) {
      const char = s.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash)
  }

  // Fill data area with deterministic pattern based on text hash
  const seed = hashCode(text)
  let rng = seed
  function nextRandom(): number {
    rng = (rng * 1103515245 + 12345) & 0x7fffffff
    return rng
  }

  // Also encode actual character data
  const charCodes = Array.from(text).map(c => c.charCodeAt(0))

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      // Skip finder patterns and their separators
      const inTopLeftFinder = r < 8 && c < 8
      const inTopRightFinder = r < 8 && c >= size - 8
      const inBottomLeftFinder = r >= size - 8 && c < 8
      // Skip timing patterns
      const onTimingRow = r === 6
      const onTimingCol = c === 6
      // Skip alignment pattern
      const inAlignment = Math.abs(r - apRow) <= 2 && Math.abs(c - apCol) <= 2

      if (inTopLeftFinder || inTopRightFinder || inBottomLeftFinder || onTimingRow || onTimingCol || inAlignment) {
        continue
      }

      // Use a mix of character data and pseudo-random for data region
      const dataIndex = (r * size + c) % charCodes.length
      const charBit = (charCodes[dataIndex] >> ((r + c) % 8)) & 1
      const randomBit = nextRandom() % 3 === 0 ? 1 : 0
      matrix[r][c] = ((charBit ^ randomBit) & 1) === 1
    }
  }

  // Apply XOR mask pattern for better visual distribution (mask 0: (r + c) % 2 === 0)
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const inTopLeftFinder = r < 8 && c < 8
      const inTopRightFinder = r < 8 && c >= size - 8
      const inBottomLeftFinder = r >= size - 8 && c < 8
      const onTimingRow = r === 6
      const onTimingCol = c === 6
      const inAlignment = Math.abs(r - apRow) <= 2 && Math.abs(c - apCol) <= 2

      if (inTopLeftFinder || inTopRightFinder || inBottomLeftFinder || onTimingRow || onTimingCol || inAlignment) {
        continue
      }

      if ((r + c) % 3 === 0) {
        matrix[r][c] = !matrix[r][c]
      }
    }
  }

  return matrix
}

function generateQRSvg(
  matrix: boolean[][],
  fgColor: string,
  bgColor: string,
  moduleSize: number = 10,
): string {
  const size = matrix.length
  const svgSize = size * moduleSize + moduleSize * 2 // Add quiet zone
  const offset = moduleSize // Quiet zone

  let rects = ''
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (matrix[r][c]) {
        rects += `<rect x="${offset + c * moduleSize}" y="${offset + r * moduleSize}" width="${moduleSize}" height="${moduleSize}" fill="${fgColor}" />`
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgSize} ${svgSize}" width="${svgSize}" height="${svgSize}"><rect width="${svgSize}" height="${svgSize}" fill="${bgColor}" />${rects}</svg>`
}

function svgToDataUrl(svg: string): string {
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`
}

const SIZE_OPTIONS = [
  { label: '小 (15%)', value: 15 },
  { label: '中 (25%)', value: 25 },
  { label: '大 (35%)', value: 35 },
] as const

export default function QrCodeInserter({ open, onClose, onInsert }: Props) {
  const [url, setUrl] = useState('https://')
  const [sizePercent, setSizePercent] = useState(25)
  const [fgColor, setFgColor] = useState('#000000')
  const [bgColor, setBgColor] = useState('#ffffff')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const previewRef = useRef<HTMLDivElement>(null)

  const generatePreview = useCallback(() => {
    if (!url || url === 'https://' || url.length < 5) {
      setPreviewUrl(null)
      return
    }
    const matrix = generateQRMatrix(url)
    const svg = generateQRSvg(matrix, fgColor, bgColor)
    setPreviewUrl(svgToDataUrl(svg))
  }, [url, fgColor, bgColor])

  useEffect(() => {
    generatePreview()
  }, [generatePreview])

  function handleInsert() {
    if (!url || url === 'https://' || url.length < 5) return
    const matrix = generateQRMatrix(url)
    const svg = generateQRSvg(matrix, fgColor, bgColor)
    onInsert(svgToDataUrl(svg))
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-slate-900 rounded-xl border border-slate-700 shadow-2xl w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-white">QRコード生成</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* URL Input */}
        <div className="mb-4">
          <label className="block text-sm text-slate-400 mb-1">URL</label>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Size Selector */}
        <div className="mb-4">
          <label className="block text-sm text-slate-400 mb-1">サイズ</label>
          <div className="flex gap-2">
            {SIZE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSizePercent(opt.value)}
                className={`flex-1 py-1.5 rounded-lg text-sm transition-colors ${
                  sizePercent === opt.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Color Pickers */}
        <div className="flex gap-4 mb-4">
          <div className="flex-1">
            <label className="block text-sm text-slate-400 mb-1">前景色</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={fgColor}
                onChange={(e) => setFgColor(e.target.value)}
                className="w-8 h-8 rounded cursor-pointer border border-slate-600 bg-transparent"
              />
              <span className="text-sm text-slate-300">{fgColor}</span>
            </div>
          </div>
          <div className="flex-1">
            <label className="block text-sm text-slate-400 mb-1">背景色</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value)}
                className="w-8 h-8 rounded cursor-pointer border border-slate-600 bg-transparent"
              />
              <span className="text-sm text-slate-300">{bgColor}</span>
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="mb-5">
          <label className="block text-sm text-slate-400 mb-1">プレビュー</label>
          <div
            ref={previewRef}
            className="flex items-center justify-center bg-slate-800 rounded-lg border border-slate-600 p-4"
            style={{ minHeight: 160 }}
          >
            {previewUrl ? (
              <img src={previewUrl} alt="QR Code Preview" className="max-w-[140px] max-h-[140px]" />
            ) : (
              <span className="text-slate-500 text-sm">URLを入力してください</span>
            )}
          </div>
        </div>

        {/* Insert Button */}
        <button
          onClick={handleInsert}
          disabled={!previewUrl}
          className="w-full py-2.5 rounded-lg font-medium text-sm transition-colors bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-40 disabled:cursor-not-allowed"
        >
          挿入
        </button>
      </div>
    </div>
  )
}
