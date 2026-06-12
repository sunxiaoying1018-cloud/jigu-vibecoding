const storage = require("../../utils/storage");
const markUtil = require("../../utils/mark");
const wordUtil = require("../../utils/word");
const dataLoader = require("../../data/loader.js");
const { updateTabBarSelected } = require("../../utils/tabBar");

Page({
  data: {
    words: [],
    marks: [],
    emptyText: "还没有抓到鱼，去读今天的文章吧",
  },

  onShow() {
    updateTabBarSelected(this, 1);
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

      const displayStatus = storage.getWordDisplayStatus(w);
      lemmaMap[lemmaKey] = {
        key: lemmaKey,
        word: entry.word,
        meaning: entry.meaning || w.meaning || "暂无释义",
        revealed: !!revealed[lemmaKey],
        articleId: w.articleId || 0,
        sourceKey: w.key,
        status: displayStatus.status,
        statusLabel: displayStatus.statusLabel,
      };
    });

    const words = Object.values(lemmaMap);
    const marks = markUtil.getMarks();

    this.setData({
      words,
      marks,
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

  onGoSource(e) {
    const { articleId, sourceKey } = e.currentTarget.dataset;
    if (!articleId) return;
    wx.navigateTo({
      url: `/pages/read/read?id=${articleId}&focus=${encodeURIComponent(sourceKey || "")}`,
    });
  },

  goRead() {
    wx.switchTab({ url: "/pages/index/index" });
  },
});
