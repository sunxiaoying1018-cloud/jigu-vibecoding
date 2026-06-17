const storage = require("../../utils/storage");
const { updateTabBarSelected } = require("../../utils/tabBar");

Page({
  data: {
    progress: {},
  },

  onShow() {
    updateTabBarSelected(this, 1);
    this.setData({ progress: storage.getProgress() });
  },

  clearData() {
    wx.showModal({
      title: "确认清空",
      content: "将清空词缸和学习进度，此操作不可恢复",
      success(res) {
        if (res.confirm) {
          wx.removeStorageSync("caughtWords");
          wx.removeStorageSync("userProgress");
          wx.removeStorageSync("readArticles");
          wx.removeStorageSync("savedSentences");
          wx.removeStorageSync("articleWordMarks");
          wx.removeStorageSync("articleWordMarkIndices");
          wx.removeStorageSync("articleWordMarksMigrated");
          wx.showToast({ title: "已清空", icon: "success" });
          setTimeout(() => {
            wx.switchTab({ url: "/pages/index/index" });
          }, 800);
        }
      },
    });
  },
});
