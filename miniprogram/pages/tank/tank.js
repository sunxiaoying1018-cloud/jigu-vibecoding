const storage = require("../../utils/storage");
const wordUtil = require("../../utils/word");
const dataLoader = require("../../data/loader.js");

function formatPhonetic(phonetic) {
  if (!phonetic) return "";
  const trimmed = String(phonetic).trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) return trimmed;
  return `[${trimmed}]`;
}

function formatMeaningDisplay(pos, meaning) {
  const text = (meaning || "暂无释义").trim() || "暂无释义";
  const posStr = wordUtil.normalizePos(pos);
  if (!posStr) return text;

  const lowerText = text.toLowerCase();
  if (
    lowerText.startsWith(posStr.toLowerCase()) ||
    lowerText.startsWith(`${posStr.replace(/\.$/, "").toLowerCase()} `)
  ) {
    return text;
  }
  return `${posStr} ${text}`;
}

Page({
  data: {
    statusBarHeight: 20,
    navTotalHeight: 88,
    words: [],
    emptyText: "这个阶段还没有生词，去读文章标记一下吧",
  },

  onLoad() {
    const sys = wx.getSystemInfoSync();
    const statusBarHeight = sys.statusBarHeight || 20;
    this.setData({
      statusBarHeight,
      navTotalHeight: statusBarHeight + 44,
    });
  },

  onShow() {
    const app = getApp();
    const articles = app.globalData.articles.length
      ? app.globalData.articles
      : dataLoader.loadArticles();
    const vocab =
      app.globalData.vocab && Object.keys(app.globalData.vocab).length
        ? app.globalData.vocab
        : dataLoader.loadVocab();

    storage.syncCaughtWordsFromArticleMarks(articles);

    const revealed = this._revealed || {};
    const lemmaMap = {};

    storage.getCaughtWords().forEach((w) => {
      const entry = wordUtil.resolveLemmaEntry(vocab, w.key);
      const lemmaKey = entry.lemmaKey;
      if (lemmaMap[lemmaKey]) return;

      lemmaMap[lemmaKey] = {
        key: lemmaKey,
        word: entry.word,
        meaningDisplay: formatMeaningDisplay(
          entry.pos || w.pos,
          entry.meaning || w.meaning
        ),
        phoneticDisplay: formatPhonetic(entry.phonetic || w.phonetic),
        revealed: !!revealed[lemmaKey],
      };
    });

    this.setData({
      words: Object.values(lemmaMap),
    });
  },

  onToggleMeaning(e) {
    const { key } = e.currentTarget.dataset;
    if (!key) return;

    if (!this._revealed) this._revealed = {};
    const words = this.data.words.map((item) => {
      if (item.key !== key) return item;
      const revealed = !item.revealed;
      if (revealed) {
        this._revealed[key] = true;
      } else {
        delete this._revealed[key];
      }
      return { ...item, revealed };
    });

    this.setData({ words });
  },

  onNavBack() {
    wx.navigateBack({ delta: 1 });
  },

  goRead() {
    wx.switchTab({ url: "/pages/index/index" });
  },
});
