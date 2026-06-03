import { useState, useRef } from 'react'
import { generateId } from '@/lib/utils'

export function useSlideCanvasInteraction() {
  const [selectedElementIds, setSelectedElementIds] = useState<string[]>([])
  const [zoom, setZoom] = useState(100)
  const [guides, setGuides] = useState<{id: string, type: 'horizontal' | 'vertical', position: number}[]>([])
  const [gridVisible, setGridVisible] = useState(false)
  const [rulerVisible, setRulerVisible] = useState(false)
  const [selectedTableCells, setSelectedTableCells] = useState<{row: number; col: number}[]>([])
  const canvasContainerRef = useRef<HTMLDivElement>(null)

  // Transition preview hover state
  const [transitionHoverType, setTransitionHoverType] = useState<string | null>(null)
  const [transitionHoverPlaying, setTransitionHoverPlaying] = useState(false)

  const addGuide = (type: 'horizontal' | 'vertical', position: number) => {
    setGuides(prev => [...prev, { id: generateId(), type, position }])
  }

  const deleteGuide = (id: string) => {
    setGuides(prev => prev.filter(g => g.id !== id))
  }

  const clearGuides = () => {
    setGuides([])
  }

  return {
    selectedElementIds, setSelectedElementIds,
    zoom, setZoom,
    guides, setGuides,
    gridVisible, setGridVisible,
    rulerVisible, setRulerVisible,
    selectedTableCells, setSelectedTableCells,
    canvasContainerRef,
    transitionHoverType, setTransitionHoverType,
    transitionHoverPlaying, setTransitionHoverPlaying,
    addGuide,
    deleteGuide,
    clearGuides,
  }
}
