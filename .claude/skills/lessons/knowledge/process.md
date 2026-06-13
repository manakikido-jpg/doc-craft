# 手順の改善（段取りの学び）

既存ワークフローより速い・確実だと分かったやり方。

## リサーチ

- **2026-06-12**: サイト直接取得が塞がれている場合の案件リサーチ手順:
  1. `site:crowdworks.jp {キーワード}` で WebSearch → 案件 ID 一覧を収集
  2. `crowdworks {ID} {知りたい項目}` で個別スニペットを追加取得
  3. 取れた実データと相場資料を突き合わせてレポート化
  自動巡回・スクレイピングはしない（規約リスク。gig-hunt SKILL.md の原則）。

## レポート納品

- **2026-06-11**: レポートは「Markdown 作成 → `md_to_pdf.py` で PDF 化 → SendUserFile」の
  3ステップで固定。md は `/tmp` に置き、PDF ファイル名は
  `{テーマ}_{YYYY-MM-DD}.pdf` 形式（日本語可）。

## スキル作成

- スキルは SKILL.md（手順＋Gotchas）＋ references/（変化する知識）＋
  assets/（テンプレート）＋ scripts/（実行コード）の4点構成。
  ユーザー固有メモリは config.json / logs/（gitignore 対象）に分離する。

- **2026-06-13**: スキルが増えると description の「トリガー食い合い」が起きる。
  複数スキルで似た守備範囲がある場合、1つが「〇〇全般で必ず使用すること」と
  書くと兄弟スキルの発動を全部奪う（実例: sns-marketing が SNS 系3つを総取りしていた）。
  → 各 description に「スコープ＋※こういう時は別スキル（名指し）」を入れて棲み分ける。
  「必ず使用」のような全取り表現は禁止。役割が3層なら3層とも相互参照させる。

- **2026-06-13**: スキルを zip 等で配布するときは `config.example.json`（ダミー値）だけ同梱し、
  実 `config.json`（氏名・屋号・PCパス等の個人情報が入る）は絶対に含めない。
  さらに `*-workspace`/`data/`/`logs/` の実行時データ（生成物・PNG・CSV）も配布物から除外する
  （肥大化＋情報漏洩）。配布前に `grep -ri "api_key\|user_name\|C:\\\\Users"` で機微情報を一掃する。

## DocCraft AI スキル追加時のチェックリスト

- **2026-06-13**: `src/lib/ai-skills.ts` には更新箇所が3つある。抜け漏れに注意。
  1. `AI_SKILLS` 配列にエントリ追加（`id` / `name` / `icon` / `description` / `type`）
  2. `type: 'both'` または `'slides'` のスキルは `buildSkillSlides()` の `templates` に6枚分追加
  3. `type: 'both'` または `'doc'` のスキルは `buildSkillDocSections()` の `templates` に追加
  4. `SUMMARIZE_STRUCTURES` にエントリ追加（長文入力時の要約構造。全スキルに推奨）
  - 型チェック: `npx tsc --noEmit` でエラーなしを確認してからコミット
