import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDocEditorState } from './use-doc-editor-state'

describe('useDocEditorState', () => {
  it('returns correct initial state for all dialog flags', () => {
    const { result } = renderHook(() => useDocEditorState())
    const { dialogs } = result.current

    expect(dialogs.aiOpen).toBe(false)
    expect(dialogs.commentsOpen).toBe(false)
    expect(dialogs.sidebarOpen).toBe(false)
    expect(dialogs.shareOpen).toBe(false)
    expect(dialogs.commandPaletteOpen).toBe(false)
  })

  it('returns correct initial state for display settings', () => {
    const { result } = renderHook(() => useDocEditorState())
    const { display } = result.current

    expect(display.zoom).toBe(100)
    expect(display.pageLayout).toBe(false)
    expect(display.showFormattingMarks).toBe(false)
    expect(display.pageCount).toBe(1)
  })

  it('returns correct initial state for save status', () => {
    const { result } = renderHook(() => useDocEditorState())
    expect(result.current.save.saveStatus).toBe('saved')
    expect(result.current.save.saveFlash).toBe(false)
  })

  it('toggles dialog open/close correctly', () => {
    const { result } = renderHook(() => useDocEditorState())

    expect(result.current.dialogs.aiOpen).toBe(false)
    act(() => {
      result.current.dialogs.setAiOpen(true)
    })
    expect(result.current.dialogs.aiOpen).toBe(true)
    act(() => {
      result.current.dialogs.setAiOpen(false)
    })
    expect(result.current.dialogs.aiOpen).toBe(false)
  })

  it('updates zoom level', () => {
    const { result } = renderHook(() => useDocEditorState())

    act(() => {
      result.current.display.setZoom(150)
    })
    expect(result.current.display.zoom).toBe(150)
  })

  it('updates save status', () => {
    const { result } = renderHook(() => useDocEditorState())

    act(() => {
      result.current.save.setSaveStatus('saving')
    })
    expect(result.current.save.saveStatus).toBe('saving')

    act(() => {
      result.current.save.setSaveStatus('error')
    })
    expect(result.current.save.saveStatus).toBe('error')
  })
})
