'use client'

import { useState, useEffect, useMemo } from 'react'
import type { DocumentMeta } from '@/types'
import { listDocuments, deleteDocument, duplicateDocument } from '@/lib/document-store'
import DocumentCard from '@/components/dashboard/document-card'
import CreateModal from '@/components/dashboard/create-modal'
import { t, getLocale } from '@/lib/i18n'
import { Search, X, FilePlus, Plus, Sun, Moon } from 'lucide-react'
import { useTheme } from '@/lib/theme-context'

type FilterType = 'all' | 'slides' | 'doc' | 'spreadsheet'
type SortType = 'updated' | 'created' | 'name'

export default function DashboardPage() {
  const [docs, setDocs] = useState<DocumentMeta[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<FilterType>('all')
  const [sortBy, setSortBy] = useState<SortType>('updated')

  // Initialize locale on mount
  useEffect(() => {
    getLocale()
  }, [])

  function refresh() {
    setDocs(listDocuments())
  }

  useEffect(() => {
    refresh()
  }, [])

  const filtered = useMemo(() => {
    let result = docs

    // Filter by type
    if (filterType !== 'all') {
      result = result.filter((d) => d.type === filterType)
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter((d) => d.title.toLowerCase().includes(q))
    }

    // Sort
    switch (sortBy) {
      case 'created':
        result = [...result].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        break
      case 'name':
        result = [...result].sort((a, b) => a.title.localeCompare(b.title, 'ja'))
        break
      case 'updated':
      default:
        // already sorted by updated from listDocuments
        break
    }

    return result
  }, [docs, search, filterType, sortBy])

  function handleDelete(id: string) {
    deleteDocument(id)
    refresh()
  }

  function handleDuplicate(id: string) {
    duplicateDocument(id)
    refresh()
  }

  function handleModalClose() {
    setModalOpen(false)
    refresh()
  }

  const { theme, toggleTheme } = useTheme()

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">{t('dashboard.title')}</h1>
            <p className="text-slate-400 text-sm mt-1">
              {docs.length > 0 ? `${docs.length} ${t('dashboard.filesCount')}` : t('dashboard.noFiles')}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="w-9 h-9 flex items-center justify-center rounded-lg border border-slate-700 hover:border-slate-500 bg-slate-800 text-slate-400 hover:text-white transition-colors"
              title={theme === 'dark' ? 'ライトモード' : 'ダークモード'}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-4 py-2.5 rounded-lg transition-colors text-sm shadow-lg shadow-indigo-500/20"
            >
              <Plus size={18} />
              {t('dashboard.newCreate')}
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        {docs.length > 0 && (
          <div className="flex items-center gap-3 mb-6">
            <div className="relative flex-1 max-w-sm">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                <Search size={15} />
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('dashboard.search')}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-0.5 border border-slate-700">
              {(
                [
                  ['all', t('dashboard.all')],
                  ['slides', t('dashboard.slides')],
                  ['doc', t('dashboard.docs')],
                  ['spreadsheet', t('dashboard.spreadsheets')],
                ] as [FilterType, string][]
              ).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setFilterType(val)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    filterType === val ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortType)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
            >
              <option value="updated">{t('dashboard.sortUpdated')}</option>
              <option value="created">{t('dashboard.sortCreated')}</option>
              <option value="name">{t('dashboard.sortName')}</option>
            </select>
          </div>
        )}

        {docs.length === 0 ? (
          <EmptyState onCreate={() => setModalOpen(true)} />
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-slate-500 text-sm">
              {t('dashboard.noResults')}「{search}」
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filtered.map((doc) => (
              <DocumentCard key={doc.id} doc={doc} onDelete={handleDelete} onDuplicate={handleDuplicate} />
            ))}
          </div>
        )}
      </div>

      <CreateModal open={modalOpen} onClose={handleModalClose} />
    </div>
  )
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-32 text-center">
      <div className="w-20 h-20 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mb-5">
        <FilePlus size={36} className="text-slate-500" />
      </div>
      <h2 className="text-xl font-semibold text-white mb-2">{t('dashboard.createFirst')}</h2>
      <p className="text-slate-400 text-sm mb-6 max-w-xs">{t('dashboard.createFirstDesc')}</p>
      <button
        onClick={onCreate}
        className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-5 py-2.5 rounded-lg transition-colors"
      >
        {t('dashboard.newCreate')}
      </button>
    </div>
  )
}
