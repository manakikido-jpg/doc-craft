import type { Cell } from '@/types'

export interface SpreadsheetTemplate {
  id: string
  name: string
  icon: string
  description: string
  buildCells: () => { cells: Record<string, Cell>; colWidths?: Record<number, number> }
}

export const SPREADSHEET_TEMPLATES: SpreadsheetTemplate[] = [
  {
    id: 'blank',
    name: '空白',
    icon: 'table',
    description: '白紙のスプレッドシート',
    buildCells: () => ({ cells: {} }),
  },
  {
    id: 'financial-plan',
    name: '財務計画',
    icon: 'dollarSign',
    description: '売上・費用・利益の月次計画',
    buildCells: () => {
      const cells: Record<string, Cell> = {}
      // Headers
      const months = ['項目', '1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月', '合計']
      months.forEach((m, c) => { cells[`0-${c}`] = { value: m, format: { bold: true, bgColor: '#1e3a8a', textColor: '#ffffff', align: 'center' } } })
      // Row labels
      const rows = ['売上高', 'サービスA', 'サービスB', 'その他', '', '費用', '人件費', 'オフィス', 'マーケティング', 'ツール/SaaS', 'その他費用', '', '営業利益', '利益率']
      rows.forEach((r, i) => {
        cells[`${i+1}-0`] = { value: r, format: r === '売上高' || r === '費用' || r === '営業利益' || r === '利益率' ? { bold: true, bgColor: '#334155' } : {} }
      })
      // SUM formulas for 合計 column (col 13)
      for (let r = 2; r <= 4; r++) cells[`${r}-13`] = { value: `=SUM(B${r+1}:M${r+1})`, format: { bold: true } }
      for (let r = 7; r <= 11; r++) cells[`${r}-13`] = { value: `=SUM(B${r+1}:M${r+1})`, format: { bold: true } }
      // 売上高 = sum of sub-items
      for (let c = 1; c <= 13; c++) {
        const col = String.fromCharCode(65 + c)
        cells[`1-${c}`] = { value: `=SUM(${col}3:${col}5)`, format: { bold: true, numberFormat: 'currency' } }
        cells[`6-${c}`] = { value: `=SUM(${col}8:${col}12)`, format: { bold: true, numberFormat: 'currency' } }
        cells[`13-${c}`] = { value: `=${col}2-${col}7`, format: { bold: true, numberFormat: 'currency' } }
        cells[`14-${c}`] = { value: `=IF(${col}2=0,0,${col}14/${col}2*100)`, format: { numberFormat: 'percent' } }
      }
      return { cells, colWidths: { 0: 140 } }
    },
  },
  {
    id: 'kpi-dashboard',
    name: 'KPIダッシュボード',
    icon: 'barChart',
    description: '主要指標の月次トラッキング',
    buildCells: () => {
      const cells: Record<string, Cell> = {}
      const headers = ['KPI', '目標', '1月', '2月', '3月', '4月', '5月', '6月', '達成率']
      headers.forEach((h, c) => { cells[`0-${c}`] = { value: h, format: { bold: true, bgColor: '#1e3a8a', textColor: '#ffffff', align: 'center' } } })
      const kpis = ['MRR (万円)', 'ユーザー数', 'チャーン率 (%)', 'CAC (円)', 'LTV (円)', 'NPS', 'MAU', 'コンバージョン率 (%)']
      kpis.forEach((k, i) => {
        cells[`${i+1}-0`] = { value: k, format: { bold: true } }
        cells[`${i+1}-1`] = { value: '', format: { bgColor: '#1e293b' } }
        // Achievement formula
        cells[`${i+1}-8`] = { value: `=IF(B${i+2}=0,"",H${i+2}/B${i+2})`, format: { numberFormat: 'percent' } }
      })
      return { cells, colWidths: { 0: 180, 1: 80 } }
    },
  },
  {
    id: 'task-tracker',
    name: 'タスク管理',
    icon: 'checkSquare',
    description: 'チームのタスク・進捗管理',
    buildCells: () => {
      const cells: Record<string, Cell> = {}
      const headers = ['タスク名', '担当者', '優先度', 'ステータス', '開始日', '期限', '進捗率', '備考']
      headers.forEach((h, c) => { cells[`0-${c}`] = { value: h, format: { bold: true, bgColor: '#1e3a8a', textColor: '#ffffff', align: 'center' } } })
      // Sample rows
      const sample = [
        ['LP制作', '田中', '高', '進行中', '2025/06/01', '2025/06/15', '60%', ''],
        ['API設計', '鈴木', '高', '完了', '2025/05/20', '2025/06/01', '100%', ''],
        ['ユーザーテスト', '佐藤', '中', '未着手', '2025/06/10', '2025/06/20', '0%', '要日程調整'],
      ]
      sample.forEach((row, r) => {
        row.forEach((val, c) => {
          const fmt: Record<string, string | boolean> = {}
          if (c === 2) fmt.align = 'center'
          if (c === 3) {
            fmt.align = 'center'
            if (val === '完了') fmt.bgColor = '#166534'
            if (val === '進行中') fmt.bgColor = '#854d0e'
            if (val === '未着手') fmt.bgColor = '#7f1d1d'
            fmt.textColor = '#ffffff'
          }
          if (c === 6) fmt.align = 'center'
          cells[`${r+1}-${c}`] = { value: val, format: Object.keys(fmt).length ? fmt : undefined }
        })
      })
      return { cells, colWidths: { 0: 200, 7: 180 } }
    },
  },
  {
    id: 'okr',
    name: 'OKR管理',
    icon: 'target',
    description: 'Objectives & Key Results',
    buildCells: () => {
      const cells: Record<string, Cell> = {}
      const headers = ['Objective / Key Result', '担当', '進捗', '自己評価', '期限', '備考']
      headers.forEach((h, c) => { cells[`0-${c}`] = { value: h, format: { bold: true, bgColor: '#1e3a8a', textColor: '#ffffff', align: 'center' } } })
      const rows = [
        { v: 'O1: プロダクトのPMFを達成する', isObj: true },
        { v: 'KR1: 有料ユーザー100人達成', isObj: false },
        { v: 'KR2: NPS 50以上', isObj: false },
        { v: 'KR3: 月次チャーン率 3%以下', isObj: false },
        { v: '', isObj: false },
        { v: 'O2: 資金調達を完了する', isObj: true },
        { v: 'KR1: ピッチデック完成', isObj: false },
        { v: 'KR2: 10社以上にピッチ', isObj: false },
        { v: 'KR3: シードラウンド ¥XX M', isObj: false },
      ]
      rows.forEach((r, i) => {
        cells[`${i+1}-0`] = { value: r.v, format: r.isObj ? { bold: true, bgColor: '#334155', fontSize: 13 } : { fontSize: 12 } }
        if (r.v && !r.isObj) {
          cells[`${i+1}-2`] = { value: '0%', format: { align: 'center' } }
          cells[`${i+1}-3`] = { value: '', format: { align: 'center' } }
        }
      })
      return { cells, colWidths: { 0: 280, 1: 80, 2: 80, 3: 80 } }
    },
  },
  {
    id: 'employee-list',
    name: '社員名簿',
    icon: 'users',
    description: 'メンバー一覧・連絡先',
    buildCells: () => {
      const cells: Record<string, Cell> = {}
      const headers = ['氏名', 'メール', '部署', '役職', '入社日', '電話番号', '緊急連絡先']
      headers.forEach((h, c) => { cells[`0-${c}`] = { value: h, format: { bold: true, bgColor: '#1e3a8a', textColor: '#ffffff', align: 'center' } } })
      return { cells, colWidths: { 0: 120, 1: 200, 4: 110, 5: 130, 6: 130 } }
    },
  },
  {
    id: 'invoice',
    name: '請求書',
    icon: 'receipt',
    description: '取引先への請求管理',
    buildCells: () => {
      const cells: Record<string, Cell> = {}
      cells['0-0'] = { value: '請求書', format: { bold: true, fontSize: 24 } }
      cells['2-0'] = { value: '請求日:', format: { bold: true } }
      cells['2-1'] = { value: '20XX/XX/XX' }
      cells['3-0'] = { value: '請求番号:', format: { bold: true } }
      cells['3-1'] = { value: 'INV-001' }
      cells['5-0'] = { value: '請求先:', format: { bold: true } }
      cells['5-1'] = { value: '株式会社○○ 御中' }
      cells['7-0'] = { value: '品目', format: { bold: true, bgColor: '#334155', textColor: '#ffffff', align: 'center' } }
      cells['7-1'] = { value: '数量', format: { bold: true, bgColor: '#334155', textColor: '#ffffff', align: 'center' } }
      cells['7-2'] = { value: '単価', format: { bold: true, bgColor: '#334155', textColor: '#ffffff', align: 'center' } }
      cells['7-3'] = { value: '金額', format: { bold: true, bgColor: '#334155', textColor: '#ffffff', align: 'center' } }
      for (let r = 8; r <= 12; r++) {
        cells[`${r}-3`] = { value: `=B${r+1}*C${r+1}`, format: { numberFormat: 'currency' } }
      }
      cells['13-2'] = { value: '小計', format: { bold: true, align: 'right' } }
      cells['13-3'] = { value: '=SUM(D9:D13)', format: { bold: true, numberFormat: 'currency' } }
      cells['14-2'] = { value: '消費税 (10%)', format: { align: 'right' } }
      cells['14-3'] = { value: '=D14*0.1', format: { numberFormat: 'currency' } }
      cells['15-2'] = { value: '合計', format: { bold: true, fontSize: 14, align: 'right' } }
      cells['15-3'] = { value: '=D14+D15', format: { bold: true, fontSize: 14, numberFormat: 'currency' } }
      return { cells, colWidths: { 0: 250, 1: 80, 2: 100, 3: 120 } }
    },
  },
  {
    id: 'fundraising-plan',
    name: '資金調達計画',
    icon: 'dollarSign',
    description: 'ラウンドごとの調達計画・投資家管理',
    buildCells: () => {
      const cells: Record<string, Cell> = {}
      const headers = ['ラウンド', '調達額', 'バリュエーション', '投資家', '時期', 'ステータス']
      headers.forEach((h, c) => { cells[`0-${c}`] = { value: h, format: { bold: true, bgColor: '#1e3a8a', textColor: '#ffffff', align: 'center' } } })
      const rows = [
        ['プレシード', '¥10M', '¥50M', 'エンジェル投資家A', '2024年Q1', '完了'],
        ['シード', '¥50M', '¥300M', 'VC A, VC B', '2024年Q4', '進行中'],
        ['シリーズA', '¥200M', '¥1,500M', '未定', '2025年Q3', '計画中'],
        ['シリーズB', '¥500M', '¥5,000M', '未定', '2026年Q2', '計画中'],
      ]
      rows.forEach((row, r) => {
        row.forEach((val, c) => {
          const fmt: Record<string, string | boolean> = {}
          if (c === 5) {
            fmt.align = 'center'
            if (val === '完了') { fmt.bgColor = '#166534'; fmt.textColor = '#ffffff' }
            if (val === '進行中') { fmt.bgColor = '#854d0e'; fmt.textColor = '#ffffff' }
            if (val === '計画中') { fmt.bgColor = '#1e293b' }
          }
          if (c === 1 || c === 2) fmt.align = 'right'
          cells[`${r + 1}-${c}`] = { value: val, format: Object.keys(fmt).length ? fmt : undefined }
        })
      })
      return { cells, colWidths: { 0: 120, 1: 120, 2: 160, 3: 200, 4: 100, 5: 100 } }
    },
  },
  {
    id: 'sales-management',
    name: '売上管理',
    icon: 'dollarSign',
    description: '日別の売上・数量・単価の管理',
    buildCells: () => {
      const cells: Record<string, Cell> = {}
      // Headers
      const headers = ['日付', '商品名', '数量', '単価', '合計']
      headers.forEach((h, c) => {
        cells[`0-${c}`] = {
          value: h,
          format: { bold: true, bgColor: '#1e3a8a', textColor: '#ffffff', align: 'center' },
        }
      })
      // 5 sample data rows
      const sampleData = [
        ['2025/06/01', '製品A', '10', '¥1,500', '=C2*D2'],
        ['2025/06/02', '製品B', '5', '¥3,200', '=C3*D3'],
        ['2025/06/03', '製品A', '8', '¥1,500', '=C4*D4'],
        ['2025/06/04', '製品C', '3', '¥8,000', '=C5*D5'],
        ['2025/06/05', '製品B', '12', '¥3,200', '=C6*D6'],
      ]
      sampleData.forEach((row, r) => {
        row.forEach((val, c) => {
          const fmt: Record<string, string | boolean> = {}
          if (c === 3 || c === 4) fmt.numberFormat = 'currency'
          if (c === 2) fmt.align = 'center'
          cells[`${r + 1}-${c}`] = { value: val, format: Object.keys(fmt).length ? fmt : undefined }
        })
      })
      // SUM formulas at bottom (row 7, index 6)
      const sumRow = sampleData.length + 1
      cells[`${sumRow}-0`] = { value: '合計', format: { bold: true, bgColor: '#334155', textColor: '#ffffff' } }
      cells[`${sumRow}-1`] = { value: '', format: { bgColor: '#334155' } }
      cells[`${sumRow}-2`] = { value: `=SUM(C2:C${sumRow})`, format: { bold: true, align: 'center', bgColor: '#334155', textColor: '#ffffff' } }
      cells[`${sumRow}-3`] = { value: '', format: { bgColor: '#334155' } }
      cells[`${sumRow}-4`] = { value: `=SUM(E2:E${sumRow})`, format: { bold: true, numberFormat: 'currency', bgColor: '#334155', textColor: '#ffffff' } }
      return { cells, colWidths: { 0: 120, 1: 120, 2: 80, 3: 100, 4: 120 } }
    },
  },
  {
    id: 'inventory-management',
    name: '在庫管理',
    icon: 'checkSquare',
    description: '商品の在庫状況・発注判定',
    buildCells: () => {
      const cells: Record<string, Cell> = {}
      // Headers
      const headers = ['商品名', '現在庫数', '最低在庫数', '発注点', 'ステータス']
      headers.forEach((h, c) => {
        cells[`0-${c}`] = {
          value: h,
          format: { bold: true, bgColor: '#1e3a8a', textColor: '#ffffff', align: 'center' },
        }
      })
      // 6 sample products with IF formulas for status
      const products = [
        ['ノートPC', '25', '10', '15'],
        ['モニター', '8', '10', '12'],
        ['キーボード', '50', '20', '25'],
        ['マウス', '5', '10', '15'],
        ['USBケーブル', '100', '30', '40'],
        ['ヘッドセット', '3', '5', '8'],
      ]
      products.forEach((row, r) => {
        row.forEach((val, c) => {
          const fmt: Record<string, string | boolean> = {}
          if (c >= 1 && c <= 3) fmt.align = 'center'
          cells[`${r + 1}-${c}`] = { value: val, format: Object.keys(fmt).length ? fmt : undefined }
        })
        // Status column with IF formula: if current stock <= reorder point => "要発注", else "在庫十分"
        // Also provide conditional color formatting hints via bgColor
        const currentStock = Number(row[1])
        const reorderPoint = Number(row[3])
        const needsOrder = currentStock <= reorderPoint
        cells[`${r + 1}-4`] = {
          value: `=IF(B${r + 2}<=D${r + 2},"要発注","在庫十分")`,
          format: {
            align: 'center',
            bold: true,
            bgColor: needsOrder ? '#7f1d1d' : '#166534',
            textColor: '#ffffff',
          },
        }
      })
      return { cells, colWidths: { 0: 140, 1: 100, 2: 100, 3: 100, 4: 120 } }
    },
  },
  {
    id: 'burn-rate',
    name: 'バーンレート管理',
    icon: 'barChart',
    description: '月次キャッシュフロー・バーンレート管理',
    buildCells: () => {
      const cells: Record<string, Cell> = {}
      const headers = ['項目', '1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
      headers.forEach((h, c) => { cells[`0-${c}`] = { value: h, format: { bold: true, bgColor: '#1e3a8a', textColor: '#ffffff', align: 'center' } } })
      const rowLabels = ['売上', '', '人件費', 'オフィス', 'ツール', 'マーケティング', 'その他', '', '合計支出', 'キャッシュ残高']
      rowLabels.forEach((label, i) => {
        const isBold = label === '売上' || label === '合計支出' || label === 'キャッシュ残高'
        cells[`${i + 1}-0`] = { value: label, format: isBold ? { bold: true, bgColor: '#334155' } : {} }
      })
      // Formulas for each month column (cols 1-12)
      for (let c = 1; c <= 12; c++) {
        const col = String.fromCharCode(65 + c)
        // 合計支出 = SUM of expense rows (rows 3-7 = cells row indices 3..7)
        cells[`9-${c}`] = { value: `=SUM(${col}4:${col}8)`, format: { bold: true, numberFormat: 'currency' } }
        // キャッシュ残高 = 前月キャッシュ残高 + 売上 - 合計支出
        if (c === 1) {
          cells[`10-${c}`] = { value: `=${col}2-${col}10`, format: { bold: true, numberFormat: 'currency' } }
        } else {
          const prevCol = String.fromCharCode(64 + c)
          cells[`10-${c}`] = { value: `=${prevCol}11+${col}2-${col}10`, format: { bold: true, numberFormat: 'currency' } }
        }
      }
      return { cells, colWidths: { 0: 140 } }
    },
  },
  {
    id: 'kpi-startup',
    name: 'KPIダッシュボード（SaaS）',
    icon: 'barChart',
    description: 'SaaSスタートアップ向けKPI管理',
    buildCells: () => {
      const cells: Record<string, Cell> = {}
      const headers = ['月', 'MRR（万円）', 'ARR（万円）', 'チャーン率（%）', 'LTV（円）', 'CAC（円）', 'NPS']
      headers.forEach((h, c) => { cells[`0-${c}`] = { value: h, format: { bold: true, bgColor: '#1e3a8a', textColor: '#ffffff', align: 'center' } } })
      const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
      const sampleData = [
        [100, null, 3.5, 45000, 12000, 32],
        [115, null, 3.2, 47000, 11500, 35],
        [130, null, 2.8, 50000, 11000, 38],
        [150, null, 2.5, 52000, 10500, 40],
        [170, null, 2.3, 55000, 10000, 42],
        [195, null, 2.0, 58000, 9500, 45],
      ]
      months.forEach((m, i) => {
        cells[`${i + 1}-0`] = { value: m, format: { bold: true } }
        if (i < sampleData.length) {
          const row = sampleData[i]
          cells[`${i + 1}-1`] = { value: row[0] !== null ? String(row[0]) : '', format: { align: 'right' } }
          // ARR = MRR * 12
          cells[`${i + 1}-2`] = { value: `=B${i + 2}*12`, format: { align: 'right', numberFormat: 'currency' } }
          cells[`${i + 1}-3`] = { value: row[2] !== null ? String(row[2]) : '', format: { align: 'right' } }
          cells[`${i + 1}-4`] = { value: row[3] !== null ? String(row[3]) : '', format: { align: 'right' } }
          cells[`${i + 1}-5`] = { value: row[4] !== null ? String(row[4]) : '', format: { align: 'right' } }
          cells[`${i + 1}-6`] = { value: row[5] !== null ? String(row[5]) : '', format: { align: 'center' } }
        }
      })
      // Summary row
      const sumRow = months.length + 1
      cells[`${sumRow}-0`] = { value: '平均/合計', format: { bold: true, bgColor: '#334155' } }
      cells[`${sumRow}-1`] = { value: `=AVERAGE(B2:B${sumRow})`, format: { bold: true, align: 'right' } }
      cells[`${sumRow}-2`] = { value: `=B${sumRow + 1}*12`, format: { bold: true, align: 'right' } }
      cells[`${sumRow}-3`] = { value: `=AVERAGE(D2:D${sumRow})`, format: { bold: true, align: 'right' } }
      cells[`${sumRow}-4`] = { value: `=AVERAGE(E2:E${sumRow})`, format: { bold: true, align: 'right' } }
      cells[`${sumRow}-5`] = { value: `=AVERAGE(F2:F${sumRow})`, format: { bold: true, align: 'right' } }
      cells[`${sumRow}-6`] = { value: `=AVERAGE(G2:G${sumRow})`, format: { bold: true, align: 'center' } }
      return { cells, colWidths: { 0: 80, 1: 120, 2: 120, 3: 130, 4: 100, 5: 100, 6: 80 } }
    },
  },
]
