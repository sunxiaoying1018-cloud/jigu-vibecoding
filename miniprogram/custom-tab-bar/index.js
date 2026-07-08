Component({
  data: {
    selected: 0,
    switching: false,
    list: [
      {
        pagePath: "/pages/index/index",
        text: "首页",
        iconPath: "/assets/tab/home.png",
        selectedIconPath: "/assets/tab/home-active.png",
      },
      {
        pagePath: "/pages/mine/mine",
        text: "我的",
        iconPath: "/assets/ui/tab/mine.png",
        selectedIconPath: "/assets/ui/tab/mine-active.png",
      },
    ],
  },

  pageLifetimes: {
    show() {
      this.syncSelectedWithRoute();
    },
  },

  methods: {
    syncSelectedWithRoute() {
      const pages = getCurrentPages();
      const current = pages[pages.length - 1];
      const route = current ? `/${current.route}` : "";
      const selected = this.data.list.findIndex((item) => item.pagePath === route);
      if (selected >= 0 && selected !== this.data.selected) {
        this.setData({ selected });
      }
    },

    switchTab(e) {
      const { path, index } = e.currentTarget.dataset;
      if (this.data.selected === index || this.switching) return;
      this.switching = true;
      this.setData({ selected: index, switching: true });
      wx.switchTab({
        url: path,
        complete: () => {
          setTimeout(() => {
            this.switching = false;
            this.setData({ switching: false });
            this.syncSelectedWithRoute();
          }, 300);
        },
      });
    },
  },
});
