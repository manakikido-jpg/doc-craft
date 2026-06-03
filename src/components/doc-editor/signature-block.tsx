'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Upload, Pen, Trash2 } from 'lucide-react'

interface Props {
  data?: Record<string, string>
  onUpdateData?: (data: Record<string, string>) => void
}

export default function SignatureBlock({ data, onUpdateData }: Props) {
  const [editing, setEditing] = useState(false)
  const [drawMode, setDrawMode] = useState(false)
  const [isDrawing, setIsDrawing] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const name = data?.name || ''
  const title = data?.title || ''
  const date = data?.date || ''
  const company = data?.company || ''
  const signatureImage = data?.signatureImage || ''

  function handleSave(field: string, value: string) {
    onUpdateData?.({ ...data, [field]: value } as Record<string, string>)
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string
      if (dataUrl) {
        handleSave('signatureImage', dataUrl)
      }
    }
    reader.readAsDataURL(file)
    // Reset input so same file can be selected again
    e.target.value = ''
  }

  function clearSignatureImage() {
    const next = { ...data } as Record<string, string>
    delete next.signatureImage
    onUpdateData?.(next)
  }

  // Canvas drawing
  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    // Set canvas size
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * 2
    canvas.height = rect.height * 2
    ctx.scale(2, 2)
    ctx.strokeStyle = '#e2e8f0'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [])

  useEffect(() => {
    if (drawMode) {
      initCanvas()
    }
  }, [drawMode, initCanvas])

  function getCanvasPos(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  function handleMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    setIsDrawing(true)
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx) return
    const pos = getCanvasPos(e)
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
  }

  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!isDrawing) return
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx) return
    const pos = getCanvasPos(e)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
  }

  function handleMouseUp() {
    setIsDrawing(false)
  }

  function saveCanvasAsSignature() {
    const canvas = canvasRef.current
    if (!canvas) return
    const dataUrl = canvas.toDataURL('image/png')
    handleSave('signatureImage', dataUrl)
    setDrawMode(false)
  }

  function clearCanvas() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }

  return (
    <div className="my-6 max-w-sm" onClick={() => setEditing(true)}>
      <div className="border-t-2 border-slate-600 pt-3">
        {/* Signature area */}
        <div className="mb-4 min-h-[48px] border-b border-dashed border-slate-600 flex items-end pb-1 relative">
          {signatureImage ? (
            <div className="relative group w-full">
              <img
                src={signatureImage}
                alt="署名"
                className="max-h-20 object-contain"
              />
              <button
                onClick={(e) => { e.stopPropagation(); clearSignatureImage() }}
                className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 p-1 bg-slate-800/80 text-red-400 rounded transition-opacity"
                title="署名画像を削除"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ) : (
            <span className="text-xs text-slate-600 italic">署名欄</span>
          )}
        </div>

        {/* Canvas drawing mode */}
        {drawMode && (
          <div className="mb-3 space-y-2" onClick={(e) => e.stopPropagation()}>
            <div className="text-xs text-slate-400 mb-1">マウスで署名を描いてください</div>
            <canvas
              ref={canvasRef}
              className="w-full h-24 bg-slate-900 border border-slate-600 rounded cursor-crosshair"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            />
            <div className="flex gap-2">
              <button
                onClick={saveCanvasAsSignature}
                className="text-[10px] px-2 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-500 transition-colors"
              >
                保存
              </button>
              <button
                onClick={clearCanvas}
                className="text-[10px] px-2 py-1 bg-slate-700 text-slate-300 rounded hover:bg-slate-600 transition-colors"
              >
                クリア
              </button>
              <button
                onClick={() => setDrawMode(false)}
                className="text-[10px] px-2 py-1 text-slate-500 hover:text-slate-300 transition-colors"
              >
                キャンセル
              </button>
            </div>
          </div>
        )}

        {editing ? (
          <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
            <input
              type="text"
              value={name}
              onChange={(e) => handleSave('name', e.target.value)}
              placeholder="氏名"
              className="w-full bg-transparent text-sm text-white border-b border-slate-700 focus:border-indigo-500 focus:outline-none pb-1"
            />
            <input
              type="text"
              value={title}
              onChange={(e) => handleSave('title', e.target.value)}
              placeholder="役職"
              className="w-full bg-transparent text-xs text-slate-400 border-b border-slate-700 focus:border-indigo-500 focus:outline-none pb-1"
            />
            <input
              type="text"
              value={company}
              onChange={(e) => handleSave('company', e.target.value)}
              placeholder="会社名"
              className="w-full bg-transparent text-xs text-slate-400 border-b border-slate-700 focus:border-indigo-500 focus:outline-none pb-1"
            />
            <input
              type="text"
              value={date}
              onChange={(e) => handleSave('date', e.target.value)}
              placeholder="日付 (例: 2026年5月18日)"
              className="w-full bg-transparent text-xs text-slate-500 border-b border-slate-700 focus:border-indigo-500 focus:outline-none pb-1"
            />
            {/* Signature image/drawing buttons */}
            <div className="flex items-center gap-2 pt-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1 text-[10px] px-2 py-1 border border-slate-700 text-slate-400 rounded hover:text-indigo-400 hover:border-indigo-500/50 transition-colors"
              >
                <Upload size={10} /> 画像をアップロード
              </button>
              <button
                onClick={() => setDrawMode(true)}
                className="flex items-center gap-1 text-[10px] px-2 py-1 border border-slate-700 text-slate-400 rounded hover:text-indigo-400 hover:border-indigo-500/50 transition-colors"
              >
                <Pen size={10} /> 手書き署名
              </button>
            </div>
            <button onClick={() => setEditing(false)} className="text-[10px] text-indigo-400 hover:text-indigo-300">
              完了
            </button>
          </div>
        ) : (
          <div className="cursor-text">
            <div className="text-sm text-white font-medium">
              {name || <span className="text-slate-600 italic">氏名を入力</span>}
            </div>
            {title && <div className="text-xs text-slate-400">{title}</div>}
            {company && <div className="text-xs text-slate-400">{company}</div>}
            {date && <div className="text-xs text-slate-500 mt-1">{date}</div>}
          </div>
        )}
      </div>
    </div>
  )
}
