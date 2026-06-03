'use client'

import { useState } from 'react'
import type { SlideMaster, SlideElement, SlideThemeKey, SlideTextElement } from '@/types'
import { generateId } from '@/lib/utils'
import { SLIDE_THEMES, THEME_KEYS } from '@/lib/themes'
import { X, Plus, Trash2, Edit3, Check, Layout, Type, AlignLeft, MessageSquare } from 'lucide-react'

interface Props {
  masters: SlideMaster[]
  onAddMaster: (master: SlideMaster) => void
  onUpdateMaster: (id: string, updates: Partial<SlideMaster>) => void
  onDeleteMaster: (id: string) => void
  onClose: () => void
}

function createPlaceholderElement(
  kind: 'title' | 'body' | 'label',
  themeKey: SlideThemeKey
): SlideTextElement {
  const theme = SLIDE_THEMES[themeKey]
  const defaults: Record<string, Partial<SlideTextElement>> = {
    title: {
      type: 'title',
      content: 'Title Placeholder',
      x: 60,
      y: 40,
      w: 840,
      h: 80,
      fontSize: 36,
      fontWeight: '700',
      align: 'left',
      color: theme.titleColor,
    },
    body: {
      type: 'body',
      content: 'Body text placeholder',
      x: 60,
      y: 160,
      w: 840,
      h: 300,
      fontSize: 18,
      fontWeight: '400',
      align: 'left',
      color: theme.bodyColor,
    },
    label: {
      type: 'label',
      content: 'Footer placeholder',
      x: 60,
      y: 500,
      w: 840,
      h: 30,
      fontSize: 12,
      fontWeight: '400',
      align: 'center',
      color: theme.bodyColor,
    },
  }
  const d = defaults[kind]!
  return {
    id: generateId(),
    type: d.type as SlideTextElement['type'],
    content: d.content!,
    x: d.x!,
    y: d.y!,
    w: d.w!,
    h: d.h!,
    fontSize: d.fontSize!,
    fontWeight: d.fontWeight as SlideTextElement['fontWeight'],
    align: d.align as SlideTextElement['align'],
    color: d.color,
  }
}

function MiniPreview({ master }: { master: SlideMaster }) {
  const theme = SLIDE_THEMES[master.themeKey]
  return (
    <div
      className="w-full aspect-video rounded border border-slate-600 overflow-hidden relative"
      style={{ background: theme.background }}
    >
      {master.elements.map((el) => {
        if (el.type === 'title' || el.type === 'body' || el.type === 'subtitle' || el.type === 'label') {
          const textEl = el as SlideTextElement
          const scale = 0.15
          return (
            <div
              key={el.id}
              className="absolute overflow-hidden"
              style={{
                left: `${textEl.x * scale}px`,
                top: `${textEl.y * scale}px`,
                width: `${textEl.w * scale}px`,
                height: `${textEl.h * scale}px`,
                fontSize: `${Math.max(4, textEl.fontSize * scale)}px`,
                fontWeight: textEl.fontWeight,
                color: textEl.color || theme.titleColor,
                textAlign: textEl.align,
              }}
            >
              {textEl.content}
            </div>
          )
        }
        return null
      })}
    </div>
  )
}

