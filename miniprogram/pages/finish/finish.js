const storage = require("../../utils/storage");

Page({
  data: {
    count: 0,
    progress: {},
  },

  onLoad(options) {
    const count = parseInt(options.count, 10) || 0;
    const progress = storage.getProgress();
    this.setData({ count, progress });
  },

  goReview() {
    wx.switchTab({ url: "/pages/review/review" });
  },

  goHome() {
    wx.switchTab({ url: "/pages/index/index" });
  },

  goTank() {
    wx.switchTab({ url: "/pages/tank/tank" });
  },
});
