function tokenizeText(text) {
  const tokens = [];
  const regex = /([a-zA-Z]+(?:'[a-zA-Z]+)?)|(\s+)|([^\w\s])/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    const value = match[0];
    if (/^[a-zA-Z]/.test(value)) {
      tokens.push({ type: "word", text: value, key: value.toLowerCase() });
    } else if (/^\s+$/.test(value)) {
      tokens.push({ type: "space", text: value });
    } else {
      tokens.push({ type: "punct", text: value });
    }
  }

  return tokens;
}

function tokenizeParagraphs(text) {
  let wordIndex = 0;

  return text.split("\n\n").map((paraText, pIndex) => {
    const rawTokens = tokenizeText(paraText);
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

    return { id: pIndex, tokens };
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

module.exports = {
  tokenizeParagraphs,
  getWordCount,
  normalizeWordRange,
  isWordInRange,
  buildIndexMap,
  buildSpanTokenKeys,
  getFragmentText,
  lookupVocab,
  buildQuizOptions,
  findContextForWord,
};
