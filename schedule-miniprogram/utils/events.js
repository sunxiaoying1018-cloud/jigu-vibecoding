const dateUtil = require("./date.js");

const STORAGE_KEY = "schedule_events_v1";

const EVENT_COLORS = [
  { id: "blue", value: "#007AFF" },
  { id: "red", value: "#FF3B30" },
  { id: "orange", value: "#FF9500" },
  { id: "green", value: "#34C759" },
  { id: "purple", value: "#AF52DE" },
  { id: "teal", value: "#5AC8FA" },
];

const STAFF_MEMBERS = [
  { id: "staff-0", name: "0号", shortName: "0", color: "#31AFFF" },
  { id: "staff-1", name: "1号", shortName: "1", color: "#34C759" },
  { id: "staff-2", name: "2号", shortName: "2", color: "#FF9500" },
  { id: "staff-3", name: "3号", shortName: "3", color: "#AF52DE" },
  { id: "staff-4", name: "4号", shortName: "4", color: "#FF3B30" },
  { id: "staff-5", name: "5号", shortName: "5", color: "#5AC8FA" },
];

function loadEvents() {
  try {
    return wx.getStorageSync(STORAGE_KEY) || [];
  } catch (e) {
    return [];
  }
}

function saveEvents(events) {
  wx.setStorageSync(STORAGE_KEY, events);
}

function createId() {
  return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function sortEvents(events) {
  return events.slice().sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
    return dateUtil.compareTime(a.startTime, b.startTime);
  });
}

function getStaffById(staffId) {
  return STAFF_MEMBERS.find((staff) => staff.id === staffId) || STAFF_MEMBERS[0];
}

function getEventsForDate(dateStr) {
  return sortEvents(loadEvents().filter((e) => e.date === dateStr));
}

function getEventsForMonth(dateStr) {
  const { year, month } = dateUtil.getMonthMeta(dateStr);
  const prefix = `${year}-${dateUtil.pad(month + 1)}`;
  return sortEvents(loadEvents().filter((e) => e.date.startsWith(prefix)));
}

function getEventsForYear(year) {
  const prefix = String(year);
  return sortEvents(loadEvents().filter((e) => e.date.startsWith(prefix)));
}

function countByDate(events) {
  const map = {};
  events.forEach((e) => {
    map[e.date] = (map[e.date] || 0) + 1;
  });
  return map;
}

function upsertEvent(event) {
  const events = loadEvents();
  const idx = events.findIndex((e) => e.id === event.id);
  const payload = {
    id: event.id || createId(),
    title: (event.title || "").trim() || "无标题",
    date: event.date,
    allDay: !!event.allDay,
    startTime: event.allDay ? "" : event.startTime || "09:00",
    endTime: event.allDay ? "" : event.endTime || "10:00",
    color: event.color || EVENT_COLORS[0].value,
    staffId: event.staffId || STAFF_MEMBERS[0].id,
    notes: (event.notes || "").trim(),
    done: !!event.done,
    updatedAt: Date.now(),
  };
  if (idx >= 0) {
    events[idx] = { ...events[idx], ...payload };
  } else {
    events.push({ ...payload, createdAt: Date.now() });
  }
  saveEvents(events);
  return payload;
}

function hasStaffConflict(event) {
  if (!event || !event.date || !event.staffId) return false;
  const start = event.allDay ? "00:00" : event.startTime || "09:00";
  const end = event.allDay ? "23:59" : event.endTime || "10:00";
  return loadEvents().some((item) => {
    if (event.id && item.id === event.id) return false;
    if (item.date !== event.date || item.staffId !== event.staffId) return false;
    const itemStart = item.allDay ? "00:00" : item.startTime || "09:00";
    const itemEnd = item.allDay ? "23:59" : item.endTime || "10:00";
    return start < itemEnd && end > itemStart;
  });
}

function deleteEvent(id) {
  const events = loadEvents().filter((e) => e.id !== id);
  saveEvents(events);
}

function getEventById(id) {
  return loadEvents().find((e) => e.id === id) || null;
}

function getSortedEventDates() {
  const set = new Set();
  loadEvents().forEach((e) => set.add(e.date));
  return [...set].sort();
}

function toggleEventDone(id) {
  const events = loadEvents();
  const idx = events.findIndex((e) => e.id === id);
  if (idx < 0) return null;
  events[idx] = { ...events[idx], done: !events[idx].done, updatedAt: Date.now() };
  saveEvents(events);
  return events[idx];
}

module.exports = {
  EVENT_COLORS,
  STAFF_MEMBERS,
  loadEvents,
  saveEvents,
  getEventsForDate,
  getEventsForMonth,
  getEventsForYear,
  countByDate,
  getSortedEventDates,
  upsertEvent,
  deleteEvent,
  getEventById,
  toggleEventDone,
  getStaffById,
  hasStaffConflict,
};
