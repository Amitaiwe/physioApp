// format.js — עזרי תאריך/שעה, בעברית, עם תמיכה בשבוע א'-ה'

export const DAY_NAMES = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
export const WORK_DAYS = [0, 1, 2, 3, 4]; // א'-ה' (0=ראשון ... 4=חמישי)
export const START_HOUR = 8;
export const END_HOUR = 20;

export function startOfWeek(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  d.setDate(d.getDate() - day); // חוזר ליום ראשון
  return d;
}

export function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

export function toDateKey(date) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatHeaderDate(date) {
  return new Intl.DateTimeFormat("he-IL", { day: "numeric", month: "short" }).format(date);
}

export function hourLabel(hour) {
  return `${String(hour).padStart(2, "0")}:00`;
}

export function minutesToDuration(mins) {
  if (mins < 60) return `${mins} דק'`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h} שעות` : `${h}:${String(m).padStart(2, "0")} שעות`;
}

export function wazeUrl(address) {
  return `https://waze.com/ul?q=${encodeURIComponent(address)}&navigate=yes`;
}

export function telUrl(phone) {
  return `tel:${phone.replace(/[^0-9+]/g, "")}`;
}
