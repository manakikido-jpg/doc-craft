'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  FileText,
  Presentation,
  Table2,
  Sparkles,
  ArrowRight,
  Check,
  Zap,
  Shield,
  Globe,
  Layers,
  Download,
  PenTool,
  BarChart3,
  BookOpen,
} from 'lucide-react'

export default function LandingPage() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsLoggedIn(!!user)
    })
  }, [])

  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-slate-950/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-indigo-500/20">
              D
            </div>
            <span className="font-bold text-lg tracking-tight">DocCraft</span>
          </div>
          <div className="flex items-center gap-3">
            {isLoggedIn ? (
              <Link
                href="/dashboard"
                className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:brightness-110 rounded-xl text-sm font-medium transition-all shadow-lg shadow-indigo-500/25"
              >
                ダッシュボードへ <ArrowRight size={14} />
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-4 py-2 text-sm text-slate-300 hover:text-white transition-colors"
                >
                  ログイン
                </Link>
                <Link
                  href="/signup"
                  className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:brightness-110 rounded-xl text-sm font-medium transition-all shadow-lg shadow-indigo-500/25"
                >
                  無料で始める <ArrowRight size={14} />
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6">
        {/* Background effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-1/4 w-[500px] h-[500px] bg-indigo-600/15 rounded-full blur-[120px]" />
          <div className="absolute top-40 right-1/4 w-[400px] h-[400px] bg-violet-600/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-cyan-600/5 rounded-full blur-[100px]" />
        </div>

        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium mb-8">
            <Sparkles size={12} />
            AI搭載の次世代ドキュメントツール
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.1] mb-6">
            すべての資料を
            <br />
            <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent">
              ひとつのツール
            </span>
            で。
          </h1>

          <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            ドキュメント、スライド、スプレッドシート。
            <br className="hidden sm:block" />
            3つのツールをひとつに統合。AIが資料作成をアシストします。
          </p>

          <div className="flex items-center justify-center gap-4 mb-16">
            <Link
              href={isLoggedIn ? '/dashboard' : '/signup'}
              className="flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:brightness-110 rounded-xl text-base font-semibold transition-all shadow-xl shadow-indigo-500/25 hover:-translate-y-0.5"
            >
              {isLoggedIn ? 'ダッシュボードへ' : '無料で始める'} <ArrowRight size={16} />
            </Link>
            <a
              href="#features"
              className="px-8 py-3.5 rounded-xl text-base font-medium text-slate-300 hover:text-white border border-slate-700 hover:border-slate-500 transition-all hover:-translate-y-0.5"
            >
              機能を見る
            </a>
          </div>

          {/* Three tool preview cards */}
          <div className="grid grid-cols-3 gap-4 max-w-3xl mx-auto">
            <ToolPreviewCard
              icon={<FileText size={28} />}
              title="ドキュメント"
              gradient="from-emerald-600 to-teal-600"
              features={['リッチテキスト編集', 'テンプレート', 'DOCX/PDF出力']}
            />
            <ToolPreviewCard
              icon={<Presentation size={28} />}
              title="スライド"
              gradient="from-indigo-600 to-violet-600"
              features={['テーマ & アニメーション', 'プレゼンモード', 'PPTX出力']}
            />
            <ToolPreviewCard
              icon={<Table2 size={28} />}
              title="スプレッドシート"
              gradient="from-cyan-600 to-blue-600"
              features={['65+関数', 'グラフ作成', 'CSV/PDF出力']}
            />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-6 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-indigo-950/10 to-transparent pointer-events-none" />
        <div className="relative max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">
              必要なものが、
              <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">すべて揃う</span>
            </h2>
            <p className="text-slate-400 text-lg max-w-xl mx-auto">
              資料作成に必要な機能をワンストップで提供
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <FeatureCard
              icon={<Sparkles size={20} />}
              title="AI自動生成"
              description="トピックを入力するだけでスライドやドキュメントをAIが自動生成。会議メモの要約も可能。"
              color="text-indigo-400"
            />
            <FeatureCard
              icon={<PenTool size={20} />}
              title="リッチエディタ"
              description="20種類以上のブロックタイプ。画像、表、コード、数式、図形描画にも対応。"
              color="text-emerald-400"
            />
            <FeatureCard
              icon={<BarChart3 size={20} />}
              title="グラフ & チャート"
              description="スプレッドシートのデータから棒グラフ、折れ線、円グラフ、散布図を作成。"
              color="text-cyan-400"
            />
            <FeatureCard
              icon={<Download size={20} />}
              title="多彩なエクスポート"
              description="DOCX、PPTX、PDF、HTML、CSVなど。作成した資料をそのまま提出・共有。"
              color="text-amber-400"
            />
            <FeatureCard
              icon={<BookOpen size={20} />}
              title="テンプレート"
              description="ビジネスレター、議事録、企画書、レポートなど豊富なテンプレートで素早く開始。"
              color="text-pink-400"
            />
            <FeatureCard
              icon={<Zap size={20} />}
              title="数式エンジン"
              description="SUM、VLOOKUP、IFなど65以上の関数。スラッシュコマンドで関数一覧を即座に表示。"
              color="text-violet-400"
            />
            <FeatureCard
              icon={<Layers size={20} />}
              title="プレゼンテーション"
              description="スライドショー、プレゼンタービュー、スライドソーター。発表者ノート付き。"
              color="text-orange-400"
            />
            <FeatureCard
              icon={<Shield size={20} />}
              title="セキュア認証"
              description="Google・GitHub OAuthまたはメール認証。Supabaseによる安全なデータ管理。"
              color="text-green-400"
            />
            <FeatureCard
              icon={<Globe size={20} />}
              title="クラウド保存"
              description="作成した資料はクラウドに自動保存。どこからでもアクセス・編集が可能。"
              color="text-sky-400"
            />
          </div>
        </div>
      </section>

      {/* Document Types Detail */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto space-y-20">
          <DetailRow
            icon={<FileText size={32} />}
            gradient="from-emerald-600 to-teal-600"
            title="ドキュメント"
            subtitle="Word感覚で使えるリッチドキュメントエディタ"
            features={[
              '20種類以上のブロック（見出し、段落、表、画像、コード、数式...）',
              'AI文章校正 & 自動生成',
              'ウォーターマーク、表紙、目次の自動生成',
              'DOCX / PDF / HTML エクスポート',
              'バージョン履歴 & Undo/Redo',
              '書式ツールバー（フォント、色、ルビ、傍点...）',
            ]}
            reverse={false}
          />
          <DetailRow
            icon={<Presentation size={32} />}
            gradient="from-indigo-600 to-violet-600"
            title="スライド"
            subtitle="PowerPoint級のプレゼンテーションを素早く作成"
            features={[
              'ドラッグ&ドロップ要素配置 & スマートガイド',
              'テーマ & テンプレートの豊富なバリエーション',
              'アニメーション設定 & トランジション',
              'プレゼンタービュー（ノート・タイマー付き）',
              'PPTX / PDF / HTML エクスポート',
              '画像フィルタ & チャート埋め込み',
            ]}
            reverse={true}
          />
          <DetailRow
            icon={<Table2 size={32} />}
            gradient="from-cyan-600 to-blue-600"
            title="スプレッドシート"
            subtitle="Excel級の表計算機能をブラウザで"
            features={[
              '65以上の関数（SUM, VLOOKUP, IF, SUMIFS...）',
              '「/」スラッシュコマンドで関数リファレンス即表示',
              'グラフ作成（棒、折れ線、円、散布図）',
              'データバリデーション & 条件付き書式',
              'セル結合、行列操作、複数シート',
              'CSV / PDF / HTML エクスポート & 印刷プレビュー',
            ]}
            reverse={false}
          />
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6 relative">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute bottom-0 left-1/3 w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 right-1/3 w-[300px] h-[300px] bg-violet-600/10 rounded-full blur-[100px]" />
        </div>
        <div className="relative max-w-2xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">
            今すぐ始めよう
          </h2>
          <p className="text-slate-400 text-lg mb-8">
            無料でアカウントを作成して、すべての機能を使い始めましょう。
          </p>
          <Link
            href={isLoggedIn ? '/dashboard' : '/signup'}
            className="inline-flex items-center gap-2 px-10 py-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:brightness-110 rounded-xl text-lg font-semibold transition-all shadow-xl shadow-indigo-500/25 hover:-translate-y-0.5"
          >
            {isLoggedIn ? 'ダッシュボードへ' : '無料で始める'} <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/50 py-8 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white font-bold text-[10px]">
              D
            </div>
            <span className="text-sm font-semibold text-slate-400">DocCraft</span>
          </div>
          <p className="text-xs text-slate-600">Built with Next.js & Supabase</p>
        </div>
      </footer>
    </div>
  )
}

/* ── Sub-components ── */

function ToolPreviewCard({
  icon,
  title,
  gradient,
  features,
}: {
  icon: React.ReactNode
  title: string
  gradient: string
  features: string[]
}) {
  return (
    <div className="group relative bg-slate-900/60 backdrop-blur-sm border border-slate-800 rounded-2xl p-6 text-center hover:border-slate-700 transition-all duration-300 hover:-translate-y-1">
      <div
        className={`w-14 h-14 mx-auto rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white shadow-lg mb-4 group-hover:scale-110 transition-transform duration-300`}
      >
        {icon}
      </div>
      <h3 className="font-bold text-white mb-3">{title}</h3>
      <ul className="space-y-1.5">
        {features.map((f) => (
          <li key={f} className="text-xs text-slate-400 flex items-center gap-1.5 justify-center">
            <Check size={10} className="text-indigo-400 flex-shrink-0" />
            {f}
          </li>
        ))}
      </ul>
    </div>
  )
}

function FeatureCard({
  icon,
  title,
  description,
  color,
}: {
  icon: React.ReactNode
  title: string
  description: string
  color: string
}) {
  return (
    <div className="group p-5 rounded-xl border border-slate-800 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900/60 transition-all duration-300">
      <div className={`w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center ${color} mb-3 group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
      <h3 className="font-semibold text-white text-sm mb-1.5">{title}</h3>
      <p className="text-xs text-slate-400 leading-relaxed">{description}</p>
    </div>
  )
}

function DetailRow({
  icon,
  gradient,
  title,
  subtitle,
  features,
  reverse,
}: {
  icon: React.ReactNode
  gradient: string
  title: string
  subtitle: string
  features: string[]
  reverse: boolean
}) {
  return (
    <div className={`flex items-center gap-16 ${reverse ? 'flex-row-reverse' : ''} max-lg:flex-col max-lg:gap-8`}>
      {/* Visual */}
      <div className="flex-1 relative">
        <div className={`aspect-video rounded-2xl bg-gradient-to-br ${gradient} p-[1px]`}>
          <div className="w-full h-full rounded-2xl bg-slate-950 flex items-center justify-center">
            <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white opacity-80`}>
              {icon}
            </div>
          </div>
        </div>
        <div className={`absolute -z-10 inset-0 bg-gradient-to-br ${gradient} opacity-10 blur-3xl rounded-full scale-75`} />
      </div>
      {/* Content */}
      <div className="flex-1">
        <h3 className="text-2xl font-extrabold mb-2">{title}</h3>
        <p className="text-slate-400 mb-5">{subtitle}</p>
        <ul className="space-y-2.5">
          {features.map((f) => (
            <li key={f} className="flex items-start gap-2.5 text-sm text-slate-300">
              <Check size={16} className="text-indigo-400 flex-shrink-0 mt-0.5" />
              {f}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
