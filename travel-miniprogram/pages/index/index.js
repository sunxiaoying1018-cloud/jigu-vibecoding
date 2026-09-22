const rawTrip = require("../../data/itinerary.js");

const STORAGE_KEY = "travel_planner_checked_v1";
const PHOTO_STORAGE_KEY = "travel_planner_photos_v1";

function loadChecked() {
  try {
    return wx.getStorageSync(STORAGE_KEY) || {};
  } catch (e) {
    return {};
  }
}

function saveChecked(checkedMap) {
  wx.setStorageSync(STORAGE_KEY, checkedMap);
}

function loadPhotos() {
  try {
    return wx.getStorageSync(PHOTO_STORAGE_KEY) || {};
  } catch (e) {
    return {};
  }
}

function savePhotos(photoMap) {
  wx.setStorageSync(PHOTO_STORAGE_KEY, photoMap);
}

function normalizeTrip(source) {
  const buildHeartIcons = (count) =>
    Array.from({ length: 5 }, (_, index) => ({
      id: index,
      filled: index < count,
    }));

  return {
    ...source,
    days: source.days.map((day) => ({
      ...day,
      groups: day.groups.map((group) => {
        const rating = group.rating || 0;
        const isRouteGroup = group.items.some((item) => item.showTransport);
        return {
          ...group,
          displayTitle: group.title,
          isRouteGroup,
          starIcons: rating ? buildHeartIcons(rating) : [],
        };
      }),
    })),
  };
}

const trip = normalizeTrip(rawTrip);

function countItems(days) {
  return days.reduce((total, day) => {
    return total + day.groups.reduce((sum, group) => sum + group.items.length, 0);
  }, 0);
}

function parseStartMinute(timeText) {
  const match = String(timeText || "").match(/(\d{1,2}):(\d{2})/);
  if (!match) return 24 * 60 + 999;
  return Number(match[1]) * 60 + Number(match[2]);
}

function flattenDayItems(day) {
  if (!day) return [];
  return day.groups
    .reduce((list, group) => {
      return list.concat(
        group.items.map((item) => ({
          ...item,
          groupTitle: group.displayTitle || group.title,
          sortMinute: parseStartMinute(item.time),
        }))
      );
    }, [])
    .sort((a, b) => {
      if (a.sortMinute !== b.sortMinute) return a.sortMinute - b.sortMinute;
      return b.stars - a.stars;
    });
}

function buildVisitedSummary(activeDayId, checkedMap = {}) {
  const activeDay = trip.days.find((day) => day.id === activeDayId) || trip.days[0];
  const visitedItems = flattenDayItems(activeDay).filter((item) => checkedMap[item.id]);
  if (!visitedItems.length) {
    return {
      count: 0,
      text: "勾选当前路线去过的地方后，这里会自动汇总",
    };
  }

  const names = visitedItems.map((item) => item.title).join("、");
  return {
    count: visitedItems.length,
    text: names,
  };
}

