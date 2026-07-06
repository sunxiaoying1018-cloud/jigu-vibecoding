const dateUtil = require("../../utils/date.js");
const eventStore = require("../../utils/events.js");

const DAY_BATCH = 10;
const YEAR_BATCH = 2;
const DAY_SECTION_PX = 100;
const QUICK_ADD_ROW_RPX = 108;
const QUICK_ADD_FIRST_SCROLL_RPX = 24;
const QUICK_ADD_SCROLL_THRESHOLD = 1;
const QUICK_ADD_SCROLL_STEPS = 5;

function emptyForm(dateStr) {
  return {
    title: "",
    date: dateStr,
    allDay: false,
    startTime: "09:00",
    endTime: "10:00",
    color: eventStore.EVENT_COLORS[0].value,
    staffId: eventStore.STAFF_MEMBERS[0].id,
    notes: "",
  };
}

function emptyQuickForm(dateStr) {
  return {
    title: "",
    date: dateStr,
    allDay: false,
    startTime: "09:00",
    endTime: "10:00",
    color: eventStore.EVENT_COLORS[0].value,
    staffId: eventStore.STAFF_MEMBERS[0].id,
    notes: "",
  };
}

function scrollKey(str) {
  return String(str).replace(/-/g, "");
}

function monthStart(dateStr) {
  const d = dateUtil.parseDate(dateStr);
  return `${d.getFullYear()}-${dateUtil.pad(d.getMonth() + 1)}-01`;
}

function formatEventTimeRange(event) {
  if (event.allDay) return "全天";
  const start = event.startTime || "";
  const end = event.endTime || "";
  if (!start && !end) return "";
  if (!start) return end;
  if (!end) return start;
  return `${start}–${end.replace(/^0/, "")}`;
}

function withDisplayMeta(event) {
  const staff = eventStore.getStaffById(event.staffId);
  return {
    ...event,
    staffName: staff.name,
    staffShortName: staff.shortName,
    staffColor: staff.color,
    timeRange: formatEventTimeRange(event),
  };
}

function groupEventsByTime(events) {
  const groups = [];
  events.forEach((e) => {
    const time = e.allDay ? "全天" : e.startTime || "未设时间";
    let group = groups.find((g) => g.time === time);
    if (!group) {
      group = { time, items: [] };
      groups.push(group);
    }
    group.items.push(withDisplayMeta(e));
  });
  return groups;
}

function applyEventMarks(
  rows,
  eventDateSet,
  skipDate,
  staffColorMap = {},
  staffBookingMap = {}
) {
  rows.forEach((row) => {
    row.forEach((cell) => {
      if (!cell) return;
      cell.hasEvent = cell.date !== skipDate && eventDateSet.has(cell.date);
      cell.staffColor = staffColorMap[cell.date] || "";
      const booking = staffBookingMap[cell.date];
      cell.bookedStaffText = booking ? booking.bookedStaffText : "";
      cell.bookedStaffs = booking ? booking.bookedStaffs : [];
    });

    row.forEach((cell, idx) => {
      if (!cell || !cell.hasEvent) return;
      const prev = idx > 0 && row[idx - 1] && row[idx - 1].hasEvent;
      const next = idx < row.length - 1 && row[idx + 1] && row[idx + 1].hasEvent;
      cell.eventSingle = !prev && !next;
      cell.eventStart = !prev && next;
      cell.eventMiddle = prev && next;
      cell.eventEnd = prev && !next;
    });
  });
}

function buildStaffColorMap(events) {
  const map = {};
  events.forEach((event) => {
    if (!map[event.date]) {
      map[event.date] = eventStore.getStaffById(event.staffId).color;
    }
  });
  return map;
}

function buildStaffBookingMap(events) {
  const map = {};
  const staffOrder = eventStore.STAFF_MEMBERS.map((staff) => staff.id);
  events.forEach((event) => {
    const staff = eventStore.getStaffById(event.staffId);
    if (!map[event.date]) map[event.date] = {};
    map[event.date][staff.id] = {
      id: staff.id,
      name: staff.name,
      shortName: staff.shortName,
      color: staff.color,
    };
  });
  Object.keys(map).forEach((date) => {
    const bookedStaffs = Object.values(map[date]).sort(
      (a, b) => staffOrder.indexOf(a.id) - staffOrder.indexOf(b.id)
    );
    map[date] = {
      bookedStaffs,
      bookedStaffText: bookedStaffs.map((staff) => staff.shortName).join(""),
    };
  });
  return map;
}

