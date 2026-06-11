const { articles, vocab } = require("./data/loader.js");

App({
  globalData: {
    articles,
    vocab,
  },

  onLaunch() {
    console.log("articles loaded:", this.globalData.articles.length);
  },
});
