#!/usr/bin/env python3
"""Build miniprogram vocab from ECDICT + article word list + curated IELTS vocab."""

import json
import os
import re
import sqlite3
import sys
import zipfile
from urllib.request import urlretrieve

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)

from ielts_reading_passages import PASSAGES
from ielts_vocab_data import VOCABULARY
ECDICT_DIR = os.path.join(ROOT, "data", "ecdict")
ECDICT_DB = os.path.join(ECDICT_DIR, "stardict.db")
ECDICT_ZIP = os.path.join(ECDICT_DIR, "ecdict-sqlite-28.zip")
ECDICT_URL = (
    "https://github.com/skywind3000/ECDICT/releases/download/1.0.28/ecdict-sqlite-28.zip"
)
OUT_DIR = os.path.join(ROOT, "miniprogram", "data")

WORD_RE = re.compile(r"[a-zA-Z]+(?:'[a-zA-Z]+)?")


def ensure_ecdict_db():
    if os.path.isfile(ECDICT_DB):
        return
    os.makedirs(ECDICT_DIR, exist_ok=True)
    if not os.path.isfile(ECDICT_ZIP):
        print(f"Downloading ECDICT sqlite (~206MB) -> {ECDICT_ZIP}")
        urlretrieve(ECDICT_URL, ECDICT_ZIP)
    with zipfile.ZipFile(ECDICT_ZIP) as zf:
        zf.extractall(ECDICT_DIR)
    if not os.path.isfile(ECDICT_DB):
        raise FileNotFoundError(f"Expected {ECDICT_DB} after unzip")


def extract_article_words():
    words = set()
    for passage in PASSAGES:
        for match in WORD_RE.findall(passage["text"]):
            words.add(match.lower())
    return words


def build_curated_vocab():
    lookup = {}
    for topic, entries in VOCABULARY.items():
        topic_label = topic.split(" ", 1)[-1] if " " in topic else topic
        for word, pos, example, meaning in entries:
            key = word.lower()
            if key not in lookup:
                lookup[key] = {
                    "word": word,
                    "pos": pos,
                    "meaning": meaning,
                    "example": example,
                    "topic": topic_label,
                    "source": "curated",
                }
    return lookup


# ECDICT / StarDict 词性码（老式单字母）→ 现代缩写
ECDICT_POS_MAP = {
    "n": "n.",
    "v": "v.",
    "j": "adj.",  # 形容词
    "r": "adv.",  # 副词
    "i": "prep.",  # 介词
    "c": "conj.",  # 连词
    "p": "pron.",  # 代词
    "m": "num.",  # 数词
    "u": "int.",  # 叹词
    "a": "art.",  # 冠词
    "d": "adv.",  # 部分词条作副词
    "t": "adv.",  # 时间词，展示为副词类
    "adj": "adj.",
    "adv": "adv.",
    "prep": "prep.",
    "conj": "conj.",
    "pron": "pron.",
    "art": "art.",
    "int": "int.",
    "vt": "v.",
    "vi": "v.",
    "num": "num.",
}


def normalize_pos_tag(tag):
    tag = (tag or "").strip().lower().rstrip(".")
    return ECDICT_POS_MAP.get(tag, f"{tag}." if tag else "")


def parse_pos(pos_field):
    if not pos_field:
        return ""
    first = pos_field.split("/")[0]
    if ":" in first:
        tag = first.split(":")[0]
    else:
        tag = first.rstrip(".")
    return normalize_pos_tag(tag)


def pos_from_translation(translation):
    if not translation:
        return ""
    first_line = translation.split("\n")[0].strip()
    match = re.match(r"^([a-z]+\.)\s", first_line, flags=re.I)
    if not match:
        return ""
    return normalize_pos_tag(match.group(1).rstrip("."))


def shorten_meaning(translation, max_len=80):
    if not translation:
        return ""
    lines = [line.strip() for line in translation.split("\n") if line.strip()]
    if not lines:
        return ""
    meaning = re.sub(r"^[a-z]+\.\s*", "", lines[0], flags=re.I)
    meaning = re.sub(r"^\[计\]\s*", "", meaning)
    if len(meaning) > max_len:
        meaning = meaning[: max_len - 1] + "…"
    return meaning