function formatAvailabilityDate(dateStr) {
  const d = dateUtil.parseDate(dateStr);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

Page({
  data: {
    statusBarHeight: 20,
    navBarHeight: 44,
    navRightPadding: 96,
    headerTotalHeight: 120,
    bottomBarHeight: 144,
    view: "day",
    selectedDate: dateUtil.todayStr(),
    focusDate: dateUtil.todayStr(),
    today: dateUtil.todayStr(),
    headerTitle: "",
    contentPaddingTop: 64,
    weekLabels: ["日", "一", "二", "三", "四", "五", "六"],
    daySections: [],
    monthRows: [],
    monthEventGroups: [],
    yearSections: [],
    scrollIntoView: "",
    scrollTop: 0,
    scrollWithAnimation: false,
    showModal: false,
    quickAddDate: "",
    quickAddFocus: false,
    quickForm: emptyQuickForm(dateUtil.todayStr()),
    editingId: "",
    form: emptyForm(dateUtil.todayStr()),
    colorOptions: eventStore.EVENT_COLORS,
    staffOptions: eventStore.STAFF_MEMBERS,
    staffFilterId: "all",
    selectedYearDate: "",
    yearAvailability: null,
  },

  onLoad() {
    this.initLayout();
    this.dayRangeStart = "";
    this.dayRangeEnd = "";
    this._dayBefore = [];
    this._dayAfter = [];
    this._dayPinAnchor = null;
    this._yearBefore = [];
    this._yearAfter = [];
    this.yearRangeStart = 0;
    this.currentScrollTop = 0;
    this._quickAddScrollTop = 0;
    this.loadingMore = false;
    this.initDayView(this.data.today);
    this.updateHeader();
  },

  initLayout() {
    const sys = wx.getSystemInfoSync();
    const statusBarHeight = sys.statusBarHeight || 20;
    const menuButton = wx.getMenuButtonBoundingClientRect();
    const rpxToPx = (rpx) => (rpx / 750) * sys.windowWidth;
    const navBarHeight =
      (menuButton.top - statusBarHeight) * 2 + menuButton.height;
    const navTotalHeight = statusBarHeight + navBarHeight;
    const navRightPadding = Math.ceil(sys.windowWidth - menuButton.left + 8);
    const titleBlockHeight = rpxToPx(56 + 16);
    const headerTotalHeight = navTotalHeight + titleBlockHeight;
    const bottomBarHeight = rpxToPx(144) + (sys.safeAreaInsets?.bottom || 0);

    this.navTotalHeight = navTotalHeight;
    this.windowHeight = sys.windowHeight;
    this.rpxToPx = rpxToPx;
    this.quickAddRowPx = rpxToPx(QUICK_ADD_ROW_RPX);

    this.setData({
      statusBarHeight,
      navBarHeight,
      navRightPadding,
      headerTotalHeight,
      bottomBarHeight,
      contentPaddingTop:
        this.data.view === "month" ? headerTotalHeight : navTotalHeight,
    });
  },

  getContentPaddingTop(view) {
    return view === "month" ? this.data.headerTotalHeight : this.navTotalHeight;
  },

  updateViewPadding() {
    const contentPaddingTop = this.getContentPaddingTop(this.data.view);
    if (contentPaddingTop !== this.data.contentPaddingTop) {
      this.setData({ contentPaddingTop });
    }
  },

  onShow() {
    this.updateViewPadding();
    this.refreshCurrentView();
  },

  filterEventsByStaff(events) {
    const { staffFilterId } = this.data;
    if (!staffFilterId || staffFilterId === "all") return events;
    return events.filter((event) => event.staffId === staffFilterId);
  },

  getVisibleEventsForDate(dateStr) {
    return this.filterEventsByStaff(eventStore.getEventsForDate(dateStr));
  },

  getVisibleEventsForYear(year) {
    return this.filterEventsByStaff(eventStore.getEventsForYear(year));
  },

  getVisibleEventDates() {
    const set = new Set();
    this.filterEventsByStaff(eventStore.loadEvents()).forEach((event) => {
      set.add(event.date);
    });
    return [...set].sort();
  },

  onSelectStaffFilter(e) {
    this.setData({ staffFilterId: e.currentTarget.dataset.staff }, () => {
      this.refreshCurrentView();
    });
  },

  buildYearAvailability(dateStr) {
    const bookedIdSet = new Set(
      eventStore.getEventsForDate(dateStr).map((event) => event.staffId)
    );
    const bookedStaffs = eventStore.STAFF_MEMBERS.filter((staff) =>
      bookedIdSet.has(staff.id)
    );
    const availableStaffs = eventStore.STAFF_MEMBERS.filter(
      (staff) => !bookedIdSet.has(staff.id)
    );
    return {
      date: dateStr,
      label: formatAvailabilityDate(dateStr),
      bookedStaffs,
      availableStaffs,
    };
  },

  onSelectYearDate(e) {
    const date = e.currentTarget.dataset.date;
    if (!date) return;
    this.setData({
      selectedYearDate: date,
      yearAvailability: this.buildYearAvailability(date),
    });
  },

  buildDaySection(dateStr) {
    const { today, selectedDate } = this.data;
    const events = this.getVisibleEventsForDate(dateStr);
    return {
      scrollKey: scrollKey(dateStr),
      date: dateStr,
      title: dateUtil.formatHeader(dateStr, "day"),
      isToday: dateStr === today,
      isSelected: dateStr === selectedDate,
      hasEvents: events.length > 0,
      events: events.map((e) => withDisplayMeta(e)),
      eventGroups: groupEventsByTime(events),
    };
  },

  initDayView(anchorDate) {
    const anchor = anchorDate || this.data.today;
    const allEventDates = this.getVisibleEventDates();
    this._dayPinAnchor = anchor;

    const before = allEventDates.filter((d) => d < anchor);
    const after = allEventDates.filter((d) => d > anchor);
    this._dayBefore = before;
    const loadAfter = after.slice(0, 2);
    this._dayAfter = after.slice(2);
    const visible = [anchor, ...loadAfter];

    this.setData({
      daySections: visible.map((d) => this.buildDaySection(d)),
      selectedDate: anchor,
      focusDate: anchor,
      scrollTop: 0,
      scrollIntoView: "",
      scrollWithAnimation: false,
    });
  },

  refreshDayView() {
    const pin = this._dayPinAnchor;
    let dates = this.data.daySections.map((s) => s.date);
    dates = dates.filter(
      (d) => d === pin || this.getVisibleEventsForDate(d).length > 0
    );
    if (pin && this.data.daySections.some((s) => s.date === pin)) {
      dates = [pin, ...dates.filter((d) => d !== pin)];
    }
    this.setData({ daySections: dates.map((d) => this.buildDaySection(d)) });
  },

  upsertVisibleDay(dateStr, callback) {
    const dates = this.data.daySections.map((s) => s.date);
    if (!dates.includes(dateStr)) {
      dates.push(dateStr);
    }
    const pin = this._dayPinAnchor;
    const visibleDates = dates
      .filter((d) => d === pin || this.getVisibleEventsForDate(d).length > 0)
      .sort();
    this.setData({
      daySections: visibleDates.map((d) => this.buildDaySection(d)),
    }, callback);
  },

  buildMonthViewPatch(focusDate, selectedDate = this.data.selectedDate) {
    const { today } = this.data;
    const anchor = monthStart(focusDate);
    const monthPrefix = anchor.slice(0, 7);
    let activeDate = selectedDate;
    if (!selectedDate.startsWith(monthPrefix)) {
      activeDate = today.startsWith(monthPrefix) ? today : anchor;
    }
    const visibleEvents = this.filterEventsByStaff(eventStore.loadEvents());
    const eventDateSet = new Set(visibleEvents.map((event) => event.date));
    const staffColorMap = buildStaffColorMap(visibleEvents);
    const staffBookingMap = buildStaffBookingMap(visibleEvents);
    const monthRows = dateUtil.buildMonthGrid(anchor);
    monthRows.forEach((row) => {
      row.forEach((cell) => {
        cell.isToday = cell.date === today;
        cell.isSelected = cell.date === activeDate;
      });
    });
    applyEventMarks(monthRows, eventDateSet, today, staffColorMap, staffBookingMap);
    return {
      focusDate: anchor,
      selectedDate: activeDate,
      headerTitle: dateUtil.formatHeader(anchor, "month"),
      monthRows,
      monthEventGroups: groupEventsByTime(
        this.getVisibleEventsForDate(activeDate)
      ),
    };
  },

  refreshMonthView() {
    this.setData(
      this.buildMonthViewPatch(this.data.focusDate, this.data.selectedDate)
    );
  },

  buildYearSection(year) {
    const { today } = this.data;
    const todayYear = dateUtil.parseDate(today).getFullYear();
    const todayMonth = dateUtil.parseDate(today).getMonth();
    const isCurrentYear = year === todayYear;
    const visibleEvents = this.getVisibleEventsForYear(year);
    const eventDateSet = new Set(visibleEvents.map((event) => event.date));
    const staffColorMap = buildStaffColorMap(visibleEvents);
    const staffBookingMap = buildStaffBookingMap(visibleEvents);
    const yearMonths = dateUtil.buildYearMonths(year);
    yearMonths.forEach((m) => {
      m.isCurrentMonth = isCurrentYear && m.month === todayMonth;
      m.rows.forEach((row) => {
        row.forEach((cell) => {
          if (cell) cell.isToday = cell.date === today;
        });
      });
      applyEventMarks(m.rows, eventDateSet, today, staffColorMap, staffBookingMap);
    });
    return {
      scrollKey: String(year),
      year,
      label: `${year}年`,
      isCurrentYear,
      yearMonths,
    };
  },

  initMonthView(anchorDate) {
    this.setData(this.buildMonthViewPatch(anchorDate));
  },

  initYearView(anchorYear) {
    const anchor =
      anchorYear || dateUtil.parseDate(this.data.today).getFullYear();
    const beforeYears = [];
    for (let y = anchor - 30; y < anchor; y++) beforeYears.push(y);
    const afterYears = [];
    for (let y = anchor + 1; y <= anchor + 30; y++) afterYears.push(y);

    this._yearBefore = beforeYears;
    const loadAfter = afterYears.slice(0, 2);
    this._yearAfter = afterYears.slice(2);
    const visible = [anchor, ...loadAfter];

    this.yearRangeStart = anchor;
    this.yearRangeEnd = visible[visible.length - 1];

    this.setData({
      yearSections: visible.map((y) => this.buildYearSection(y)),
      focusDate: `${anchor}-01-01`,
      scrollTop: 0,
      scrollIntoView: "",
      scrollWithAnimation: false,
    });
  },

  refreshCurrentView() {
    const { view } = this.data;
    if (view === "day") {
      this.refreshDayView();
    } else if (view === "month") {
      this.refreshMonthView();
    } else if (view === "year" && this.data.yearSections.length) {
      const years = this.data.yearSections.map((s) => s.year);
      this.setData({
        yearSections: years.map((y) => this.buildYearSection(y)),
      });
    }
    this.updateHeader();
  },

  updateHeader() {
    const { view, focusDate } = this.data;
    const headerTitle =
      view === "month" ? dateUtil.formatHeader(focusDate, "month") : "";
    this.setData({ headerTitle });
  },

  onBodyScroll(e) {
    this.currentScrollTop = e.detail.scrollTop;
    this._quickAddScrollTop = e.detail.scrollTop;
  },

  switchToView(view) {
    if (!view || view === this.data.view) return;
    const monthAnchor =
      view === "month" ? this.data.today : this.data.focusDate;
    const viewPatch =
      view === "month"
        ? this.buildMonthViewPatch(monthAnchor, monthAnchor)
        : {};
    this.setData(
      {
        view,
        headerTitle: "",
        contentPaddingTop: this.getContentPaddingTop(view),
        ...viewPatch,
      },
      () => {
        if (view === "day") {
          const today = this.data.today;
          this.initDayView(today);
        } else if (view === "year") {
          const currentYear = dateUtil.parseDate(this.data.today).getFullYear();
          this.initYearView(currentYear);
        }
        this.updateHeader();
      }
    );
  },

  switchView(e) {
    this.switchToView(e.currentTarget.dataset.view);
  },

  onReachTop() {
    if (this.loadingMore) return;
    if (this.data.view === "day") this.prependDays();
  },

  onReachBottom() {
    if (this.loadingMore) return;
    const { view } = this.data;
    if (view === "day") this.appendDays();
    else if (view === "year") this.appendYears();
  },

  onTouchStart(e) {
    this.touchStartX = e.changedTouches[0].clientX;
    this.touchStartY = e.changedTouches[0].clientY;
  },

  onTouchEnd(e) {
    if (this.data.view !== "month") return;
    const dx = e.changedTouches[0].clientX - this.touchStartX;
    const dy = e.changedTouches[0].clientY - this.touchStartY;
    if (Math.abs(dx) < 60 || Math.abs(dx) <= Math.abs(dy)) return;

    const delta = dx > 0 ? -1 : 1;
    const next = dateUtil.addMonths(this.data.focusDate, delta);
    this.setData(this.buildMonthViewPatch(next));
  },

  prependDays() {
    if (!this._dayBefore.length) return;
    this.loadingMore = true;
    const batch = this._dayBefore.slice(-DAY_BATCH);
    this._dayBefore = this._dayBefore.slice(0, this._dayBefore.length - batch.length);
    const newSections = batch.map((d) => this.buildDaySection(d));
    const addedHeight = batch.length * DAY_SECTION_PX;
    this.setData(
      {
        daySections: [...newSections, ...this.data.daySections],
        scrollTop: this.currentScrollTop + addedHeight,
      },
      () => {
        this.loadingMore = false;
        setTimeout(() => this.setData({ scrollTop: -1 }), 100);
      }
    );
  },

  appendDays() {
    if (!this._dayAfter.length) return;
    this.loadingMore = true;
    const batch = this._dayAfter.slice(0, DAY_BATCH);
    this._dayAfter = this._dayAfter.slice(DAY_BATCH);
    this.setData(
      {
        daySections: [
          ...this.data.daySections,
          ...batch.map((d) => this.buildDaySection(d)),
        ],
      },
      () => {
        this.loadingMore = false;
      }
    );
  },

  prependYears() {
    if (!this._yearBefore.length) return;
    this.loadingMore = true;
    const batch = this._yearBefore.slice(-YEAR_BATCH);
    this._yearBefore = this._yearBefore.slice(
      0,
      this._yearBefore.length - batch.length
    );
    const newSections = batch.map((y) => this.buildYearSection(y));
    const addedHeight = YEAR_BATCH * 620;
    this.yearRangeStart = batch[0];
    this.setData(
      {
        yearSections: [...newSections, ...this.data.yearSections],
        scrollTop: this.currentScrollTop + addedHeight,
      },
      () => {
        this.loadingMore = false;
        setTimeout(() => this.setData({ scrollTop: -1 }), 100);
      }
    );
  },

  appendYears() {
    if (!this._yearAfter.length) return;
    this.loadingMore = true;
    const batch = this._yearAfter.slice(0, YEAR_BATCH);
    this._yearAfter = this._yearAfter.slice(YEAR_BATCH);
    this.yearRangeEnd = batch[batch.length - 1];
    this.setData(
      {
        yearSections: [
          ...this.data.yearSections,
          ...batch.map((y) => this.buildYearSection(y)),
        ],
      },
      () => {
        this.loadingMore = false;
      }
    );
  },

  goToday() {
    const today = dateUtil.todayStr();
    const year = dateUtil.parseDate(today).getFullYear();
    this.setData({ selectedDate: today, focusDate: today });
    const { view } = this.data;
    if (view === "day") {
      this.initDayView(today);
    } else if (view === "month") {
      this.initMonthView(today);
    } else {
      this.initYearView(year);
    }
    this.updateViewPadding();
    this.updateHeader();
  },

  onSelectDate(e) {
    const date = e.currentTarget.dataset.date;
    if (!date) return;
    if (this.data.view === "month") {
      this.setData({ selectedDate: date }, () => {
        this.refreshMonthView();
      });
      return;
    }
    this.setData({ selectedDate: date, focusDate: date });
    this.refreshCurrentView();
    this.updateHeader();
  },

  onSelectMonth(e) {
    const month = Number(e.currentTarget.dataset.month);
    const year = Number(e.currentTarget.dataset.year);
    const date = `${year}-${dateUtil.pad(month + 1)}-01`;
    this.setData(
      {
        view: "month",
        contentPaddingTop: this.getContentPaddingTop("month"),
        ...this.buildMonthViewPatch(date, date),
      },
      () => {
        this.updateHeader();
      }
    );
  },

  toggleDone(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    eventStore.toggleEventDone(id);
    this.refreshCurrentView();
  },

  openAddModal(e) {
    const date =
      (e && e.currentTarget && e.currentTarget.dataset.date) ||
      this.data.selectedDate;
    const form = emptyForm(date);
    if (this.data.staffFilterId && this.data.staffFilterId !== "all") {
      form.staffId = this.data.staffFilterId;
    }
    this.setData({
      showModal: true,
      editingId: "",
      form,
    });
  },

  openQuickAdd(e) {
    const date =
      (e && e.currentTarget && e.currentTarget.dataset.date) ||
      this.data.selectedDate;
    const quickForm = emptyQuickForm(date);
    if (this.data.staffFilterId && this.data.staffFilterId !== "all") {
      quickForm.staffId = this.data.staffFilterId;
    }
    this.setData(
      {
        quickAddDate: date,
        quickAddFocus: false,
        quickForm,
      },
      () => {
        setTimeout(() => {
          if (this.data.quickAddDate === date) {
            this.setData({ quickAddFocus: true });
          }
        }, 80);
      }
    );
  },

  closeQuickAdd() {
    this.setData({ quickAddDate: "", quickAddFocus: false });
  },

  nudgeQuickAddAfterSave(date) {
    const eventCount = eventStore.getEventsForDate(date).length;
    if (eventCount < QUICK_ADD_SCROLL_THRESHOLD) return;
    const baseScrollTop = Math.max(
      this.currentScrollTop || 0,
      this._quickAddScrollTop || 0,
      Number(this.data.scrollTop) || 0
    );
    const scrollStep =
      eventCount === QUICK_ADD_SCROLL_THRESHOLD
        ? this.rpxToPx(QUICK_ADD_FIRST_SCROLL_RPX)
        : this.quickAddRowPx || 50;
    setTimeout(() => {
      this.animateQuickAddScroll(baseScrollTop, scrollStep);
    }, 80);
  },

  animateQuickAddScroll(from, delta) {
    if (!delta) return;
    if (this._quickAddScrollTimers) {
      this._quickAddScrollTimers.forEach((timer) => clearTimeout(timer));
    }
    this._quickAddScrollTimers = [];
    for (let i = 1; i <= QUICK_ADD_SCROLL_STEPS; i += 1) {
      const timer = setTimeout(() => {
        const progress = i / QUICK_ADD_SCROLL_STEPS;
        const eased = 1 - Math.pow(1 - progress, 3);
        const nextScrollTop = from + delta * eased;
        this._quickAddScrollTop = nextScrollTop;
        this.setData({
          scrollWithAnimation: false,
          scrollTop: nextScrollTop,
        });
      }, i * 42);
      this._quickAddScrollTimers.push(timer);
    }
  },

  onQuickInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [`quickForm.${field}`]: e.detail.value });
  },

  onQuickPickDate(e) {
    this.setData({ "quickForm.date": e.detail.value });
  },

  onQuickPickStaff(e) {
    this.setData({ "quickForm.staffId": e.currentTarget.dataset.staff });
  },

  onQuickPickStartTime(e) {
    this.setData({ "quickForm.startTime": e.detail.value });
  },

  onQuickPickEndTime(e) {
    this.setData({ "quickForm.endTime": e.detail.value });
  },

  saveQuickEvent() {
    const { quickForm } = this.data;
    if (eventStore.hasStaffConflict(quickForm)) {
      wx.showToast({ title: "该员工此时段已有安排", icon: "none" });
      return;
    }
    eventStore.upsertEvent(quickForm);
    this.setData({ quickAddDate: "", quickAddFocus: false });
    if (this.data.view === "day") {
      this._dayBefore = this._dayBefore.filter((d) => d !== quickForm.date);
      this._dayAfter = this._dayAfter.filter((d) => d !== quickForm.date);
      this.upsertVisibleDay(quickForm.date, () => {
        this.nudgeQuickAddAfterSave(quickForm.date);
      });
    } else {
      this.refreshCurrentView();
    }
    wx.showToast({ title: "已添加", icon: "success" });
  },

  openEditModal(e) {
    const id = e.currentTarget.dataset.id;
    const event = eventStore.getEventById(id);
    if (!event) return;
    this.setData({
      showModal: true,
      editingId: id,
      form: {
        title: event.title,
        date: event.date,
        allDay: event.allDay,
        startTime: event.startTime || "09:00",
        endTime: event.endTime || "10:00",
        color: event.color,
        staffId: event.staffId || eventStore.STAFF_MEMBERS[0].id,
        notes: event.notes || "",
      },
    });
  },

  closeModal() {
    this.setData({ showModal: false, editingId: "" });
  },

  noop() {},

  onFormInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [`form.${field}`]: e.detail.value });
  },

  onToggleAllDay(e) {
    this.setData({ "form.allDay": e.detail.value });
  },

  onPickDate(e) {
    this.setData({ "form.date": e.detail.value });
  },

  onPickStartTime(e) {
    this.setData({ "form.startTime": e.detail.value });
  },

  onPickEndTime(e) {
    this.setData({ "form.endTime": e.detail.value });
  },

  onPickStaff(e) {
    this.setData({ "form.staffId": e.currentTarget.dataset.staff });
  },

  onPickColor(e) {
    const color = e.currentTarget.dataset.color;
    this.setData({ "form.color": color });
  },

  saveEvent() {
    const { form, editingId } = this.data;
    if (!form.date) {
      wx.showToast({ title: "请选择日期", icon: "none" });
      return;
    }
    const payload = { ...form, id: editingId || undefined };
    if (eventStore.hasStaffConflict(payload)) {
      wx.showToast({ title: "该员工此时段已有安排", icon: "none" });
      return;
    }
    eventStore.upsertEvent(payload);
    this.closeModal();
    if (this.data.view === "day") {
      this._dayBefore = this._dayBefore.filter((d) => d !== form.date);
      this._dayAfter = this._dayAfter.filter((d) => d !== form.date);
      this.upsertVisibleDay(form.date);
    } else {
      this.setData({ focusDate: form.date, selectedDate: form.date });
      this.refreshCurrentView();
    }
    this.updateHeader();
    wx.showToast({ title: "已保存", icon: "success" });
  },

  deleteEvent() {
    const { editingId } = this.data;
    if (!editingId) return;
    const event = eventStore.getEventById(editingId);
    const deletedDate = event ? event.date : "";
    wx.showModal({
      title: "删除日程",
      content: "确定删除这条日程吗？",
      confirmColor: "#FF3B30",
      success: (res) => {
        if (!res.confirm) return;
        eventStore.deleteEvent(editingId);
        this.closeModal();
        if (this.data.view === "day") {
          const hasRemaining =
            deletedDate && eventStore.getEventsForDate(deletedDate).length > 0;
          if (!hasRemaining) {
            this._dayBefore = this._dayBefore.filter((d) => d !== deletedDate);
            this._dayAfter = this._dayAfter.filter((d) => d !== deletedDate);
          }
          this.refreshDayView();
        } else {
          this.refreshCurrentView();
        }
        wx.showToast({ title: "已删除", icon: "success" });
      },
    });
  },
});
