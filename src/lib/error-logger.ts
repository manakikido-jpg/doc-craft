interface ErrorLog {
  message: string
  stack?: string
  context?: string
  url?: string
  timestamp: string
}

const ERROR_LOG_KEY = 'doccraft:errorLog'
const MAX_LOGS = 50

export function logError(error: unknown, context?: string): void {
  const log: ErrorLog = {
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    context,
    url: typeof window !== 'undefined' ? window.location.href : undefined,
    timestamp: new Date().toISOString(),
  }

  // Console log
  console.error(`[DocCraft Error] ${context || ''}:`, error)

  // Store in localStorage for debugging
  if (typeof window === 'undefined') return
  try {
    const existing: ErrorLog[] = JSON.parse(localStorage.getItem(ERROR_LOG_KEY) || '[]')
    existing.push(log)
    // Keep only last 50 errors
    const trimmed = existing.slice(-MAX_LOGS)
    localStorage.setItem(ERROR_LOG_KEY, JSON.stringify(trimmed))
  } catch { /* ignore */ }
}

export function getErrorLogs(): ErrorLog[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(ERROR_LOG_KEY) || '[]')
  } catch { return [] }
}

export function clearErrorLogs(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(ERROR_LOG_KEY)
}
