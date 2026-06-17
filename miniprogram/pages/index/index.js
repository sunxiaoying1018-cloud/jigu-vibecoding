const storage = require("../../utils/storage");
const dataLoader = require("../../data/loader.js");
const { updateTabBarSelected } = require("../../utils/tabBar");

function formatArticleTags(article) {
  const topic = article.topic || "";
  const parts = topic.split("·").map((s) => s.trim());
  const topicTag = parts.length >= 2 ? `${parts[0]} ${parts[1]}` : topic;
  const level = article.level || "";
  const levelTag = level.replace(/IELTS\s*[\d.]+\s*/i, "IELTS ").trim();
  return { ...article, topicTag, levelTag };
}

function getMarkedWordCount() {
  const stored = wx.getStorageSync("articleWordMarks") || {};
  let count = 0;
  Object.values(stored).forEach((marks) => {
    if (marks && typeof marks === "object") {
      count += Object.keys(marks).length;
    }
  });
  return count;
}

function getReadArticleCount() {
  const readArticles = wx.getStorageSync("readArticles") || {};
  return Object.keys(readArticles).length;
}

Page({
  data: {
    statusBarHeight: 20,
    navTotalHeight: 88,
    mascotTop: 155,
    bodyPaddingTop: 8,
    dueCount: 0,
    markedCount: 0,
    readCount: 0,
    totalCaught: 0,
    totalArticles: 0,
    todayArticle: null,
    allArticles: [],
    loadError: "",
    showReviewCard: false,
    mascotSrc: "/assets/ui/mascot.gif",
  },

  onLoad() {
    const sys = wx.getSystemInfoSync();
    const statusBarHeight = sys.statusBarHeight || 20;
    const scale = sys.windowWidth / 375;
    this.setData({
      statusBarHeight,
      navTotalHeight: statusBarHeight + 44,
      mascotTop: Math.round(155 * scale),
      bodyPaddingTop: Math.max(0, Math.round(96 * scale) - (statusBarHeight + 44)),
    });
  },

  onMascotError() {
    if (this.data.mascotSrc.endsWith("mascot.gif")) {
      this.setData({ mascotSrc: "/assets/ui/mascot-static.png" });
    }
  },

  onShow() {
    updateTabBarSelected(this, 0);
    this.loadData();
  },

  loadData() {
    const app = getApp();
    let articles = app.globalData.articles || [];

    if (!articles.length) {
      articles = dataLoader.loadArticles();
      app.globalData.articles = articles;
    }

    const caughtWords = storage.getCaughtWords();
    const dueCount = storage.getDueWords().length;
    const todayArticle = storage.getTodayArticle(articles);
    const markedCount = getMarkedWordCount();
    const readCount = getReadArticleCount();
    const totalCaught = caughtWords.length;
    const showReviewCard = dueCount > 0;

    let loadError = "";
    if (!articles.length) {
      loadError = "文章加载失败，请点击「编译」重试";
    }

    const formatted = articles.map(formatArticleTags);
    const today = todayArticle ? formatArticleTags(todayArticle) : null;

    this.setData({
      dueCount,
      markedCount,
      readCount,
      totalCaught,
      totalArticles: articles.length,
      todayArticle: today,
      allArticles: formatted,
      loadError,
      showReviewCard,
    });
  },

  goReadToday() {
    if (!this.data.todayArticle) return;
    wx.navigateTo({
      url: `/pages/read/read?id=${this.data.todayArticle.id}`,
    });
  },

  goReview() {
    wx.navigateTo({ url: "/pages/review/review" });
  },

  goTank() {
    wx.navigateTo({ url: "/pages/tank/tank" });
  },

  goArticles() {
    wx.navigateTo({ url: "/pages/articles/articles" });
  },
});
