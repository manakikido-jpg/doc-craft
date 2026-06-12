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