def parse_exchange_lemma(exchange, form):
    if not exchange:
        return None
    for part in exchange.split("/"):
        if ":" not in part:
            continue
        code, lemma = part.split(":", 1)
        if lemma.lower() == form.lower():
            return lemma
    return None


def lookup_word(conn, word):
    cur = conn.cursor()
    row = cur.execute(
        "SELECT word, phonetic, pos, translation, exchange FROM stardict WHERE word = ? COLLATE NOCASE",
        (word,),
    ).fetchone()
    if row:
        return row

    # exchange reverse lookup: find entries whose lemma matches inflected form
    row = cur.execute(
        "SELECT word, phonetic, pos, translation, exchange FROM stardict WHERE exchange LIKE ? LIMIT 1",
        (f"%:{word}%",),
    ).fetchone()
    if row:
        return row

    # stripped word fuzzy match
    sw = re.sub(r"[^a-z]", "", word.lower())
    row = cur.execute(
        "SELECT word, phonetic, pos, translation, exchange FROM stardict WHERE sw = ? LIMIT 1",
        (sw,),
    ).fetchone()
    if row:
        return row

    # common suffix fallbacks
    candidates = []
    if word.endswith("ies") and len(word) > 4:
        candidates.append(word[:-3] + "y")
    if word.endswith("ied") and len(word) > 4:
        candidates.append(word[:-3] + "y")
    if word.endswith("ing") and len(word) > 5:
        candidates.append(word[:-3])
        candidates.append(word[:-3] + "e")
    if word.endswith("ed") and len(word) > 4:
        candidates.append(word[:-2])
        candidates.append(word[:-1])
    if word.endswith("es") and len(word) > 3:
        candidates.append(word[:-2])
    if word.endswith("s") and len(word) > 3:
        candidates.append(word[:-1])

    for cand in candidates:
        row = cur.execute(
            "SELECT word, phonetic, pos, translation, exchange FROM stardict WHERE word = ? COLLATE NOCASE",
            (cand,),
        ).fetchone()
        if row:
            return row

    return None


def ecdict_entry_to_vocab(key, row):
    word, phonetic, pos, translation, _exchange = row
    parsed_pos = parse_pos(pos) or pos_from_translation(translation)
    return {
        "word": word,
        "pos": parsed_pos,
        "meaning": shorten_meaning(translation),
        "phonetic": phonetic or "",
        "example": "",
        "topic": "阅读词汇",
    }


def build_vocab():
    ensure_ecdict_db()
    curated = build_curated_vocab()
    article_words = extract_article_words()
    all_keys = set(curated.keys()) | article_words

    conn = sqlite3.connect(ECDICT_DB)
    vocab = {}
    missing = []

    for key in sorted(all_keys):
        if key in curated:
            entry = dict(curated[key])
            row = lookup_word(conn, key)
            if row:
                _word, row_phonetic, row_pos, row_translation, _ex = row
                if not entry.get("phonetic"):
                    entry["phonetic"] = row_phonetic or ""
                if not entry.get("pos"):
                    entry["pos"] = parse_pos(row_pos) or pos_from_translation(
                        row_translation
                    )
            vocab[key] = entry
            continue

        row = lookup_word(conn, key)
        if row:
            vocab[key] = ecdict_entry_to_vocab(key, row)
        else:
            missing.append(key)

    conn.close()

    os.makedirs(OUT_DIR, exist_ok=True)
    out_json = os.path.join(OUT_DIR, "vocab.json")
    with open(out_json, "w", encoding="utf-8") as f:
        json.dump(vocab, f, ensure_ascii=False, indent=2)

    js_path = os.path.join(OUT_DIR, "vocab.js")
    with open(js_path, "w", encoding="utf-8") as f:
        f.write(f"module.exports = {json.dumps(vocab, ensure_ascii=False, indent=2)};\n")

    print(f"Built {len(vocab)} vocab entries ({len(curated)} curated, {len(missing)} missing)")
    if missing:
        print(f"Missing ({len(missing)}): {', '.join(missing[:20])}{'...' if len(missing) > 20 else ''}")
    print(f"-> {out_json}")


if __name__ == "__main__":
    build_vocab()
