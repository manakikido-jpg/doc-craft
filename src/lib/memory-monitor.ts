/**
 * Memory leak prevention utilities for DocCraft.
 * Provides safe wrappers for timers, event listeners, and memory monitoring.
 */

'use client'

import { useEffect, useRef, useCallback } from 'react'

// ── Safe timer utilities ──

interface TimerHandle {
  clear: () => void
}

/**
 * Create an interval that can be easily cleaned up.
 * Returns a handle with a clear() method.
 */
export function safeInterval(callback: () => void, ms: number): TimerHandle {
  const id = setInterval(callback, ms)
  return {
    clear: () => clearInterval(id),
  }
}

/**
 * Create a timeout that can be easily cleaned up.
 * Returns a handle with a clear() method.
 */
export function safeTimeout(callback: () => void, ms: number): TimerHandle {
  const id = setTimeout(callback, ms)
  return {
    clear: () => clearTimeout(id),
  }
}

// ── Tracker for event listeners ──

interface TrackedListener {
  target: EventTarget
  type: string
  listener: EventListenerOrEventListenerObject
  options?: boolean | AddEventListenerOptions
}

class ListenerTracker {
  private listeners: TrackedListener[] = []

  add(
    target: EventTarget,
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ): void {
    target.addEventListener(type, listener, options)
    this.listeners.push({ target, type, listener, options })
  }

  removeAll(): void {
    for (const { target, type, listener, options } of this.listeners) {
      target.removeEventListener(type, listener, options)
    }
    this.listeners = []
  }

  get count(): number {
    return this.listeners.length
  }
}

/**
 * Create a listener tracker that auto-removes all listeners on cleanup.
 */
export function createListenerTracker(): ListenerTracker {
  return new ListenerTracker()
}

// ── React hooks ──

type CleanupFn = () => void

/**
 * Hook that registers cleanup functions to be called on unmount.
 * Useful for gathering multiple cleanup tasks in one place.
 *
 * Usage:
 *   const addCleanup = useCleanup()
 *   addCleanup(() => clearInterval(id))
 *   addCleanup(() => socket.close())
 */
export function useCleanup(): (fn: CleanupFn) => void {
  const cleanups = useRef<CleanupFn[]>([])

  useEffect(() => {
    return () => {
      for (const fn of cleanups.current) {
        try {
          fn()
        } catch (e) {
          console.warn('[DocCraft] Cleanup error:', e)
        }
      }
      cleanups.current = []
    }
  }, [])

  const addCleanup = useCallback((fn: CleanupFn) => {
    cleanups.current.push(fn)
  }, [])

  return addCleanup
}

/**
 * Hook that creates a safe interval, automatically cleared on unmount.
 */
export function useSafeInterval(callback: () => void, ms: number, enabled = true): void {
  const savedCallback = useRef(callback)
  savedCallback.current = callback

  useEffect(() => {
    if (!enabled) return
    const handle = safeInterval(() => savedCallback.current(), ms)
    return () => handle.clear()
  }, [ms, enabled])
}

/**
 * Hook that creates a safe timeout, automatically cleared on unmount.
 */
export function useSafeTimeout(): (callback: () => void, ms: number) => TimerHandle {
  const handles = useRef<TimerHandle[]>([])

  useEffect(() => {
    return () => {
      for (const h of handles.current) {
        h.clear()
      }
      handles.current = []
    }
  }, [])

  return useCallback((callback: () => void, ms: number) => {
    const handle = safeTimeout(callback, ms)
    handles.current.push(handle)
    return handle
  }, [])
}

// ── Memory monitoring ──

const MEMORY_WARNING_THRESHOLD_MB = 500

interface MemoryInfo {
  usedJSHeapSize: number
  totalJSHeapSize: number
  jsHeapSizeLimit: number
}

interface PerformanceWithMemory extends Performance {
  memory?: MemoryInfo
}

/**
 * Get current memory usage information (Chrome only).
 * Returns null if performance.memory is not available.
 */
export function getMemoryUsage(): MemoryInfo | null {
  if (typeof performance === 'undefined') return null
  const perf = performance as PerformanceWithMemory
  return perf.memory ?? null
}

/**
 * Check if memory usage exceeds the warning threshold.
 */
export function isMemoryWarning(): boolean {
  const mem = getMemoryUsage()
  if (!mem) return false
  return mem.usedJSHeapSize > MEMORY_WARNING_THRESHOLD_MB * 1024 * 1024
}

/**
 * Hook that monitors memory usage and calls onWarning when the threshold is exceeded.
 * Only works in browsers that support performance.memory (Chromium-based).
 *
 * @param onWarning - Called when memory exceeds 500MB, with usage in MB
 * @param checkIntervalMs - How often to check (default: 30 seconds)
 */
export function useMemoryMonitor(
  onWarning?: (usageMB: number) => void,
  checkIntervalMs: number = 30_000,
): void {
  const savedOnWarning = useRef(onWarning)
  savedOnWarning.current = onWarning

  useEffect(() => {
    const mem = getMemoryUsage()
    if (!mem) return // Not supported

    const handle = safeInterval(() => {
      const current = getMemoryUsage()
      if (!current) return

      const usedMB = current.usedJSHeapSize / (1024 * 1024)
      if (usedMB > MEMORY_WARNING_THRESHOLD_MB && savedOnWarning.current) {
        savedOnWarning.current(Math.round(usedMB))
      }
    }, checkIntervalMs)

    return () => handle.clear()
  }, [checkIntervalMs])
}
