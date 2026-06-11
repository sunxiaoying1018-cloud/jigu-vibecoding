const storage = require("../../utils/storage");
const wordUtil = require("../../utils/word");
const markUtil = require("../../utils/mark");
const dataLoader = require("../../data/loader.js");

Page({
  data: {
    article: null,
    paragraphs: [],
    caughtKeys: {},
    markedSpanKeys: {},
    spanTokenKeys: {},
    selection: null,
    handleLeft: null,
    handleRight: null,
    sessionCount: 0,
    markCount: 0,
    draggingHandle: false,
  },

  onLoad(options) {
    const app = getApp();
    const articles = app.globalData.articles.length
      ? app.globalData.articles
      : dataLoader.loadArticles();
    const vocab = app.globalData.vocab && Object.keys(app.globalData.vocab).length
      ? app.globalData.vocab
      : dataLoader.loadVocab();

    const id = parseInt(options.id, 10) || 1;
    const article = articles.find((a) => a.id === id) || articles[0];

    if (!article) {
      wx.showModal({
        title: "文章未找到",
        content: "请返回首页，或重新编译项目后再试",
        showCancel: false,
        success() {
          wx.navigateBack();
        },
      });
      return;
    }

    wx.setNavigationBarTitle({
      title: article.topic.split("·")[0].trim(),
    });

    const paragraphs = wordUtil.tokenizeParagraphs(article.text);
    this.wordCount = wordUtil.getWordCount(paragraphs);

    const caughtWords = storage.getCaughtWords();
    const caughtKeys = {};
    caughtWords.forEach((w) => {
      caughtKeys[w.key] = true;
    });

    let markedSpanKeys = {};
    let markCount = 0;
    try {
      markedSpanKeys = markUtil.getMarkedSpanKeys(article.id, paragraphs);
      markCount = markUtil.getMarksForArticle(article.id).length;
    } catch (err) {
      console.error("load marks failed", err);
    }

    this.vocab = vocab;
    this.article = article;
    this._handleDrag = null;
    this._ignoreHandleUntil = 0;
    this._wordRects = null;
    this._dragRange = null;

    this.setData({
      article,
      paragraphs,
      caughtKeys,
      markedSpanKeys,
      sessionCount: 0,
      markCount,
    });
  },

  onReady() {
    wx.nextTick(() => this.cacheWordRects());
  },

  applySelection(startIndex, endIndex, menuType, savedKey, dragging) {
    const range = wordUtil.normalizeWordRange(startIndex, endIndex);
    const { selection } = this.data;

    if (
      !dragging &&
      selection &&
      selection.startIndex === range.startIndex &&
      selection.endIndex === range.endIndex &&
      selection.menuType === menuType
    ) {
      return;
    }

    if (
      dragging &&
      this._dragRange &&
      this._dragRange.startIndex === range.startIndex &&
      this._dragRange.endIndex === range.endIndex
    ) {
      return;
    }

    if (dragging) {
      this._dragRange = {
        startIndex: range.startIndex,
        endIndex: range.endIndex,
      };
    } else {
      this._dragRange = null;
    }

    const spanTokenKeys = wordUtil.buildSpanTokenKeys(
      this.data.paragraphs,
      range.startIndex,
      range.endIndex
    );

    const payload = {
      selection: {
        startIndex: range.startIndex,
        endIndex: range.endIndex,
        menuType,
        savedKey: savedKey || "",
        menuTop: selection ? selection.menuTop : 0,
        menuLeft: selection ? selection.menuLeft : 0,
      },
      spanTokenKeys,
    };

    if (dragging && this._wordRects) {
      const startRect = this._wordRects.find(
        (w) => w.wordIndex === range.startIndex
      );
      const endRect = this._wordRects.find(
        (w) => w.wordIndex === range.endIndex
      );
      if (startRect && endRect) {
        payload.handleLeft = {
          top: startRect.bottom - 2,
          left: startRect.left,
        };
        payload.handleRight = {
          top: endRect.bottom - 2,
          left: endRect.right,
        };
      }
    }

    this.setData(payload, () => {
      if (dragging) return;
      this.updateOverlayPositions();
      this.cacheWordRects();
    });
  },

  cacheWordRects(done) {
    const indices = [];
    const query = wx.createSelectorQuery().in(this);

    (this.data.paragraphs || []).forEach((para) => {
      (para.tokens || []).forEach((token) => {
        if (token.type === "word") {
          indices.push(token.wordIndex);
          query.select(`#w-${token.wordIndex}`).boundingClientRect();
        }
      });
    });

    if (!indices.length) {
      if (typeof done === "function") done();
      return;
    }

    query.exec((rects) => {
      this._wordRects = indices
        .map((wordIndex, i) => {
          const rect = rects[i];
          if (!rect || !rect.width) return null;
          return {
            wordIndex,
            left: rect.left,
            right: rect.right,
            top: rect.top,
            bottom: rect.top + rect.height,
          };
        })
        .filter(Boolean);

      if (typeof done === "function") done();
    });
  },

  wordIndexFromTouch(x, y, dir, range) {
    if (!this._wordRects || !range) return null;

    const { startIndex, endIndex } = range;
    let candidates = this._wordRects;

    if (dir === "left") {
      candidates = candidates.filter((w) => w.wordIndex <= endIndex);
    } else {
      candidates = candidates.filter((w) => w.wordIndex >= startIndex);
    }

    if (!candidates.length) return null;

    const pad = 10;
    for (let i = 0; i < candidates.length; i += 1) {
      const w = candidates[i];
      if (
        x >= w.left - pad &&
        x <= w.right + pad &&
        y >= w.top - pad &&
        y <= w.bottom + pad
      ) {
        return w.wordIndex;
      }
    }

    let best = candidates[0].wordIndex;
    let bestScore = Infinity;

    candidates.forEach((w) => {
      const cx = Math.max(w.left, Math.min(x, w.right));
      const cy = Math.max(w.top, Math.min(y, w.bottom));
      const dx = x - cx;
      const dy = y - cy;
      const score = dx * dx + dy * dy * 5;
      if (score < bestScore) {
        bestScore = score;
        best = w.wordIndex;
      }
    });

    return best;
  },

  updateOverlayPositions() {
    this.updateHandlePositions();
    if (this.data.selection) {
      this.updateMenuPosition(
        this.data.selection.startIndex,
        this.data.selection.endIndex
      );
    }
  },

  updateHandlePositions() {
    const { selection } = this.data;
    if (!selection || selection.menuType !== "mark") {
      this.setData({ handleLeft: null, handleRight: null });
      return;
    }

    const { startIndex, endIndex } = selection;
    wx.createSelectorQuery()
      .in(this)
      .select(`#w-${startIndex}`)
      .boundingClientRect()
      .select(`#w-${endIndex}`)
      .boundingClientRect()
      .exec((res) => {
        if (!res[0] || !res[1] || !this.data.selection) return;

        this.setData({
          handleLeft: {
            top: res[0].top + res[0].height - 2,
            left: res[0].left,
          },
          handleRight: {
            top: res[1].top + res[1].height - 2,
            left: res[1].right,
          },
        });
      });
  },

  updateMenuPosition(startIndex, endIndex) {
    wx.createSelectorQuery()
      .in(this)
      .select(`#w-${startIndex}`)
      .boundingClientRect()
      .select(`#w-${endIndex}`)
      .boundingClientRect()
      .exec((res) => {
        if (!res[0] || !res[1] || !this.data.selection) return;

        const top = Math.min(res[0].top, res[1].top) - 56;
        const left = (res[0].left + res[1].right) / 2;

        this.setData({
          selection: {
            ...this.data.selection,
            menuTop: Math.max(12, top),
            menuLeft: left,
          },
        });
      });
  },

  clearSelection() {
    this._dragRange = null;
    this.setData({
      selection: null,
      spanTokenKeys: {},
      handleLeft: null,
      handleRight: null,
    });
  },

  onPageTap() {
    if (this.data.selection) {
      this.clearSelection();
    }
  },

  onMenuTap() {},

  getInitialRange(wordIndex) {
    const max = this.wordCount - 1;
    let start = wordIndex;
    let end = Math.min(wordIndex + 1, max);
    if (end <= start && start > 0) {
      start = wordIndex - 1;
      end = wordIndex;
    }
    return { start, end };
  },

  onWordLongPress(e) {
    const wordIndex = parseInt(e.currentTarget.dataset.index, 10);
    if (Number.isNaN(wordIndex)) return;

    wx.vibrateShort({ type: "light" });

    const existing = markUtil.findMarkAt(this.article.id, wordIndex);
    if (existing) {
      this.applySelection(
        existing.startIndex,
        existing.endIndex,
        "cancel",
        existing.key
      );
      return;
    }

    const range = this.getInitialRange(wordIndex);
    this._ignoreHandleUntil = Date.now() + 200;
    this.applySelection(range.start, range.end, "mark");
  },

  onHandleStart(e) {
    if (Date.now() < this._ignoreHandleUntil) return;

    const touch = e.touches[0];
    const { startIndex, endIndex, menuType, savedKey } = this.data.selection;
    this._handleDrag = {
      dir: e.currentTarget.dataset.dir,
      menuType,
      savedKey,
    };
    this._dragRange = { startIndex, endIndex };
    this.setData({ draggingHandle: true });

    this.cacheWordRects(() => {
      this.dragToTouch(touch.clientX, touch.clientY);
    });
  },

  dragToTouch(x, y) {
    if (!this._handleDrag || !this._dragRange) return;

    const { dir, menuType, savedKey } = this._handleDrag;
    const { startIndex, endIndex } = this._dragRange;
    const target = this.wordIndexFromTouch(x, y, dir, this._dragRange);

    if (target === null) return;

    if (dir === "left" && target !== startIndex) {
      this.applySelection(target, endIndex, menuType, savedKey, true);
    } else if (dir === "right" && target !== endIndex) {
      this.applySelection(startIndex, target, menuType, savedKey, true);
    }
  },

  onHandleMove(e) {
    if (!this._handleDrag || !this.data.selection) return;
    const touch = e.touches[0];
    this.dragToTouch(touch.clientX, touch.clientY);
  },

  onHandleEnd() {
    this._handleDrag = null;
    this._dragRange = null;
    this._ignoreHandleUntil = Date.now() + 100;
    this.setData({ draggingHandle: false });
    if (this.data.selection) {
      this.updateOverlayPositions();
      this.cacheWordRects();
    }
  },

  onMarkLine() {
    const { startIndex, endIndex } = this.data.selection;
    const result = markUtil.saveMarkRange(
      this.article,
      this.data.paragraphs,
      startIndex,
      endIndex
    );

    if (result) {
      this.setData({
        markedSpanKeys: result.markedSpanKeys,
        markCount: result.count,
      });
      wx.showToast({ title: "已划线", icon: "none" });
    }

    this.clearSelection();
  },

  onCancelLine() {
    const { savedKey, startIndex } = this.data.selection;
    const mark =
      markUtil.getMarks().find((item) => item.key === savedKey) ||
      markUtil.findMarkAt(this.article.id, startIndex);

    if (mark) {
      markUtil.removeMark(mark.key);
      this.setData({
        markedSpanKeys: markUtil.getMarkedSpanKeys(
          this.article.id,
          this.data.paragraphs
        ),
        markCount: markUtil.getMarksForArticle(this.article.id).length,
      });
      wx.showToast({ title: "已取消划线", icon: "none" });
    }

    this.clearSelection();
  },

  onWordTap(e) {
    const { key, text, index } = e.currentTarget.dataset;
    const wordIndex = parseInt(index, 10);
    if (!key || Number.isNaN(wordIndex)) return;

    if (markUtil.findMarkAt(this.article.id, wordIndex)) {
      const mark = markUtil.findMarkAt(this.article.id, wordIndex);
      this.applySelection(mark.startIndex, mark.endIndex, "cancel", mark.key);
      return;
    }

    if (this.data.selection) {
      this.clearSelection();
      return;
    }

    const vocabEntry = wordUtil.lookupVocab(this.vocab, key);
    const context = wordUtil.findContextForWord(this.data.paragraphs, key);

    if (this.data.caughtKeys[key]) {
      storage.unCatchWord(key);
      const caughtKeys = { ...this.data.caughtKeys };
      delete caughtKeys[key];
      this.setData({
        caughtKeys,
        sessionCount: Math.max(0, this.data.sessionCount - 1),
      });
      return;
    }

    const info = vocabEntry || {
      word: text,
      pos: "",
      meaning: "暂无释义，建议查词典",
      example: context,
    };

    storage.catchWord(info, this.article, context);
    this.setData({
      caughtKeys: { ...this.data.caughtKeys, [key]: true },
      sessionCount: this.data.sessionCount + 1,
    });
  },

  finishReading() {
    storage.markArticleRead(this.article.id);
    wx.redirectTo({
      url: `/pages/finish/finish?count=${this.data.sessionCount}&sentenceCount=${this.data.markCount}&articleId=${this.article.id}`,
    });
  },
});
