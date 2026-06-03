'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  loading: boolean
  isGuest: boolean
  signOut: () => Promise<void>
  loginAsGuest: () => void
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isGuest: false,
  signOut: async () => {},
  loginAsGuest: () => {},
})

const AUTH_TIMEOUT_MS = 5000

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isGuest, setIsGuest] = useState(false)

  useEffect(() => {
    let cancelled = false
    const supabase = createClient()

    // タイムアウト: Supabase応答がない場合はロード解除
    const timeout = setTimeout(() => {
      if (!cancelled) {
        setLoading(false)
      }
    }, AUTH_TIMEOUT_MS)

    supabase.auth.getUser().then(({ data: { user: supaUser } }) => {
      if (cancelled) return
      clearTimeout(timeout)
      setUser(supaUser)
      setLoading(false)
    }).catch(() => {
      if (cancelled) return
      clearTimeout(timeout)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => {
      cancelled = true
      clearTimeout(timeout)
      subscription.unsubscribe()
    }
  }, [])

  function loginAsGuest() {
    setUser(null)
    setIsGuest(true)
    setLoading(false)
  }

  async function signOut() {
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
    } catch {
      // ignore
    }
    setUser(null)
    setIsGuest(false)
    window.location.href = '/login'
  }

  return (
    <AuthContext.Provider value={{ user, loading, isGuest, signOut, loginAsGuest }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
