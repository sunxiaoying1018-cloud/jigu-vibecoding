const STORAGE_KEY = "caughtWords";
const PROGRESS_KEY = "userProgress";
const ARTICLE_MARKS_KEY = "articleWordMarks";
const ARTICLE_MARKS_MIGRATED_KEY = "articleWordMarksMigrated";
const { normalizeArticleId, isSameArticle } = require("./article");
const {
  normalizeWordKey,
  keysAreRelated,
  buildHighlightKeys,
} = require("./word");

const ARTICLE_MARK_INDICES_KEY = "articleWordMarkIndices";

const REVIEW_INTERVALS = [1, 2, 4, 7, 15];

function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(dateStr, days) {
  const d = new Date(dateStr.replace(/-/g, "/"));
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getCaughtWords() {
  return wx.getStorageSync(STORAGE_KEY) || [];
}

function saveCaughtWords(words) {
  wx.setStorageSync(STORAGE_KEY, words);
}

function getProgress() {
  const defaults = {
    currentDay: 1,
    streak: 0,
    lastStudyDate: "",
    totalCaught: 0,
    totalMastered: 0,
  };
  return { ...defaults, ...(wx.getStorageSync(PROGRESS_KEY) || {}) };
}

function saveProgress(progress) {
  wx.setStorageSync(PROGRESS_KEY, progress);
}

function getWordKey(word) {
  return normalizeWordKey(word);
}

function migrateArticleWordMarks() {
  if (wx.getStorageSync(ARTICLE_MARKS_MIGRATED_KEY)) return;

  const stored = wx.getStorageSync(ARTICLE_MARKS_KEY) || {};
  const indicesMap = wx.getStorageSync(ARTICLE_MARK_INDICES_KEY) || {};

  getCaughtWords().forEach((w) => {
    if (!w || !w.key || w.articleId == null || w.articleId === "") return;
    const id = String(normalizeArticleId(w.articleId));
    if (!stored[id]) stored[id] = {};
    stored[id][w.key] = true;
    if (typeof w.wordIndex === "number" && w.wordIndex >= 0) {
      if (!indicesMap[id]) indicesMap[id] = {};
      indicesMap[id][String(w.wordIndex)] = w.key;
    }
  });

  wx.setStorageSync(ARTICLE_MARKS_KEY, stored);
  wx.setStorageSync(ARTICLE_MARK_INDICES_KEY, indicesMap);
  wx.setStorageSync(ARTICLE_MARKS_MIGRATED_KEY, true);
}

function getArticleWordMarkMap(articleId) {
  migrateArticleWordMarks();
  const id = String(normalizeArticleId(articleId));
  const stored = wx.getStorageSync(ARTICLE_MARKS_KEY) || {};
  return stored[id] || {};
}

function syncArticleMarksFromTank(articleId) {
  const id = String(normalizeArticleId(articleId));
  const stored = wx.getStorageSync(ARTICLE_MARKS_KEY) || {};
  let changed = false;

  if (!stored[id]) stored[id] = {};
  getCaughtWords().forEach((w) => {
    if (!w || !w.key || !isSameArticle(w.articleId, articleId)) return;
    if (!stored[id][w.key]) {
      stored[id][w.key] = true;
      changed = true;
    }
  });

  if (changed) wx.setStorageSync(ARTICLE_MARKS_KEY, stored);
}

function getCaughtWordKeysForArticle(articleId, paragraphs) {
  syncArticleMarksFromTank(articleId);

  const markKeys = { ...getArticleWordMarkMap(articleId) };
  getCaughtWords().forEach((w) => {
    if (w && w.key && isSameArticle(w.articleId, articleId)) {
      markKeys[w.key] = true;
    }
  });

  if (!paragraphs || !paragraphs.length) {
    return markKeys;
  }

  const highlight = buildHighlightKeys(markKeys, paragraphs);
  const indicesMap = wx.getStorageSync(ARTICLE_MARK_INDICES_KEY) || {};
  const id = String(normalizeArticleId(articleId));
  const indices = indicesMap[id] || {};

  paragraphs.forEach((para) => {
    (para.tokens || []).forEach((token) => {
      if (token.type === "word" && indices[String(token.wordIndex)]) {
        highlight[token.key] = true;
      }
    });
  });

  return highlight;
}

function markWordInArticle(articleId, wordKey, wordIndex) {
  const id = String(normalizeArticleId(articleId));
  const key = normalizeWordKey(wordKey);
  if (!key) return;

  migrateArticleWordMarks();
  const stored = wx.getStorageSync(ARTICLE_MARKS_KEY) || {};
  if (!stored[id]) stored[id] = {};
  stored[id][key] = true;
  wx.setStorageSync(ARTICLE_MARKS_KEY, stored);

  if (typeof wordIndex === "number" && wordIndex >= 0) {
    const indicesMap = wx.getStorageSync(ARTICLE_MARK_INDICES_KEY) || {};
    if (!indicesMap[id]) indicesMap[id] = {};
    indicesMap[id][String(wordIndex)] = key;
    wx.setStorageSync(ARTICLE_MARK_INDICES_KEY, indicesMap);
  }
}

function unmarkWordInArticle(articleId, wordKey, wordIndex) {
  const id = String(normalizeArticleId(articleId));
  const key = normalizeWordKey(wordKey);
  if (!key) return;

  const stored = wx.getStorageSync(ARTICLE_MARKS_KEY) || {};
  if (stored[id]) {
    Object.keys(stored[id]).forEach((mk) => {
      if (keysAreRelated(mk, key)) delete stored[id][mk];
    });
    if (!Object.keys(stored[id]).length) delete stored[id];
    wx.setStorageSync(ARTICLE_MARKS_KEY, stored);
  }

  const indicesMap = wx.getStorageSync(ARTICLE_MARK_INDICES_KEY) || {};
  if (indicesMap[id]) {
    Object.keys(indicesMap[id]).forEach((idx) => {
      if (keysAreRelated(indicesMap[id][idx], key)) {
        delete indicesMap[id][idx];
      }
    });
    if (!Object.keys(indicesMap[id]).length) delete indicesMap[id];
    wx.setStorageSync(ARTICLE_MARK_INDICES_KEY, indicesMap);
  }
}

function isWordMarkedInArticle(articleId, wordKey) {
  const key = normalizeWordKey(wordKey);
  if (!key) return false;

  const marks = getArticleWordMarkMap(articleId);
  if (Object.keys(marks).some((mk) => keysAreRelated(mk, key))) return true;

  if (
    getCaughtWords().some(
      (w) => isSameArticle(w.articleId, articleId) && keysAreRelated(w.key, key)
    )
  ) {
    return true;
  }

  migrateArticleWordMarks();
  const indicesMap = wx.getStorageSync(ARTICLE_MARK_INDICES_KEY) || {};
  const id = String(normalizeArticleId(articleId));
  const indices = indicesMap[id] || {};
  return Object.values(indices).some((mk) => keysAreRelated(mk, key));
}

function findWordRecord(words, wordKey) {
  return words.find((w) => keysAreRelated(w.key, wordKey));
}

function syncCaughtWordsFromArticleMarks(articles) {
  migrateArticleWordMarks();
  const stored = wx.getStorageSync(ARTICLE_MARKS_KEY) || {};
  const words = [...getCaughtWords()];
  let changed = false;

  const findArticle = (articleId) =>
    (articles || []).find((item) =>
      isSameArticle(item.id, articleId)
    );

  Object.keys(stored).forEach((articleIdStr) => {
    const article = findArticle(articleIdStr);
    const markMap = stored[articleIdStr] || {};

    Object.keys(markMap).forEach((rawKey) => {
      const key = normalizeWordKey(rawKey);
      if (!key || findWordRecord(words, key)) return;

      words.unshift({
        key,
        word: rawKey,
        pos: "",
        phonetic: "",
        meaning: "暂无释义",
        example: "",
        sentence: "",
        articleId: normalizeArticleId(articleIdStr),
        articleTitle: article ? article.title : "",
        topic: article ? article.topic : "",
        caughtAt: todayStr(),
        reviewLevel: 0,
        nextReviewAt: addDays(todayStr(), 1),
        status: "pending",
        correctStreak: 0,
      });
      changed = true;
    });
  });

  if (changed) {
    saveCaughtWords(words);
    const progress = getProgress();
    progress.totalCaught = words.length;
    saveProgress(progress);
  }

  return words;
}

function catchWord(wordInfo, article, sentence, tokenKey) {
  const words = getCaughtWords();
  const key = normalizeWordKey(tokenKey || wordInfo.word || wordInfo);
  if (!key) return { action: "invalid" };

  const existing = findWordRecord(words, key);
  const displayWord = wordInfo.tappedText || tokenKey || wordInfo.word || key;
  const wordIndex =
    typeof wordInfo.wordIndex === "number" ? wordInfo.wordIndex : -1;

  if (article && article.id != null) {
    markWordInArticle(article.id, key, wordIndex);
  }

  if (existing) {
    const idx = words.findIndex((w) => keysAreRelated(w.key, key));
    if (idx >= 0 && article && article.id != null) {
      words[idx] = {
        ...words[idx],
        word: displayWord || words[idx].word,
        articleId: normalizeArticleId(article.id),
        articleTitle: article.title,
        topic: article.topic,
      };
      saveCaughtWords(words);
      return { action: "exists", word: words[idx] };
    }
    return { action: "exists", word: existing };
  }

  const entry = {
    key,
    word: displayWord,
    pos: wordInfo.pos || "",
    phonetic: wordInfo.phonetic || "",
    meaning: wordInfo.meaning || "暂无释义",
    example: wordInfo.example || sentence || "",
    sentence: sentence || wordInfo.example || "",
    articleId: normalizeArticleId(article.id),
    articleTitle: article.title,
    topic: article.topic,
    caughtAt: todayStr(),
    reviewLevel: 0,
    nextReviewAt: addDays(todayStr(), 1),
    status: "pending",
    correctStreak: 0,
    wordIndex: wordIndex >= 0 ? wordIndex : undefined,
  };

  words.unshift(entry);
  saveCaughtWords(words);

  const progress = getProgress();
  progress.totalCaught = words.length;
  saveProgress(progress);

  return { action: "caught", word: entry };
}

function unCatchWord(wordKey, articleId, wordIndex) {
  const key = normalizeWordKey(wordKey);
  if (articleId != null && articleId !== "") {
    unmarkWordInArticle(articleId, key, wordIndex);
  }

  const words = getCaughtWords().filter((w) => !keysAreRelated(w.key, key));
  saveCaughtWords(words);
  const progress = getProgress();
  progress.totalCaught = words.length;
  progress.totalMastered = words.filter((w) => w.status === "mastered").length;
  saveProgress(progress);
}

function getDueWords() {
  const today = todayStr();
  return getCaughtWords().filter(
    (w) => w.status !== "mastered" && w.nextReviewAt <= today
  );
}

function reviewWord(wordKey, isCorrect) {
  const words = getCaughtWords();
  const idx = words.findIndex((w) => w.key === wordKey);
  if (idx === -1) return null;

  const word = words[idx];
  const today = todayStr();

  if (isCorrect) {
    word.correctStreak = (word.correctStreak || 0) + 1;
    word.reviewLevel = Math.min(
      (word.reviewLevel || 0) + 1,
      REVIEW_INTERVALS.length
    );

    if (word.reviewLevel >= REVIEW_INTERVALS.length) {
      word.status = "mastered";
      word.nextReviewAt = "";
    } else {
      word.status = "learning";
      const interval = REVIEW_INTERVALS[word.reviewLevel - 1] || 1;
      word.nextReviewAt = addDays(today, interval);
    }
  } else {
    word.correctStreak = 0;
    word.reviewLevel = 0;
    word.status = "pending";
    word.nextReviewAt = addDays(today, 1);
  }

  word.lastReviewAt = today;
  words[idx] = word;
  saveCaughtWords(words);

  const progress = getProgress();
  progress.totalMastered = words.filter((w) => w.status === "mastered").length;
  saveProgress(progress);

  return word;
}

function isArticleReadOnDate(articleId, dateStr) {
  const readArticles = wx.getStorageSync("readArticles") || {};
  return readArticles[String(articleId)] === dateStr;
}

function isArticleReadToday(articleId) {
  return isArticleReadOnDate(articleId, todayStr());
}

function getTodayArticleCtaText(articles) {
  const article = getTodayArticle(articles);
  if (!article) return "去抓小鱼";
  return isArticleReadToday(article.id) ? "再次阅读" : "去抓小鱼";
}

function markArticleRead(articleId) {
  const progress = getProgress();
  const today = todayStr();

  if (progress.lastStudyDate !== today) {
    if (
      progress.lastStudyDate &&
      addDays(progress.lastStudyDate, 1) === today
    ) {
      progress.streak = (progress.streak || 0) + 1;
    } else if (progress.lastStudyDate !== today) {
      progress.streak = 1;
    }
    progress.lastStudyDate = today;
  }

  const readArticles = wx.getStorageSync("readArticles") || {};
  const articleKey = String(articleId);
  if (!readArticles[articleKey]) {
    readArticles[articleKey] = today;
    progress.currentDay = Math.min((progress.currentDay || 1) + 1, 10);
    wx.setStorageSync("readArticles", readArticles);
  }

  saveProgress(progress);
  return progress;
}

function getTodayArticle(articles) {
  if (!articles || !articles.length) return null;

  const progress = getProgress();
  const today = todayStr();

  if (
    progress.todayArticleDate === today &&
    progress.todayArticleId != null
  ) {
    const locked = articles.find((a) => a.id === progress.todayArticleId);
    if (locked) return locked;
  }

  const dayIndex = Math.max(0, (progress.currentDay || 1) - 1);
  const article = articles[dayIndex % articles.length];

  progress.todayArticleDate = today;
  progress.todayArticleId = article.id;
  saveProgress(progress);

  return article;
}

function isWordCaught(wordKey) {
  return !!findWordRecord(getCaughtWords(), wordKey);
}

function getStatusLabel(status) {
  const map = {
    pending: "待吃",
    learning: "复习中",
    mastered: "已记牢",
    due: "该吃了",
  };
  return map[status] || "待吃";
}

function getWordDisplayStatus(word) {
  const today = todayStr();
  if (word.status === "mastered") {
    return { status: "mastered", statusLabel: "已记牢" };
  }
  if (word.nextReviewAt && word.nextReviewAt <= today) {
    return { status: "due", statusLabel: "该吃了" };
  }
  return {
    status: word.status || "pending",
    statusLabel: getStatusLabel(word.status || "pending"),
  };
}

module.exports = {
  todayStr,
  getCaughtWords,
  syncCaughtWordsFromArticleMarks,
  getCaughtWordKeysForArticle,
  markWordInArticle,
  unmarkWordInArticle,
  isWordMarkedInArticle,
  getArticleWordMarkMap,
  catchWord,
  unCatchWord,
  getDueWords,
  reviewWord,
  markArticleRead,
  getTodayArticle,
  getTodayArticleCtaText,
  isArticleReadToday,
  isArticleReadOnDate,
  getProgress,
  isWordCaught,
  getWordKey,
  getStatusLabel,
  getWordDisplayStatus,
};
