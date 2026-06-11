const storage = require("../../utils/storage");
const dataLoader = require("../../data/loader.js");

Page({
  data: {
    subtitle: "读文章背单词",
    dueCount: 0,
    todayArticle: null,
    allArticles: [],
    progress: {},
    mascotLine: "今天的鱼群靠岸了，准备好了吗？",
    loadError: "",
  },

  onShow() {
    this.loadData();
  },

  loadData() {
    const app = getApp();
    let articles = app.globalData.articles || [];

    if (!articles.length) {
      articles = dataLoader.loadArticles();
      app.globalData.articles = articles;
    }

    const progress = storage.getProgress();
    const dueCount = storage.getDueWords().length;
    const todayArticle = storage.getTodayArticle(articles);

    let mascotLine = "今天的鱼群靠岸了，准备好了吗？";
    if (dueCount > 0) {
      mascotLine = `缸里有 ${dueCount} 条鱼该吃了，先复习吧。`;
    }

    let loadError = "";
    if (!articles.length) {
      loadError = "文章加载失败，请点击「编译」重试；若仍失败，查看控制台报错";
    }

    this.setData({
      dueCount,
      todayArticle,
      allArticles: articles,
      progress,
      mascotLine,
      loadError,
    });
  },

  goReview() {
    wx.switchTab({ url: "/pages/review/review" });
  },

  goRead(e) {
    const id = e && e.currentTarget.dataset.id;
    const article = id
      ? this.data.allArticles.find((a) => a.id === id)
      : this.data.todayArticle;

    if (!article) {
      wx.showToast({ title: "暂无文章", icon: "none" });
      return;
    }
    wx.navigateTo({
      url: `/pages/read/read?id=${article.id}`,
    });
  },
});
