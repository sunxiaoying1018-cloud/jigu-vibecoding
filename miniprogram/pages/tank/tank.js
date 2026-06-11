const storage = require("../../utils/storage");
const markUtil = require("../../utils/mark");

Page({
  data: {
    words: [],
    marks: [],
    emptyText: "还没有抓到鱼，去读今天的文章吧",
  },

  onShow() {
    const words = storage.getCaughtWords().map((w) => ({
      ...w,
      statusLabel: storage.getStatusLabel(w.status),
    }));
    const marks = markUtil.getMarks();
    this.setData({ words, marks });
  },

  goRead() {
    wx.switchTab({ url: "/pages/index/index" });
  },
});
