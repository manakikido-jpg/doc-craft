import { useRef, useEffect, useCallback } from 'react'
import { saveVersion, getVersionData } from '@/lib/version-history'

export function useSlideHistory(
  dispatch: (action: any) => void,
  state: any,
) {
  const lastVersionSave = useRef(Date.now())
  const copiedSlideRef = useRef<any>(null)

  // Auto-save version snapshots to localStorage every 5 minutes
  useEffect(() => {
    if (!state.meta.id || state.slides.length === 0) return
    if (Date.now() - lastVersionSave.current > 300000) {
      saveVersion(
        state.meta.id,
        state.meta.title || '無題',
        JSON.stringify({ slides: state.slides, activeSlideId: state.activeSlideId }),
      )
      lastVersionSave.current = Date.now()
    }
  }, [state.slides, state.meta.id, state.meta.title, state.activeSlideId])

  const handleRestoreVersion = useCallback(
    (versionId: string) => {
      const data = getVersionData(versionId)
      if (!data) return
      try {
        const parsed = JSON.parse(data)
        if (parsed.slides) {
          dispatch({
            type: 'LOAD',
            doc: {
              ...state,
              slides: parsed.slides,
              activeSlideId: parsed.activeSlideId || state.activeSlideId,
            },
          })
        }
      } catch {
        /* ignore parse errors */
      }
    },
    [dispatch, state],
  )

  return {
    copiedSlideRef,
    handleRestoreVersion,
  }
}
