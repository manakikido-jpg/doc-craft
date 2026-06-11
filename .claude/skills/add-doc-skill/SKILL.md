---
name: add-doc-skill
description: |
  DocCraftのAI生成パネルに新しい生成スキル（テンプレート）を追加する手順。
  「スキル追加」「AIスキル」「生成テンプレート追加」「ai-skillsにスキルを作って」
  と言われたときに使用。src/lib/ai-skills.ts を変更するタスクに適用。
---

# DocCraft AI生成スキルの追加

## 概要

DocCraftの「AIで生成」パネルに表示されるスキル（スライド・ドキュメントのテンプレート）を
`src/lib/ai-skills.ts` に追加するワークフロー。UIは登録配列から動的に描画されるため、
コード変更はデータ追加が中心になる。

## 手順

### Step 1: 題材の根拠を確認

可能性ラボ関連のスキルなら、Googleドライブの一次資料（タスク一覧・提案書・設定ガイド等）を
先に読み、テンプレート文言を実際の業務用語に合わせる。想像で文言を作らない。

### Step 2: スキルを登録

`src/lib/ai-skills.ts` の `AI_SKILLS` 配列にエントリを追加する。

- `id`: 英小文字の短い一意ID
- `icon`: `src/components/shared/icon-map.tsx` の `ICON_MAP` に存在するキーのみ
- `type`: `'both'`（スライド+ドキュメント）/ `'doc'`（ドキュメント専用）

### Step 3: テンプレートを追加

- `type: 'both'` → `buildSkillSlides`（6枚構成）と `buildSkillDocSections`（5セクション）の両方
- `type: 'doc'` → `buildSkillDocSections` のみ
- 長文貼り付け対応 → `SUMMARIZE_STRUCTURES` に headings 5個 + intro 5個を追加
- テンプレートでは賄えない解析ロジックは別ファイル（例: `src/lib/content-audit.ts`）に
  純関数として切り出し、`summarizeContentToDoc` 冒頭で skillId を特殊分岐する

### Step 4: 検証

```
npx tsc --noEmit && npx eslint src/lib/ && npx vitest run
```

ロジックを追加した場合はユニットテスト（`src/lib/*.test.ts`、vitest）も書く。

## Gotchas（必読）

- ⚠️ `ICON_MAP` に無いアイコンキーを指定するとエラーにならず**キー名の生テキスト**が描画される。
  新アイコンは lucide-react から import して `ICON_MAP` に追加すること
- ⚠️ `buildSkillSlides` は各スライドの `themeKey` を `THEMES` 配列で**上書き再マップ**する。
  個別指定の themeKey は実質コスメティックなので悩まなくてよい
- ⚠️ 入力が「テンプレート生成」か「長文要約」かは `isContentInput`（3行以上 or 80文字以上）で
  自動分岐する。短い入力はテンプレート側に流れることを前提に文言を書く
- ⚠️ 別ファイルのロジックから `DocSkillResult` を使うときは `import type` にする
  （ai-skills.ts との循環は型のみなら安全）
- ⚠️ AGENTS.md の指示どおり、Next.jsのAPIに触れる変更をする前に
  `node_modules/next/dist/docs/` を読む。データ追加のみなら不要

## 参照

- スキル定義・テンプレート → `src/lib/ai-skills.ts`
- アイコン登録 → `src/components/shared/icon-map.tsx`
- 解析ロジックの実例（監査エンジン+テスト） → `src/lib/content-audit.ts` / `src/lib/content-audit.test.ts`
- 利用側UI（変更不要の確認用） → `src/components/dashboard/create-modal.tsx`, `src/hooks/use-ai-generate.ts`
