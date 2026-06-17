function normalizeWordKey(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z'-]/g, "");
}

/** ECDICT 老式词性码 → 现代缩写（j.→adj., r.→adv. 等） */
const POS_TAG_MAP = {
  n: "n",
  v: "v",
  j: "adj",
  r: "adv",
  i: "prep",
  c: "conj",
  p: "pron",
  m: "num",
  u: "int",
  a: "art",
  d: "adv",
  t: "adv",
  adj: "adj",
  adv: "adv",
  prep: "prep",
  conj: "conj",
  pron: "pron",
  art: "art",
  int: "int",
  vt: "v",
  vi: "v",
  num: "num",
  det: "det",
};

function normalizePosSingle(raw) {
  const tag = String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/\.$/, "");
  if (!tag) return "";
  const mapped = POS_TAG_MAP[tag] || tag;
  return `${mapped}.`;
}

function normalizePos(pos) {
  const text = String(pos || "").trim();
  if (!text) return "";
  if (text.includes("/")) {
    return text
      .split("/")
      .map((part) => normalizePosSingle(part))
      .filter(Boolean)
      .join("/");
  }
  return normalizePosSingle(text);
}

function tokenizeText(text) {
  const tokens = [];
  const regex = /([a-zA-Z]+(?:'[a-zA-Z]+)?)|(\s+)|([^\w\s])/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    const value = match[0];
    if (/^[a-zA-Z]/.test(value)) {
      tokens.push({ type: "word", text: value, key: normalizeWordKey(value) });
    } else if (/^\s+$/.test(value)) {
      tokens.push({ type: "space", text: value });
    } else {
      tokens.push({ type: "punct", text: value });
    }
  }

  return tokens;
}

function tokenizeParagraphs(textOrArticle) {
  let wordIndex = 0;
  const blocks = [];

  if (textOrArticle && typeof textOrArticle === "object" && textOrArticle.paragraphs) {
    textOrArticle.paragraphs.forEach((para) => {
      blocks.push({
        en: para.en || "",
        zh: para.zh || "",
      });
    });
  } else {
    const text = typeof textOrArticle === "string" ? textOrArticle : "";
    text.split("\n\n").forEach((en) => {
      blocks.push({ en, zh: "" });
    });
  }

  return blocks.map((block, pIndex) => {
    const rawTokens = tokenizeText(block.en);
    const tokens = rawTokens.map((token, tIndex) => {
      if (token.type !== "word") {
        return { ...token, tokenKey: `${pIndex}-${tIndex}` };
      }
      const enriched = {
        ...token,
        wordIndex,
        tokenKey: `${pIndex}-${tIndex}`,
      };
      wordIndex += 1;
      return enriched;
    });

    return { id: pIndex, tokens, zh: block.zh || "" };
  });
}

function getWordCount(paragraphs) {
  let count = 0;
  (paragraphs || []).forEach((para) => {
    (para.tokens || []).forEach((token) => {
      if (token.type === "word") count += 1;
    });
  });
  return count;
}

function normalizeWordRange(startIndex, endIndex) {
  const start = Math.min(startIndex, endIndex);
  const end = Math.max(startIndex, endIndex);
  return { startIndex: start, endIndex: end };
}

function isWordInRange(wordIndex, startIndex, endIndex) {
  if (wordIndex < 0) return false;
  const range = normalizeWordRange(startIndex, endIndex);
  return wordIndex >= range.startIndex && wordIndex <= range.endIndex;
}

function buildSpanTokenKeys(paragraphs, startIndex, endIndex) {
  const range = normalizeWordRange(startIndex, endIndex);
  const flat = [];
  (paragraphs || []).forEach((para) => {
    (para.tokens || []).forEach((token) => flat.push(token));
  });

  let firstKey = null;
  let lastKey = null;

  flat.forEach((token) => {
    if (token.type !== "word") return;
    if (
      token.wordIndex >= range.startIndex &&
      token.wordIndex <= range.endIndex
    ) {
      if (!firstKey) firstKey = token.tokenKey;
      lastKey = token.tokenKey;
    }
  });

  if (!firstKey || !lastKey) return {};

  const map = {};
  let active = false;
  flat.forEach((token) => {
    if (token.tokenKey === firstKey) active = true;
    if (active) map[token.tokenKey] = true;
    if (token.tokenKey === lastKey) active = false;
  });

  return map;
}

function buildIndexMap(startIndex, endIndex, value) {
  const map = {};
  const range = normalizeWordRange(startIndex, endIndex);
  for (let i = range.startIndex; i <= range.endIndex; i += 1) {
    map[i] = value;
  }
  return map;
}

function getFragmentText(paragraphs, startIndex, endIndex) {
  const range = normalizeWordRange(startIndex, endIndex);
  const parts = [];
  let inRange = false;
  let finished = false;

  (paragraphs || []).forEach((para) => {
    if (finished) return;
    (para.tokens || []).forEach((token) => {
      if (finished) return;

      if (token.type === "word") {
        if (token.wordIndex >= range.startIndex && token.wordIndex <= range.endIndex) {
          inRange = true;
          parts.push(token.text);
        } else if (inRange && token.wordIndex > range.endIndex) {
          finished = true;
        } else if (token.wordIndex < range.startIndex) {
          inRange = false;
        }
      } else if (inRange) {
        parts.push(token.text);
      }
    });
  });

  return parts.join("").replace(/\s+/g, " ").trim();
}

function lookupVocab(vocab, wordKey) {
  if (!vocab || !wordKey) return null;
  return vocab[wordKey] || vocab[wordKey.toLowerCase()] || null;
}

function keysAreRelated(a, b) {
  const ka = normalizeWordKey(a);
  const kb = normalizeWordKey(b);
  if (!ka || !kb) return false;
  if (ka === kb) return true;
  return lemmaCandidates(ka).includes(kb) || lemmaCandidates(kb).includes(ka);
}

function buildHighlightKeys(markKeys, paragraphs) {
  const highlight = {};
  const marks = Object.keys(markKeys || {});
  if (!marks.length) return highlight;

  (paragraphs || []).forEach((para) => {
    (para.tokens || []).forEach((token) => {
      if (token.type !== "word") return;
      if (markKeys[token.key]) {
        highlight[token.key] = true;
        return;
      }
      for (let i = 0; i < marks.length; i += 1) {
        if (keysAreRelated(marks[i], token.key)) {
          highlight[token.key] = true;
          break;
        }
      }
    });
  });

  return highlight;
}

function lemmaCandidates(wordKey) {
  const key = normalizeWordKey(wordKey);
  const candidates = [key];
  if (key.endsWith("ies") && key.length > 4) {
    candidates.push(key.slice(0, -3) + "y");
  }
  if (key.endsWith("ied") && key.length > 4) {
    candidates.push(key.slice(0, -3) + "y");
  }
  if (key.endsWith("ing") && key.length > 5) {
    candidates.push(key.slice(0, -3));
    candidates.push(key.slice(0, -3) + "e");
  }
  if (key.endsWith("ed") && key.length > 4) {
    candidates.push(key.slice(0, -2));
    candidates.push(key.slice(0, -1));
  }
  if (key.endsWith("es") && key.length > 4) {
    candidates.push(key.slice(0, -2));
  }
  if (key.endsWith("s") && key.length > 4 && !key.endsWith("ss")) {
    candidates.push(key.slice(0, -1));
  }
  return candidates;
}

/** 推断单词原形，用于展示（targets → target） */
function inferLemma(wordKey) {
  const key = normalizeWordKey(wordKey);
  if (!key || key.length <= 2) return key;

  if (key.endsWith("ies") && key.length > 4) {
    return key.slice(0, -3) + "y";
  }
  if (key.endsWith("ied") && key.length > 4) {
    return key.slice(0, -3) + "y";
  }
  if (key.endsWith("ing") && key.length > 5) {
    return key.slice(0, -3);
  }
  if (key.endsWith("ed") && key.length > 4) {
    const stem = key.slice(0, -2);
    if (stem.length >= 3) return stem;
    const alt = key.slice(0, -1);
    if (alt.length >= 3) return alt;
  }
  if (key.endsWith("es") && key.length > 4) {
    return key.slice(0, -2);
  }
  if (key.endsWith("s") && key.length > 4 && !key.endsWith("ss")) {
    return key.slice(0, -1);
  }
  return key;
}

function resolveLemmaEntry(vocab, wordKey) {
  const key = normalizeWordKey(wordKey);
  const lemmaKey = inferLemma(key);
  const candidates = [...new Set([lemmaKey, key, ...lemmaCandidates(key)])];

  let entry = null;
  let phonetic = "";

  const lemmaEntry = lookupVocab(vocab, lemmaKey);
  if (lemmaEntry && (lemmaEntry.phonetic || "").trim()) {
    phonetic = lemmaEntry.phonetic.trim();
  }

  for (let i = 0; i < candidates.length; i += 1) {
    const found = lookupVocab(vocab, candidates[i]);
    if (!found) continue;
    if (!entry) entry = found;
    if (!phonetic && (found.phonetic || "").trim()) {
      phonetic = found.phonetic.trim();
    }
  }

  if (entry) {
    return {
      ...entry,
      pos: normalizePos(entry.pos),
      phonetic,
      word: lemmaKey,
      lemmaKey,
    };
  }

  return {
    word: lemmaKey,
    pos: "",
    meaning: "暂无释义",
    phonetic: "",
    lemmaKey,
  };
}

function buildQuizOptions(correct, vocab, count = 4) {
  const meanings = Object.values(vocab || {})
    .map((v) => v.meaning)
    .filter((m) => m && m !== correct);

  const shuffled = meanings.sort(() => Math.random() - 0.5);
  const options = [correct];

  for (const m of shuffled) {
    if (options.length >= count) break;
    if (!options.includes(m)) options.push(m);
  }

  while (options.length < count) {
    options.push(`选项 ${options.length}`);
  }

  return options.sort(() => Math.random() - 0.5);
}

function findTokenByWordIndex(paragraphs, wordIndex) {
  for (const para of paragraphs || []) {
    for (const token of para.tokens || []) {
      if (token.type === "word" && token.wordIndex === wordIndex) {
        return token;
      }
    }
  }
  return null;
}

function findWordIndexByKey(paragraphs, wordKey) {
  const candidates = lemmaCandidates(wordKey);
  const candidateSet = {};
  candidates.forEach((c) => {
    candidateSet[c] = true;
  });

  for (const para of paragraphs || []) {
    for (const token of para.tokens || []) {
      if (token.type === "word" && candidateSet[token.key]) {
        return token.wordIndex;
      }
    }
  }
  return -1;
}

function findContextForWord(paragraphs, wordKey) {
  for (const para of paragraphs || []) {
    let chunk = "";
    for (const token of para.tokens || []) {
      chunk += token.text;
      if (token.type === "word" && token.key === wordKey) {
        return chunk.length > 120 ? chunk.slice(0, 120) + "…" : chunk;
      }
      if (token.type === "word" && /[.!?]$/.test(token.text)) {
        chunk = "";
      }
    }
  }
  return getFragmentText(
    paragraphs,
    0,
    getWordCount(paragraphs) - 1
  );
}

function buildCaughtIndexMap(articleTankWords, paragraphs) {
  const lemmaToIndex = {};
  (articleTankWords || []).forEach((item) => {
    if (item && item.key) lemmaToIndex[item.key] = item.index;
  });

  const indexMap = {};
  const marks = Object.keys(lemmaToIndex);
  if (!marks.length) return indexMap;

  (paragraphs || []).forEach((para) => {
    (para.tokens || []).forEach((token) => {
      if (token.type !== "word") return;
      if (lemmaToIndex[token.key]) {
        indexMap[token.key] = lemmaToIndex[token.key];
        return;
      }
      for (let i = 0; i < marks.length; i += 1) {
        if (keysAreRelated(marks[i], token.key)) {
          indexMap[token.key] = lemmaToIndex[marks[i]];
          break;
        }
      }
    });
  });

  return indexMap;
}

function enrichParagraphs(
  articleId,
  paragraphs,
  caughtKeys,
  markedSpanKeys,
  caughtIndexMap
) {
  return (paragraphs || []).map((para) => ({
    ...para,
    tokens: (para.tokens || []).map((token) => {
      const isCaught = token.type === "word" && !!caughtKeys[token.key];
      return {
        ...token,
        isCaught,
        isMarked: !!markedSpanKeys[token.tokenKey],
        caughtIndex:
          isCaught && caughtIndexMap ? caughtIndexMap[token.key] || 0 : 0,
      };
    }),
  }));
}

module.exports = {
  normalizeWordKey,
  normalizePos,
  tokenizeParagraphs,
  getWordCount,
  normalizeWordRange,
  isWordInRange,
  buildIndexMap,
  buildSpanTokenKeys,
  buildCaughtIndexMap,
  enrichParagraphs,
  getFragmentText,
  lookupVocab,
  keysAreRelated,
  buildHighlightKeys,
  lemmaCandidates,
  inferLemma,
  resolveLemmaEntry,
  findWordIndexByKey,
  findTokenByWordIndex,
  buildQuizOptions,
  findContextForWord,
};
