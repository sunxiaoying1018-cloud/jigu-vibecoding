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
                    "meanings": [{"pos": pos, "zh": meaning}],
                    "example": example,
                    "topic": topic_label,
                    "source": "curated",
                }
                enrich_exam_hints(lookup[key])
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
    "a": "adj.",  # ECDICT translation/WordNet 中 a. 多表示形容词
    "s": "adj.",  # WordNet satellite adjective
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

IELTS_SYNONYM_MAP = {
    "accelerate": ["speed up", "hasten", "quicken"],
    "adequate": ["sufficient", "enough", "satisfactory"],
    "adopt": ["take up", "embrace", "implement"],
    "adverse": ["negative", "unfavourable", "harmful"],
    "advocate": ["support", "promote", "argue for"],
    "affluent": ["wealthy", "prosperous", "well-off"],
    "alleviate": ["ease", "relieve", "mitigate"],
    "ambiguous": ["unclear", "vague", "uncertain"],
    "approach": ["method", "way", "strategy"],
    "approximately": ["roughly", "about", "around"],
    "assess": ["evaluate", "measure", "judge"],
    "attain": ["achieve", "reach", "accomplish"],
    "benefit": ["advantage", "gain", "merit"],
    "challenge": ["difficulty", "obstacle", "problem"],
    "chronic": ["long-term", "persistent", "lasting"],
    "complicated": ["complex", "intricate", "difficult"],
    "consequence": ["result", "outcome", "effect"],
    "considerable": ["significant", "substantial", "marked"],
    "contemporary": ["modern", "current", "present-day"],
    "contend": ["argue", "claim", "maintain"],
    "crucial": ["vital", "essential", "key"],
    "decline": ["decrease", "fall", "drop"],
    "demonstrate": ["show", "indicate", "prove"],
    "diminish": ["reduce", "decrease", "lessen"],
    "displacement": ["replacement", "relocation", "removal"],
    "dispute": ["question", "challenge", "argue against"],
    "dramatic": ["striking", "marked", "considerable"],
    "emerge": ["appear", "arise", "come into being"],
    "emphasise": ["stress", "highlight", "underline"],
    "enable": ["allow", "permit", "make possible"],
    "encounter": ["face", "experience", "come across"],
    "enhance": ["improve", "strengthen", "boost"],
    "enormous": ["huge", "vast", "immense"],
    "equivalent": ["equal", "comparable", "corresponding"],
    "erode": ["weaken", "undermine", "wear away"],
    "evidence": ["proof", "indication", "support"],
    "explicit": ["clear", "direct", "unambiguous"],
    "facilitate": ["help", "enable", "make easier"],
    "fluctuate": ["vary", "change", "shift"],
    "fundamental": ["basic", "essential", "underlying"],
    "generate": ["produce", "create", "bring about"],
    "hinder": ["impede", "obstruct", "hamper"],
    "impact": ["effect", "influence", "consequence"],
    "implement": ["carry out", "put into practice", "apply"],
    "implication": ["consequence", "suggestion", "possible effect"],
    "incentive": ["motivation", "encouragement", "stimulus"],
    "indicate": ["show", "suggest", "point to"],
    "inevitable": ["unavoidable", "certain", "bound to happen"],
    "innovation": ["new development", "novelty", "invention"],
    "intensify": ["increase", "strengthen", "heighten"],
    "maintain": ["argue", "claim", "preserve"],
    "marked": ["noticeable", "significant", "clear"],
    "meticulous": ["careful", "thorough", "precise"],
    "notion": ["idea", "concept", "belief"],
    "obligation": ["responsibility", "duty", "requirement"],
    "obstacle": ["barrier", "difficulty", "hurdle"],
    "obtain": ["get", "acquire", "gain"],
    "predominantly": ["mainly", "primarily", "largely"],
    "priority": ["main concern", "preference", "precedence"],
    "profound": ["deep", "significant", "far-reaching"],
    "prohibitively": ["excessively", "unaffordably", "too"],
    "prominent": ["noticeable", "important", "well-known"],
    "prompt": ["cause", "lead to", "trigger"],
    "proportion": ["share", "percentage", "ratio"],
    "pursue": ["seek", "follow", "try to achieve"],
    "rapid": ["fast", "swift", "quick"],
    "resemble": ["look like", "be similar to", "mirror"],
    "reside": ["live", "dwell", "be located"],
    "significant": ["important", "substantial", "notable"],
    "simultaneously": ["at the same time", "concurrently", "meanwhile"],
    "substantial": ["considerable", "large", "significant"],
    "supplant": ["replace", "displace", "take the place of"],
    "surge": ["increase sharply", "rise rapidly", "soar"],
    "sustainable": ["long-term", "environmentally sound", "viable"],
    "transparent": ["clear", "obvious", "open"],
    "transparently": ["clearly", "plainly", "openly"],
    "ultimately": ["eventually", "finally", "in the end"],
    "undermine": ["weaken", "damage", "erode"],
    "unprecedented": ["never-before-seen", "new", "without precedent"],
    "vulnerable": ["at risk", "susceptible", "exposed"],
}

