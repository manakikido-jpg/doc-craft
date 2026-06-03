'use client'

import { useState, useEffect } from 'react'

interface CursorInfo {
  /** What the user is currently editing, e.g. "セルB5を編集中" */
  label: string
  /** Whether the user is actively typing right now */
  isTyping: boolean
}

interface PresenceUser {
  userId: string
  name: string
  color: string
  cursorInfo?: CursorInfo
}

const MOCK_USERS: PresenceUser[] = [
  {
    userId: 'mock-1',
    name: '田中',
    color: '#3b82f6',
    cursorInfo: { label: 'セルB5を編集中', isTyping: true },
  },
  {
    userId: 'mock-2',
    name: '佐藤',
    color: '#22c55e',
    cursorInfo: { label: '段落3を編集中', isTyping: false },
  },
  {
    userId: 'mock-3',
    name: '鈴木',
    color: '#eab308',
    cursorInfo: { label: 'スライド2を編集中', isTyping: true },
  },
]

interface Props {
  documentId: string
}

export default function PresenceAvatars({ documentId }: Props) {
  const [users, setUsers] = useState<PresenceUser[]>([])

  useEffect(() => {
    if (!documentId) return
    // Use mock presence data for UI demonstration
    // In production, this would connect to a WebSocket/Supabase presence channel
    const timer = setTimeout(() => {
      setUsers(MOCK_USERS.slice(0, 2 + Math.floor(Math.random() * 2)))
    }, 500)
    return () => clearTimeout(timer)
  }, [documentId])

  if (users.length === 0) return null

  return (
    <>
      {/* Pulsing animation for typing indicator */}
      <style>{`
        @keyframes presence-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.3); }
        }
        .presence-typing-dot {
          animation: presence-pulse 1.2s ease-in-out infinite;
        }
      `}</style>
      <div className="flex items-center gap-1.5">
        <div className="flex items-center">
          {users.slice(0, 5).map((user) => (
            <div key={user.userId} className="relative group -ml-1 first:ml-0">
              {/* Avatar */}
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white border-2 border-slate-950 transition-transform hover:scale-110 hover:z-10"
                style={{ backgroundColor: user.color }}
              >
                {user.name.charAt(0)}
              </div>

              {/* Active editing dot */}
              {user.cursorInfo && (
                <span
                  className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border border-slate-950${
                    user.cursorInfo.isTyping ? ' presence-typing-dot' : ''
                  }`}
                  style={{ backgroundColor: user.color }}
                />
              )}

              {/* Tooltip on hover */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded bg-slate-800 border border-slate-700 text-[10px] text-white whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-lg">
                <span className="font-medium">{user.name}</span>
                {user.cursorInfo ? (
                  <>
                    <span className="mx-1 text-slate-500">·</span>
                    <span className="text-slate-300">{user.cursorInfo.label}</span>
                  </>
                ) : (
                  <span className="text-slate-400 ml-1">閲覧中</span>
                )}
              </div>
            </div>
          ))}
          {users.length > 5 && (
            <span className="text-[10px] text-slate-400 ml-1">+{users.length - 5}</span>
          )}
        </div>
        <span className="text-[10px] text-slate-400 whitespace-nowrap hidden sm:inline">
          {users.length}人が閲覧中
        </span>
      </div>
    </>
  )
}
