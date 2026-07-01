const storage = require("../../utils/storage");
const wordUtil = require("../../utils/word");
const pronunciation = require("../../utils/pronunciation");
const dataLoader = require("../../data/loader.js");
const stage = require("../../utils/stage");

const REPEAT_RULES = {
  forgot: { delays: [6, 12, 20] },
  vague: { delays: [10, 20] },
};

function formatPhonetic(phonetic) {
  const trimmed = String(phonetic || "").trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) return trimmed;
  return `[${trimmed}]`;
}

function buildMeaningLines(pos, meaning, meanings) {
  if (Array.isArray(meanings) && meanings.length) {
    return meanings
      .filter((item) => item && item.zh)
      .slice(0, 3)
      .map((item) => ({
        pos: item.pos || wordUtil.normalizePos(pos),
        text: item.zh,
      }));
  }

  const text = String(meaning || "暂无释义").trim() || "暂无释义";
  const posText = wordUtil.normalizePos(pos);
  return text
    .split(/[;；]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 3)
    .map((item) => ({
      pos: posText,
      text: item,
    }));
}

function getDetailLength(display) {
  const texts = [
    ...(display.synonyms || []),
    display.exampleSentence || "",
    display.exampleSentenceZh || "",
    ...(display.definitions || []).map((item) => item.en || ""),
  ];
  return texts.join("").length;
}

function getDetailLongHeightRpx(contentHeightRpx, bottomInsetRpx, meaningCount) {
  const quizTopPadding = 24;
  const wordBlockHeight = 78 + 8 + 44;
  const answerPanelMargin = 16;
  const meaningRowsHeight =
    meaningCount > 0 ? meaningCount * 42 + Math.max(0, meaningCount - 1) * 18 + 40 : 0;
  const detailTop =
    quizTopPadding + wordBlockHeight + answerPanelMargin + meaningRowsHeight;
  const buttonBlockHeight = 144 + 24 + 34;
  const buttonBottom = 46 + bottomInsetRpx;
  const fixedGapToButtons = 40;

  return Math.max(
    360,
    Math.floor(
      contentHeightRpx -
        detailTop -
        buttonBlockHeight -
        buttonBottom -
        fixedGapToButtons
    )
  );
}

