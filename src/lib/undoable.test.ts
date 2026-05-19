import { describe, it, expect } from 'vitest'
import { createUndoableReducer, initUndoable } from './undoable'

// Simple counter reducer for testing
type CounterState = { count: number }
type CounterAction =
  | { type: 'INCREMENT' }
  | { type: 'DECREMENT' }
  | { type: 'SET'; value: number }
  | { type: 'LOAD' } // Should skip history
  | { type: 'SET_ACTIVE' } // Should skip history

function counterReducer(state: CounterState, action: CounterAction): CounterState {
  switch (action.type) {
    case 'INCREMENT':
      return { count: state.count + 1 }
    case 'DECREMENT':
      return { count: state.count - 1 }
    case 'SET':
      return { count: action.value }
    case 'LOAD':
    case 'SET_ACTIVE':
      return state
    default:
      return state
  }
}

const undoableCounter = createUndoableReducer(counterReducer)

describe('initUndoable', () => {
  it('creates initial state with empty history', () => {
    const state = initUndoable({ count: 0 })
    expect(state.past).toEqual([])
    expect(state.present).toEqual({ count: 0 })
    expect(state.future).toEqual([])
  })
})

describe('createUndoableReducer', () => {
  it('forwards actions to inner reducer and records history', () => {
    let state = initUndoable({ count: 0 })
    state = undoableCounter(state, { type: 'INCREMENT' })
    expect(state.present.count).toBe(1)
    expect(state.past).toHaveLength(1)
    expect(state.past[0].count).toBe(0)
    expect(state.future).toEqual([])
  })

  it('UNDO restores previous state', () => {
    let state = initUndoable({ count: 0 })
    state = undoableCounter(state, { type: 'INCREMENT' })
    state = undoableCounter(state, { type: 'INCREMENT' })
    expect(state.present.count).toBe(2)

    state = undoableCounter(state, { type: 'UNDO' })
    expect(state.present.count).toBe(1)
    expect(state.past).toHaveLength(1)
    expect(state.future).toHaveLength(1)
  })

  it('REDO restores future state', () => {
    let state = initUndoable({ count: 0 })
    state = undoableCounter(state, { type: 'INCREMENT' })
    state = undoableCounter(state, { type: 'INCREMENT' })
    state = undoableCounter(state, { type: 'UNDO' })
    state = undoableCounter(state, { type: 'REDO' })
    expect(state.present.count).toBe(2)
    expect(state.future).toEqual([])
  })

  it('UNDO on empty past returns same state', () => {
    const state = initUndoable({ count: 0 })
    const next = undoableCounter(state, { type: 'UNDO' })
    expect(next).toBe(state) // Same reference
  })

  it('REDO on empty future returns same state', () => {
    const state = initUndoable({ count: 0 })
    const next = undoableCounter(state, { type: 'REDO' })
    expect(next).toBe(state)
  })

  it('new action after undo clears future', () => {
    let state = initUndoable({ count: 0 })
    state = undoableCounter(state, { type: 'INCREMENT' })
    state = undoableCounter(state, { type: 'INCREMENT' })
    state = undoableCounter(state, { type: 'INCREMENT' })
    state = undoableCounter(state, { type: 'UNDO' })
    expect(state.future).toHaveLength(1)

    state = undoableCounter(state, { type: 'DECREMENT' })
    expect(state.future).toEqual([])
    expect(state.present.count).toBe(1) // was 2, decremented
  })

  it('SKIP_HISTORY actions do not record history', () => {
    let state = initUndoable({ count: 0 })
    state = undoableCounter(state, { type: 'INCREMENT' })
    state = undoableCounter(state, { type: 'LOAD' })
    // LOAD should not add to past
    expect(state.past).toHaveLength(1) // only INCREMENT
  })

  it('SET_ACTIVE skips history', () => {
    let state = initUndoable({ count: 0 })
    state = undoableCounter(state, { type: 'SET_ACTIVE' })
    expect(state.past).toHaveLength(0)
  })

  it('no-op action (state unchanged) does not create history', () => {
    const initial = initUndoable({ count: 5 })
    // LOAD returns same state, so no history entry
    const next = undoableCounter(initial, { type: 'LOAD' })
    expect(next.past).toEqual([])
  })

  it('respects MAX_HISTORY (50) limit', () => {
    let state = initUndoable({ count: 0 })
    for (let i = 0; i < 60; i++) {
      state = undoableCounter(state, { type: 'INCREMENT' })
    }
    expect(state.present.count).toBe(60)
    expect(state.past.length).toBeLessThanOrEqual(50)
  })

  it('multiple undo/redo cycle', () => {
    let state = initUndoable({ count: 0 })
    state = undoableCounter(state, { type: 'SET', value: 10 } as CounterAction & { type: 'SET'; value: number })
    state = undoableCounter(state, { type: 'SET', value: 20 } as CounterAction & { type: 'SET'; value: number })
    state = undoableCounter(state, { type: 'SET', value: 30 } as CounterAction & { type: 'SET'; value: number })

    // Undo all
    state = undoableCounter(state, { type: 'UNDO' })
    state = undoableCounter(state, { type: 'UNDO' })
    state = undoableCounter(state, { type: 'UNDO' })
    expect(state.present.count).toBe(0)

    // Redo all
    state = undoableCounter(state, { type: 'REDO' })
    state = undoableCounter(state, { type: 'REDO' })
    state = undoableCounter(state, { type: 'REDO' })
    expect(state.present.count).toBe(30)
  })
})
