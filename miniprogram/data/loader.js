const articles = require("./articles.js");
const vocab = require("./vocab.js");

function loadArticles() {
  return articles;
}

function loadVocab() {
  return vocab;
}

module.exports = {
  loadArticles,
  loadVocab,
  articles,
  vocab,
};
