'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { FileText, Mail, Lock, UserPlus, CheckCircle2, ArrowRight } from 'lucide-react'

function GitHubIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  )
}

function GoogleIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  )
}

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)
  function getSupabase() {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    return supabaseRef.current
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await getSupabase().auth.signUp({ email, password })
    if (error) {
      if (error.message === 'Supabase未接続') {
        setError('現在メール登録は利用できません。ダッシュボードへ直接お進みください。')
      } else {
        setError(error.message)
      }
      setLoading(false)
    } else {
      setSuccess(true)
      setLoading(false)
    }
  }

  async function handleGitHubLogin() {
    setError('')
    const { error } = await getSupabase().auth.signInWithOAuth({
      provider: 'github',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) {
      if (error.message === 'Supabase未接続') {
        setError('現在GitHub認証は利用できません。ダッシュボードへ直接お進みください。')
      } else {
        setError(error.message)
      }
    }
  }

  async function handleGoogleLogin() {
    setError('')
    const { error } = await getSupabase().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) {
      if (error.message === 'Supabase未接続') {
        setError('現在Google認証は利用できません。ダッシュボードへ直接お進みください。')
      } else {
        setError(error.message)
      }
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="backdrop-blur-xl bg-white/[0.03] border border-white/[0.08] rounded-2xl p-8 shadow-2xl">
            <CheckCircle2 size={48} className="text-emerald-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">登録完了</h2>
            <p className="text-slate-400 text-sm mb-6">確認メールを送信しました。メール内のリンクをクリックしてアカウントを有効化してください。</p>
            <Link href="/login" className="text-indigo-400 hover:text-indigo-300 text-sm font-medium">ログインページへ</Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/40 via-slate-950 to-violet-950/40" />
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-violet-600/15 rounded-full blur-3xl animate-pulse [animation-delay:1s]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-3xl" />

      <div className="w-full max-w-sm relative z-10">
        <div className="backdrop-blur-xl bg-white/[0.03] border border-white/[0.08] rounded-2xl p-8 shadow-2xl shadow-black/20">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2.5 mb-3">
              <div className="relative">
                <div className="absolute inset-0 bg-indigo-400/30 blur-lg rounded-full scale-150" />
                <FileText size={36} className="text-indigo-400 relative" />
              </div>
              <span className="text-2xl font-bold text-white tracking-tight">DocCraft</span>
            </div>
            <p className="text-slate-400 text-sm">新規アカウント登録</p>
          </div>

          {/* OAuth */}
          <button
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-2.5 py-3 px-4 bg-white hover:bg-gray-50 border border-slate-200 rounded-xl text-gray-700 text-sm font-medium transition-all duration-200 mb-3 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/10"
          >
            <GoogleIcon />
            Googleで登録
          </button>
          <button
            onClick={handleGitHubLogin}
            className="w-full flex items-center justify-center gap-2.5 py-3 px-4 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-600/50 rounded-xl text-white text-sm font-medium transition-all duration-200 mb-6 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20 hover:border-slate-500/50"
          >
            <GitHubIcon />
            GitHubで登録
          </button>

          {/* ダッシュボードへ直接進む */}
          <Link
            href="/dashboard"
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-xl text-white text-sm font-medium transition-all duration-200 mb-3 hover:-translate-y-0.5 shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/30"
          >
            <ArrowRight size={16} />
            登録せずに始める
          </Link>

          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-600/50 to-transparent" />
            <span className="text-xs text-slate-400 font-medium px-2">または</span>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-600/50 to-transparent" />
          </div>

          {/* Email Signup */}
          <form onSubmit={handleSignup} className="space-y-3.5">
            <div className="relative">
              <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="メールアドレス"
                required
                className="w-full pl-10 pr-4 py-3 bg-slate-900/60 border border-slate-700/60 rounded-xl text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200"
              />
            </div>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="パスワード（6文字以上）"
                required
                minLength={6}
                className="w-full pl-10 pr-4 py-3 bg-slate-900/60 border border-slate-700/60 rounded-xl text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200"
              />
            </div>

            {error && <p className="text-red-400 text-xs">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 rounded-xl text-white text-sm font-medium transition-all duration-200 shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30 hover:brightness-110"
            >
              <UserPlus size={16} />
              {loading ? '登録中...' : 'メールで登録'}
            </button>
          </form>
        </div>

        <div className="mt-6 text-center">
          <div className="inline-block backdrop-blur-sm bg-white/[0.03] border border-white/[0.06] rounded-xl px-6 py-3">
            <p className="text-sm text-slate-400">
              すでにアカウントをお持ちの方は{' '}
              <Link href="/login" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
                ログイン
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
