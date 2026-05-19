import type { Block } from '@/types'
import { generateId } from './utils'

export interface DocTemplate {
  id: string
  name: string
  icon: string
  description: string
  buildDoc: () => Block[]
}

export const DOC_TEMPLATES: DocTemplate[] = [
  {
    id: 'blank',
    name: 'ブランク',
    icon: 'file',
    description: '白紙から始める',
    buildDoc: () => [
      { id: generateId(), type: 'h1', content: '' },
      { id: generateId(), type: 'paragraph', content: '' },
    ],
  },
  {
    id: 'meeting',
    name: '議事録',
    icon: 'notebookPen',
    description: '会議の記録・決定事項',
    buildDoc: () => [
      { id: generateId(), type: 'h1', content: '会議議事録' },
      { id: generateId(), type: 'h2', content: '会議情報' },
      { id: generateId(), type: 'bullet', content: '日時: ' },
      { id: generateId(), type: 'bullet', content: '場所: ' },
      { id: generateId(), type: 'bullet', content: '参加者: ' },
      { id: generateId(), type: 'h2', content: '議題' },
      { id: generateId(), type: 'numbered', content: '' },
      { id: generateId(), type: 'h2', content: '決定事項' },
      { id: generateId(), type: 'bullet', content: '' },
      { id: generateId(), type: 'h2', content: 'アクションアイテム' },
      { id: generateId(), type: 'bullet', content: '' },
      { id: generateId(), type: 'h2', content: '次回予定' },
      { id: generateId(), type: 'paragraph', content: '' },
    ],
  },
  {
    id: 'proposal',
    name: '提案書',
    icon: 'clipboardList',
    description: 'プロジェクト提案・企画書',
    buildDoc: () => [
      { id: generateId(), type: 'h1', content: '提案書' },
      { id: generateId(), type: 'h2', content: '背景・目的' },
      { id: generateId(), type: 'paragraph', content: '' },
      { id: generateId(), type: 'h2', content: '提案内容' },
      { id: generateId(), type: 'paragraph', content: '' },
      { id: generateId(), type: 'h2', content: '期待される効果' },
      { id: generateId(), type: 'bullet', content: '' },
      { id: generateId(), type: 'h2', content: 'スケジュール' },
      { id: generateId(), type: 'numbered', content: 'Phase 1: ' },
      { id: generateId(), type: 'numbered', content: 'Phase 2: ' },
      { id: generateId(), type: 'numbered', content: 'Phase 3: ' },
      { id: generateId(), type: 'h2', content: '予算・リソース' },
      { id: generateId(), type: 'paragraph', content: '' },
    ],
  },
  {
    id: 'report',
    name: 'レポート',
    icon: 'barChart',
    description: '月次・四半期レポート',
    buildDoc: () => [
      { id: generateId(), type: 'h1', content: 'レポート' },
      { id: generateId(), type: 'h2', content: 'エグゼクティブサマリー' },
      { id: generateId(), type: 'paragraph', content: '' },
      { id: generateId(), type: 'h2', content: '主要指標' },
      { id: generateId(), type: 'bullet', content: '' },
      { id: generateId(), type: 'h2', content: '詳細分析' },
      { id: generateId(), type: 'paragraph', content: '' },
      { id: generateId(), type: 'h2', content: '課題と対策' },
      { id: generateId(), type: 'bullet', content: '' },
      { id: generateId(), type: 'h2', content: '今後の計画' },
      { id: generateId(), type: 'paragraph', content: '' },
    ],
  },
  {
    id: 'spec',
    name: '仕様書',
    icon: 'cog',
    description: '技術仕様・要件定義',
    buildDoc: () => [
      { id: generateId(), type: 'h1', content: '仕様書' },
      { id: generateId(), type: 'h2', content: '概要' },
      { id: generateId(), type: 'paragraph', content: '' },
      { id: generateId(), type: 'h2', content: '目的・スコープ' },
      { id: generateId(), type: 'paragraph', content: '' },
      { id: generateId(), type: 'h2', content: '機能要件' },
      { id: generateId(), type: 'numbered', content: '' },
      { id: generateId(), type: 'h2', content: '非機能要件' },
      { id: generateId(), type: 'bullet', content: '' },
      { id: generateId(), type: 'h2', content: '技術スタック' },
      { id: generateId(), type: 'bullet', content: '' },
      { id: generateId(), type: 'h2', content: 'スケジュール' },
      { id: generateId(), type: 'paragraph', content: '' },
    ],
  },
  {
    id: 'weekly',
    name: '週報',
    icon: 'calendar',
    description: '週次進捗レポート',
    buildDoc: () => [
      { id: generateId(), type: 'h1', content: '週報' },
      { id: generateId(), type: 'h2', content: '今週の実績' },
      { id: generateId(), type: 'bullet', content: '' },
      { id: generateId(), type: 'h2', content: '来週の予定' },
      { id: generateId(), type: 'bullet', content: '' },
      { id: generateId(), type: 'h2', content: '課題・相談事項' },
      { id: generateId(), type: 'bullet', content: '' },
      { id: generateId(), type: 'h2', content: '振り返り' },
      { id: generateId(), type: 'paragraph', content: '' },
    ],
  },
]
