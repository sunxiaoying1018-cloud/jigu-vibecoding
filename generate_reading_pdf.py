#!/usr/bin/env python3
"""Generate a clean IELTS 7.0 reading articles PDF (articles only, no vocab lists)."""

from pathlib import Path
from typing import List

from fpdf import FPDF

from ielts_reading_passages import PASSAGES

FONT_PATH = "/Library/Fonts/Arial Unicode.ttf"
OUTPUT_DIR = Path(__file__).parent


class ReadingPDF(FPDF):
    def __init__(self):
        super().__init__(orientation="P", unit="mm", format="A4")
        self.set_auto_page_break(auto=True, margin=18)
        self.add_font("Main", "", FONT_PATH)
        self.add_font("Main", "B", FONT_PATH)

    def footer(self):
        self.set_y(-12)
        self.set_font("Main", "", 8)
        self.set_text_color(120, 120, 120)
        self.cell(0, 8, f"第 {self.page_no()} 页", align="C")
        self.set_text_color(0, 0, 0)

    def cover(self):
        self.add_page()
        self.set_left_margin(22)
        self.set_right_margin(22)
        w = self.w - self.l_margin - self.r_margin
        self.set_font("Main", "B", 20)
        self.ln(28)
        self.cell(0, 11, "雅思 7.0 阅读文章", align="C", new_x="LMARGIN", new_y="NEXT")
        self.set_font("Main", "", 12)
        self.ln(4)
        self.cell(0, 8, "10 篇词汇密集型阅读", align="C", new_x="LMARGIN", new_y="NEXT")
        self.ln(10)
        self.set_font("Main", "", 10)
        tips = [
            "第一遍：通读全文，生词根据上下文猜测，不要立刻查词典",
            "第二遍：划出仍不确定的词，查词典并记录在笔记本上",
            "记录时写下：单词 + 词性 + 原文例句 + 中文释义",
            "第三遍：重读文章，确认每个生词在语境中的确切含义",
            "隔天重读同一篇文章，直到标出的词都能认出来",
        ]
        self.set_font("Main", "B", 11)
        self.cell(0, 8, "建议使用方式（每天约 30 分钟）", new_x="LMARGIN", new_y="NEXT")
        self.set_font("Main", "", 10)
        for i, tip in enumerate(tips, 1):
            self.set_x(self.l_margin)
            self.multi_cell(w, 6, f"  {i}. {tip}")
        self.ln(6)
        self.set_font("Main", "", 9)
        self.set_text_color(90, 90, 90)
        self.set_x(self.l_margin)
        self.multi_cell(
            w, 5,
            "每篇文章约 270–310 词，难度对标 IELTS Band 7.0（CEFR C1），"
            "涵盖环境、科技、教育、社会、健康、文化、工作、媒体、农业等雅思高频话题。"
            "文中刻意使用了大量学术词汇和复杂句式，适合通过阅读积累词汇。",
        )
        self.set_text_color(0, 0, 0)
        self.set_left_margin(18)
        self.set_right_margin(18)

    def passage(self, p: dict):
        self.add_page()
        self.set_fill_color(235, 240, 248)
        self.set_font("Main", "B", 13)
        self.cell(0, 9, f"Passage {p['id']}  {p['title']}", fill=True, new_x="LMARGIN", new_y="NEXT")
        self.set_font("Main", "", 8.5)
        self.set_text_color(100, 100, 100)
        self.cell(0, 6, f"{p['topic']}  |  {p['level']}", new_x="LMARGIN", new_y="NEXT")
        self.set_text_color(0, 0, 0)
        self.ln(4)

        w = self.w - self.l_margin - self.r_margin
        self.set_font("Main", "", 10.5)
        for para in p["text"].split("\n\n"):
            self.set_x(self.l_margin)
            self.multi_cell(w, 5.8, para)
            self.ln(3.5)

        # word count note
        wc = len(p["text"].split())
        self.ln(2)
        self.set_font("Main", "", 8)
        self.set_text_color(140, 140, 140)
        self.cell(0, 5, f"约 {wc} 词", align="R")
        self.set_text_color(0, 0, 0)


def build() -> Path:
    pdf = ReadingPDF()
    pdf.cover()
    for p in PASSAGES:
        pdf.passage(p)
    out = OUTPUT_DIR / "雅思7.0阅读文章10篇.pdf"
    pdf.output(str(out))
    return out


def main():
    out = build()
    total_words = sum(len(p["text"].split()) for p in PASSAGES)
    print(f"Generated: {out}")
    print(f"Passages: {len(PASSAGES)}, total words: {total_words}")


if __name__ == "__main__":
    main()
