const storage = require("../../utils/storage");
const wordUtil = require("../../utils/word");
const pronunciation = require("../../utils/pronunciation");
const dataLoader = require("../../data/loader.js");
const stage = require("../../utils/stage");

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
    emptyText: "这里还没有生词。去读一篇文章，点击不认识的词标记进生词本吧",
    playingKey: "",
  },

  onLoad() {
    const sys = wx.getSystemInfoSync();
    const statusBarHeight = sys.statusBarHeight || 20;
    this.setData({
      statusBarHeight,
      navTotalHeight: statusBarHeight + 44,
    });
    this.audioContext = wx.createInnerAudioContext();
    this.audioContext.obeyMuteSwitch = false;
    this.audioContext.onPlay(() => {
      this.clearPronunciationTimer();
    });
    this.audioContext.onEnded(() => {
      this.clearPronunciationState();
    });
    this.audioContext.onStop(() => {
      this.clearPronunciationTimer();
    });
    this.audioContext.onError((err) => {
      if (this.playNextPronunciationUrl()) return;
      console.warn("tank pronunciation play failed", err);
      this.clearPronunciationState();
      wx.showToast({
        title: "发音播放失败",
        icon: "none",
      });
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
        audioWord: entry.word || w.word || w.key,
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

  playWord(e) {
    const { key } = e.currentTarget.dataset;
    const word = this.data.words.find((item) => item.key === key);
    if (!word || !this.audioContext) return;

    const urls = pronunciation.getPronunciationUrls(word.audioWord, word.word, word.key);
    if (!urls.length) return;

    this.audioContext.stop();
    this.setData({ playingKey: key });
    this.pronunciationUrls = urls;
    this.pronunciationUrlIndex = 0;
    this.audioContext.src = urls[0];
    this.audioContext.play();
    this.schedulePronunciationFallback(0);
  },

  playNextPronunciationUrl() {
    if (!this.audioContext || !this.pronunciationUrls) return false;
    const nextIndex = this.pronunciationUrlIndex + 1;
    if (nextIndex >= this.pronunciationUrls.length) return false;

    this.pronunciationUrlIndex = nextIndex;
    this.audioContext.src = this.pronunciationUrls[nextIndex];
    this.audioContext.play();
    this.schedulePronunciationFallback(nextIndex);
    return true;
  },

  schedulePronunciationFallback(index) {
    this.clearPronunciationTimer();
    this.pronunciationTimer = setTimeout(() => {
      if (
        this.data.playingKey &&
        this.pronunciationUrlIndex === index &&
        this.playNextPronunciationUrl()
      ) {
        return;
      }
      this.clearPronunciationTimer();
    }, 1200);
  },

  clearPronunciationTimer() {
    if (this.pronunciationTimer) {
      clearTimeout(this.pronunciationTimer);
      this.pronunciationTimer = null;
    }
  },

  clearPronunciationState() {
    this.clearPronunciationTimer();
    this.pronunciationUrls = null;
    this.pronunciationUrlIndex = 0;
    this.setData({ playingKey: "" });
  },

  onNavBack() {
    wx.navigateBack({ delta: 1 });
  },

  goRead() {
    const app = getApp();
    let articles = app.globalData.articles && app.globalData.articles.length
      ? app.globalData.articles
      : dataLoader.loadArticles();
    articles = stage.filterArticlesByCurrentStage(articles);
    const article = storage.getTodayArticle(articles);
    if (!article) {
      wx.switchTab({ url: "/pages/index/index" });
      return;
    }
    wx.navigateTo({ url: `/pages/read/read?id=${article.id}` });
  },

  onUnload() {
    this.clearPronunciationTimer();
    if (this.audioContext) {
      this.audioContext.destroy();
      this.audioContext = null;
    }
  },
});
