'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface PresenceUser {
  userId: string
  name: string
  color: string
  lastSeen: string
}

const PRESENCE_COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#8b5cf6', '#ec4899']

export function usePresence(documentId: string) {
  const [users, setUsers] = useState<PresenceUser[]>([])

  useEffect(() => {
    if (!documentId) return

    const supabase = createClient()
    let userId = ''

    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      userId = user.id

      const channel = supabase.channel(`doc:${documentId}`)

      channel
        .on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState()
          const activeUsers: PresenceUser[] = []
          Object.values(state).forEach((presences) => {
            (presences as unknown as PresenceUser[]).forEach((p) => {
              if (p.userId !== userId) {
                activeUsers.push(p)
              }
            })
          })
          setUsers(activeUsers)
        })
        .subscribe(async (status: string) => {
          if (status === 'SUBSCRIBED') {
            await channel.track({
              userId: user.id,
              name: user.email?.split('@')[0] || 'ユーザー',
              color: PRESENCE_COLORS[Math.abs(user.id.charCodeAt(0)) % PRESENCE_COLORS.length],
              lastSeen: new Date().toISOString(),
            })
          }
        })

      return () => {
        supabase.removeChannel(channel)
      }
    }

    const cleanup = init()
    return () => { cleanup.then(fn => fn?.()) }
  }, [documentId])

  return users
}
