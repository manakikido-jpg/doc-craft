'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import {
  ImageIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Rows3,
  Crop,
  Check,
  X,
  Square,
  Layers,
  ArrowUpFromLine,
  ArrowDownFromLine,
} from 'lucide-react'
import { fileToDataURL, isStorageNearLimit } from '@/lib/image-utils'
import { useToast } from '@/components/shared/toast'

type WrapStyle = 'inline' | 'square' | 'tight' | 'behind' | 'infront'

interface Props {
  src?: string
  alt?: string
  width?: string
  imageAlign?: string
  caption?: string
  wrapText?: 'none' | 'left' | 'right'
  wrapStyle?: WrapStyle
  brightness?: string
  contrast?: string
  figureIndex?: number
  onImageSet: (src: string, alt: string) => void
  onUpdateProps?: (data: Record<string, string>) => void
}

export default function ImageBlock({
  src,
  alt,
  width,
  imageAlign,
  caption,
  wrapText,
  wrapStyle,
  brightness,
  contrast,
  figureIndex,
  onImageSet,
  onUpdateProps,
}: Props) {
  const { addToast } = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [resizing, setResizing] = useState(false)
  const [resizeSize, setResizeSize] = useState<{ w: number; h: number } | null>(null)
  const [selected, setSelected] = useState(false)
  const [cropping, setCropping] = useState(false)
  const [cropRect, setCropRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const [editingAlt, setEditingAlt] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const cropContainerRef = useRef<HTMLDivElement>(null)
  const startX = useRef(0)
  const startY = useRef(0)
  const startW = useRef(0)
  const startH = useRef(0)
  const aspectRatio = useRef(1)

  const brightnessVal = brightness ? parseInt(brightness) : 100
  const contrastVal = contrast ? parseInt(contrast) : 100
  const currentWrapStyle: WrapStyle = wrapStyle || 'inline'

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) return
    if (isStorageNearLimit()) {
      addToast('ストレージの容量が不足しています。不要なドキュメントを削除してください。', 'warning')
      return
    }
    setLoading(true)
    try {
      const dataUrl = await fileToDataURL(file)
      onImageSet(dataUrl, file.name)
    } catch {
      addToast('画像の読み込みに失敗しました。', 'error')
    }
    setLoading(false)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  // Click outside to deselect
  useEffect(() => {
    if (!selected) return
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setSelected(false)
        setEditingAlt(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [selected])

  const handleResizeStart = useCallback(
    (e: React.MouseEvent, direction: string) => {
      e.preventDefault()
      e.stopPropagation()
      setResizing(true)
      startX.current = e.clientX
      startY.current = e.clientY
      startW.current = imgRef.current?.offsetWidth || 300
      startH.current = imgRef.current?.offsetHeight || 200
      aspectRatio.current = startW.current / startH.current

      function onMove(ev: MouseEvent) {
        const dx = ev.clientX - startX.current
        const dy = ev.clientY - startY.current
        let newW = startW.current
        let newH = startH.current

        const isLeft = direction.includes('l')
        const isRight = direction.includes('r')
        const isTop = direction.includes('t')
        const isBottom = direction.includes('b')
        const isCorner = (isLeft || isRight) && (isTop || isBottom)

        if (isCorner) {
          const xDiff = isLeft ? -dx : dx
          newW = Math.max(80, Math.min(1200, startW.current + xDiff))
          if (!ev.shiftKey) {
            newH = newW / aspectRatio.current
          } else {
            const yDiff = isTop ? -dy : dy
            newH = Math.max(40, startH.current + yDiff)
          }
        } else if (isLeft || isRight) {
          const xDiff = isLeft ? -dx : dx
          newW = Math.max(80, Math.min(1200, startW.current + xDiff))
          newH = newW / aspectRatio.current
        }

        if (imgRef.current) {
          imgRef.current.style.width = `${newW}px`
          imgRef.current.style.height = `${newH}px`
        }
        setResizeSize({ w: Math.round(newW), h: Math.round(newH) })
      }

      function onUp() {
        const w = imgRef.current?.offsetWidth || startW.current
        onUpdateProps?.({ width: `${w}px` })
        setResizing(false)
        setResizeSize(null)
        if (imgRef.current) imgRef.current.style.height = ''
        window.removeEventListener('mousemove', onMove)
        window.removeEventListener('mouseup', onUp)
      }

      window.addEventListener('mousemove', onMove)
      window.addEventListener('mouseup', onUp)
    },
    [onUpdateProps],
  )

  // Crop functionality
  function startCrop() {
    setCropping(true)
    const imgW = imgRef.current?.offsetWidth || 300
    const imgH = imgRef.current?.offsetHeight || 200
    setCropRect({ x: imgW * 0.1, y: imgH * 0.1, w: imgW * 0.8, h: imgH * 0.8 })
  }

  function applyCrop() {
    if (!cropRect || !imgRef.current || !src) return
    const img = imgRef.current
    const scaleX = img.naturalWidth / img.offsetWidth
    const scaleY = img.naturalHeight / img.offsetHeight

    const canvas = document.createElement('canvas')
    const sx = cropRect.x * scaleX
    const sy = cropRect.y * scaleY
    const sw = cropRect.w * scaleX
    const sh = cropRect.h * scaleY
    canvas.width = sw
    canvas.height = sh

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const tempImg = new Image()
    tempImg.onload = () => {
      ctx.drawImage(tempImg, sx, sy, sw, sh, 0, 0, sw, sh)
      const croppedUrl = canvas.toDataURL('image/png')
      onImageSet(croppedUrl, alt || '')
      setCropping(false)
      setCropRect(null)
    }
    tempImg.src = src
  }

  function cancelCrop() {
    setCropping(false)
    setCropRect(null)
  }

  // Crop handle drag
  function handleCropHandleDrag(e: React.MouseEvent, handle: string) {
    e.preventDefault()
    e.stopPropagation()
    if (!cropRect) return
    const startMX = e.clientX
    const startMY = e.clientY
    const startCrop = { ...cropRect }
    const imgW = imgRef.current?.offsetWidth || 300
    const imgH = imgRef.current?.offsetHeight || 200

    function onMove(ev: MouseEvent) {
      const dx = ev.clientX - startMX
      const dy = ev.clientY - startMY
      const next = { ...startCrop }

      if (handle.includes('l')) { next.x = Math.max(0, startCrop.x + dx); next.w = startCrop.w - dx }
      if (handle.includes('r')) { next.w = Math.max(20, startCrop.w + dx) }
      if (handle.includes('t')) { next.y = Math.max(0, startCrop.y + dy); next.h = startCrop.h - dy }
      if (handle.includes('b')) { next.h = Math.max(20, startCrop.h + dy) }

      // Clamp
      if (next.x + next.w > imgW) next.w = imgW - next.x
      if (next.y + next.h > imgH) next.h = imgH - next.y
      next.w = Math.max(20, next.w)
      next.h = Math.max(20, next.h)

      setCropRect(next)
    }

    function onUp() {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const resizeHandles = [
    { pos: 'tl', cursor: 'nw-resize', cls: '-top-1 -left-1' },
    { pos: 'tr', cursor: 'ne-resize', cls: '-top-1 -right-1' },
    { pos: 'bl', cursor: 'sw-resize', cls: '-bottom-1 -left-1' },
    { pos: 'br', cursor: 'se-resize', cls: '-bottom-1 -right-1' },
    { pos: 'l', cursor: 'ew-resize', cls: 'top-1/2 -left-1 -translate-y-1/2' },
    { pos: 'r', cursor: 'ew-resize', cls: 'top-1/2 -right-1 -translate-y-1/2' },
  ]

  const cropHandles = [
    { pos: 'tl', cursor: 'nw-resize', cls: '-top-1 -left-1' },
    { pos: 'tr', cursor: 'ne-resize', cls: '-top-1 -right-1' },
    { pos: 'bl', cursor: 'sw-resize', cls: '-bottom-1 -left-1' },
    { pos: 'br', cursor: 'se-resize', cls: '-bottom-1 -right-1' },
    { pos: 't', cursor: 'ns-resize', cls: '-top-1 left-1/2 -translate-x-1/2' },
    { pos: 'b', cursor: 'ns-resize', cls: '-bottom-1 left-1/2 -translate-x-1/2' },
    { pos: 'l', cursor: 'ew-resize', cls: 'top-1/2 -left-1 -translate-y-1/2' },
    { pos: 'r', cursor: 'ew-resize', cls: 'top-1/2 -right-1 -translate-y-1/2' },
  ]

  const currentAlign = imageAlign || 'left'
  const currentWrap = wrapText || 'none'

  // Compute wrap CSS based on wrapStyle
  function getWrapContainerStyle(): React.CSSProperties {
    switch (currentWrapStyle) {
      case 'square':
        return { float: 'left', marginRight: '16px', marginBottom: '8px' }
      case 'tight':
        return { float: 'left', marginRight: '16px', marginBottom: '8px', shapeOutside: 'content-box' }
      case 'behind':
        return { position: 'relative', zIndex: -1 }
      case 'infront':
        return { position: 'relative', zIndex: 10 }
      case 'inline':
      default:
        // Use legacy wrapText for backward compat
        if (currentWrap === 'left') return { float: 'left', marginRight: '1rem', marginBottom: '0.5rem' }
        if (currentWrap === 'right') return { float: 'right', marginLeft: '1rem', marginBottom: '0.5rem' }
        return {}
    }
  }

  const figureNum = figureIndex || 1

  if (src) {
    const wrapContainerStyle = getWrapContainerStyle()
    const isWrapped = currentWrapStyle !== 'inline' || currentWrap !== 'none'
    const filterStyle = (brightnessVal !== 100 || contrastVal !== 100)
      ? `brightness(${brightnessVal}%) contrast(${contrastVal}%)`
      : undefined

    return (
      <figure
        className={`my-3 group relative ${!isWrapped ? (currentAlign === 'center' ? 'flex flex-col items-center' : currentAlign === 'right' ? 'flex flex-col items-end' : '') : ''}`}
        style={isWrapped ? { overflow: 'hidden' } : undefined}
      >
        <div
          ref={containerRef}
          className="relative inline-block"
          style={wrapContainerStyle}
          onClick={(e) => { e.stopPropagation(); setSelected(true) }}
        >
          <img
            ref={imgRef}
            src={src}
            alt={alt || ''}
            className={`rounded-lg ${selected ? 'border-2 border-indigo-500' : 'border border-slate-700'} ${resizing ? '' : 'transition-all'}`}
            style={{
              width: width || undefined,
              maxWidth: '100%',
              maxHeight: '600px',
              objectFit: 'contain',
              filter: filterStyle,
            }}
          />

          {/* Crop overlay */}
          {cropping && cropRect && (
            <div ref={cropContainerRef} className="absolute inset-0 z-30">
              {/* Dark overlay */}
              <div className="absolute inset-0 bg-black/50" />
              {/* Crop area */}
              <div
                className="absolute border-2 border-white bg-transparent"
                style={{
                  left: cropRect.x,
                  top: cropRect.y,
                  width: cropRect.w,
                  height: cropRect.h,
                  boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)',
                }}
              >
                {cropHandles.map(({ pos, cursor, cls }) => (
                  <div
                    key={pos}
                    onMouseDown={(e) => handleCropHandleDrag(e, pos)}
                    className={`absolute ${cls} w-2.5 h-2.5 bg-white border border-slate-400 rounded-sm z-10`}
                    style={{ cursor }}
                  />
                ))}
              </div>
              {/* Crop actions */}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-40">
                <button onClick={applyCrop} className="p-1.5 bg-green-600 text-white rounded hover:bg-green-500" title="適用">
                  <Check size={14} />
                </button>
                <button onClick={cancelCrop} className="p-1.5 bg-red-600 text-white rounded hover:bg-red-500" title="キャンセル">
                  <X size={14} />
                </button>
              </div>
            </div>
          )}

          {/* Resize handles - visible when selected and not cropping */}
          {selected && !cropping && resizeHandles.map(({ pos, cursor, cls }) => (
            <div
              key={pos}
              onMouseDown={(e) => handleResizeStart(e, pos)}
              className={`absolute ${cls} w-2.5 h-2.5 bg-indigo-500 border border-white rounded-sm z-10`}
              style={{ cursor }}
            />
          ))}
          {/* Size indicator while resizing */}
          {resizing && resizeSize && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/75 text-white text-xs px-2 py-1 rounded pointer-events-none z-20 whitespace-nowrap">
              {resizeSize.w} x {resizeSize.h}
            </div>
          )}
          {/* Main Toolbar (alignment + wrap + change + crop) */}
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-all">
            <button
              onClick={() => onUpdateProps?.({ imageAlign: 'left' })}
              className={`p-1 rounded ${currentAlign === 'left' ? 'bg-indigo-500/30' : 'bg-slate-800/80'} text-slate-300 text-xs backdrop-blur-sm hover:bg-slate-700`}
              title="左揃え"
            >
              <AlignLeft size={12} />
            </button>
            <button
              onClick={() => onUpdateProps?.({ imageAlign: 'center' })}
              className={`p-1 rounded ${currentAlign === 'center' ? 'bg-indigo-500/30' : 'bg-slate-800/80'} text-slate-300 text-xs backdrop-blur-sm hover:bg-slate-700`}
              title="中央揃え"
            >
              <AlignCenter size={12} />
            </button>
            <button
              onClick={() => onUpdateProps?.({ imageAlign: 'right' })}
              className={`p-1 rounded ${currentAlign === 'right' ? 'bg-indigo-500/30' : 'bg-slate-800/80'} text-slate-300 text-xs backdrop-blur-sm hover:bg-slate-700`}
              title="右揃え"
            >
              <AlignRight size={12} />
            </button>
            <div className="w-px h-4 bg-slate-600 mx-0.5" />
            <button
              onClick={() => onUpdateProps?.({ wrapText: currentWrap === 'left' ? 'none' : 'left' })}
              className={`p-1 rounded ${currentWrap === 'left' ? 'bg-indigo-500/30' : 'bg-slate-800/80'} text-slate-300 text-xs backdrop-blur-sm hover:bg-slate-700`}
              title="テキスト回り込み（左）"
            >
              <Rows3 size={12} style={{ transform: 'scaleX(-1)' }} />
            </button>
            <button
              onClick={() => onUpdateProps?.({ wrapText: currentWrap === 'right' ? 'none' : 'right' })}
              className={`p-1 rounded ${currentWrap === 'right' ? 'bg-indigo-500/30' : 'bg-slate-800/80'} text-slate-300 text-xs backdrop-blur-sm hover:bg-slate-700`}
              title="テキスト回り込み（右）"
            >
              <Rows3 size={12} />
            </button>
            <div className="w-px h-4 bg-slate-600 mx-0.5" />
            <button
              onClick={startCrop}
              className="p-1 rounded bg-slate-800/80 text-slate-300 text-xs backdrop-blur-sm hover:bg-slate-700"
              title="トリミング"
            >
              <Crop size={12} />
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              className="px-2 py-1 bg-slate-800/80 text-slate-300 text-xs rounded backdrop-blur-sm hover:bg-slate-700"
            >
              変更
            </button>
          </div>
        </div>

        {/* Wrap style toolbar below image */}
        {selected && !cropping && (
          <div className="flex items-center gap-1 mt-1 justify-center">
            <span className="text-[9px] text-slate-500 mr-1">折返し:</span>
            {([
              { key: 'inline', label: '行内', icon: <Square size={10} /> },
              { key: 'square', label: '四角', icon: <Rows3 size={10} /> },
              { key: 'tight', label: '詰め', icon: <Rows3 size={10} style={{ transform: 'scaleX(-1)' }} /> },
              { key: 'behind', label: '背面', icon: <ArrowDownFromLine size={10} /> },
              { key: 'infront', label: '前面', icon: <ArrowUpFromLine size={10} /> },
            ] as const).map((ws) => (
              <button
                key={ws.key}
                onClick={() => onUpdateProps?.({ wrapStyle: ws.key })}
                className={`flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded transition-colors ${
                  currentWrapStyle === ws.key ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-800 text-slate-500 hover:text-white'
                }`}
                title={ws.label}
              >
                {ws.icon}
                <span>{ws.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Brightness/Contrast sliders when selected */}
        {selected && !cropping && (
          <div className="mt-2 space-y-1 max-w-xs mx-auto">
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-slate-500 w-14 text-right">明るさ</span>
              <input
                type="range"
                min={0}
                max={200}
                value={brightnessVal}
                onChange={(e) => onUpdateProps?.({ brightness: e.target.value })}
                className="flex-1 accent-indigo-500 h-1"
              />
              <span className="text-[9px] text-slate-400 w-8">{brightnessVal}%</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-slate-500 w-14 text-right">コントラスト</span>
              <input
                type="range"
                min={0}
                max={200}
                value={contrastVal}
                onChange={(e) => onUpdateProps?.({ contrast: e.target.value })}
                className="flex-1 accent-indigo-500 h-1"
              />
              <span className="text-[9px] text-slate-400 w-8">{contrastVal}%</span>
            </div>
          </div>
        )}

        {/* Alt text input when selected */}
        {selected && !cropping && (
          <div className="mt-1 max-w-xs mx-auto">
            <div
              className="flex items-center gap-1 cursor-pointer"
              onClick={() => setEditingAlt(true)}
            >
              <span className="text-[9px] text-slate-500">Alt:</span>
              {editingAlt ? (
                <input
                  type="text"
                  value={alt || ''}
                  onChange={(e) => onUpdateProps?.({ alt: e.target.value })}
                  onBlur={() => setEditingAlt(false)}
                  onKeyDown={(e) => { if (e.key === 'Enter') setEditingAlt(false) }}
                  autoFocus
                  className="flex-1 text-[10px] bg-slate-800 text-slate-300 rounded px-1 py-0.5 border border-slate-700 focus:border-indigo-500 focus:outline-none"
                  placeholder="代替テキストを入力..."
                />
              ) : (
                <span className="text-[10px] text-slate-400 hover:text-slate-300 truncate max-w-[200px]">
                  {alt || 'クリックして追加...'}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Figure Caption */}
        <figcaption className="mt-1 text-center">
          <span className="text-xs text-slate-500 mr-1">図 {figureNum}.</span>
          <span
            contentEditable
            suppressContentEditableWarning
            data-placeholder="キャプションを追加..."
            className="text-sm text-slate-400 italic focus:outline-none focus:text-slate-300 min-h-[1.2em] empty:before:content-[attr(data-placeholder)] empty:before:text-slate-500/50 cursor-text"
            onBlur={(e) => {
              const text = e.currentTarget.innerText.trim()
              onUpdateProps?.({ caption: text })
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                ;(e.target as HTMLElement).blur()
              }
            }}
            dangerouslySetInnerHTML={{ __html: caption || '' }}
          />
        </figcaption>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
          }}
        />
      </figure>
    )
  }

  return (
    <div
      className={`my-3 border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
        dragging ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-700 hover:border-slate-500'
      }`}
      onClick={() => fileRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      {loading ? (
        <div className="text-slate-400 text-sm animate-pulse">読み込み中...</div>
      ) : (
        <>
          <ImageIcon size={32} className="mb-2 text-slate-500" />
          <div className="text-slate-400 text-sm">クリックまたはドラッグ&ドロップで画像を追加</div>
          <div className="text-slate-600 text-xs mt-1">JPG, PNG, GIF 対応</div>
        </>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
        }}
      />
    </div>
  )
}
