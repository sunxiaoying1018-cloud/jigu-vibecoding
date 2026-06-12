#!/usr/bin/env python3
"""Export articles and vocab for WeChat miniprogram (JSON + JS modules)."""

import json
import os
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, ROOT)

from ielts_reading_passages import PASSAGES
from ielts_reading_translations import TRANSLATIONS
from ielts_vocab_data import VOCABULARY

OUT_DIR = os.path.join(ROOT, "miniprogram", "data")


def build_vocab_dict():
    """Prefer expanded vocab.json if present (from ECDICT build)."""
    expanded = os.path.join(OUT_DIR, "vocab.json")
    if os.path.isfile(expanded):
        with open(expanded, encoding="utf-8") as f:
            data = json.load(f)
        if len(data) > len(VOCABULARY):
            return data

    lookup = {}
    for topic, entries in VOCABULARY.items():
        for word, pos, example, meaning in entries:
            key = word.lower()
            if key not in lookup:
                lookup[key] = {
                    "word": word,
                    "pos": pos,
                    "meaning": meaning,
                    "example": example,
                    "topic": topic.split(" ", 1)[-1] if " " in topic else topic,
                }
    return lookup


def build_article(passage):
    en_paragraphs = passage["text"].split("\n\n")
    zh_paragraphs = TRANSLATIONS.get(passage["id"], [""] * len(en_paragraphs))
    if len(zh_paragraphs) != len(en_paragraphs):
        raise ValueError(
            f"Article {passage['id']}: {len(en_paragraphs)} EN paragraphs "
            f"but {len(zh_paragraphs)} ZH translations"
        )

    paragraphs = [
        {"en": en, "zh": zh}
        for en, zh in zip(en_paragraphs, zh_paragraphs)
    ]

    return {
        "id": passage["id"],
        "title": passage["title"],
        "topic": passage["topic"],
        "level": passage["level"],
        "text": passage["text"],
        "paragraphs": paragraphs,
    }


def write_js_module(path, data):
    content = f"module.exports = {json.dumps(data, ensure_ascii=False, indent=2)};\n"
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)


def main():
    os.makedirs(OUT_DIR, exist_ok=True)

    articles = [build_article(p) for p in PASSAGES]
    vocab = build_vocab_dict()

    with open(os.path.join(OUT_DIR, "articles.json"), "w", encoding="utf-8") as f:
        json.dump(articles, f, ensure_ascii=False, indent=2)

    with open(os.path.join(OUT_DIR, "vocab.json"), "w", encoding="utf-8") as f:
        json.dump(vocab, f, ensure_ascii=False, indent=2)

    write_js_module(os.path.join(OUT_DIR, "articles.js"), articles)
    write_js_module(os.path.join(OUT_DIR, "vocab.js"), vocab)

    print(
        f"Exported {len(articles)} articles, {len(vocab)} vocab entries -> {OUT_DIR}"
    )


if __name__ == "__main__":
    main()
