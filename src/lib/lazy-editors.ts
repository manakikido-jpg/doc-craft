/**
 * Code-splitting utility for DocCraft editors.
 * Exports lazy-loaded versions of the 3 editors using React.lazy + dynamic import.
 * Route pages can import these to reduce initial bundle size.
 */

'use client'

import { lazy } from 'react'

/**
 * Lazy-loaded Slide Editor.
 * Usage in a route page:
 *   import { LazySlideEditor } from '@/lib/lazy-editors'
 *   <Suspense fallback={<EditorSkeleton />}><LazySlideEditor {...props} /></Suspense>
 */
export const LazySlideEditor = lazy(
  () => import('@/components/slide-editor/slide-editor'),
)

/**
 * Lazy-loaded Document Editor.
 */
export const LazyDocEditor = lazy(
  () => import('@/components/doc-editor/doc-editor'),
)

/**
 * Lazy-loaded Spreadsheet Editor.
 */
export const LazySpreadsheetEditor = lazy(
  () => import('@/components/spreadsheet-editor/spreadsheet-editor'),
)
