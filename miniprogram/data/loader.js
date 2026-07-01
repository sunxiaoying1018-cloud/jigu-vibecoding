const articles = require("./articles.js");
const juniorArticles = require("./junior_articles.js");
const vocab = require("./vocab.js");
const juniorVocab = require("./junior_vocab.js");

const allArticles = [...juniorArticles, ...articles];
const allVocab = { ...vocab, ...juniorVocab };

function loadArticles() {
  return allArticles;
}

function loadVocab() {
  return allVocab;
}

module.exports = {
  loadArticles,
  loadVocab,
  articles: allArticles,
  vocab: allVocab,
};
