function updateTabBarSelected(page, index) {
  if (typeof page.getTabBar === "function" && page.getTabBar()) {
    page.getTabBar().setData({ selected: index });
  }
}

module.exports = {
  updateTabBarSelected,
};
