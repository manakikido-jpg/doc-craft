'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { FileText, Hash, Calendar, Type } from 'lucide-react'
import type { HeaderFooterSettings } from '@/types'

interface Props {
  position: 'header' | 'footer'
  settings: HeaderFooterSettings | undefined
  onSave: (settings: HeaderFooterSettings) => void
  pageNumber: number
  totalPages: number
  title: string
  isFirstPage?: boolean
}

type FieldKey = 'Left' | 'Center' | 'Right'

const PLACEHOLDERS: { label: string; value: string; icon: React.ReactNode }[] = [
  { label: '{page}', value: '{page}', icon: <FileText size={10} /> },
  { label: '{pages}', value: '{pages}', icon: <Hash size={10} /> },
  { label: '{date}', value: '{date}', icon: <Calendar size={10} /> },
  { label: '{title}', value: '{title}', icon: <Type size={10} /> },
]

function replacePlaceholders(text: string, pageNumber: number, totalPages: number, title: string): string {
  return text
    .replace(/\{page\}/g, String(pageNumber))
    .replace(/\{pages\}/g, String(totalPages))
    .replace(/\{date\}/g, new Date().toLocaleDateString('ja-JP'))
    .replace(/\{title\}/g, title)
}

export default function PageHeaderFooter({ position, settings, onSave, pageNumber, totalPages, title, isFirstPage }: Props) {
  const isOdd = pageNumber % 2 === 1
  const useDifferentOddEven = !!settings?.differentOddEven

  // Determine which keys to use based on odd/even setting
  const prefix = position === 'header' ? 'header' : 'footer'
  let leftKey: keyof HeaderFooterSettings
  let centerKey: keyof HeaderFooterSettings
  let rightKey: keyof HeaderFooterSettings

  if (useDifferentOddEven) {
    const parity = isOdd ? 'odd' : 'even'
    const capPrefix = prefix === 'header' ? 'Header' : 'Footer'
    leftKey = `${parity}${capPrefix}Left` as keyof HeaderFooterSettings
    centerKey = `${parity}${capPrefix}Center` as keyof HeaderFooterSettings
    rightKey = `${parity}${capPrefix}Right` as keyof HeaderFooterSettings
  } else {
    leftKey = `${prefix}Left` as keyof HeaderFooterSettings
    centerKey = `${prefix}Center` as keyof HeaderFooterSettings
    rightKey = `${prefix}Right` as keyof HeaderFooterSettings
  }

  const leftVal = (settings?.[leftKey] as string) || ''
  const centerVal = (settings?.[centerKey] as string) || ''
  const rightVal = (settings?.[rightKey] as string) || ''

  const [editing, setEditing] = useState(false)
  const [editLeft, setEditLeft] = useState(leftVal)
  const [editCenter, setEditCenter] = useState(centerVal)
  const [editRight, setEditRight] = useState(rightVal)
  const [focusedField, setFocusedField] = useState<FieldKey | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setEditLeft((settings?.[leftKey] as string) || '')
    setEditCenter((settings?.[centerKey] as string) || '')
    setEditRight((settings?.[rightKey] as string) || '')
  }, [settings, leftKey, centerKey, rightKey])

  const saveChanges = useCallback(() => {
    const updated: HeaderFooterSettings = {
      ...settings,
      [leftKey]: editLeft,
      [centerKey]: editCenter,
      [rightKey]: editRight,
    }
    onSave(updated)
    setEditing(false)
    setFocusedField(null)
  }, [editLeft, editCenter, editRight, settings, leftKey, centerKey, rightKey, onSave])

  useEffect(() => {
    if (!editing) return
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        saveChanges()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [editing, saveChanges])

  const insertPlaceholder = (value: string) => {
    if (!focusedField) return
    if (focusedField === 'Left') setEditLeft((v) => v + value)
    else if (focusedField === 'Center') setEditCenter((v) => v + value)
    else if (focusedField === 'Right') setEditRight((v) => v + value)
  }

  const isEmpty = !leftVal && !centerVal && !rightVal
  const isFooter = position === 'footer'

  // Hide header/footer on first page if differentFirstPage is enabled
  if (settings?.differentFirstPage && isFirstPage) {
    return <div className={`${isFooter ? 'pt-2' : 'pb-2'}`} />
  }

  if (!editing) {
    return (
      <div
        className={`flex items-center justify-between text-[10px] text-slate-400 cursor-pointer transition-colors hover:bg-slate-50 ${
          isEmpty ? 'border border-dashed border-slate-300 rounded' : isFooter ? 'border-t border-slate-200' : 'border-b border-slate-200'
        } ${isFooter ? 'pt-2' : 'pb-2'} ${isEmpty ? 'py-2' : ''}`}
        onClick={(e) => {
          e.stopPropagation()
          setEditing(true)
        }}
        title={position === 'header' ? 'クリックしてヘッダーを編集' : 'クリックしてフッターを編集'}
      >
        {isEmpty ? (
          <span className="w-full text-center text-slate-300 italic text-[10px]">
            {position === 'header' ? 'ヘッダーを編集するにはクリック' : 'フッターを編集するにはクリック'}
            {useDifferentOddEven && (
              <span className="ml-1 text-slate-400">({isOdd ? '奇数' : '偶数'}ページ)</span>
            )}
          </span>
        ) : (
          <>
            <span>{replacePlaceholders(leftVal, pageNumber, totalPages, title)}</span>
            <span>{replacePlaceholders(centerVal, pageNumber, totalPages, title)}</span>
            <span>
              {isFooter && settings?.showPageNumbers && !rightVal
                ? `${pageNumber} / ${totalPages}`
                : replacePlaceholders(rightVal, pageNumber, totalPages, title)}
            </span>
          </>
        )}
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={`${isFooter ? 'pt-2' : 'pb-2'}`}
      onClick={(e) => e.stopPropagation()}
    >
      {useDifferentOddEven && (
        <div className="text-[9px] text-slate-400 mb-1 text-center">
          {isOdd ? '奇数ページ' : '偶数ページ'} {position === 'header' ? 'ヘッダー' : 'フッター'}
        </div>
      )}
      <div className="flex items-center justify-between gap-1 border border-indigo-300 rounded p-1">
        <EditableField
          value={editLeft}
          onChange={setEditLeft}
          placeholder="左"
          onFocus={() => setFocusedField('Left')}
        />
        <div className="w-px h-4 bg-slate-200 flex-shrink-0" />
        <EditableField
          value={editCenter}
          onChange={setEditCenter}
          placeholder="中央"
          onFocus={() => setFocusedField('Center')}
        />
        <div className="w-px h-4 bg-slate-200 flex-shrink-0" />
        <EditableField
          value={editRight}
          onChange={setEditRight}
          placeholder="右"
          onFocus={() => setFocusedField('Right')}
        />
      </div>
      {/* Insert placeholder buttons */}
      <div className="flex items-center gap-1 mt-1">
        <span className="text-[9px] text-slate-400 mr-1">挿入:</span>
        {PLACEHOLDERS.map((p) => (
          <button
            key={p.value}
            onMouseDown={(e) => {
              e.preventDefault()
              insertPlaceholder(p.value)
            }}
            className="flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 hover:bg-indigo-100 hover:text-indigo-600 transition-colors"
            title={`${p.label} を挿入`}
          >
            {p.icon}
            {p.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function EditableField({
  value,
  onChange,
  placeholder,
  onFocus,
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
  onFocus: () => void
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onFocus={onFocus}
      placeholder={placeholder}
      className="flex-1 min-w-0 text-[10px] text-slate-600 bg-transparent outline-none px-1 py-0.5 placeholder:text-slate-300 text-center"
    />
  )
}
