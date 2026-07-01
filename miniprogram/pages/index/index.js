const storage = require("../../utils/storage");
const dataLoader = require("../../data/loader.js");
const { updateTabBarSelected } = require("../../utils/tabBar");
const stage = require("../../utils/stage");

function formatArticleTags(article) {
  const topic = article.topic || "";
  const parts = topic.split("·").map((s) => s.trim());
  const topicTag = parts.length >= 2 ? `${parts[0]} ${parts[1]}` : topic;
  const level = article.level || "";
  const levelTag = level.replace(/IELTS\s*[\d.]+\s*/i, "IELTS ").trim();
  const examPointTags = Array.isArray(article.examPoints)
    ? article.examPoints.slice(0, 2)
    : [];
  return { ...article, topicTag, levelTag, examPointTags };
}

function getReadArticleCount() {
  const readArticles = storage.getReadArticles();
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
    showReviewDot: false,
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
      bodyPaddingTop: Math.round(12 * scale),
    });
  },

  onMascotError() {
    if (this.data.mascotSrc.endsWith("mascot.gif")) {
      this.setData({ mascotSrc: "/assets/ui/mascot-static.png" });
    }
  },

  onShow() {
    updateTabBarSelected(this, 0);
    if (!stage.hasSelectedStage()) {
      wx.reLaunch({ url: "/pages/stage/stage" });
      return;
    }
    this.loadData();
  },

  loadData() {
    const app = getApp();
    let articles = app.globalData.articles || [];

    if (!articles.length) {
      articles = dataLoader.loadArticles();
      app.globalData.articles = articles;
    }

    articles = stage.filterArticlesByCurrentStage(articles);

    const caughtWords = storage.getCaughtWords();
    const dueCount = storage.getDueWords().length;
    const todayArticle = storage.getTodayArticle(articles);
    const markedCount = caughtWords.length;
    const readCount = getReadArticleCount();
    const totalCaught = caughtWords.length;
    const showReviewCard = true;
    const showReviewDot = dueCount > storage.getReviewNoticeCount();

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
      showReviewDot,
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
