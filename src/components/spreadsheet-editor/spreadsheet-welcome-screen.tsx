'use client'

import type { Cell } from '@/types'
import {
  Wallet,
  FolderKanban,
  TrendingUp,
  CalendarDays,
  Package,
  FileSpreadsheet,
} from 'lucide-react'

interface Template {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  color: string
  cells: Record<string, Cell>
}

const TEMPLATES: Template[] = [
  {
    id: 'household',
    name: '家計簿',
    description: '月、カテゴリ、金額、残高',
    icon: <Wallet size={24} />,
    color: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/30',
    cells: {
      '0-0': { value: '月' },
      '0-1': { value: 'カテゴリ' },
      '0-2': { value: '金額' },
      '0-3': { value: '残高' },
      '1-0': { value: '1月' },
      '1-1': { value: '食費' },
      '1-2': { value: '30000' },
      '1-3': { value: '=300000-C2', format: { numberFormat: 'currency' } },
      '2-0': { value: '1月' },
      '2-1': { value: '光熱費' },
      '2-2': { value: '15000' },
      '2-3': { value: '=D2-C3', format: { numberFormat: 'currency' } },
      '3-0': { value: '1月' },
      '3-1': { value: '交通費' },
      '3-2': { value: '10000' },
      '3-3': { value: '=D3-C4', format: { numberFormat: 'currency' } },
      '4-0': { value: '2月' },
      '4-1': { value: '食費' },
      '4-2': { value: '28000' },
      '4-3': { value: '=D4-C5', format: { numberFormat: 'currency' } },
      '5-0': { value: '2月' },
      '5-1': { value: '光熱費' },
      '5-2': { value: '12000' },
      '5-3': { value: '=D5-C6', format: { numberFormat: 'currency' } },
    },
  },
  {
    id: 'project',
    name: 'プロジェクト管理',
    description: 'タスク、担当者、ステータス、期限',
    icon: <FolderKanban size={24} />,
    color: 'from-blue-500/20 to-blue-600/10 border-blue-500/30',
    cells: {
      '0-0': { value: 'タスク' },
      '0-1': { value: '担当者' },
      '0-2': { value: 'ステータス' },
      '0-3': { value: '期限' },
      '0-4': { value: '優先度' },
      '1-0': { value: '要件定義' },
      '1-1': { value: '田中' },
      '1-2': { value: '完了' },
      '1-3': { value: '2025/01/15', format: { numberFormat: 'date' } },
      '1-4': { value: '高' },
      '2-0': { value: 'UI設計' },
      '2-1': { value: '佐藤' },
      '2-2': { value: '進行中' },
      '2-3': { value: '2025/02/01', format: { numberFormat: 'date' } },
      '2-4': { value: '高' },
      '3-0': { value: 'バックエンド開発' },
      '3-1': { value: '鈴木' },
      '3-2': { value: '未着手' },
      '3-3': { value: '2025/03/01', format: { numberFormat: 'date' } },
      '3-4': { value: '中' },
      '4-0': { value: 'テスト' },
      '4-1': { value: '高橋' },
      '4-2': { value: '未着手' },
      '4-3': { value: '2025/03/15', format: { numberFormat: 'date' } },
      '4-4': { value: '中' },
    },
  },
  {
    id: 'sales',
    name: '売上管理',
    description: '日付、商品、数量、売上',
    icon: <TrendingUp size={24} />,
    color: 'from-amber-500/20 to-amber-600/10 border-amber-500/30',
    cells: {
      '0-0': { value: '日付' },
      '0-1': { value: '商品名' },
      '0-2': { value: '数量' },
      '0-3': { value: '単価' },
      '0-4': { value: '売上' },
      '1-0': { value: '2025/01/05', format: { numberFormat: 'date' } },
      '1-1': { value: '商品A' },
      '1-2': { value: '10' },
      '1-3': { value: '1500', format: { numberFormat: 'currency' } },
      '1-4': { value: '=C2*D2', format: { numberFormat: 'currency' } },
      '2-0': { value: '2025/01/06', format: { numberFormat: 'date' } },
      '2-1': { value: '商品B' },
      '2-2': { value: '5' },
      '2-3': { value: '3000', format: { numberFormat: 'currency' } },
      '2-4': { value: '=C3*D3', format: { numberFormat: 'currency' } },
      '3-0': { value: '2025/01/07', format: { numberFormat: 'date' } },
      '3-1': { value: '商品A' },
      '3-2': { value: '8' },
      '3-3': { value: '1500', format: { numberFormat: 'currency' } },
      '3-4': { value: '=C4*D4', format: { numberFormat: 'currency' } },
      '4-0': { value: '' },
      '4-1': { value: '' },
      '4-2': { value: '' },
      '4-3': { value: '合計', format: { bold: true } },
      '4-4': { value: '=SUM(E2:E4)', format: { numberFormat: 'currency', bold: true } },
    },
  },
  {
    id: 'schedule',
    name: 'スケジュール表',
    description: '時間帯、月曜〜金曜',
    icon: <CalendarDays size={24} />,
    color: 'from-purple-500/20 to-purple-600/10 border-purple-500/30',
    cells: {
      '0-0': { value: '時間', format: { bold: true } },
      '0-1': { value: '月曜日', format: { bold: true } },
      '0-2': { value: '火曜日', format: { bold: true } },
      '0-3': { value: '水曜日', format: { bold: true } },
      '0-4': { value: '木曜日', format: { bold: true } },
      '0-5': { value: '金曜日', format: { bold: true } },
      '1-0': { value: '09:00' },
      '2-0': { value: '10:00' },
      '3-0': { value: '11:00' },
      '4-0': { value: '12:00' },
      '5-0': { value: '13:00' },
      '6-0': { value: '14:00' },
      '7-0': { value: '15:00' },
      '8-0': { value: '16:00' },
      '9-0': { value: '17:00' },
    },
  },
  {
    id: 'inventory',
    name: '在庫管理',
    description: '商品、在庫数、単価、仕入先',
    icon: <Package size={24} />,
    color: 'from-rose-500/20 to-rose-600/10 border-rose-500/30',
    cells: {
      '0-0': { value: '商品名', format: { bold: true } },
      '0-1': { value: '在庫数', format: { bold: true } },
      '0-2': { value: '単価', format: { bold: true } },
      '0-3': { value: '在庫金額', format: { bold: true } },
      '0-4': { value: '仕入先', format: { bold: true } },
      '1-0': { value: '商品A' },
      '1-1': { value: '150' },
      '1-2': { value: '500', format: { numberFormat: 'currency' } },
      '1-3': { value: '=B2*C2', format: { numberFormat: 'currency' } },
      '1-4': { value: '仕入先X' },
      '2-0': { value: '商品B' },
      '2-1': { value: '80' },
      '2-2': { value: '1200', format: { numberFormat: 'currency' } },
      '2-3': { value: '=B3*C3', format: { numberFormat: 'currency' } },
      '2-4': { value: '仕入先Y' },
      '3-0': { value: '商品C' },
      '3-1': { value: '200' },
      '3-2': { value: '300', format: { numberFormat: 'currency' } },
      '3-3': { value: '=B4*C4', format: { numberFormat: 'currency' } },
      '3-4': { value: '仕入先X' },
      '4-0': { value: '', format: { bold: true } },
      '4-1': { value: '', format: { bold: true } },
      '4-2': { value: '合計', format: { bold: true } },
      '4-3': { value: '=SUM(D2:D4)', format: { numberFormat: 'currency', bold: true } },
    },
  },
  {
    id: 'blank',
    name: '白紙',
    description: '空のスプレッドシートから始める',
    icon: <FileSpreadsheet size={24} />,
    color: 'from-slate-500/20 to-slate-600/10 border-slate-500/30',
    cells: {},
  },
]

interface SpreadsheetWelcomeScreenProps {
  onSelectTemplate: (cells: Record<string, Cell>) => void
}

export default function SpreadsheetWelcomeScreen({ onSelectTemplate }: SpreadsheetWelcomeScreenProps) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
      <div className="w-full max-w-2xl mx-4">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-white mb-2">
            スプレッドシートを始めましょう
          </h2>
          <p className="text-sm text-slate-400">
            テンプレートを選択するか、白紙から作成してください
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {TEMPLATES.map((template) => (
            <button
              key={template.id}
              onClick={() => onSelectTemplate(template.cells)}
              className={`group relative flex flex-col items-center gap-3 p-5 rounded-xl border bg-gradient-to-br ${template.color} hover:scale-[1.03] transition-all duration-200 hover:shadow-lg hover:shadow-indigo-500/10`}
            >
              <div className="w-12 h-12 rounded-lg bg-slate-800/50 flex items-center justify-center text-slate-300 group-hover:text-white transition-colors">
                {template.icon}
              </div>
              <div className="text-center">
                <div className="text-sm font-semibold text-white mb-0.5">{template.name}</div>
                <div className="text-[11px] text-slate-400 group-hover:text-slate-300 transition-colors">
                  {template.description}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
