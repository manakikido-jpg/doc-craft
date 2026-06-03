/**
 * Virtualized blocks utility for large document optimization.
 * Uses IntersectionObserver to track which blocks are in the viewport
 * and returns only the visible ones for rendering.
 */

'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'

interface BlockLike {
  id: string
  [key: string]: unknown
}

interface VirtualizedResult<T extends BlockLike> {
  /** Only the blocks currently visible (plus buffer) */
  visibleBlocks: T[]
  /** Estimated total height of all blocks in px */
  totalHeight: number
  /** Offset from top to the first visible block in px */
  offsetTop: number
  /** Whether virtualization is active (false for small documents) */
  isVirtualized: boolean
  /** Ref callback to attach to each block's DOM element */
  blockRef: (id: string) => (el: HTMLElement | null) => void
}

const DEFAULT_BLOCK_HEIGHT = 60
const BUFFER_COUNT = 5 // extra blocks above/below viewport
const MIN_BLOCKS_FOR_VIRTUALIZATION = 50

/**
 * Hook that virtualizes a list of blocks based on viewport visibility.
 * For documents with fewer than MIN_BLOCKS_FOR_VIRTUALIZATION blocks,
 * it returns all blocks without virtualization.
 *
 * @param blocks - The full array of blocks
 * @param containerRef - Ref to the scrollable container element
 * @param estimatedBlockHeight - Estimated height per block (default 60px)
 */
export function useVirtualizedBlocks<T extends BlockLike>(
  blocks: T[],
  containerRef: React.RefObject<HTMLElement | null>,
  estimatedBlockHeight: number = DEFAULT_BLOCK_HEIGHT,
): VirtualizedResult<T> {
  const [visibleIds, setVisibleIds] = useState<Set<string>>(new Set())
  const observerRef = useRef<IntersectionObserver | null>(null)
  const blockElementsRef = useRef<Map<string, HTMLElement>>(new Map())
  const blockHeightsRef = useRef<Map<string, number>>(new Map())

  const isVirtualized = blocks.length >= MIN_BLOCKS_FOR_VIRTUALIZATION

  // Set up IntersectionObserver
  useEffect(() => {
    if (!isVirtualized) return

    const root = containerRef.current
    if (!root) return

    observerRef.current = new IntersectionObserver(
      (entries) => {
        setVisibleIds((prev) => {
          const next = new Set(prev)
          for (const entry of entries) {
            const id = entry.target.getAttribute('data-block-id')
            if (!id) continue
            if (entry.isIntersecting) {
              next.add(id)
            } else {
              next.delete(id)
            }
          }
          return next
        })
      },
      {
        root,
        rootMargin: `${estimatedBlockHeight * BUFFER_COUNT}px 0px`,
        threshold: 0,
      },
    )

    // Observe all currently registered elements
    for (const [, el] of blockElementsRef.current) {
      observerRef.current.observe(el)
    }

    return () => {
      observerRef.current?.disconnect()
      observerRef.current = null
    }
  }, [isVirtualized, containerRef, estimatedBlockHeight])

  // Ref callback factory for each block
  const blockRef = useCallback(
    (id: string) => (el: HTMLElement | null) => {
      if (el) {
        blockElementsRef.current.set(id, el)
        blockHeightsRef.current.set(id, el.offsetHeight)
        observerRef.current?.observe(el)
      } else {
        const existing = blockElementsRef.current.get(id)
        if (existing) {
          observerRef.current?.unobserve(existing)
        }
        blockElementsRef.current.delete(id)
      }
    },
    [],
  )

  // Compute visible blocks with buffer
  const visibleBlocks = useMemo(() => {
    if (!isVirtualized) return blocks

    if (visibleIds.size === 0) {
      // Initially show the first chunk until observer reports
      return blocks.slice(0, BUFFER_COUNT * 2)
    }

    // Find the range of visible block indices
    let minIdx = blocks.length
    let maxIdx = 0
    for (let i = 0; i < blocks.length; i++) {
      if (visibleIds.has(blocks[i].id)) {
        minIdx = Math.min(minIdx, i)
        maxIdx = Math.max(maxIdx, i)
      }
    }

    const startIdx = Math.max(0, minIdx - BUFFER_COUNT)
    const endIdx = Math.min(blocks.length, maxIdx + BUFFER_COUNT + 1)

    return blocks.slice(startIdx, endIdx)
  }, [blocks, visibleIds, isVirtualized])

  // Calculate total height and offset
  const { totalHeight, offsetTop } = useMemo(() => {
    if (!isVirtualized) {
      return { totalHeight: 0, offsetTop: 0 }
    }

    let total = 0
    let offset = 0
    const firstVisibleIdx = blocks.findIndex((b) =>
      visibleBlocks.length > 0 ? b.id === visibleBlocks[0].id : false,
    )

    for (let i = 0; i < blocks.length; i++) {
      const h = blockHeightsRef.current.get(blocks[i].id) ?? estimatedBlockHeight
      if (i < firstVisibleIdx) {
        offset += h
      }
      total += h
    }

    return { totalHeight: total, offsetTop: offset }
  }, [blocks, visibleBlocks, isVirtualized, estimatedBlockHeight])

  return {
    visibleBlocks,
    totalHeight,
    offsetTop,
    isVirtualized,
    blockRef,
  }
}
