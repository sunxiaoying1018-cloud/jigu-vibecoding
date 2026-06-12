function normalizeArticleId(articleId) {
  const id = parseInt(articleId, 10);
  return Number.isNaN(id) ? 0 : id;
}

function isSameArticle(a, b) {
  return normalizeArticleId(a) === normalizeArticleId(b);
}

module.exports = {
  normalizeArticleId,
  isSameArticle,
};
