#!/usr/bin/env python3
"""Markdownのリサーチレポートを日本語PDFに変換する。

使い方:
    python3 md_to_pdf.py report.md report.pdf

対応Markdown: # 〜 ### 見出し / - 箇条書き / | 表 | / --- 区切り / 段落
依存: reportlab（pip3 install reportlab）。

日本語フォントはTTFを探して埋め込む（PDFがビューア非依存になる）。
探索順: 環境変数 GIG_HUNT_FONT → スキル内 fonts/ → システムの日本語フォント。
見つからない場合のみ内蔵CIDフォントにフォールバックする（この場合は
ビューア側に日本語フォントが必要で、環境により文字が表示されない）。
"""

import os
import re
import sys
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.cidfonts import UnicodeCIDFont
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    HRFlowable,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

# 日本語TTFの探索候補（上から優先）
FONT_CANDIDATES = [
    os.environ.get("GIG_HUNT_FONT", ""),
    str(Path(__file__).resolve().parent.parent / "fonts" / "japanese.ttf"),
    "/usr/share/fonts/opentype/ipafont-gothic/ipagp.ttf",
    "/usr/share/fonts/opentype/ipafont-gothic/ipag.ttf",
    "/usr/share/fonts/truetype/fonts-japanese-gothic.ttf",
    "/usr/share/fonts/opentype/ipaexfont-gothic/ipaexg.ttf",
    "/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc",
    "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
    "/System/Library/Fonts/ヒラギノ角ゴシック W3.ttc",  # macOS
    "C:/Windows/Fonts/msgothic.ttc",  # Windows
]


def register_japanese_font() -> str:
    """埋め込み可能な日本語TTFを登録し、フォント名を返す。"""
    for path in FONT_CANDIDATES:
        if not path or not os.path.isfile(path):
            continue
        try:
            pdfmetrics.registerFont(TTFont("JPFont", path, subfontIndex=0))
            return "JPFont"
        except Exception:
            continue
    # フォールバック: 非埋め込みCIDフォント（ビューア依存・文字化けの可能性あり）
    print("警告: 日本語TTFが見つからずCIDフォントで生成します。", file=sys.stderr)
    print("      表示できない場合は GIG_HUNT_FONT=/path/to/font.ttf を指定してください。", file=sys.stderr)
    pdfmetrics.registerFont(UnicodeCIDFont("HeiseiKakuGo-W5"))
    return "HeiseiKakuGo-W5"


FONT = register_japanese_font()

STYLES = {
    "h1": ParagraphStyle("h1", fontName=FONT, fontSize=18, leading=24, spaceAfter=6 * mm, textColor=colors.HexColor("#1a2b4a")),
    "h2": ParagraphStyle("h2", fontName=FONT, fontSize=14, leading=20, spaceBefore=5 * mm, spaceAfter=3 * mm, textColor=colors.HexColor("#1a2b4a")),
    "h3": ParagraphStyle("h3", fontName=FONT, fontSize=11.5, leading=17, spaceBefore=3 * mm, spaceAfter=2 * mm, textColor=colors.HexColor("#444444")),
    "body": ParagraphStyle("body", fontName=FONT, fontSize=9.5, leading=15, alignment=TA_LEFT, spaceAfter=1.5 * mm),
    "bullet": ParagraphStyle("bullet", fontName=FONT, fontSize=9.5, leading=15, leftIndent=6 * mm, bulletIndent=2 * mm, spaceAfter=1 * mm),
    "cell": ParagraphStyle("cell", fontName=FONT, fontSize=8.5, leading=12),
}

TABLE_STYLE = TableStyle(
    [
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1a2b4a")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, -1), FONT),
        ("FONTSIZE", (0, 0), (-1, -1), 8.5),
        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#aaaaaa")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f2f4f8")]),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
    ]
)


def esc(text: str) -> str:
    text = text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    text = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", text)
    return text


def cell_par(text: str, header: bool) -> Paragraph:
    content = esc(text)
    if header:
        content = f'<font color="white">{content}</font>'
    return Paragraph(content, STYLES["cell"])


def flush_table(rows, story):
    if not rows:
        return
    data = [[cell_par(c, i == 0) for c in row] for i, row in enumerate(rows)]
    story.append(Table(data, style=TABLE_STYLE, hAlign="LEFT"))
    story.append(Spacer(1, 3 * mm))
    rows.clear()


def md_to_story(md: str):
    story = []
    table_rows = []
    for raw in md.splitlines():
        line = raw.rstrip()
        stripped = line.strip()
        if stripped.startswith("|"):
            cells = [c.strip() for c in stripped.strip("|").split("|")]
            if all(re.fullmatch(r":?-{2,}:?", c) for c in cells):
                continue  # 区切り行
            table_rows.append(cells)
            continue
        flush_table(table_rows, story)
        if not stripped:
            continue
        if stripped.startswith("### "):
            story.append(Paragraph(esc(stripped[4:]), STYLES["h3"]))
        elif stripped.startswith("## "):
            story.append(Paragraph(esc(stripped[3:]), STYLES["h2"]))
        elif stripped.startswith("# "):
            story.append(Paragraph(esc(stripped[2:]), STYLES["h1"]))
        elif stripped in ("---", "***"):
            story.append(HRFlowable(width="100%", thickness=0.6, color=colors.HexColor("#cccccc"), spaceBefore=3 * mm, spaceAfter=3 * mm))
        elif stripped.startswith(("- ", "* ")):
            story.append(Paragraph(esc(stripped[2:]), STYLES["bullet"], bulletText="・"))
        elif re.match(r"^\d+\. ", stripped):
            num, rest = stripped.split(". ", 1)
            story.append(Paragraph(esc(rest), STYLES["bullet"], bulletText=f"{num}."))
        else:
            story.append(Paragraph(esc(stripped), STYLES["body"]))
    flush_table(table_rows, story)
    return story


def main() -> None:
    if len(sys.argv) != 3:
        sys.exit("usage: md_to_pdf.py <input.md> <output.pdf>")
    with open(sys.argv[1], encoding="utf-8") as f:
        md = f.read()
    doc = SimpleDocTemplate(
        sys.argv[2],
        pagesize=A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=18 * mm,
        bottomMargin=18 * mm,
        title="リサーチレポート",
    )
    doc.build(md_to_story(md))
    print(f"PDF生成完了: {sys.argv[2]}")


if __name__ == "__main__":
    main()
