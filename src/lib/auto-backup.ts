/**
 * Auto-backup system for DocCraft.
 * Saves periodic backups to localStorage with timestamps,
 * keeping the last 5 backups per document.
 */

const BACKUP_PREFIX = 'doccraft:backup:'
const MAX_BACKUPS = 5
const BACKUP_INTERVAL_MS = 5 * 60 * 1000 // 5 minutes

function isBrowser(): boolean {
  return typeof window !== 'undefined'
}

export interface BackupEntry {
  id: string
  documentId: string
  timestamp: string
  data: string
  title: string
}

function getBackupKey(documentId: string): string {
  return BACKUP_PREFIX + documentId
}

/**
 * Get all backups for a document, sorted newest first.
 */
export function getBackups(documentId: string): BackupEntry[] {
  if (!isBrowser()) return []
  try {
    const raw = localStorage.getItem(getBackupKey(documentId))
    if (!raw) return []
    const backups: BackupEntry[] = JSON.parse(raw)
    return backups.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    )
  } catch {
    return []
  }
}

/**
 * Save a backup for a document.
 * Keeps only the last MAX_BACKUPS entries.
 */
export function saveBackup(documentId: string, data: string, title: string): void {
  if (!isBrowser()) return

  const backups = getBackups(documentId)
  const newEntry: BackupEntry = {
    id: `backup-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    documentId,
    timestamp: new Date().toISOString(),
    data,
    title,
  }

  backups.unshift(newEntry)

  // Keep only the latest MAX_BACKUPS
  const trimmed = backups.slice(0, MAX_BACKUPS)

  try {
    localStorage.setItem(getBackupKey(documentId), JSON.stringify(trimmed))
  } catch (e) {
    if (e instanceof DOMException && (e.name === 'QuotaExceededError' || e.code === 22)) {
      console.warn('[DocCraft] Backup: quota exceeded, removing oldest backups')
      // Try keeping fewer backups
      const minimal = trimmed.slice(0, 2)
      try {
        localStorage.setItem(getBackupKey(documentId), JSON.stringify(minimal))
      } catch {
        // Give up
      }
    }
  }
}

/**
 * Restore a specific backup by its ID.
 * Returns the backup data string, or null if not found.
 */
export function restoreBackup(documentId: string, backupId: string): string | null {
  const backups = getBackups(documentId)
  const backup = backups.find((b) => b.id === backupId)
  return backup?.data ?? null
}

/**
 * Delete all backups for a document.
 */
export function clearBackups(documentId: string): void {
  if (!isBrowser()) return
  localStorage.removeItem(getBackupKey(documentId))
}

/**
 * Delete a single backup entry.
 */
export function deleteBackup(documentId: string, backupId: string): void {
  if (!isBrowser()) return
  const backups = getBackups(documentId).filter((b) => b.id !== backupId)
  localStorage.setItem(getBackupKey(documentId), JSON.stringify(backups))
}

/**
 * Start an auto-backup timer for a document.
 * Returns a cleanup function to stop the timer.
 *
 * @param documentId - The document ID to back up
 * @param getDocData - Function that returns the current document data as a JSON string
 * @param getTitle   - Function that returns the current document title
 * @param intervalMs - Backup interval in milliseconds (default: 5 minutes)
 */
export function startAutoBackup(
  documentId: string,
  getDocData: () => string,
  getTitle: () => string,
  intervalMs: number = BACKUP_INTERVAL_MS,
): () => void {
  if (!isBrowser()) return () => {}

  const timer = setInterval(() => {
    try {
      const data = getDocData()
      const title = getTitle()
      saveBackup(documentId, data, title)
    } catch (e) {
      console.warn('[DocCraft] Auto-backup failed:', e)
    }
  }, intervalMs)

  return () => clearInterval(timer)
}

/**
 * Format a backup timestamp for display.
 */
export function formatBackupTime(timestamp: string): string {
  const date = new Date(timestamp)
  return date.toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}
