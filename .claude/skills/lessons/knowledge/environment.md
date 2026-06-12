# 環境のクセ（全作業の前に読む）

ツール・実行環境の制約と回避策。日付が古いものは再検証してから使う。

## Web取得

- **2026-06-12**: WebFetch はこの環境でほぼ全ての外部サイトに 403 を返す
  （クラウドワークス・ランサーズ・ココナラ・note・Yahoo!知恵袋・一般企業ブログまで全滅を確認）。
  → 回避: **WebSearch のスニペットから情報収集する**。検索結果の要約文に
  報酬額・応募数などの実データが含まれるので、クエリを変えて多角的に引く。
- **2026-06-12**: 個別案件のスニペットは `crowdworks {案件ID} 報酬` のように
  ID 直指定で検索すると追加情報が引ける。`site:crowdworks.jp + キーワード` で
  案件 ID の一覧を先に集めるのが効率的。
- WebSearch は US 版。日本の統計は `site:mhlw.go.jp` などドメイン指定で絞る
  （info-research の Gotchas にも記載）。

## PDF生成（日本語）

- **2026-06-11**: reportlab の `UnicodeCIDFont('HeiseiKakuGo-W5')` はフォント非埋め込みのため
  ビューアによって日本語が表示されない。→ **`TTFont` で
  `/usr/share/fonts/opentype/ipafont-gothic/ipagp.ttf` を埋め込む**。
  実装済み: `.claude/skills/gig-hunt/scripts/md_to_pdf.py`（他スキルでも流用可）。

## Git / リポジトリ構成

- **2026-06-11**: `.gitignore` は `.claude/` 丸ごとではなく
  `.claude/*` + `!.claude/skills/` の組み合わせでスキルだけコミット対象にできる。
  さらに `.claude/skills/*/config.json` と `.claude/skills/*/logs/` を除外して
  個人メモリはローカル限定にしている。

## Claude Code フック

- **2026-06-12**: `.claude/settings.json` をセッション途中に新規作成した場合でも、
  設定ウォッチャーが拾ってフックは同一セッション内で発火する（Stop フックの発火を実地確認）。
  `/hooks` を開いての再読み込みは不要だった。
- Stop フックのスロットル用タイムスタンプは `/tmp` に置いているため、
  セッションごとにリセットされ、各セッションの最初のターン終了時に必ず1回リマインドが入る（仕様）。

## 実行環境

- リモート実行環境はエフェメラル。`/tmp` の成果物・`logs/` の記録はセッション終了で消える。
  ユーザーに渡すものは SendUserFile、次セッションに残すものはコミット、の二択で必ず退避する。
