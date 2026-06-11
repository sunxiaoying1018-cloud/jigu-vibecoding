const { todayStr } = require("./storage");
const wordUtil = require("./word");

const MARKS_KEY = "savedSentences";

function getMarks() {
  return wx.getStorageSync(MARKS_KEY) || [];
}

function saveMarks(list) {
  wx.setStorageSync(MARKS_KEY, list);
}

function buildMarkedSpanKeys(articleId, paragraphs) {
  const map = {};
  getMarks()
    .filter((item) => item.articleId === articleId)
    .forEach((item) => {
      const start = item.startIndex ?? item.startWordIndex ?? 0;
      const end = item.endIndex ?? item.endWordIndex ?? start;
      const span = wordUtil.buildSpanTokenKeys(paragraphs, start, end);
      Object.keys(span).forEach((key) => {
        map[key] = item.key;
      });
    });
  return map;
}

function getMarkedSpanKeys(articleId, paragraphs) {
  if (!paragraphs) return {};
  return buildMarkedSpanKeys(articleId, paragraphs);
}

function findMarkAt(articleId, wordIndex) {
  return getMarks().find(
    (item) =>
      item.articleId === articleId &&
      wordUtil.isWordInRange(
        wordIndex,
        item.startIndex ?? item.startWordIndex ?? 0,
        item.endIndex ?? item.endWordIndex ?? 0
      )
  );
}

function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  const a = wordUtil.normalizeWordRange(aStart, aEnd);
  const b = wordUtil.normalizeWordRange(bStart, bEnd);
  return a.startIndex <= b.endIndex && b.startIndex <= a.endIndex;
}

function saveMarkRange(article, paragraphs, startIndex, endIndex) {
  const range = wordUtil.normalizeWordRange(startIndex, endIndex);
  const text = wordUtil.getFragmentText(
    paragraphs,
    range.startIndex,
    range.endIndex
  );
  if (!text) return null;

  const key = `${article.id}_${range.startIndex}_${range.endIndex}`;
  const list = getMarks().filter(
    (item) =>
      !(
        item.articleId === article.id &&
        rangesOverlap(
          range.startIndex,
          range.endIndex,
          item.startIndex ?? item.startWordIndex ?? 0,
          item.endIndex ?? item.endWordIndex ?? 0
        )
      )
  );

  list.unshift({
    key,
    startIndex: range.startIndex,
    endIndex: range.endIndex,
    text,
    articleId: article.id,
    articleTitle: article.title,
    topic: article.topic,
    savedAt: todayStr(),
  });

  saveMarks(list);
  return {
    markedSpanKeys: getMarkedSpanKeys(article.id, paragraphs),
    count: list.filter((item) => item.articleId === article.id).length,
  };
}

function removeMark(markKey) {
  saveMarks(getMarks().filter((item) => item.key !== markKey));
}

function getMarksForArticle(articleId) {
  return getMarks().filter((item) => item.articleId === articleId);
}

module.exports = {
  getMarks,
  getMarkedSpanKeys,
  findMarkAt,
  saveMarkRange,
  removeMark,
  getMarksForArticle,
};
