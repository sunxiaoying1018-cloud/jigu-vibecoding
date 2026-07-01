const HANDLE_WIDTH_RPX = 28;
const HANDLE_HEIGHT_RPX = 62;

function getHandleMetrics() {
  const windowWidth = wx.getSystemInfoSync().windowWidth || 375;
  const rpxToPx = (rpx) => (rpx / 750) * windowWidth;
  return {
    widthPx: Math.ceil(rpxToPx(HANDLE_WIDTH_RPX)),
    heightPx: Math.ceil(rpxToPx(HANDLE_HEIGHT_RPX)),
    rpxToPx,
  };
}

function buildHandlePositions(startRect, endRect) {
  const { rpxToPx } = getHandleMetrics();
  const edgeFix = rpxToPx(2);
  const leftStemBottomX = rpxToPx(20);
  const rightStemTopX = rpxToPx(4);

  return {
    handleLeft: {
      top: startRect.bottom - edgeFix,
      left: startRect.left - leftStemBottomX,
    },
    handleRight: {
      top: endRect.top - edgeFix,
      left: endRect.right - rightStemTopX,
    },
  };
}

const storage = require("../../utils/storage");
const wordUtil = require("../../utils/word");
const markUtil = require("../../utils/mark");
const { isSameArticle } = require("../../utils/article");
const dataLoader = require("../../data/loader.js");
const stage = require("../../utils/stage");

function formatArticleTags(article) {
  const topic = article.topic || "";
  const parts = topic.split("·").map((s) => s.trim());
  const topicTag = parts.length >= 2 ? `${parts[0]} ${parts[1]}` : topic;
  const level = article.level || "";
  const levelTag = level.replace(/IELTS\s*[\d.]+\s*/i, "IELTS ").trim();
  const examPointTags = Array.isArray(article.examPoints)
    ? article.examPoints.slice(0, 3)
    : [];
  return { ...article, topicTag, levelTag, examPointTags };
}

function articleHasReadBefore(articleId) {
  return storage.hasArticleRead(articleId);
}

