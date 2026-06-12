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

Page({
  data: {
    statusBarHeight: 20,
    greetingTop: 95,
    mascotTop: 81,
    bodyTop: 136,
    dueCount: 0,
    todayArticle: null,
    todayCtaText: "去抓小鱼",
    listArticles: [],
    allArticles: [],
    progress: {},
    mascotLine: "今天的鱼群靠岸了，准备好了吗～",
    loadError: "",
    listScrollHeight: 300,
  },

  onLoad() {
    const sys = wx.getSystemInfoSync();
    const statusBarHeight = sys.statusBarHeight || 20;
    const scale = sys.windowWidth / 375;
    this._tabBarHeightPx = Math.round((104 / 750) * sys.windowWidth);
    this._safeBottomPx = sys.safeArea
      ? Math.max(sys.screenHeight - sys.safeArea.bottom, 0)
      : 0;
    this.setData({
      statusBarHeight,
      greetingTop: Math.round(95 * scale),
      mascotTop: Math.round(81 * scale),
      bodyTop: Math.round(136 * scale),
    });
  },

  onShow() {
    updateTabBarSelected(this, 0);
    this.loadData();
  },

  onReady() {
    this.updateListScrollHeight();
  },

  updateListScrollHeight() {
    const applyHeight = (height) => {
      const next = Math.floor(height);
      if (next > 0 && next !== this.data.listScrollHeight) {
        this.setData({ listScrollHeight: next });
      }
    };

    const run = () => {
      const query = wx.createSelectorQuery().in(this);
      query.select(".all-scroll-host").boundingClientRect();
      query.select(".all-label").boundingClientRect();
      query.exec((res) => {
        const hostRect = res && res[0];
        const labelRect = res && res[1];

        if (hostRect && hostRect.height > 0) {
          applyHeight(hostRect.height);
          return;
        }

        if (!labelRect) return;

        const sys = wx.getSystemInfoSync();
        const tabBarPx = this._tabBarHeightPx || 0;
        const safeBottom = this._safeBottomPx || 0;
        const bottomLimit = sys.windowHeight - tabBarPx - safeBottom;
        const height = bottomLimit - labelRect.bottom;
        if (height > 0) applyHeight(height);
      });
    };

    wx.nextTick(run);
    [50, 150, 300].forEach((delay) => setTimeout(run, delay));
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
    const todayCtaText = storage.getTodayArticleCtaText(articles);

    let mascotLine = "今天的鱼群靠岸了，准备好了吗～";
    if (dueCount > 0) {
      mascotLine = `缸里有 ${dueCount} 条鱼该吃了，先复习吧～`;
    }

    let loadError = "";
    if (!articles.length) {
      loadError = "文章加载失败，请点击「编译」重试";
    }

    const formatted = articles.map(formatArticleTags);
    const today = todayArticle
      ? formatArticleTags(todayArticle)
      : null;
    const listArticles = formatted.filter(
      (item) => !today || item.id !== today.id
    );

    this.setData(
      {
        dueCount,
        todayArticle: today,
        todayCtaText,
        listArticles,
        allArticles: formatted,
        progress,
        mascotLine,
        loadError,
      },
      () => this.updateListScrollHeight()
    );
  },

  goReadToday() {
    if (!this.data.todayArticle) return;
    wx.navigateTo({
      url: `/pages/read/read?id=${this.data.todayArticle.id}`,
    });
  },

  goRead(e) {
    const rawId = e && e.currentTarget.dataset.id;
    const id = rawId != null ? parseInt(rawId, 10) : null;
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
