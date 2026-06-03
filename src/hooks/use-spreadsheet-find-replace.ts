'use client'

import { useState, useCallback } from 'react'

interface UseSpreadsheetFindReplaceParams {
  activeSheet: {
    id: string
    rowCount: number
    colCount: number
    cells: Record<string, { value: string }>
  } | undefined
  dispatch: (action: unknown) => void
  setSelectedCell: (cell: { row: number; col: number }) => void
  setSelectionRange: (range: null) => void
}

export function useSpreadsheetFindReplace({
  activeSheet,
  dispatch,
  setSelectedCell,
  setSelectionRange,
}: UseSpreadsheetFindReplaceParams) {
  const [findReplaceOpen, setFindReplaceOpen] = useState(false)
  const [findReplaceMode, setFindReplaceMode] = useState<'find' | 'replace'>('find')
  const [findText, setFindText] = useState('')
  const [replaceText, setReplaceText] = useState('')
  const [findResults, setFindResults] = useState<{ row: number; col: number }[]>([])
  const [findIndex, setFindIndex] = useState(0)

  const doFind = useCallback(
    (text: string) => {
      if (!activeSheet || !text) {
        setFindResults([])
        setFindIndex(0)
        return
      }
      const results: { row: number; col: number }[] = []
      const lowerText = text.toLowerCase()
      for (let r = 0; r < activeSheet.rowCount; r++) {
        for (let c = 0; c < activeSheet.colCount; c++) {
          const key = `${r}-${c}`
          const cell = activeSheet.cells[key]
          if (cell && cell.value.toLowerCase().includes(lowerText)) {
            results.push({ row: r, col: c })
          }
        }
      }
      setFindResults(results)
      setFindIndex(0)
      if (results.length > 0) {
        setSelectedCell(results[0])
        setSelectionRange(null)
      }
    },
    [activeSheet, setSelectedCell, setSelectionRange],
  )

  const findNext = useCallback(() => {
    if (findResults.length === 0) return
    const next = (findIndex + 1) % findResults.length
    setFindIndex(next)
    setSelectedCell(findResults[next])
    setSelectionRange(null)
  }, [findResults, findIndex, setSelectedCell, setSelectionRange])

  const findPrev = useCallback(() => {
    if (findResults.length === 0) return
    const prev = (findIndex - 1 + findResults.length) % findResults.length
    setFindIndex(prev)
    setSelectedCell(findResults[prev])
    setSelectionRange(null)
  }, [findResults, findIndex, setSelectedCell, setSelectionRange])

  const doReplace = useCallback(() => {
    if (!activeSheet || findResults.length === 0) return
    const target = findResults[findIndex]
    const key = `${target.row}-${target.col}`
    const cell = activeSheet.cells[key]
    if (cell) {
      const newValue = cell.value.replace(
        new RegExp(findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'),
        replaceText,
      )
      dispatch({
        type: 'SET_CELL_VALUE',
        sheetId: activeSheet.id,
        row: target.row,
        col: target.col,
        value: newValue,
      })
    }
    setTimeout(() => doFind(findText), 50)
  }, [activeSheet, findResults, findIndex, findText, replaceText, dispatch, doFind])

  const doReplaceAll = useCallback(() => {
    if (!activeSheet || findResults.length === 0) return
    for (const target of findResults) {
      const key = `${target.row}-${target.col}`
      const cell = activeSheet.cells[key]
      if (cell) {
        const newValue = cell.value.replace(
          new RegExp(findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'),
          replaceText,
        )
        dispatch({
          type: 'SET_CELL_VALUE',
          sheetId: activeSheet.id,
          row: target.row,
          col: target.col,
          value: newValue,
        })
      }
    }
    setTimeout(() => doFind(findText), 50)
  }, [activeSheet, findResults, findText, replaceText, dispatch, doFind])

  const openFind = useCallback(() => {
    setFindReplaceOpen(true)
    setFindReplaceMode('find')
  }, [])

  const openReplace = useCallback(() => {
    setFindReplaceOpen(true)
    setFindReplaceMode('replace')
  }, [])

  return {
    findReplaceOpen,
    setFindReplaceOpen,
    findReplaceMode,
    setFindReplaceMode,
    findText,
    setFindText,
    replaceText,
    setReplaceText,
    findResults,
    findIndex,
    doFind,
    findNext,
    findPrev,
    doReplace,
    doReplaceAll,
    openFind,
    openReplace,
  }
}
