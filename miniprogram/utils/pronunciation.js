const wordUtil = require("./word");

const ACCENT_KEY = "pronunciationAccent";
const ACCENT_US = "us";
const ACCENT_UK = "uk";

function pushUnique(list, value) {
  const text = String(value || "").trim();
  if (text && !list.includes(text)) list.push(text);
}

function getPronunciationWords(...candidates) {
  const words = [];
  candidates.forEach((candidate) => {
    const raw = String(candidate || "").trim();
    if (!raw) return;

    pushUnique(words, wordUtil.normalizeWordKey(raw));

    const firstWord = raw.match(/[a-zA-Z]+(?:'[a-zA-Z]+)?/);
    if (firstWord) {
      pushUnique(words, firstWord[0]);
      pushUnique(words, firstWord[0].toLowerCase());
    }

    pushUnique(words, raw);
    pushUnique(words, raw.toLowerCase());
  });
  return words;
}

function getPronunciationUrls(...candidates) {
  const accent = getPronunciationAccent();
  const primaryType = accent === ACCENT_UK ? 1 : 2;
  const fallbackType = accent === ACCENT_UK ? 2 : 1;

  return getPronunciationWords(...candidates).reduce((urls, word) => {
    const text = encodeURIComponent(word);
    urls.push(
      `https://dict.youdao.com/dictvoice?audio=${text}&type=${primaryType}`,
      `https://fanyi.baidu.com/gettts?lan=en&text=${text}&spd=3&source=web`,
      `https://dict.youdao.com/dictvoice?audio=${text}&type=${fallbackType}`
    );
    return urls;
  }, []);
}

function getPronunciationAccent() {
  const accent = wx.getStorageSync(ACCENT_KEY);
  return accent === ACCENT_UK ? ACCENT_UK : ACCENT_US;
}

function setPronunciationAccent(accent) {
  wx.setStorageSync(ACCENT_KEY, accent === ACCENT_UK ? ACCENT_UK : ACCENT_US);
}

module.exports = {
  ACCENT_US,
  ACCENT_UK,
  getPronunciationUrls,
  getPronunciationAccent,
  setPronunciationAccent,
};