export default function SlideMasterEditor({
  masters,
  onAddMaster,
  onUpdateMaster,
  onDeleteMaster,
  onClose,
}: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(
    masters.length > 0 ? masters[0].id : null
  )
  const [editingName, setEditingName] = useState<string | null>(null)
  const [nameInput, setNameInput] = useState('')
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const selectedMaster = masters.find((m) => m.id === selectedId) ?? null

  const handleAddMaster = () => {
    const newMaster: SlideMaster = {
      id: generateId(),
      name: `Master ${masters.length + 1}`,
      elements: [],
      themeKey: 'dark-blue',
    }
    onAddMaster(newMaster)
    setSelectedId(newMaster.id)
  }

  const startRename = (master: SlideMaster) => {
    setEditingName(master.id)
    setNameInput(master.name)
  }

  const commitRename = () => {
    if (editingName && nameInput.trim()) {
      onUpdateMaster(editingName, { name: nameInput.trim() })
    }
    setEditingName(null)
  }

  const handleDeleteMaster = (id: string) => {
    if (deleteConfirmId === id) {
      onDeleteMaster(id)
      setDeleteConfirmId(null)
      if (selectedId === id) {
        setSelectedId(masters.length > 1 ? masters.find((m) => m.id !== id)?.id ?? null : null)
      }
    } else {
      setDeleteConfirmId(id)
    }
  }

  const handleThemeChange = (themeKey: SlideThemeKey) => {
    if (selectedMaster) {
      onUpdateMaster(selectedMaster.id, { themeKey })
    }
  }

  const handleAddPlaceholder = (kind: 'title' | 'body' | 'label') => {
    if (!selectedMaster) return
    const el = createPlaceholderElement(kind, selectedMaster.themeKey)
    onUpdateMaster(selectedMaster.id, {
      elements: [...selectedMaster.elements, el],
    })
  }

  const handleRemoveElement = (elId: string) => {
    if (!selectedMaster) return
    onUpdateMaster(selectedMaster.id, {
      elements: selectedMaster.elements.filter((e) => e.id !== elId),
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-[900px] h-[600px] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-700">
          <h2 className="text-white font-semibold text-lg flex items-center gap-2">
            <Layout className="w-5 h-5" />
            Master Slides
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-1 rounded hover:bg-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left sidebar - master list */}
          <div className="w-56 border-r border-slate-700 flex flex-col">
            <div className="p-3 border-b border-slate-700">
              <button
                onClick={handleAddMaster}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Master
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {masters.map((master) => (
                <div
                  key={master.id}
                  className={`p-2 rounded-lg cursor-pointer border transition-colors ${
                    selectedId === master.id
                      ? 'border-blue-500 bg-slate-800'
                      : 'border-transparent hover:bg-slate-800/60'
                  }`}
                  onClick={() => setSelectedId(master.id)}
                >
                  <MiniPreview master={master} />
                  <div className="mt-1.5 flex items-center justify-between">
                    {editingName === master.id ? (
                      <div className="flex items-center gap-1 flex-1">
                        <input
                          type="text"
                          value={nameInput}
                          onChange={(e) => setNameInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && commitRename()}
                          onBlur={commitRename}
                          className="flex-1 bg-slate-700 text-white text-xs px-1.5 py-0.5 rounded border border-slate-600 outline-none"
                          autoFocus
                        />
                        <button
                          onClick={commitRename}
                          className="text-green-400 hover:text-green-300"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="text-slate-300 text-xs truncate">
                          {master.name}
                        </span>
                        <div className="flex items-center gap-0.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              startRename(master)
                            }}
                            className="text-slate-500 hover:text-slate-300 p-0.5"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteMaster(master.id)
                            }}
                            className={`p-0.5 ${
                              deleteConfirmId === master.id
                                ? 'text-red-400'
                                : 'text-slate-500 hover:text-red-400'
                            }`}
                            title={
                              deleteConfirmId === master.id
                                ? 'Click again to confirm'
                                : 'Delete master'
                            }
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
              {masters.length === 0 && (
                <p className="text-slate-500 text-xs text-center py-6">
                  No master slides yet
                </p>
              )}
            </div>
          </div>

          {/* Right area - selected master details */}
          <div className="flex-1 flex flex-col overflow-y-auto">
            {selectedMaster ? (
              <div className="p-5 space-y-5">
                {/* Preview */}
                <div className="rounded-lg overflow-hidden border border-slate-700">
                  <div
                    className="w-full aspect-video relative"
                    style={{ background: SLIDE_THEMES[selectedMaster.themeKey].background }}
                  >
                    {selectedMaster.elements.map((el) => {
                      if (el.type === 'title' || el.type === 'body' || el.type === 'subtitle' || el.type === 'label') {
                        const textEl = el as SlideTextElement
                        const theme = SLIDE_THEMES[selectedMaster.themeKey]
                        const scale = 0.65
                        return (
                          <div
                            key={el.id}
                            className="absolute border border-dashed border-white/20 rounded"
                            style={{
                              left: `${textEl.x * scale}px`,
                              top: `${textEl.y * scale}px`,
                              width: `${textEl.w * scale}px`,
                              height: `${textEl.h * scale}px`,
                              fontSize: `${textEl.fontSize * scale}px`,
                              fontWeight: textEl.fontWeight,
                              color: textEl.color || theme.titleColor,
                              textAlign: textEl.align,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent:
                                textEl.align === 'center'
                                  ? 'center'
                                  : textEl.align === 'right'
                                    ? 'flex-end'
                                    : 'flex-start',
                              padding: '4px',
                            }}
                          >
                            {textEl.content}
                          </div>
                        )
                      }
                      return null
                    })}
                  </div>
                </div>

                {/* Theme selector */}
                <div>
                  <h3 className="text-slate-300 text-sm font-medium mb-2">Theme</h3>
                  <div className="flex flex-wrap gap-2">
                    {THEME_KEYS.map((key) => {
                      const theme = SLIDE_THEMES[key]
                      return (
                        <button
                          key={key}
                          onClick={() => handleThemeChange(key)}
                          className={`w-10 h-10 rounded-lg border-2 transition-all ${
                            selectedMaster.themeKey === key
                              ? 'border-blue-500 ring-2 ring-blue-500/30'
                              : 'border-slate-600 hover:border-slate-400'
                          }`}
                          style={{ background: theme.background }}
                          title={theme.label}
                        />
                      )
                    })}
                  </div>
                </div>

                {/* Add placeholders */}
                <div>
                  <h3 className="text-slate-300 text-sm font-medium mb-2">
                    Add Placeholder
                  </h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAddPlaceholder('title')}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-600 hover:border-slate-500 text-slate-300 text-sm transition-colors"
                    >
                      <Type className="w-4 h-4" />
                      Title
                    </button>
                    <button
                      onClick={() => handleAddPlaceholder('body')}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-600 hover:border-slate-500 text-slate-300 text-sm transition-colors"
                    >
                      <AlignLeft className="w-4 h-4" />
                      Body
                    </button>
                    <button
                      onClick={() => handleAddPlaceholder('label')}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-600 hover:border-slate-500 text-slate-300 text-sm transition-colors"
                    >
                      <MessageSquare className="w-4 h-4" />
                      Footer
                    </button>
                  </div>
                </div>

                {/* Elements list */}
                <div>
                  <h3 className="text-slate-300 text-sm font-medium mb-2">
                    Elements ({selectedMaster.elements.length})
                  </h3>
                  {selectedMaster.elements.length === 0 ? (
                    <p className="text-slate-500 text-sm">
                      No elements yet. Add placeholders above.
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {selectedMaster.elements.map((el) => (
                        <div
                          key={el.id}
                          className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-800 border border-slate-700"
                        >
                          <span className="text-slate-300 text-sm capitalize">
                            {el.type}
                            {'content' in el && (
                              <span className="text-slate-500 ml-2 text-xs">
                                {(el as SlideTextElement).content.slice(0, 30)}
                              </span>
                            )}
                          </span>
                          <button
                            onClick={() => handleRemoveElement(el.id)}
                            className="text-slate-500 hover:text-red-400 transition-colors p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-slate-500 text-sm">
                  Select a master slide or create one
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
