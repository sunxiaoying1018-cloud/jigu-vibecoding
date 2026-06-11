#!/usr/bin/env python3
"""Export articles and vocab for WeChat miniprogram (JSON + JS modules)."""

import json
import os

from ielts_reading_passages import PASSAGES
from ielts_vocab_data import VOCABULARY

OUT_DIR = os.path.join(os.path.dirname(__file__), "miniprogram", "data")


def build_vocab_dict():
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


def write_js_module(path, data):
    # 必须用 module.exports，不能用 ARTICLES = ...（微信严格模式会报错）
    content = f"module.exports = {json.dumps(data, ensure_ascii=False, indent=2)};\n"
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)


def main():
    os.makedirs(OUT_DIR, exist_ok=True)

    articles = []
    for p in PASSAGES:
        articles.append(
            {
                "id": p["id"],
                "title": p["title"],
                "topic": p["topic"],
                "level": p["level"],
                "text": p["text"],
            }
        )

    vocab = build_vocab_dict()

    with open(os.path.join(OUT_DIR, "articles.json"), "w", encoding="utf-8") as f:
        json.dump(articles, f, ensure_ascii=False, indent=2)

    with open(os.path.join(OUT_DIR, "vocab.json"), "w", encoding="utf-8") as f:
        json.dump(vocab, f, ensure_ascii=False, indent=2)

    write_js_module(os.path.join(OUT_DIR, "articles.js"), articles)
    write_js_module(os.path.join(OUT_DIR, "vocab.js"), vocab)

    print(f"Exported {len(articles)} articles, {len(vocab)} vocab entries -> {OUT_DIR}")


if __name__ == "__main__":
    main()
