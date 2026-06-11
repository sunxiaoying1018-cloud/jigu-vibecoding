const STORAGE_KEY = "caughtWords";
const PROGRESS_KEY = "userProgress";

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
  return word.toLowerCase().replace(/[^a-z'-]/g, "");
}

function findWordRecord(words, wordKey) {
  return words.find((w) => w.key === wordKey);
}

function catchWord(wordInfo, article, sentence) {
  const words = getCaughtWords();
  const key = getWordKey(wordInfo.word || wordInfo);
  const existing = findWordRecord(words, key);

  if (existing) {
    return { action: "exists", word: existing };
  }

  const entry = {
    key,
    word: wordInfo.word || wordInfo,
    pos: wordInfo.pos || "",
    meaning: wordInfo.meaning || "暂无释义",
    example: wordInfo.example || sentence || "",
    sentence: sentence || wordInfo.example || "",
    articleId: article.id,
    articleTitle: article.title,
    topic: article.topic,
    caughtAt: todayStr(),
    reviewLevel: 0,
    nextReviewAt: addDays(todayStr(), 1),
    status: "pending",
    correctStreak: 0,
  };

  words.unshift(entry);
  saveCaughtWords(words);

  const progress = getProgress();
  progress.totalCaught = words.length;
  saveProgress(progress);

  return { action: "caught", word: entry };
}

function unCatchWord(wordKey) {
  const words = getCaughtWords().filter((w) => w.key !== wordKey);
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
  if (!readArticles[articleId]) {
    readArticles[articleId] = today;
    progress.currentDay = Math.min((progress.currentDay || 1) + 1, 10);
    wx.setStorageSync("readArticles", readArticles);
  }

  saveProgress(progress);
  return progress;
}

function getTodayArticle(articles) {
  const progress = getProgress();
  const dayIndex = Math.max(0, (progress.currentDay || 1) - 1);
  if (!articles || !articles.length) return null;
  return articles[dayIndex % articles.length];
}

function isWordCaught(wordKey) {
  return !!findWordRecord(getCaughtWords(), wordKey);
}

function getStatusLabel(status) {
  const map = {
    pending: "待吃",
    learning: "复习中",
    mastered: "已记牢",
  };
  return map[status] || "待吃";
}

module.exports = {
  todayStr,
  getCaughtWords,
  catchWord,
  unCatchWord,
  getDueWords,
  reviewWord,
  markArticleRead,
  getTodayArticle,
  getProgress,
  isWordCaught,
  getWordKey,
  getStatusLabel,
};
