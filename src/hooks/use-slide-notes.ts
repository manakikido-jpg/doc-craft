import { useState, useRef } from 'react'

export function useSlideNotes() {
  const [speakerNotesHeight, setSpeakerNotesHeight] = useState(100)
  const [speakerNotesCollapsed, setSpeakerNotesCollapsed] = useState(true)
  const speakerNotesDragRef = useRef(false)

  const handleNotesDragStart = (e: React.MouseEvent) => {
    if (speakerNotesCollapsed) return
    e.preventDefault()
    speakerNotesDragRef.current = true
    const startY = e.clientY
    const startH = speakerNotesHeight
    const onMove = (ev: MouseEvent) => {
      if (!speakerNotesDragRef.current) return
      const delta = startY - ev.clientY
      setSpeakerNotesHeight(Math.max(50, Math.min(400, startH + delta)))
    }
    const onUp = () => {
      speakerNotesDragRef.current = false
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  return {
    speakerNotesHeight, setSpeakerNotesHeight,
    speakerNotesCollapsed, setSpeakerNotesCollapsed,
    handleNotesDragStart,
  }
}
