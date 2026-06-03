'use client'

import { useState, useCallback } from 'react'

export type SplitMode = 'none' | 'horizontal' | 'vertical' | 'quad'

interface Props {
  splitMode: SplitMode
  onChangeSplitMode: (mode: SplitMode) => void
}

export function SplitViewControls({ splitMode, onChangeSplitMode }: Props) {
  return (
    <div className="fixed top-16 right-4 z-40 bg-slate-900 border border-slate-700 rounded-lg shadow-xl p-2">
      <div className="text-[10px] text-slate-400 mb-1.5 px-1">分割表示</div>
      <div className="flex gap-1">
        <button
          onClick={() => onChangeSplitMode('none')}
          className={`w-8 h-8 rounded flex items-center justify-center border text-xs ${
            splitMode === 'none'
              ? 'bg-indigo-600 border-indigo-500 text-white'
              : 'bg-slate-800 border-slate-600 text-slate-400 hover:bg-slate-700'
          }`}
          title="分割なし"
        >
          <div className="w-4 h-4 border border-current rounded-sm" />
        </button>
        <button
          onClick={() => onChangeSplitMode('horizontal')}
          className={`w-8 h-8 rounded flex items-center justify-center border text-xs ${
            splitMode === 'horizontal'
              ? 'bg-indigo-600 border-indigo-500 text-white'
              : 'bg-slate-800 border-slate-600 text-slate-400 hover:bg-slate-700'
          }`}
          title="横分割"
        >
          <div className="w-4 h-4 border border-current rounded-sm flex flex-col">
            <div className="flex-1 border-b border-current" />
            <div className="flex-1" />
          </div>
        </button>
        <button
          onClick={() => onChangeSplitMode('vertical')}
          className={`w-8 h-8 rounded flex items-center justify-center border text-xs ${
            splitMode === 'vertical'
              ? 'bg-indigo-600 border-indigo-500 text-white'
              : 'bg-slate-800 border-slate-600 text-slate-400 hover:bg-slate-700'
          }`}
          title="縦分割"
        >
          <div className="w-4 h-4 border border-current rounded-sm flex flex-row">
            <div className="flex-1 border-r border-current" />
            <div className="flex-1" />
          </div>
        </button>
        <button
          onClick={() => onChangeSplitMode('quad')}
          className={`w-8 h-8 rounded flex items-center justify-center border text-xs ${
            splitMode === 'quad'
              ? 'bg-indigo-600 border-indigo-500 text-white'
              : 'bg-slate-800 border-slate-600 text-slate-400 hover:bg-slate-700'
          }`}
          title="4分割"
        >
          <div className="w-4 h-4 border border-current rounded-sm grid grid-cols-2 grid-rows-2">
            <div className="border-r border-b border-current" />
            <div className="border-b border-current" />
            <div className="border-r border-current" />
            <div />
          </div>
        </button>
      </div>
    </div>
  )
}

interface SplitContainerProps {
  splitMode: SplitMode
  children: React.ReactNode
  renderPane: (paneIndex: number) => React.ReactNode
}

export function SplitContainer({ splitMode, children, renderPane }: SplitContainerProps) {
  if (splitMode === 'none') {
    return <>{children}</>
  }

  if (splitMode === 'horizontal') {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-hidden border-b border-slate-600">
          {renderPane(0)}
        </div>
        <div className="flex-1 overflow-hidden">
          {renderPane(1)}
        </div>
      </div>
    )
  }

  if (splitMode === 'vertical') {
    return (
      <div className="flex flex-row h-full">
        <div className="flex-1 overflow-hidden border-r border-slate-600">
          {renderPane(0)}
        </div>
        <div className="flex-1 overflow-hidden">
          {renderPane(1)}
        </div>
      </div>
    )
  }

  // quad
  return (
    <div className="grid grid-cols-2 grid-rows-2 h-full">
      <div className="overflow-hidden border-r border-b border-slate-600">
        {renderPane(0)}
      </div>
      <div className="overflow-hidden border-b border-slate-600">
        {renderPane(1)}
      </div>
      <div className="overflow-hidden border-r border-slate-600">
        {renderPane(2)}
      </div>
      <div className="overflow-hidden">
        {renderPane(3)}
      </div>
    </div>
  )
}

export function useSplitView() {
  const [splitMode, setSplitMode] = useState<SplitMode>('none')

  const cycleSplit = useCallback(() => {
    setSplitMode((prev) => {
      switch (prev) {
        case 'none': return 'horizontal'
        case 'horizontal': return 'vertical'
        case 'vertical': return 'quad'
        case 'quad': return 'none'
      }
    })
  }, [])

  return { splitMode, setSplitMode, cycleSplit }
}
