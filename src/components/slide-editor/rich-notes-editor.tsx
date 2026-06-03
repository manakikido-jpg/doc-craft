'use client'

import { useRef, useCallback } from 'react'
import { Bold, Italic, List } from 'lucide-react'

interface Props {
  notes: string
  onChange: (notes: string) => void
}

export default function RichNotesEditor({ notes, onChange }: Props) {
  const editorRef = useRef<HTMLDivElement>(null)

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML)
    }
  }, [onChange])

  const execFormat = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value)
    editorRef.current?.focus()
    handleInput()
  }, [handleInput])

  const btnClass = (active?: boolean) =>
    `p-1.5 rounded transition-colors ${
      active
        ? 'bg-slate-700 text-slate-200'
        : 'text-slate-500 hover:bg-slate-800 hover:text-slate-300'
    }`

  return (
    <div className="flex flex-col bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-slate-800 bg-slate-900/80">
        <button
          title="Bold"
          className={btnClass()}
          onMouseDown={(e) => {
            e.preventDefault()
            execFormat('bold')
          }}
        >
          <Bold size={14} />
        </button>
        <button
          title="Italic"
          className={btnClass()}
          onMouseDown={(e) => {
            e.preventDefault()
            execFormat('italic')
          }}
        >
          <Italic size={14} />
        </button>
        <button
          title="Bullet List"
          className={btnClass()}
          onMouseDown={(e) => {
            e.preventDefault()
            execFormat('insertUnorderedList')
          }}
        >
          <List size={14} />
        </button>
      </div>

      {/* Editor */}
      <div className="relative">
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          dangerouslySetInnerHTML={{ __html: notes }}
          className="min-h-[80px] max-h-[200px] overflow-y-auto px-3 py-2 text-sm text-slate-300 focus:outline-none [&_ul]:list-disc [&_ul]:ml-4 [&_b]:font-bold [&_i]:italic empty:before:content-[attr(data-placeholder)] empty:before:text-slate-600 empty:before:pointer-events-none"
          data-placeholder="スピーカーノートを入力..."
        />
      </div>
    </div>
  )
}