Page({
  data: {
    statusBarHeight: 20,
    navHeight: 88,
    trip,
    activeDayId: trip.days[0].id,
    expandedMap: {},
    expandedItemMap: {},
    checkedMap: {},
    photoMap: {},
    viewMode: "group",
    sortedItems: flattenDayItems(trip.days[0]),
    visitedSummary: buildVisitedSummary(trip.days[0].id),
    completedCount: 0,
    totalCount: countItems(trip.days),
  },

  onLoad() {
    const sys = wx.getSystemInfoSync();
    const statusBarHeight = sys.statusBarHeight || 20;
    const checkedMap = loadChecked();
    const photoMap = loadPhotos();
    const expandedMap = {};
    trip.days.forEach((day) => {
      day.groups.forEach((group, index) => {
        expandedMap[group.id] = index === 0;
      });
    });
    this.setData({
      statusBarHeight,
      navHeight: statusBarHeight + 44,
      checkedMap,
      photoMap,
      expandedMap,
      sortedItems: flattenDayItems(trip.days[0]),
      visitedSummary: buildVisitedSummary(trip.days[0].id, checkedMap),
      completedCount: Object.keys(checkedMap).filter((id) => checkedMap[id]).length,
    });
  },

  switchDay(e) {
    const activeDayId = e.currentTarget.dataset.day;
    const activeDay = trip.days.find((day) => day.id === activeDayId);
    this.setData({
      activeDayId,
      sortedItems: flattenDayItems(activeDay),
      visitedSummary: buildVisitedSummary(activeDayId, this.data.checkedMap),
    });
  },

  toggleViewMode() {
    const nextMode = this.data.viewMode === "group" ? "time" : "group";
    this.setData({
      viewMode: nextMode,
    });
    wx.showToast({
      title: nextMode === "group" ? "已按照推荐星级展示" : "已按照推荐时间顺序展示",
      icon: "none",
      duration: 1200,
    });
  },

  toggleGroup(e) {
    const id = e.currentTarget.dataset.id;
    const isRouteGroup = this.data.trip.days.some((day) =>
      day.groups.some((group) => group.id === id && group.isRouteGroup)
    );
    if (isRouteGroup) return;
    this.setData({ [`expandedMap.${id}`]: !this.data.expandedMap[id] });
  },

  toggleItemDetail(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    this.setData({ [`expandedItemMap.${id}`]: !this.data.expandedItemMap[id] });
  },

  toggleCheck(e) {
    const id = e.currentTarget.dataset.id;
    const checkedMap = { ...this.data.checkedMap, [id]: !this.data.checkedMap[id] };
    if (!checkedMap[id]) delete checkedMap[id];
    saveChecked(checkedMap);
    this.setData({
      checkedMap,
      visitedSummary: buildVisitedSummary(this.data.activeDayId, checkedMap),
      completedCount: Object.keys(checkedMap).length,
    });
  },

  addPhotos(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    const current = this.data.photoMap[id] || [];
    const count = Math.max(1, 9 - current.length);
    const onChoose = (paths) => {
      this.persistPhotos(paths, (savedPaths) => {
        const photoMap = {
          ...this.data.photoMap,
          [id]: current.concat(savedPaths).slice(0, 9),
        };
        savePhotos(photoMap);
        this.setData({ photoMap });
      });
    };
    if (wx.chooseMedia) {
      wx.chooseMedia({
        count,
        mediaType: ["image"],
        sourceType: ["album", "camera"],
        success: (res) => {
          onChoose((res.tempFiles || []).map((file) => file.tempFilePath));
        },
      });
      return;
    }
    wx.chooseImage({
      count,
      sourceType: ["album", "camera"],
      success: (res) => onChoose(res.tempFilePaths || []),
    });
  },

  persistPhotos(paths, callback) {
    if (!paths.length) {
      callback([]);
      return;
    }
    const saved = [];
    let finished = 0;
    paths.forEach((path) => {
      wx.saveFile({
        tempFilePath: path,
        success: (res) => saved.push(res.savedFilePath || path),
        fail: () => saved.push(path),
        complete: () => {
          finished += 1;
          if (finished === paths.length) callback(saved);
        },
      });
    });
  },

  previewPhoto(e) {
    const id = e.currentTarget.dataset.id;
    const url = e.currentTarget.dataset.url;
    const urls = this.data.photoMap[id] || [];
    if (!url || !urls.length) return;
    wx.previewImage({ current: url, urls });
  },

  removePhoto(e) {
    const id = e.currentTarget.dataset.id;
    const url = e.currentTarget.dataset.url;
    if (!id || !url) return;
    const nextPhotos = (this.data.photoMap[id] || []).filter((item) => item !== url);
    const photoMap = { ...this.data.photoMap };
    if (nextPhotos.length) {
      photoMap[id] = nextPhotos;
    } else {
      delete photoMap[id];
    }
    savePhotos(photoMap);
    this.setData({ photoMap });
  },

  resetProgress() {
    wx.showModal({
      title: "清空打卡进度",
      content: "确定要把所有已完成状态清空吗？",
      confirmColor: "#22222A",
      success: (res) => {
        if (!res.confirm) return;
        saveChecked({});
        this.setData({
          checkedMap: {},
          visitedSummary: buildVisitedSummary(this.data.activeDayId, {}),
          completedCount: 0,
        });
      },
    });
  },
});
