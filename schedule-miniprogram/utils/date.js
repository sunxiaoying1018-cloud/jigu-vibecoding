function pad(n) {
  return String(n).padStart(2, "0");
}

function formatDate(d) {
  const date = d instanceof Date ? d : parseDate(d);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function parseDate(str) {
  if (str instanceof Date) return new Date(str.getTime());
  const parts = String(str).split("-");
  return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
}

function todayStr() {
  return formatDate(new Date());
}

function addDays(dateStr, days) {
  const d = parseDate(dateStr);
  d.setDate(d.getDate() + days);
  return formatDate(d);
}

function addMonths(dateStr, months) {
  const d = parseDate(dateStr);
  d.setMonth(d.getMonth() + months);
  return formatDate(d);
}

function addYears(dateStr, years) {
  const d = parseDate(dateStr);
  d.setFullYear(d.getFullYear() + years);
  return formatDate(d);
}

function isSameDay(a, b) {
  return formatDate(a) === formatDate(b);
}

function getWeekday(dateStr) {
  return parseDate(dateStr).getDay();
}

function getMonthMeta(dateStr) {
  const d = parseDate(dateStr);
  const year = d.getFullYear();
  const month = d.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  return {
    year,
    month,
    daysInMonth: lastDay.getDate(),
    firstWeekday: firstDay.getDay(),
  };
}

function buildMonthGrid(dateStr) {
  const { year, month, daysInMonth, firstWeekday } = getMonthMeta(dateStr);
  const cells = [];
  const prevLast = new Date(year, month, 0).getDate();

  for (let i = firstWeekday - 1; i >= 0; i--) {
    const day = prevLast - i;
    const m = month === 0 ? 11 : month - 1;
    const y = month === 0 ? year - 1 : year;
    cells.push({
      day,
      date: `${y}-${pad(m + 1)}-${pad(day)}`,
      inMonth: false,
    });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({
      day,
      date: `${year}-${pad(month + 1)}-${pad(day)}`,
      inMonth: true,
    });
  }

  let nextDay = 1;
  while (cells.length % 7 !== 0) {
    const m = month === 11 ? 0 : month + 1;
    const y = month === 11 ? year + 1 : year;
    cells.push({
      day: nextDay,
      date: `${y}-${pad(m + 1)}-${pad(nextDay)}`,
      inMonth: false,
    });
    nextDay++;
  }

  const rows = [];
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7));
  }
  return rows;
}

function buildYearMonthRows(year, month) {
  const { daysInMonth, firstWeekday } = getMonthMeta(
    `${year}-${pad(month + 1)}-01`
  );
  const all = [];
  for (let i = 0; i < firstWeekday; i++) {
    all.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    all.push({
      day,
      date: `${year}-${pad(month + 1)}-${pad(day)}`,
    });
  }
  const rows = [];
  for (let i = 0; i < all.length; i += 7) {
    const row = all.slice(i, i + 7);
    while (row.length < 7) row.push(null);
    rows.push(row);
  }
  return rows;
}

function buildYearMonths(year) {
  const months = [];
  for (let m = 0; m < 12; m++) {
    months.push({
      month: m,
      label: `${m + 1}月`,
      rows: buildYearMonthRows(year, m),
    });
  }
  return months;
}

function formatHeader(dateStr, view) {
  const d = parseDate(dateStr);
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  if (view === "year") return `${y}年`;
  if (view === "month") return `${y}年${m}月`;
  return `${y}年${m}月${day}日 ${weekdays[d.getDay()]}`;
}

function compareTime(a, b) {
  return String(a || "00:00").localeCompare(String(b || "00:00"));
}

module.exports = {
  pad,
  formatDate,
  parseDate,
  todayStr,
  addDays,
  addMonths,
  addYears,
  isSameDay,
  getWeekday,
  getMonthMeta,
  buildMonthGrid,
  buildYearMonths,
  formatHeader,
  compareTime,
};