IELTS_ANTONYM_MAP = {
    "accelerate": ["slow down"],
    "adequate": ["insufficient", "inadequate"],
    "adverse": ["favourable", "beneficial"],
    "affluent": ["poor", "deprived"],
    "ambiguous": ["clear", "explicit"],
    "benefit": ["drawback", "disadvantage"],
    "chronic": ["temporary", "acute"],
    "complicated": ["simple", "straightforward"],
    "contemporary": ["ancient", "traditional"],
    "decline": ["increase", "rise"],
    "diminish": ["increase", "expand"],
    "explicit": ["implicit", "unclear"],
    "fundamental": ["minor", "secondary"],
    "hinder": ["facilitate", "help"],
    "inevitable": ["avoidable", "uncertain"],
    "major": ["minor"],
    "prominent": ["obscure", "minor"],
    "rapid": ["slow", "gradual"],
    "significant": ["insignificant", "minor"],
    "substantial": ["slight", "minor"],
    "sustainable": ["unsustainable"],
    "transparent": ["opaque", "unclear"],
    "vulnerable": ["protected", "resilient"],
}

FAMILIAR_WORDS = {
    "account", "address", "approach", "challenge", "compound", "decline",
    "domestic", "issue", "maintain", "marked", "novel", "principle",
    "property", "range", "render", "subject", "transparent"
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


def split_pos_text(line):
    line = (line or "").strip()
    match = re.match(r"^([a-z]+\.?)\s*(.*)$", line, flags=re.I)
    if not match:
        return "", line
    pos = normalize_pos_tag(match.group(1).rstrip("."))
    text = match.group(2).strip()
    return pos, text


def clean_zh_meaning(text):
    text = (text or "").strip()
    text = re.sub(r"^\[[^\]]+\]\s*", "", text)
    text = text.replace(",", "，")
    return text


def parse_translation_meanings(translation, fallback_pos=""):
    if not translation:
        return []

    meanings = []
    last_pos = fallback_pos
    for raw_line in translation.split("\n"):
        line = raw_line.strip()
        if not line:
            continue

        pos, text = split_pos_text(line)
        if pos:
            last_pos = pos
        else:
            text = line

        text = clean_zh_meaning(text)
        if not text:
            continue

        meanings.append({
            "pos": pos or last_pos or fallback_pos,
            "zh": text,
        })

    return meanings


def parse_english_definitions(definition, fallback_pos=""):
    if not definition:
        return []

    definitions = []
    for raw_line in definition.split("\n"):
        line = raw_line.strip()
        if not line:
            continue
        pos, text = split_pos_text(line)
        if not text:
            continue
        definitions.append({
            "pos": pos or fallback_pos,
            "en": text,
        })
    return definitions


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


def compact_meaning(meanings, fallback_translation=""):
    if meanings:
        joined = "；".join(item["zh"] for item in meanings[:3] if item.get("zh"))
        if len(joined) > 120:
            return joined[:119] + "…"
        return joined
    return shorten_meaning(fallback_translation, max_len=120)


def build_exam_tags(word, pos, meanings, synonyms):
    tags = []
    lower = (word or "").lower()
    if synonyms:
        tags.append("同义替换")
    if lower in FAMILIAR_WORDS or len(meanings or []) >= 3:
        tags.append("熟词僻义")
    if (pos or "").startswith(("adv", "adj")):
        tags.append("态度/程度")
    if lower.endswith(("tion", "sion", "ment", "ity", "ness")):
        tags.append("定位名词")
    if lower.endswith(("ate", "ise", "ize", "fy")):
        tags.append("动作替换")
    if not tags:
        tags.append("学术高频")
    return tags[:3]


def enrich_exam_hints(entry):
    word = (entry.get("word") or "").lower()
    synonyms = IELTS_SYNONYM_MAP.get(word, [])
    antonyms = IELTS_ANTONYM_MAP.get(word, [])
    entry["synonyms"] = synonyms
    entry["antonyms"] = antonyms
    return entry


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


def morphological_candidates(word):
    key = word.lower()
    candidates = []
    if key.endswith("ies") and len(key) > 4:
        candidates.append(key[:-3] + "y")
    if key.endswith("ied") and len(key) > 4:
        candidates.append(key[:-3] + "y")
    if key.endswith("ing") and len(key) > 5:
        candidates.append(key[:-3])
        candidates.append(key[:-3] + "e")
    if key.endswith("ed") and len(key) > 4:
        candidates.append(key[:-2])
        candidates.append(key[:-1])
    if key.endswith("es") and len(key) > 4:
        candidates.append(key[:-2])
    if key.endswith("s") and len(key) > 4 and not key.endswith("ss"):
        candidates.append(key[:-1])
    return candidates


def lemma_from_exchange(exchange):
    if not exchange:
        return None
    for part in exchange.split("/"):
        if ":" not in part:
            continue
        code, value = part.split(":", 1)
        if code == "0" and value:
            return value
    return None


def lookup_phonetic(conn, word):
    row = conn.execute(
        "SELECT phonetic FROM stardict WHERE word = ? COLLATE NOCASE",
        (word,),
    ).fetchone()
    if row and row[0] and str(row[0]).strip():
        return str(row[0]).strip()
    return ""


def resolve_phonetic(conn, word, phonetic="", exchange=""):
    if (phonetic or "").strip():
        return phonetic.strip()

    lemma = lemma_from_exchange(exchange)
    if lemma:
        got = lookup_phonetic(conn, lemma)
        if got:
            return got

    for cand in morphological_candidates(word):
        got = lookup_phonetic(conn, cand)
        if got:
            return got

    return ""


def lookup_word(conn, word):
    cur = conn.cursor()
    row = cur.execute(
        "SELECT word, phonetic, pos, translation, definition, exchange FROM stardict WHERE word = ? COLLATE NOCASE",
        (word,),
    ).fetchone()
    if row:
        return row

    # exchange reverse lookup: find entries whose lemma matches inflected form
    row = cur.execute(
        "SELECT word, phonetic, pos, translation, definition, exchange FROM stardict WHERE exchange LIKE ? LIMIT 1",
        (f"%:{word}%",),
    ).fetchone()
    if row:
        return row

    # stripped word fuzzy match
    sw = re.sub(r"[^a-z]", "", word.lower())
    row = cur.execute(
        "SELECT word, phonetic, pos, translation, definition, exchange FROM stardict WHERE sw = ? LIMIT 1",
        (sw,),
    ).fetchone()
    if row:
        return row

    # common suffix fallbacks
    candidates = morphological_candidates(word)

    for cand in candidates:
        row = cur.execute(
            "SELECT word, phonetic, pos, translation, definition, exchange FROM stardict WHERE word = ? COLLATE NOCASE",
            (cand,),
        ).fetchone()
        if row:
            return row

    return None


def ecdict_entry_to_vocab(conn, key, row):
    word, phonetic, pos, translation, definition, exchange = row
    parsed_pos = parse_pos(pos) or pos_from_translation(translation)
    meanings = parse_translation_meanings(translation, parsed_pos)[:3]
    definitions = parse_english_definitions(definition, parsed_pos)[:2]
    return enrich_exam_hints({
        "word": word,
        "pos": parsed_pos,
        "meaning": compact_meaning(meanings, translation),
        "meanings": meanings,
        "definitions": definitions,
        "phonetic": resolve_phonetic(conn, word, phonetic, exchange),
        "example": "",
        "topic": "阅读词汇",
    })


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
                _word, row_phonetic, row_pos, row_translation, row_definition, row_exchange = row
                if not entry.get("phonetic"):
                    entry["phonetic"] = resolve_phonetic(
                        conn, key, row_phonetic or "", row_exchange or ""
                    )
                if not entry.get("pos"):
                    entry["pos"] = parse_pos(row_pos) or pos_from_translation(
                        row_translation
                    )
                meanings = parse_translation_meanings(row_translation, entry.get("pos", ""))[:3]
                if meanings:
                    entry.setdefault("meanings", meanings)
                    entry["meaning"] = entry.get("meaning") or compact_meaning(meanings, row_translation)
                definitions = parse_english_definitions(row_definition, entry.get("pos", ""))[:2]
                if definitions:
                    entry.setdefault("definitions", definitions)
            vocab[key] = enrich_exam_hints(entry)
            continue

        row = lookup_word(conn, key)
        if row:
            vocab[key] = ecdict_entry_to_vocab(conn, key, row)
        else:
            missing.append(key)

    conn.close()

    os.makedirs(OUT_DIR, exist_ok=True)
    js_path = os.path.join(OUT_DIR, "vocab.js")
    with open(js_path, "w", encoding="utf-8") as f:
        f.write(
            f"module.exports={json.dumps(vocab, ensure_ascii=False, separators=(',', ':'))};\n"
        )

    print(f"Built {len(vocab)} vocab entries ({len(curated)} curated, {len(missing)} missing)")
    if missing:
        print(f"Missing ({len(missing)}): {', '.join(missing[:20])}{'...' if len(missing) > 20 else ''}")
    print(f"-> {js_path}")


if __name__ == "__main__":
    build_vocab()
