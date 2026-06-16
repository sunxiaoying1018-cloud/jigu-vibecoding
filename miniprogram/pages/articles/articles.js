const storage = require("../../utils/storage");
const dataLoader = require("../../data/loader.js");

function formatArticleTags(article) {
  const topic = article.topic || "";
  const parts = topic.split("·").map((s) => s.trim());
  const topicTag = parts.length >= 2 ? `${parts[0]} ${parts[1]}` : topic;
  const level = article.level || "";
  const levelTag = level.replace(/IELTS\s*[\d.]+\s*/i, "IELTS ").trim();
  return { ...article, topicTag, levelTag };
}

function getArticleStatus(articleId) {
  const readArticles = wx.getStorageSync("readArticles") || {};
  if (readArticles[String(articleId)]) {
    return { statusLabel: "已阅读", statusType: "read" };
  }
  const marks = storage.getArticleWordMarkMap(articleId);
  if (marks && Object.keys(marks).length > 0) {
    return { statusLabel: "未阅读", statusType: "started" };
  }
  return { statusLabel: "未学习", statusType: "new" };
}

Page({
  data: {
    statusBarHeight: 20,
    navTotalHeight: 88,
    articles: [],
  },

  onLoad() {
    const sys = wx.getSystemInfoSync();
    const statusBarHeight = sys.statusBarHeight || 20;
    this.setData({
      statusBarHeight,
      navTotalHeight: statusBarHeight + 44,
    });
    this.loadArticles();
  },

  onShow() {
    this.loadArticles();
  },

  loadArticles() {
    const app = getApp();
    let articles = app.globalData.articles || [];
    if (!articles.length) {
      articles = dataLoader.loadArticles();
      app.globalData.articles = articles;
    }

    const formatted = articles.map((article) => {
      const tags = formatArticleTags(article);
      const status = getArticleStatus(article.id);
      return { ...tags, ...status };
    });

    this.setData({ articles: formatted });
  },

  onBack() {
    wx.navigateBack();
  },

  goRead(e) {
    const rawId = e && e.currentTarget.dataset.id;
    const id = rawId != null ? parseInt(rawId, 10) : null;
    if (!id) return;
    wx.navigateTo({ url: `/pages/read/read?id=${id}` });
  },
});
