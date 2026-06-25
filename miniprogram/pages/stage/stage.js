const stage = require("../../utils/stage");
const storage = require("../../utils/storage");

Page({
  data: {
    stages: [],
    selectedKey: "",
    fromSwitch: false,
  },

  onLoad(options) {
    const currentKey = stage.getCurrentStageKey();
    this.setData({
      stages: stage.getStages(),
      selectedKey: options.key || currentKey || "",
      fromSwitch: options.from === "mine",
    });
  },

  selectStage(e) {
    const { key } = e.currentTarget.dataset;
    if (!key) return;
    this.setData({ selectedKey: key });
  },

  confirmStage() {
    const selected = stage.getStageByKey(this.data.selectedKey);
    if (!selected) return;

    const applyStage = () => {
      stage.setCurrentStage(selected.key);
      storage.migrateLegacyDataToCurrentStage();
      wx.showToast({ title: `已选择${selected.name}`, icon: "none" });
      setTimeout(() => {
        wx.reLaunch({ url: "/pages/index/index" });
      }, 300);
    };

    if (!this.data.fromSwitch || !stage.hasSelectedStage()) {
      applyStage();
      return;
    }

    wx.showModal({
      title: `切换到${selected.name}`,
      content: `切换后首页、文章、生词本和复习内容都会切换到${selected.name}。原阶段的学习记录会保留。`,
      confirmText: "确认切换",
      cancelText: "取消",
      success: (res) => {
        if (res.confirm) applyStage();
      },
    });
  },
});
