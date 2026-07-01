const CURRENT_STAGE_KEY = "currentLearningStage";
const LEGACY_MIGRATION_KEY = "stageLegacyMigration";

const STAGES = [
  { key: "primary", name: "小学", desc: "基础词汇" },
  { key: "middle", name: "初中", desc: "中考词汇" },
  { key: "high", name: "高中", desc: "高考词汇" },
  { key: "cet4", name: "四级", desc: "CET-4" },
  { key: "cet6", name: "六级", desc: "CET-6" },
  { key: "kaoyan", name: "考研", desc: "考研英语" },
];

function getStages() {
  return STAGES;
}

function getStageByKey(key) {
  return STAGES.find((item) => item.key === key) || null;
}

function getCurrentStageKey() {
  const key = wx.getStorageSync(CURRENT_STAGE_KEY);
  return getStageByKey(key) ? key : "";
}

function getCurrentStage() {
  return getStageByKey(getCurrentStageKey());
}

function hasSelectedStage() {
  return !!getCurrentStageKey();
}

function setCurrentStage(key) {
  const stage = getStageByKey(key);
  if (!stage) return null;
  wx.setStorageSync(CURRENT_STAGE_KEY, key);
  return stage;
}

function getScopedStorageKey(baseKey, stageKey) {
  const key = stageKey || getCurrentStageKey();
  return key ? `${baseKey}:${key}` : baseKey;
}

function wasLegacyMigrated(stageKey) {
  const map = wx.getStorageSync(LEGACY_MIGRATION_KEY) || {};
  return !!map[stageKey];
}

function markLegacyMigrated(stageKey) {
  const map = wx.getStorageSync(LEGACY_MIGRATION_KEY) || {};
  map[stageKey] = true;
  wx.setStorageSync(LEGACY_MIGRATION_KEY, map);
}

function normalizeArticleStages(article) {
  const raw = article && (article.stage || article.stages || article.targetStage);
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  return String(raw)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function filterArticlesByCurrentStage(articles) {
  const current = getCurrentStageKey();
  if (!current) return articles || [];
  const currentStage = getStageByKey(current);
  const list = articles || [];

  const matched = list.filter((article) => {
    const stages = normalizeArticleStages(article);
    return (
      stages.includes(current) ||
      (currentStage && stages.includes(currentStage.name))
    );
  });

  if (matched.length) return matched;

  return list.filter((article) => {
    const stages = normalizeArticleStages(article);
    return stages.length === 0;
  });
}

module.exports = {
  CURRENT_STAGE_KEY,
  STAGES,
  getStages,
  getStageByKey,
  getCurrentStageKey,
  getCurrentStage,
  hasSelectedStage,
  setCurrentStage,
  getScopedStorageKey,
  wasLegacyMigrated,
  markLegacyMigrated,
  filterArticlesByCurrentStage,
};