function sentenceMatchesExamPoint(sentence, point) {
  const text = String(sentence || "").toLowerCase();
  const tag = String(point || "");
  if (!text || !tag) return false;

  if (tag.includes("原因状语")) return /\bbecause\b/.test(text);
  if (tag.includes("宾语从句")) return /\b(said|told|asked|learned|understood|knew|thought|hoped|noticed)\b/.test(text);
  if (tag.includes("情态动词")) return /\b(should|could|may|can|must)\b/.test(text);
  if (tag.includes("一般过去")) return /\b(was|were|visited|gave|told|saw|watched|bought|wrote|went|had|played|won|received|sent|cooked|smiled|felt)\b/.test(text);
  if (tag.includes("动词不定式")) return /\bto\s+[a-z]+/.test(text);
  if (tag.includes("There be")) return /\bthere\s+(is|are|was|were)\b/.test(text);
  if (tag.includes("动名词")) return /^[\s"']*[a-z]+ing\b/.test(text);
  if (tag.includes("比较级")) return /\b(faster|better|easier|more|less)\b/.test(text);
  if (tag.includes("as...as")) return /\bas\b.+\bas\b/.test(text);
  if (tag.includes("最高级")) return /\b(most|best|biggest|largest|smallest)\b/.test(text);
  if (tag.includes("时间状语")) return /\b(when|before|after|while)\b/.test(text);
  if (tag.includes("条件状语")) return /\bif\b/.test(text);
  if (tag.includes("定语")) return /\b(who|which|that|where|named)\b/.test(text);
  if (tag.includes("感官动词")) return /\b(see|saw|watch|watched|hear|heard|feel|felt)\b/.test(text);
  if (tag.includes("spend doing")) return /\bspend(s|ing)?\b.+\b[a-z]+ing\b/.test(text);
  if (tag.includes("how much")) return /\bhow much\b/.test(text);

  return false;
}

function getExamPointAnalysis(point) {
  const tag = String(point || "");
  if (tag.includes("原因状语")) return "because 引导原因状语从句，说明主句动作发生的原因。";
  if (tag.includes("宾语从句")) return "动词后接一个完整句子作宾语，注意从句要用陈述语序。";
  if (tag.includes("情态动词")) return "情态动词后接动词原形，表示建议、能力、可能或必要。";
  if (tag.includes("一般过去")) return "描述过去发生的动作或状态，动词通常使用过去式。";
  if (tag.includes("动词不定式")) return "to do 结构可表示目的、计划或要做的事情。";
  if (tag.includes("There be")) return "There be 表示“某处有某物”，be 动词随后面的名词变化。";
  if (tag.includes("动名词")) return "动词 -ing 形式可作主语，表示一件事情或一种行为。";
  if (tag.includes("比较级")) return "比较级用于两者比较，常见形式是 -er 或 more + 形容词。";
  if (tag.includes("as...as")) return "as...as 表示“和……一样……”，中间接形容词或副词原级。";
  if (tag.includes("最高级")) return "最高级用于三者及以上比较，常和 the most 或 -est 连用。";
  if (tag.includes("时间状语")) return "when / before / after 等引导时间状语从句，说明动作发生的时间。";
  if (tag.includes("条件状语")) return "if 引导条件状语从句，表示“如果……就……”。";
  if (tag.includes("定语")) return "定语用于修饰名词，说明人或事物的特征。";
  if (tag.includes("感官动词")) return "see / watch / hear 等感官动词后可接宾语和动作补足语。";
  if (tag.includes("spend doing")) return "spend time doing sth. 表示“花时间做某事”。";
  if (tag.includes("how much")) return "how much 可引导宾语从句，询问数量或程度。";
  return "注意句子结构和关键词，结合上下文理解该考点。";
}

function buildExamPointAnnotations(paragraphs, examPoints) {
  if (!Array.isArray(examPoints) || !examPoints.length) {
    return { notes: [] };
  }

  const notes = [];
  const usedNoteKeys = {};
  (paragraphs || []).forEach((para) => {
    let sentenceTokens = [];
    const flushSentence = () => {
      if (!sentenceTokens.length) return;
      const sentence = sentenceTokens.map((token) => token.text || "").join("");
      const matched = examPoints.filter((point) => sentenceMatchesExamPoint(sentence, point));
      if (matched.length) {
        matched.forEach((point) => {
          const noteKey = `${point}:${sentence}`;
          if (usedNoteKeys[noteKey]) return;
          usedNoteKeys[noteKey] = true;
          notes.push({
            point,
            sentence: sentence.replace(/\s+/g, " ").trim(),
            analysis: getExamPointAnalysis(point),
          });
        });
      }
      sentenceTokens = [];
    };

    (para.tokens || []).forEach((token) => {
      sentenceTokens.push(token);
      if (/[.!?]/.test(token.text || "")) {
        flushSentence();
      }
    });
    flushSentence();
  });

  return { notes };
}

Page({
  data: {
    article: null,
    paragraphs: [],
    spanTokenKeys: {},
    selection: null,
    handleLeft: null,
    handleRight: null,
    markCount: 0,
    articleMarkCount: 0,
    examPointNotes: [],
    draggingHandle: false,
    showZh: false,
    tankPanelOpen: false,
    articleTankWords: [],
    tankSheetHeight: 0,
    tankSheetScrollH: 0,
    focusWordIndex: -1,
    statusBarHeight: 20,
    navTotalHeight: 64,
    navSideWidth: 24,
    navRightPadding: 16,
    stickyHeaderTop: 88,
    stickyHeaderHeightPx: 120,
    scrollTopOffset: 148,
    scrollHeight: 600,
    scrollTop: 0,
    scrollIntoView: "",
    adviceExpanded: false,
    canFinish: false,
    hasReadBefore: false,
  },

  onLoad(options) {
    const sys = wx.getSystemInfoSync();
    const statusBarHeight = sys.statusBarHeight || 20;
    const rpxToPx = (rpx) => (rpx / 750) * sys.windowWidth;
    const menuButton = wx.getMenuButtonBoundingClientRect();
    const navSideWidth = Math.ceil(rpxToPx(48));
    const navRightPadding = Math.max(
      Math.ceil(sys.windowWidth - menuButton.left),
      navSideWidth
    );
    const navTotalHeight = statusBarHeight + Math.ceil(rpxToPx(88));
    const stickyHeaderHeightPx = Math.ceil(
      rpxToPx(24 + 96 + 32 + 36 + 25)
    );
    const stickyHeaderTop = navTotalHeight;
    const scrollTopOffset = navTotalHeight + stickyHeaderHeightPx;
    const scrollHeight = sys.windowHeight - scrollTopOffset;

    const app = getApp();
    const articles = app.globalData.articles.length
      ? app.globalData.articles
      : dataLoader.loadArticles();
    const vocab = app.globalData.vocab && Object.keys(app.globalData.vocab).length
      ? app.globalData.vocab
      : dataLoader.loadVocab();

    const visibleArticles = stage.filterArticlesByCurrentStage(articles);
    const id = parseInt(options.id, 10) || 1;
    const rawArticle =
      visibleArticles.find((a) => a.id === id) || visibleArticles[0] || articles[0];
    const article = rawArticle ? formatArticleTags(rawArticle) : null;

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

    this.vocab = vocab;
    this.article = article;
    this._scrollTop = 0;
    this._handleDrag = null;
    this._ignoreHandleUntil = 0;
    this._wordRects = null;
    this._dragRange = null;
    this._focusKey = options.focus ? decodeURIComponent(options.focus) : "";
    this._focusDone = false;

    const paragraphs = wordUtil.tokenizeParagraphs(article);
    this.baseParagraphs = paragraphs;
    this.wordCount = wordUtil.getWordCount(paragraphs);
    this._pageReady = false;

    const displayState = this.buildParagraphDisplayState(paragraphs);

    this.setData(
      {
        article,
        ...displayState,
        statusBarHeight,
        navTotalHeight,
        navSideWidth,
        navRightPadding,
        stickyHeaderTop,
        stickyHeaderHeightPx,
        scrollTopOffset,
        scrollHeight,
        hasReadBefore: articleHasReadBefore(article.id),
      },
      () => {
        this._pageReady = true;
        this.updateFinishAvailability();
        if (this._focusKey) {
          wx.nextTick(() => this.focusToWord());
        }
      }
    );
  },

  onShow() {
    if (this.article) {
      this.setData({ hasReadBefore: articleHasReadBefore(this.article.id) });
    }
    if (
      this._pageReady &&
      this.article &&
      this.baseParagraphs &&
      this.baseParagraphs.length
    ) {
      this.loadPersistedState();
    }
  },

  buildParagraphDisplayState(baseParagraphs) {
    if (!this.article || !baseParagraphs || !baseParagraphs.length) {
      return { paragraphs: [], markCount: 0, articleMarkCount: 0 };
    }

    const caughtKeys = storage.getCaughtWordKeysForArticle(
      this.article.id,
      baseParagraphs
    );
    const markedSpanKeys = markUtil.getMarkedSpanKeys(
      this.article.id,
      baseParagraphs
    );
    const markCount = markUtil.getMarksForArticle(this.article.id).length;
    const articleTankWords = this.buildArticleTankWords(baseParagraphs, caughtKeys);
    const caughtIndexMap = wordUtil.buildCaughtIndexMap(
      articleTankWords,
      baseParagraphs
    );
    const examPointAnnotations = buildExamPointAnnotations(
      baseParagraphs,
      this.article.examPoints
    );

    const paragraphs = wordUtil.enrichParagraphs(
      this.article.id,
      baseParagraphs,
      caughtKeys,
      markedSpanKeys,
      caughtIndexMap
    );

    return {
      paragraphs,
      markCount,
      articleMarkCount: articleTankWords.length,
      articleTankWords,
      examPointNotes: examPointAnnotations.notes,
    };
  },

  loadPersistedState(done) {
    const baseParagraphs = this.baseParagraphs;
    if (!this.article || !baseParagraphs || !baseParagraphs.length) {
      if (typeof done === "function") done();
      return;
    }

    const displayState = this.buildParagraphDisplayState(baseParagraphs);

    this.setData(
      {
        ...displayState,
        ...(this.data.tankPanelOpen
          ? this.getTankSheetLayout(displayState.articleTankWords)
          : {}),
      },
      () => {
        this.updateFinishAvailability();
        if (typeof done === "function") done();
      }
    );
  },

  getTankSheetLayout(articleTankWords) {
    const PANEL_RPX = 1200;
    const sys = wx.getSystemInfoSync();
    const rpxToPx = (rpx) => (rpx / 750) * sys.windowWidth;
    const panelPx = Math.ceil(rpxToPx(PANEL_RPX));
    const navPx = Math.ceil(rpxToPx(88) + 1);
    const bodyPx = Math.max(panelPx - navPx, 0);
    const count = (articleTankWords || []).length;

    return {
      articleTankWords: articleTankWords || [],
      articleMarkCount: count,
      tankSheetHeight: panelPx,
      tankSheetScrollH: bodyPx,
    };
  },

  buildArticleTankWords(baseParagraphs, caughtKeys) {
    if (!this.article || !this.vocab) return [];

    const paragraphs = baseParagraphs || this.baseParagraphs;
    if (!paragraphs || !paragraphs.length) return [];

    const keys =
      caughtKeys ||
      storage.getCaughtWordKeysForArticle(this.article.id, paragraphs);
    const lemmaMap = {};
    const order = [];

    const addWord = (rawKey) => {
      const entry = wordUtil.resolveLemmaEntry(this.vocab, rawKey);
      const lemmaKey = entry.lemmaKey;
      if (lemmaMap[lemmaKey]) return;
      lemmaMap[lemmaKey] = {
        key: lemmaKey,
        word: entry.word,
        pos: entry.pos || "",
        meaning: entry.meaning || "暂无释义",
        phonetic: entry.phonetic || "",
      };
      order.push(lemmaKey);
    };

    (paragraphs || []).forEach((para) => {
      (para.tokens || []).forEach((token) => {
        if (token.type === "word" && keys[token.key]) {
          addWord(token.key);
        }
      });
    });

    Object.keys(keys).forEach((mk) => addWord(mk));

    return order.map((lemmaKey, i) => ({
      ...lemmaMap[lemmaKey],
      index: i + 1,
    }));
  },

  openTankPanel() {
    if (this.data.selection) {
      this.clearSelection();
    }

    const articleTankWords = this.buildArticleTankWords();

    this.setData({
      tankPanelOpen: true,
      ...this.getTankSheetLayout(articleTankWords),
    });
  },

  closeTankPanel() {
    this.setData({ tankPanelOpen: false });
  },

  refreshParagraphDisplay() {
    const scrollTop = this._scrollTop || 0;
    this.loadPersistedState(() => {
      wx.nextTick(() => {
        this.setData({ scrollTop });
      });
    });
  },

  toggleAdvice() {
    this.setData({ adviceExpanded: !this.data.adviceExpanded });
  },

  onContentScroll(e) {
    this._scrollTop = e.detail.scrollTop || 0;
  },

  onScrollToLower() {
    if (!this.data.hasReadBefore) {
      this.setData({ canFinish: true });
    }
  },

  onNavBack() {
    wx.navigateBack();
  },

  finishReading() {
    if (!this.article || !this.data.canFinish || this.data.hasReadBefore) return;
    storage.markArticleRead(this.article.id);
    this.setData({
      hasReadBefore: true,
      canFinish: false,
      showZh: true,
      scrollTop: 0,
    });
    this._scrollTop = 0;
    wx.showToast({ title: "进入第二遍精读", icon: "none" });
  },

  isWordCaughtInArticle(wordKey) {
    return storage.isWordMarkedInArticle(this.article.id, wordKey);
  },

  onReady() {
    wx.nextTick(() => {
      this.cacheWordRects();
      this.updateFinishAvailability();
      if (this._focusKey && !this._focusDone) {
        this.focusToWord();
      }
    });
  },

  updateFinishAvailability() {
    if (!this.article || this.data.hasReadBefore || this.data.canFinish) return;

    wx.nextTick(() => {
      const query = wx.createSelectorQuery().in(this);
      query.select(".read-scroll").boundingClientRect();
      query.select("#articleContent").boundingClientRect();
      query.exec((res) => {
        const scrollRect = res && res[0];
        const contentRect = res && res[1];
        if (!scrollRect || !contentRect) return;

        if (contentRect.height <= scrollRect.height + 8) {
          this.setData({ canFinish: true });
        }
      });
    });
  },

  focusToWord() {
    if (!this._focusKey || this._focusDone || !this.baseParagraphs) return;

    const wordIndex = wordUtil.findWordIndexByKey(
      this.baseParagraphs,
      this._focusKey
    );
    if (wordIndex < 0) return;

    this._focusDone = true;
    this.setData(
      {
        focusWordIndex: wordIndex,
        scrollIntoView: `w-${wordIndex}`,
      },
      () => {
        setTimeout(() => {
          if (this.data.focusWordIndex === wordIndex) {
            this.setData({ focusWordIndex: -1, scrollIntoView: "" });
          }
        }, 2500);
      }
    );
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
        Object.assign(payload, buildHandlePositions(startRect, endRect));
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

        this.setData(
          buildHandlePositions(
            {
              left: res[0].left,
              right: res[0].right,
              top: res[0].top,
              bottom: res[0].top + res[0].height,
            },
            {
              left: res[1].left,
              right: res[1].right,
              top: res[1].top,
              bottom: res[1].top + res[1].height,
            }
          )
        );
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
    if (this.data.tankPanelOpen) return;
    if (this.data.selection) {
      this.clearSelection();
    }
  },

  toggleZh() {
    this.setData({ showZh: !this.data.showZh });
  },

  onTankSheetTap() {},

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
    if (this.data.tankPanelOpen) return;
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
      this.refreshParagraphDisplay();
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
      this.refreshParagraphDisplay();
      wx.showToast({ title: "已取消划线", icon: "none" });
    }

    this.clearSelection();
  },

  onWordTap(e) {
    if (this.data.tankPanelOpen) return;

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

    const token = wordUtil.findTokenByWordIndex(this.data.paragraphs, wordIndex);
    const caughtKey = token ? token.key : key;
    const alreadyCaught =
      (token && token.isCaught) || this.isWordCaughtInArticle(caughtKey);

    if (alreadyCaught) {
      storage.unCatchWord(caughtKey, this.article.id, wordIndex);
      this.refreshParagraphDisplay();
      return;
    }

    const vocabEntry = wordUtil.lookupVocab(this.vocab, key);
    const context = wordUtil.findContextForWord(this.data.paragraphs, key);

    const info = vocabEntry
      ? { ...vocabEntry, context, tappedText: text, wordIndex }
      : {
          word: text,
          tappedText: text,
          wordIndex,
          pos: "",
          phonetic: "",
          meaning: "暂无释义，建议查词典",
          example: context,
          context,
        };

    storage.catchWord(info, this.article, context, key);
    const app = getApp();
    const articles = app.globalData.articles.length
      ? app.globalData.articles
      : dataLoader.loadArticles();
    storage.syncCaughtWordsFromArticleMarks(articles);
    this.refreshParagraphDisplay();
  },
});