function buildHighlightedText(text, wordKey) {
  const source = String(text || "");
  const key = wordUtil.normalizeWordKey(wordKey);
  if (!source || !key) return [{ text: source, highlight: false }];

  const parts = [];
  const regex = /([a-zA-Z]+(?:'[a-zA-Z]+)?)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(source)) !== null) {
    if (match.index > lastIndex) {
      parts.push({
        text: source.slice(lastIndex, match.index),
        highlight: false,
      });
    }
    const token = match[0];
    parts.push({
      text: token,
      highlight: wordUtil.keysAreRelated(wordUtil.normalizeWordKey(token), key),
    });
    lastIndex = match.index + token.length;
  }

  if (lastIndex < source.length) {
    parts.push({ text: source.slice(lastIndex), highlight: false });
  }

  return parts.length ? parts : [{ text: source, highlight: false }];
}

Page({
  data: {
    statusBarHeight: 20,
    navTotalHeight: 88,
    dueWords: [],
    current: null,
    answerVisible: false,
    finished: false,
    knownCount: 0,
    totalCount: 0,
    index: 0,
    repeatCounts: {},
    reviewContentHeightRpx: 724,
    bottomInsetRpx: 0,
    pronunciationPlaying: false,
  },

  onLoad() {
    const sys = wx.getSystemInfoSync();
    const statusBarHeight = sys.statusBarHeight || 20;
    const windowWidth = sys.windowWidth || 375;
    const toRpx = (px) => (px * 750) / windowWidth;
    const bottomInsetPx = sys.safeArea ? sys.windowHeight - sys.safeArea.bottom : 0;
    this.setData({
      statusBarHeight,
      navTotalHeight: statusBarHeight + 44,
      reviewContentHeightRpx: toRpx(sys.windowHeight - statusBarHeight - 44),
      bottomInsetRpx: toRpx(bottomInsetPx),
    });
    this.audioContext = wx.createInnerAudioContext();
    this.audioContext.obeyMuteSwitch = false;
    this.audioContext.onPlay(() => {
      this.clearPronunciationTimer();
    });
    this.audioContext.onEnded(() => {
      this.clearPronunciationState();
    });
    this.audioContext.onStop(() => {
      this.clearPronunciationTimer();
    });
    this.audioContext.onError((err) => {
      if (this.playNextPronunciationUrl()) return;
      console.warn("pronunciation play failed", err);
      this.clearPronunciationState();
      wx.showToast({
        title: "发音播放失败",
        icon: "none",
      });
    });
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
        answerVisible: false,
        totalCount: 0,
      });
      return;
    }

    this.setData({
      dueWords,
      index: 0,
      knownCount: 0,
      totalCount: dueWords.length,
      finished: false,
      answerVisible: false,
      repeatCounts: {},
    });
    this.showCard(dueWords[0]);
  },

  showCard(word) {
    const entry = wordUtil.resolveLemmaEntry(this.vocab, word.key);
    const display = {
      ...word,
      word: entry.word,
      audioWord: entry.word || word.word || word.key,
      posDisplay: wordUtil.normalizePos(entry.pos || word.pos),
      phoneticDisplay: formatPhonetic(entry.phonetic || word.phonetic),
      meaning: entry.meaning || word.meaning,
      meaningLines: buildMeaningLines(
        entry.pos || word.pos,
        entry.meaning || word.meaning,
        entry.meanings
      ),
      definitions: Array.isArray(entry.definitions)
        ? entry.definitions.slice(0, 2)
        : [],
      synonyms: Array.isArray(entry.synonyms)
        ? entry.synonyms.filter(Boolean).slice(0, 4)
        : [],
      antonyms: Array.isArray(entry.antonyms)
        ? entry.antonyms.filter(Boolean).slice(0, 4)
        : [],
      sentence: word.sentence || word.example || entry.example || "",
      example: entry.example || word.example || word.sentence || "",
    };
    display.synonymsText = display.synonyms.join(" / ");
    display.antonymsText = display.antonyms.join(" / ");
    if (entry.example && entry.exampleZh) {
      display.exampleSentence = entry.example;
      display.exampleSentenceZh = entry.exampleZh;
      display.exampleSentenceParts = buildHighlightedText(
        display.exampleSentence,
        word.key
      );
    }
    display.detailLong =
      getDetailLength(display) > 260 ||
      [
        display.synonyms.length,
        display.antonyms.length,
        display.exampleSentence ? 1 : 0,
        display.definitions.length,
      ].filter(Boolean).length > 3;
    display.detailLongHeightRpx = getDetailLongHeightRpx(
      this.data.reviewContentHeightRpx,
      this.data.bottomInsetRpx,
      display.meaningLines.length
    );
    this.setData({
      current: display,
      answerVisible: false,
    }, () => {
      this.playPronunciation();
    });
  },

  revealAnswer() {
    this.setData({ answerVisible: true });
  },

  playPronunciation() {
    const current = this.data.current;
    const urls = pronunciation.getPronunciationUrls(
      current && current.audioWord,
      current && current.word,
      current && current.key
    );
    if (!urls.length || !this.audioContext) return;

    this.audioContext.stop();
    this.setData({ pronunciationPlaying: true });

    this.pronunciationUrls = urls;
    this.pronunciationUrlIndex = 0;
    this.audioContext.src = urls[0];
    this.audioContext.play();
    this.schedulePronunciationFallback(0);
  },

  playNextPronunciationUrl() {
    if (!this.audioContext || !this.pronunciationUrls) return false;
    const nextIndex = this.pronunciationUrlIndex + 1;
    if (nextIndex >= this.pronunciationUrls.length) return false;

    this.pronunciationUrlIndex = nextIndex;
    this.audioContext.src = this.pronunciationUrls[nextIndex];
    this.audioContext.play();
    this.schedulePronunciationFallback(nextIndex);
    return true;
  },

  schedulePronunciationFallback(index) {
    this.clearPronunciationTimer();
    this.pronunciationTimer = setTimeout(() => {
      if (
        this.data.pronunciationPlaying &&
        this.pronunciationUrlIndex === index &&
        this.playNextPronunciationUrl()
      ) {
        return;
      }
      this.clearPronunciationTimer();
    }, 1200);
  },

  clearPronunciationTimer() {
    if (this.pronunciationTimer) {
      clearTimeout(this.pronunciationTimer);
      this.pronunciationTimer = null;
    }
  },

  clearPronunciationState() {
    this.clearPronunciationTimer();
    this.pronunciationUrls = null;
    this.pronunciationUrlIndex = 0;
    this.setData({ pronunciationPlaying: false });
  },

  onAssess(e) {
    if (!this.data.current || !this.data.answerVisible) return;

    const grade = e.currentTarget.dataset.grade;
    storage.reviewWord(this.data.current.key, grade);
    this.nextCard(grade);
  },

  nextCard(grade) {
    const isKnown = grade === "known";
    const current = this.data.current;
    const dueWords = [...this.data.dueWords];
    const repeatCounts = { ...this.data.repeatCounts };
    let nextIndex = this.data.index + 1;

    if (current && isKnown) {
      for (let i = dueWords.length - 1; i >= nextIndex; i -= 1) {
        if (wordUtil.keysAreRelated(dueWords[i].key, current.key)) {
          dueWords.splice(i, 1);
        }
      }
    } else if (current && REPEAT_RULES[grade]) {
      const key = current.key;
      const rule = REPEAT_RULES[grade];
      const repeatCount = (repeatCounts[key] || 0) + 1;
      repeatCounts[key] = repeatCount;

      if (repeatCount <= rule.delays.length) {
        const delay = rule.delays[repeatCount - 1];
        const insertAt = Math.min(nextIndex + delay, dueWords.length);
        dueWords.splice(insertAt, 0, current);
      }
    }

    if (nextIndex >= dueWords.length) {
      this.setData({
        finished: true,
        current: null,
        knownCount: this.data.knownCount + (isKnown ? 1 : 0),
        dueWords,
        totalCount: dueWords.length,
        repeatCounts,
      });
      return;
    }

    this.setData({
      index: nextIndex,
      knownCount: this.data.knownCount + (isKnown ? 1 : 0),
      dueWords,
      totalCount: dueWords.length,
      repeatCounts,
    });
    this.showCard(dueWords[nextIndex]);
  },

  goHome() {
    wx.switchTab({ url: "/pages/index/index" });
  },

  goReadToday() {
    const app = getApp();
    let articles = app.globalData.articles && app.globalData.articles.length
      ? app.globalData.articles
      : dataLoader.loadArticles();
    articles = stage.filterArticlesByCurrentStage(articles);
    const article = storage.getTodayArticle(articles);
    if (!article) {
      wx.switchTab({ url: "/pages/index/index" });
      return;
    }
    wx.navigateTo({ url: `/pages/read/read?id=${article.id}` });
  },

  onNavBack() {
    wx.navigateBack({ delta: 1 });
  },

  acknowledgeReviewNotice() {
    storage.acknowledgeReviewNotice(storage.getDueWords().length);
  },

  onHide() {
    this.acknowledgeReviewNotice();
  },

  onUnload() {
    this.acknowledgeReviewNotice();
    this.clearPronunciationTimer();
    if (this.audioContext) {
      this.audioContext.destroy();
      this.audioContext = null;
    }
  },
});
