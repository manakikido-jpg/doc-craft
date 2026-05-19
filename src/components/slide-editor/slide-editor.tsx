'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { SlidesDocument } from '@/types'
import { useSlides } from '@/hooks/use-slides'
import { deleteDocument } from '@/lib/document-store'
import { exportSlidesToHTML, downloadFile } from '@/lib/export-utils'
import { autoLayout } from '@/lib/auto-layout'
import SlideToolbar from './slide-toolbar'
import SlidePanel from './slide-panel'
import SlideCanvas from './slide-canvas'
import PresentationMode from './presentation-mode'
import NotesPanel from './notes-panel'
import CommentPanel from '../shared/comment-panel'
import ShortcutsHelp from '../shared/shortcuts-help'
import ShareModal from '../shared/share-modal'
import VersionPanel from '../shared/version-panel'
import SlideSorter from './slide-sorter'
import AnimationPanel from './animation-panel'
import SlideFooterSettings from './slide-footer-settings'

interface Props {
  initialDoc: SlidesDocument
}

export default function SlideEditor({ initialDoc }: Props) {
  const { state, dispatch, canUndo, canRedo } = useSlides()
  const [presenting, setPresenting] = useState(false)
  const [notesOpen, setNotesOpen] = useState(false)
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [versionsOpen, setVersionsOpen] = useState(false)
  const [sorterOpen, setSorterOpen] = useState(false)
  const [animPanelOpen, setAnimPanelOpen] = useState(false)
  const [footerSettingsOpen, setFooterSettingsOpen] = useState(false)
  const [selectedElementIds, setSelectedElementIds] = useState<string[]>([])
  const router = useRouter()

  useEffect(() => {
    dispatch({ type: 'LOAD', doc: initialDoc })
  }, [initialDoc.meta.id])

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (presenting) return
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        dispatch({ type: 'UNDO' })
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
        e.preventDefault()
        dispatch({ type: 'REDO' })
      }
      if (e.key === 'F5') {
        e.preventDefault()
        setPresenting(true)
      }
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault()
        setShortcutsOpen(true)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [dispatch, presenting])

  function handleExport() {
    const html = exportSlidesToHTML(state)
    downloadFile(html, `${state.meta.title || 'presentation'}.html`)
  }

  function handlePrint() {
    const prevTitle = document.title
    document.title = state.meta.title || 'presentation'
    window.print()
    document.title = prevTitle
  }

  function handleDelete() {
    if (
      !window.confirm(`「${state.meta.title || '無題のプレゼンテーション'}」を削除しますか？この操作は取り消せません。`)
    )
      return
    deleteDocument(state.meta.id)
    router.push('/dashboard')
  }

  const activeSlide = state.slides.find((s) => s.id === state.activeSlideId)

  if (!state.meta.id) return null

  return (
    <div className="flex flex-col h-screen bg-slate-950 overflow-hidden">
      <SlideToolbar
        state={state}
        dispatch={dispatch}
        onExport={handleExport}
        onPrint={handlePrint}
        onDelete={handleDelete}
        onPresent={() => setPresenting(true)}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={() => dispatch({ type: 'UNDO' })}
        onRedo={() => dispatch({ type: 'REDO' })}
        onNotesToggle={() => setNotesOpen(!notesOpen)}
        onCommentsToggle={() => setCommentsOpen(!commentsOpen)}
        onShortcuts={() => setShortcutsOpen(true)}
        onShare={() => setShareOpen(true)}
        onVersions={() => setVersionsOpen(true)}
        onSorterView={() => setSorterOpen(true)}
        onAnimationPanel={() => setAnimPanelOpen(!animPanelOpen)}
        onFooterSettings={() => setFooterSettingsOpen(!footerSettingsOpen)}
        onAutoLayout={() => {
          if (activeSlide) {
            const laid = autoLayout(activeSlide)
            // Apply each element's new position
            laid.elements.forEach((el) => {
              if (
                el.type !== 'image' &&
                el.type !== 'shape' &&
                el.type !== 'table' &&
                el.type !== 'connector' &&
                el.type !== 'video' &&
                el.type !== 'audio' &&
                el.type !== 'chart'
              ) {
                dispatch({
                  type: 'UPDATE_ELEMENT_POSITION',
                  slideId: activeSlide.id,
                  elementId: el.id,
                  x: el.x,
                  y: el.y,
                })
              }
            })
          }
        }}
      />

      <div className="flex flex-1 overflow-hidden">
        <SlidePanel state={state} dispatch={dispatch} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <SlideCanvas state={state} dispatch={dispatch} onSelectionChange={setSelectedElementIds} />
          {notesOpen && activeSlide && (
            <NotesPanel
              slide={activeSlide}
              onUpdate={(notes) => dispatch({ type: 'SET_NOTES', slideId: activeSlide.id, notes })}
            />
          )}
        </div>
        {commentsOpen && (
          <CommentPanel
            comments={state.comments || []}
            onAdd={(text, parentId) => dispatch({ type: 'ADD_COMMENT', text, slideId: state.activeSlideId, parentId })}
            onResolve={(id) => dispatch({ type: 'RESOLVE_COMMENT', id })}
            onDelete={(id) => dispatch({ type: 'DELETE_COMMENT', id })}
            onClose={() => setCommentsOpen(false)}
          />
        )}
        {animPanelOpen && activeSlide && (
          <AnimationPanel
            slide={activeSlide}
            dispatch={dispatch}
            onClose={() => setAnimPanelOpen(false)}
            selectedElementIds={selectedElementIds}
          />
        )}
      </div>

      {presenting && (
        <PresentationMode
          slides={state.slides}
          startIndex={Math.max(
            0,
            state.slides.findIndex((s) => s.id === state.activeSlideId),
          )}
          onExit={() => setPresenting(false)}
          globalFooter={state.globalFooter}
        />
      )}

      {sorterOpen && <SlideSorter state={state} dispatch={dispatch} onClose={() => setSorterOpen(false)} />}

      <ShortcutsHelp open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} context="slides" />
      <ShareModal doc={state} open={shareOpen} onClose={() => setShareOpen(false)} />
      {versionsOpen && (
        <VersionPanel
          versions={state.versions || []}
          onRestore={(_id) => dispatch({ type: 'SAVE_VERSION' })}
          onClose={() => setVersionsOpen(false)}
        />
      )}
      {footerSettingsOpen && (
        <SlideFooterSettings
          footer={state.globalFooter}
          onUpdate={(footer) => dispatch({ type: 'SET_GLOBAL_FOOTER', footer })}
          onClose={() => setFooterSettingsOpen(false)}
        />
      )}
    </div>
  )
}
