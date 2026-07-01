const storage = require("../../utils/storage");
const stage = require("../../utils/stage");
const pronunciation = require("../../utils/pronunciation");
const { updateTabBarSelected } = require("../../utils/tabBar");

Page({
  data: {
    statusBarHeight: 20,
    navTotalHeight: 88,
    progress: {},
    currentStage: null,
    pronunciationAccent: "us",
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
    updateTabBarSelected(this, 1);
    this.setData({
      progress: storage.getProgress(),
      currentStage: stage.getCurrentStage(),
      pronunciationAccent: pronunciation.getPronunciationAccent(),
    });
  },

  goStageSwitch() {
    const current = stage.getCurrentStageKey();
    wx.navigateTo({
      url: `/pages/stage/stage?from=mine&key=${current}`,
    });
  },

  selectPronunciationAccent(e) {
    const accent = e.currentTarget.dataset.accent;
    pronunciation.setPronunciationAccent(accent);
    this.setData({
      pronunciationAccent: pronunciation.getPronunciationAccent(),
    });
  },

  clearData() {
    const currentStage = stage.getCurrentStage();
    wx.showModal({
      title: "确认清空",
      content: `将清空${currentStage ? currentStage.name : "当前阶段"}的生词、阅读和复习数据，此操作不可恢复`,
      success(res) {
        if (res.confirm) {
          [
            "caughtWords",
            "userProgress",
            "readArticles",
            "savedSentences",
            "articleWordMarks",
            "articleWordMarkIndices",
            "articleWordMarksMigrated",
            "reviewNoticeCount",
          ].forEach((key) => wx.removeStorageSync(storage.getScopedStorageKey(key)));
          wx.showToast({ title: "已清空", icon: "success" });
          setTimeout(() => {
            wx.switchTab({ url: "/pages/index/index" });
          }, 800);
        }
      },
    });
  },
});
