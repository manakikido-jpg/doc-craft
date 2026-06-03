/**
 * Generic undo/redo wrapper for useReducer
 * Wraps any reducer to add history tracking with UNDO/REDO actions.
 */

const MAX_HISTORY = 50

/** Actions that should NOT create history entries */
const SKIP_HISTORY = new Set(['LOAD', 'SET_ACTIVE', 'SET_TITLE', 'UNDO', 'REDO', 'SET_SLIDE_SECTION'])

export interface UndoableState<T> {
  past: T[]
  present: T
  future: T[]
}

export type UndoableAction<A> = A | { type: 'UNDO' } | { type: 'REDO' }

export function createUndoableReducer<S, A extends { type: string }>(reducer: (state: S, action: A) => S) {
  return function undoableReducer(state: UndoableState<S>, action: UndoableAction<A>): UndoableState<S> {
    switch (action.type) {
      case 'UNDO': {
        if (state.past.length === 0) return state
        const previous = state.past[state.past.length - 1]
        return {
          past: state.past.slice(0, -1),
          present: previous,
          future: [state.present, ...state.future],
        }
      }

      case 'REDO': {
        if (state.future.length === 0) return state
        const next = state.future[0]
        return {
          past: [...state.past, state.present],
          present: next,
          future: state.future.slice(1),
        }
      }

      default: {
        const newPresent = reducer(state.present, action as A)
        // If state didn't change, don't push history
        if (newPresent === state.present) return state

        // Skip history for certain actions
        if (SKIP_HISTORY.has(action.type)) {
          return { ...state, present: newPresent }
        }

        return {
          past: [...state.past.slice(-MAX_HISTORY + 1), state.present],
          present: newPresent,
          future: [],
        }
      }
    }
  }
}

export function initUndoable<T>(initial: T): UndoableState<T> {
  return { past: [], present: initial, future: [] }
}
