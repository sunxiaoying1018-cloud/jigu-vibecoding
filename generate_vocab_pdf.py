#!/usr/bin/env python3
"""Generate IELTS vocabulary dictation PDFs (practice + answer key)."""

from pathlib import Path
from typing import List, Optional

from fpdf import FPDF

from ielts_vocab_data import VOCABULARY

FONT_PATH = "/Library/Fonts/Arial Unicode.ttf"
OUTPUT_DIR = Path(__file__).parent


class VocabPDF(FPDF):
    def __init__(self, title: str):
        super().__init__(orientation="P", unit="mm", format="A4")
        self.doc_title = title
        self.set_auto_page_break(auto=True, margin=18)
        self.add_font("Main", "", FONT_PATH)
        self.add_font("Main", "B", FONT_PATH)

    def header(self):
        if self.page_no() == 1:
            return
        self.set_font("Main", "", 8)
        self.set_text_color(120, 120, 120)
        self.cell(0, 6, self.doc_title, align="R", new_x="LMARGIN", new_y="NEXT")
        self.set_text_color(0, 0, 0)

    def footer(self):
        self.set_y(-12)
        self.set_font("Main", "", 8)
        self.set_text_color(120, 120, 120)
        self.cell(0, 8, f"第 {self.page_no()} 页", align="C")

    def cover_page(self, subtitle: str, tips: List[str]):
        self.add_page()
        self.set_left_margin(20)
        self.set_right_margin(20)
        self.set_font("Main", "B", 22)
        self.ln(25)
        self.cell(0, 12, "雅思高频词汇默写手册", align="C", new_x="LMARGIN", new_y="NEXT")
        self.set_font("Main", "", 14)
        self.ln(4)
        self.cell(0, 10, subtitle, align="C", new_x="LMARGIN", new_y="NEXT")
        self.ln(10)
        self.set_font("Main", "", 10)
        total = sum(len(words) for words in VOCABULARY.values())
        self.cell(0, 7, f"共 {len(VOCABULARY)} 个主题 · {total} 个高频词", align="C", new_x="LMARGIN", new_y="NEXT")
        self.ln(12)
        self.set_font("Main", "B", 11)
        self.cell(0, 8, "使用说明", new_x="LMARGIN", new_y="NEXT")
        self.set_font("Main", "", 10)
        content_w = self.w - self.l_margin - self.r_margin
        for tip in tips:
            self.set_x(self.l_margin)
            self.multi_cell(content_w, 6, f"  · {tip}")
        self.ln(6)
        self.set_font("Main", "", 9)
        self.set_text_color(100, 100, 100)
        self.set_x(self.l_margin)
        self.multi_cell(
            content_w,
            5,
            "建议：每天 10 个词，先遮住中文自测，写完用答案册核对，"
            "错词抄写到本子上隔天再默写一遍。",
        )
        self.set_text_color(0, 0, 0)
        self.set_left_margin(15)
        self.set_right_margin(15)

    def topic_header(self, topic: str):
        if self.get_y() > 250:
            self.add_page()
        self.ln(4)
        self.set_fill_color(240, 244, 248)
        self.set_font("Main", "B", 12)
        self.cell(0, 9, topic, fill=True, new_x="LMARGIN", new_y="NEXT")
        self.ln(2)

    def word_entry(self, word: str, pos: str, sentence: str, meaning: Optional[str]):
        if self.get_y() > 265:
            self.add_page()

        left_w = 118
        right_w = 72
        x0 = self.get_x()
        y0 = self.get_y()

        # English word + POS
        self.set_font("Main", "B", 11)
        self.set_xy(x0, y0)
        self.cell(68, 7, word)
        self.set_font("Main", "", 9)
        self.set_text_color(80, 80, 80)
        self.cell(18, 7, pos)
        self.set_text_color(0, 0, 0)

        # Chinese blank or answer
        self.set_font("Main", "", 10)
        if meaning:
            self.cell(right_w, 7, meaning, align="R")
        else:
            self.set_draw_color(180, 180, 180)
            line_x = x0 + left_w + 2
            line_y = y0 + 5.5
            self.line(line_x, line_y, x0 + left_w + right_w - 2, line_y)
            self.set_xy(x0 + left_w, y0)
            self.cell(right_w, 7, "", align="R")

        self.ln(5)

        # Example sentence
        self.set_font("Main", "", 8.5)
        self.set_text_color(60, 60, 60)
        content_w = self.w - self.l_margin - self.r_margin
        self.set_x(self.l_margin + 2)
        self.multi_cell(content_w - 2, 4.5, f"例句  {sentence}")
        self.set_text_color(0, 0, 0)
        self.ln(2.5)


def build_practice_pdf() -> Path:
    pdf = VocabPDF("雅思高频词汇 · 默写练习")
    pdf.cover_page(
        "默写练习版（右侧留白填写中文）",
        [
            "每行左侧为英文单词和词性，右侧横线处默写中文释义",
            "例句帮助理解语境，默写时可先不看例句",
            "按主题分组，建议每次练习 10 个词，约 15–20 分钟",
            "完成后用《答案册》核对，错词重点复习",
        ],
    )
    pdf.add_page()
    for topic, words in VOCABULARY.items():
        pdf.topic_header(topic)
        for word, pos, sentence, _meaning in words:
            pdf.word_entry(word, pos, sentence, meaning=None)
    out = OUTPUT_DIR / "雅思高频词汇默写练习.pdf"
    pdf.output(str(out))
    return out


def build_answer_pdf() -> Path:
    pdf = VocabPDF("雅思高频词汇 · 答案册")
    pdf.cover_page(
        "答案册（默写后核对用）",
        [
            "与练习册顺序完全一致，方便逐页核对",
            "建议不要在做题前翻看，先默写再查阅",
            "可打印或在电脑上分屏对照",
        ],
    )
    pdf.add_page()
    for topic, words in VOCABULARY.items():
        pdf.topic_header(topic)
        for word, pos, sentence, meaning in words:
            pdf.word_entry(word, pos, sentence, meaning=meaning)
    out = OUTPUT_DIR / "雅思高频词汇答案册.pdf"
    pdf.output(str(out))
    return out


def main():
    practice = build_practice_pdf()
    answer = build_answer_pdf()
    total = sum(len(v) for v in VOCABULARY.values())
    print(f"Generated: {practice}")
    print(f"Generated: {answer}")
    print(f"Total words: {total}")


if __name__ == "__main__":
    main()
