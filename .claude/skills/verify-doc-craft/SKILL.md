---
name: verify-doc-craft
description: |
  DocCraftの変更が実際に壊れていないか確認する検証フロー。
  「検証して」「動作確認」「verify」「テスト通して」「壊れてないか確認」
  と言われたとき、およびコミット・プッシュの直前に使用。
---

# DocCraft 変更検証

## 概要

「コードを書いた」と「動いている」は別物。コミット前に必ずこのフローで確認し、
結果（件数・失敗ログ）をそのまま報告する。

## 手順

### Step 1: 静的チェック

```
npx tsc --noEmit
npm run lint
```

### Step 2: ユニットテスト

```
npm run test        # vitest run
```

全件パスが前提。失敗を「既存の問題」と判断する場合は、変更前のコミットで
同じ失敗が出ることを `git stash` で確認してから言うこと。

### Step 3: 実動確認（UIに影響する変更のみ）

```
npm run build       # 本番ビルドが通るか
npm run dev         # http://localhost:3000 を起動して該当画面を目視
```

E2Eがある変更は `npm run test:e2e`（Playwright。ブラウザ未導入なら
`npx playwright install chromium` が先に必要）。

### Step 4: 報告

「テスト321件パス」のように**数字とコマンド名**で報告する。
「たぶん大丈夫」「問題ないはず」という表現は使わない。

## Gotchas（必読）

- ⚠️ このリポジトリの Next.js (16.x) は学習データと異なる破壊的変更がある。
  ビルドエラーの原因調査では憶測せず `node_modules/next/dist/docs/` の該当ガイドを読む
- ⚠️ vitest は jsdom + fake-indexeddb 環境。Node固有/ブラウザ固有のAPIに依存した
  テストは環境設定を確認する
- ⚠️ `npm run lint` は eslint をリポジトリ全体に回す。特定ファイルだけ確認したいときは
  `npx eslint <path>` のほうが速い

## 参照

- スクリプト定義 → `package.json`
- テスト実例 → `src/lib/*.test.ts`, `src/hooks/*.test.ts`
