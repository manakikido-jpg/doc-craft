'use client'

import { useState, useCallback } from 'react'
import { History, X, RotateCcw, Trash2, Clock } from 'lucide-react'
import { getBackups, deleteBackup, formatBackupTime, type BackupEntry } from '@/lib/auto-backup'

interface Props {
  documentId: string
  open: boolean
  onClose: () => void
  onRestore: (data: string) => void
}

export default function BackupRestore({ documentId, open, onClose, onRestore }: Props) {
  const [backups, setBackups] = useState<BackupEntry[]>(() => getBackups(documentId))
  const [confirmId, setConfirmId] = useState<string | null>(null)

  const refresh = useCallback(() => {
    setBackups(getBackups(documentId))
  }, [documentId])

  const handleRestore = useCallback(
    (backup: BackupEntry) => {
      onRestore(backup.data)
      onClose()
    },
    [onRestore, onClose],
  )

  const handleDelete = useCallback(
    (backupId: string) => {
      deleteBackup(documentId, backupId)
      refresh()
      setConfirmId(null)
    },
    [documentId, refresh],
  )

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="backup-restore-title"
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <div className="relative bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md mx-4 shadow-2xl animate-scale-in">
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <h2
            id="backup-restore-title"
            className="text-base font-semibold text-white flex items-center gap-2"
          >
            <History size={18} className="text-indigo-400" />
            バックアップから復元
          </h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="閉じる"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-4 max-h-[400px] overflow-y-auto custom-scrollbar">
          {backups.length === 0 ? (
            <div className="text-center py-8">
              <Clock size={32} className="mx-auto mb-3 text-slate-600" />
              <p className="text-sm text-slate-400">バックアップがありません</p>
              <p className="text-xs text-slate-500 mt-1">
                5分ごとに自動バックアップが作成されます
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {backups.map((backup) => (
                <div
                  key={backup.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-800/60 border border-slate-700/50 hover:border-slate-600 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-200 truncate">{backup.title}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {formatBackupTime(backup.timestamp)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    {confirmId === backup.id ? (
                      <>
                        <button
                          onClick={() => handleDelete(backup.id)}
                          className="px-2 py-1 text-xs text-red-400 hover:text-red-300 bg-red-500/10 rounded transition-colors"
                        >
                          削除
                        </button>
                        <button
                          onClick={() => setConfirmId(null)}
                          className="px-2 py-1 text-xs text-slate-400 hover:text-white rounded transition-colors"
                        >
                          取消
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleRestore(backup)}
                          className="p-1.5 rounded-md text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 transition-colors"
                          title="復元"
                          aria-label="このバックアップから復元"
                        >
                          <RotateCcw size={14} />
                        </button>
                        <button
                          onClick={() => setConfirmId(backup.id)}
                          className="p-1.5 rounded-md text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="削除"
                          aria-label="このバックアップを削除"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-800">
          <p className="text-xs text-slate-500 text-center">
            最新{5}件のバックアップを保持 ・ 5分間隔で自動保存
          </p>
        </div>
      </div>
    </div>
  )
}
