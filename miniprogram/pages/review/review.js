const storage = require("../../utils/storage");
const wordUtil = require("../../utils/word");

Page({
  data: {
    dueWords: [],
    current: null,
    options: [],
    selected: "",
    feedback: "",
    finished: false,
    correctCount: 0,
    totalCount: 0,
    index: 0,
  },

  onShow() {
    const app = getApp();
    this.vocab =
      app.globalData.vocab && Object.keys(app.globalData.vocab).length
        ? app.globalData.vocab
        : require("../../data/loader.js").loadVocab();
    this.startSession();
  },

  startSession() {
    const dueWords = storage.getDueWords();
    if (dueWords.length === 0) {
      this.setData({
        dueWords: [],
        current: null,
        finished: true,
        feedback: "",
      });
      return;
    }

    this.setData({
      dueWords,
      index: 0,
      correctCount: 0,
      totalCount: dueWords.length,
      finished: false,
    });
    this.showQuestion(dueWords[0]);
  },

  showQuestion(word) {
    const options = wordUtil.buildQuizOptions(word.meaning, this.vocab, 4);
    this.setData({
      current: word,
      options,
      selected: "",
      feedback: "",
    });
  },

  onSelect(e) {
    if (this.data.feedback) return;

    const selected = e.currentTarget.dataset.meaning;
    const isCorrect = selected === this.data.current.meaning;

    storage.reviewWord(this.data.current.key, isCorrect);

    this.setData({
      selected,
      feedback: isCorrect
        ? "记牢了！卷卷吃掉了这条鱼 🐱"
        : "溜走了，明天还在缸里",
      correctCount: this.data.correctCount + (isCorrect ? 1 : 0),
    });
  },

  nextQuestion() {
    const nextIndex = this.data.index + 1;
    if (nextIndex >= this.data.dueWords.length) {
      this.setData({ finished: true, current: null });
      return;
    }
    this.setData({ index: nextIndex });
    this.showQuestion(this.data.dueWords[nextIndex]);
  },

  goHome() {
    wx.switchTab({ url: "/pages/index/index" });
  },
});
