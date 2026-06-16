Component({
  data: {
    selected: 0,
    safeBottom: 0,
    list: [
      {
        pagePath: "/pages/index/index",
        text: "首页",
        iconPath: "/assets/tab/home.png",
        selectedIconPath: "/assets/tab/home-active.png",
      },
      {
        pagePath: "/pages/tank/tank",
        text: "鱼缸",
        iconPath: "/assets/ui/tab/tank.png",
        selectedIconPath: "/assets/ui/tab/tank-active.png",
      },
      {
        pagePath: "/pages/mine/mine",
        text: "我的",
        iconPath: "/assets/ui/tab/mine.png",
        selectedIconPath: "/assets/ui/tab/mine-active.png",
      },
    ],
  },

  lifetimes: {
    attached() {
      const sys = wx.getSystemInfoSync();
      const safeBottom = Math.max(
        (sys.screenHeight || 0) - (sys.safeArea && sys.safeArea.bottom
          ? sys.safeArea.bottom
          : sys.screenHeight || 0),
        0
      );
      this.setData({ safeBottom });
    },
  },

  methods: {
    switchTab(e) {
      const { path, index } = e.currentTarget.dataset;
      if (this.data.selected === index) return;
      wx.switchTab({ url: path });
    },
  },
});
