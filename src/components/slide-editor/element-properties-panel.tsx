'use client'

import type { SlideElement, SlideShapeElement } from '@/types'
import { X } from 'lucide-react'
import { t } from '@/lib/i18n'

interface Props {
  element: SlideElement
  onUpdate: (props: Partial<SlideElement>) => void
  onClose: () => void
}

export default function ElementPropertiesPanel({ element, onUpdate, onClose }: Props) {
  const _hasOpacity = 'opacity' in element
  const _hasShadow = 'shadow' in element
  const _hasFlip = 'flipH' in element
  const isShape = element.type === 'shape'
  const shape = isShape ? (element as SlideShapeElement) : null

  return (
    <div className="absolute right-0 top-0 w-64 h-full bg-slate-900 border-l border-slate-700 z-40 overflow-y-auto">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
        <span className="text-white text-sm font-medium">{t('properties')}</span>
        <button onClick={onClose} className="text-slate-400 hover:text-white">
          <X size={16} />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Opacity */}
        <div>
          <label className="text-xs text-slate-400 block mb-1">{t('opacity')}</label>
          <input
            type="range"
            min="0"
            max="100"
            value={(element as any).opacity ?? 100}
            onChange={(e) => onUpdate({ opacity: Number(e.target.value) } as any)}
            className="w-full accent-indigo-500"
          />
          <span className="text-xs text-slate-500">{(element as any).opacity ?? 100}%</span>
        </div>

        {/* Shadow */}
        <div>
          <label className="text-xs text-slate-400 block mb-1">{t('shadow')}</label>
          <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={!!(element as any).shadow}
              onChange={(e) => {
                if (e.target.checked) {
                  onUpdate({ shadow: { offsetX: 3, offsetY: 3, blur: 6, color: 'rgba(0,0,0,0.4)' } } as any)
                } else {
                  onUpdate({ shadow: undefined } as any)
                }
              }}
              className="accent-indigo-500"
            />
            影を有効にする
          </label>
          {(element as any).shadow && (
            <div className="mt-2 space-y-2">
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-[10px] text-slate-500">X</label>
                  <input
                    type="number"
                    value={(element as any).shadow.offsetX}
                    onChange={(e) =>
                      onUpdate({ shadow: { ...(element as any).shadow, offsetX: Number(e.target.value) } } as any)
                    }
                    className="w-full bg-slate-800 text-white text-xs px-2 py-1 rounded border border-slate-700"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] text-slate-500">Y</label>
                  <input
                    type="number"
                    value={(element as any).shadow.offsetY}
                    onChange={(e) =>
                      onUpdate({ shadow: { ...(element as any).shadow, offsetY: Number(e.target.value) } } as any)
                    }
                    className="w-full bg-slate-800 text-white text-xs px-2 py-1 rounded border border-slate-700"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] text-slate-500">ぼかし</label>
                  <input
                    type="number"
                    min="0"
                    value={(element as any).shadow.blur}
                    onChange={(e) =>
                      onUpdate({ shadow: { ...(element as any).shadow, blur: Number(e.target.value) } } as any)
                    }
                    className="w-full bg-slate-800 text-white text-xs px-2 py-1 rounded border border-slate-700"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] text-slate-500">色</label>
                <input
                  type="color"
                  value={(element as any).shadow.color?.startsWith('rgba') ? '#000000' : (element as any).shadow.color}
                  onChange={(e) => onUpdate({ shadow: { ...(element as any).shadow, color: e.target.value } } as any)}
                  className="w-full h-6 bg-transparent cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>

        {/* Flip */}
        <div>
          <label className="text-xs text-slate-400 block mb-1">{t('flipH')}</label>
          <div className="flex gap-2">
            <button
              onClick={() => onUpdate({ flipH: !(element as any).flipH } as any)}
              className={`flex-1 px-3 py-1.5 text-xs rounded border transition-colors ${(element as any).flipH ? 'bg-indigo-500/20 border-indigo-500 text-indigo-400' : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500'}`}
            >
              水平反転
            </button>
            <button
              onClick={() => onUpdate({ flipV: !(element as any).flipV } as any)}
              className={`flex-1 px-3 py-1.5 text-xs rounded border transition-colors ${(element as any).flipV ? 'bg-indigo-500/20 border-indigo-500 text-indigo-400' : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500'}`}
            >
              垂直反転
            </button>
          </div>
        </div>

        {/* Shape-specific: fill, stroke, gradient */}
        {shape && (
          <>
            <div>
              <label className="text-xs text-slate-400 block mb-1">塗りつぶし</label>
              <input
                type="color"
                value={shape.fill}
                onChange={(e) => onUpdate({ fill: e.target.value } as any)}
                className="w-full h-8 bg-transparent cursor-pointer rounded"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">枠線</label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={shape.stroke || '#ffffff'}
                  onChange={(e) => onUpdate({ stroke: e.target.value } as any)}
                  className="w-8 h-8 bg-transparent cursor-pointer"
                />
                <input
                  type="number"
                  min="0"
                  max="20"
                  value={shape.strokeWidth || 0}
                  onChange={(e) => onUpdate({ strokeWidth: Number(e.target.value) } as any)}
                  className="flex-1 bg-slate-800 text-white text-xs px-2 py-1 rounded border border-slate-700"
                  placeholder="幅"
                />
                <select
                  value={shape.strokeDash || 'solid'}
                  onChange={(e) => onUpdate({ strokeDash: e.target.value } as any)}
                  className="bg-slate-800 text-white text-xs px-2 py-1 rounded border border-slate-700"
                >
                  <option value="solid">実線</option>
                  <option value="dashed">破線</option>
                  <option value="dotted">点線</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">{t('gradient')}</label>
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!shape.gradientFill}
                  onChange={(e) => {
                    if (e.target.checked) {
                      onUpdate({ gradientFill: { color1: shape.fill, color2: '#1e293b', angle: 135 } } as any)
                    } else {
                      onUpdate({ gradientFill: undefined } as any)
                    }
                  }}
                  className="accent-indigo-500"
                />
                グラデーション
              </label>
              {shape.gradientFill && (
                <div className="mt-2 flex gap-2 items-center">
                  <input
                    type="color"
                    value={shape.gradientFill.color1}
                    onChange={(e) =>
                      onUpdate({ gradientFill: { ...shape.gradientFill!, color1: e.target.value } } as any)
                    }
                    className="w-8 h-8 bg-transparent cursor-pointer"
                  />
                  <input
                    type="color"
                    value={shape.gradientFill.color2}
                    onChange={(e) =>
                      onUpdate({ gradientFill: { ...shape.gradientFill!, color2: e.target.value } } as any)
                    }
                    className="w-8 h-8 bg-transparent cursor-pointer"
                  />
                  <input
                    type="number"
                    min="0"
                    max="360"
                    value={shape.gradientFill.angle}
                    onChange={(e) =>
                      onUpdate({ gradientFill: { ...shape.gradientFill!, angle: Number(e.target.value) } } as any)
                    }
                    className="flex-1 bg-slate-800 text-white text-xs px-2 py-1 rounded border border-slate-700"
                  />
                  <span className="text-[10px] text-slate-500">°</span>
                </div>
              )}
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">図形内テキスト</label>
              <input
                type="text"
                value={shape.textContent || ''}
                onChange={(e) => onUpdate({ textContent: e.target.value } as any)}
                className="w-full bg-slate-800 text-white text-xs px-2 py-1.5 rounded border border-slate-700"
                placeholder="テキストを入力"
              />
              {shape.textContent && (
                <div className="mt-2 flex gap-2">
                  <input
                    type="color"
                    value={shape.textColor || '#ffffff'}
                    onChange={(e) => onUpdate({ textColor: e.target.value } as any)}
                    className="w-8 h-8 bg-transparent cursor-pointer"
                  />
                  <input
                    type="number"
                    min="8"
                    max="120"
                    value={shape.textFontSize || 20}
                    onChange={(e) => onUpdate({ textFontSize: Number(e.target.value) } as any)}
                    className="flex-1 bg-slate-800 text-white text-xs px-2 py-1 rounded border border-slate-700"
                    placeholder="サイズ"
                  />
                </div>
              )}
            </div>
          </>
        )}

        {/* Lock */}
        <div>
          <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={!!(element as any).locked}
              onChange={(e) => onUpdate({ locked: e.target.checked } as any)}
              className="accent-indigo-500"
            />
            {(element as any).locked ? t('unlock') : t('lock')}
          </label>
        </div>
      </div>
    </div>
  )
}
