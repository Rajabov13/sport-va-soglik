import { INTL_LOCALE, isLocale, type Locale } from "@/i18n/config";

type DateInput = Date | string | number;

const toDate = (d: DateInput) => (d instanceof Date ? d : new Date(d));
const resolve = (locale: Locale | string): Locale => (isLocale(locale) ? locale : "uz");

/** All dates render in one product time zone so server and client output match (no hydration drift). */
export const APP_TIME_ZONE = process.env.NEXT_PUBLIC_APP_TIMEZONE || "Asia/Tashkent";

const partsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: APP_TIME_ZONE,
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  hourCycle: "h23",
});

/** Calendar parts of a date in the app time zone. */
export function zonedParts(d: Date) {
  const get = (type: string) => Number(partsFormatter.formatToParts(d).find((p) => p.type === type)?.value ?? 0);
  return { year: get("year"), month: get("month") - 1, day: get("day"), hour: get("hour") % 24, minute: get("minute") };
}

/** Midnight of the current day in the app time zone, as a UTC instant. */
export function startOfToday(now = new Date()) {
  const p = zonedParts(now);
  const elapsedMs = ((p.hour * 60 + p.minute) * 60 + now.getUTCSeconds()) * 1000 + now.getUTCMilliseconds();
  return new Date(now.getTime() - elapsedMs);
}

/*
 * Uzbek is formatted by hand: several browser ICU builds ship without Uzbek data
 * (they render "M07 13"), which would also cause server/client hydration mismatches.
 */
const UZ_MONTHS_SHORT = ["yan", "fev", "mar", "apr", "may", "iyn", "iyl", "avg", "sen", "okt", "noy", "dek"];
const pad = (n: number) => String(n).padStart(2, "0");

function uzDate(d: Date, opts: Intl.DateTimeFormatOptions) {
  const z = zonedParts(d);
  const parts: string[] = [];
  if (opts.day || opts.month) {
    let s = "";
    if (opts.day) s += String(z.day);
    if (opts.month) s += `${opts.day ? "-" : ""}${UZ_MONTHS_SHORT[z.month]}`;
    parts.push(s);
  }
  if (opts.year) parts.push(String(z.year));
  const date = parts.join(", ");
  const time = opts.hour ? `${pad(z.hour)}:${pad(z.minute)}` : "";
  return [date, time].filter(Boolean).join(", ");
}

export function formatDate(locale: Locale | string, date: DateInput, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }) {
  const l = resolve(locale);
  const d = toDate(date);
  if (l === "uz") return uzDate(d, opts);
  return new Intl.DateTimeFormat(INTL_LOCALE[l], { ...opts, timeZone: APP_TIME_ZONE }).format(d);
}

export function formatDateTime(locale: Locale | string, date: DateInput) {
  return formatDate(locale, date, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function formatTime(_locale: Locale | string, date: DateInput) {
  const z = zonedParts(toDate(date));
  return `${pad(z.hour)}:${pad(z.minute)}`;
}

export function formatNumber(locale: Locale | string, n: number, opts?: Intl.NumberFormatOptions) {
  const l = resolve(locale);
  // Uzbek uses space grouping and a decimal comma, like Russian; compact notation falls back to K/M.
  const intl = l === "uz" ? (opts?.notation === "compact" ? "en-US" : "ru-RU") : INTL_LOCALE[l];
  return new Intl.NumberFormat(intl, opts).format(n);
}

const UZ_UNITS: Record<Intl.RelativeTimeFormatUnit, string> = {
  second: "soniya", seconds: "soniya", minute: "daqiqa", minutes: "daqiqa", hour: "soat", hours: "soat", day: "kun", days: "kun",
  week: "hafta", weeks: "hafta", month: "oy", months: "oy", quarter: "chorak", quarters: "chorak", year: "yil", years: "yil",
};

function uzRelative(value: number, unit: Intl.RelativeTimeFormatUnit) {
  if (unit === "second" && Math.abs(value) < 45) return "hozirgina";
  if (unit === "day" && value === -1) return "kecha";
  if (unit === "day" && value === 1) return "ertaga";
  const n = Math.abs(value);
  return value < 0 ? `${n} ${UZ_UNITS[unit]} oldin` : `${n} ${UZ_UNITS[unit]}dan keyin`;
}

export function relativeTime(locale: Locale | string, date: DateInput) {
  const l = resolve(locale);
  const diff = (toDate(date).getTime() - Date.now()) / 1000;
  const abs = Math.abs(diff);
  let value: number;
  let unit: Intl.RelativeTimeFormatUnit;
  if (abs < 60) [value, unit] = [Math.round(diff), "second"];
  else if (abs < 3600) [value, unit] = [Math.round(diff / 60), "minute"];
  else if (abs < 86400) [value, unit] = [Math.round(diff / 3600), "hour"];
  else if (abs < 86400 * 30) [value, unit] = [Math.round(diff / 86400), "day"];
  else if (abs < 86400 * 365) [value, unit] = [Math.round(diff / (86400 * 30)), "month"];
  else [value, unit] = [Math.round(diff / (86400 * 365)), "year"];
  if (l === "uz") return uzRelative(value, unit);
  return new Intl.RelativeTimeFormat(INTL_LOCALE[l], { numeric: "auto" }).format(value, unit);
}

export function categoryName(c: { nameUz: string; nameRu: string; nameEn: string }, locale: Locale) {
  return locale === "ru" ? c.nameRu : locale === "en" ? c.nameEn : c.nameUz;
}

export function minutesToTime(m: number) {
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${pad(h)}:${pad(mm)}`;
}

export function timeToMinutes(v: string) {
  const [h, m] = v.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}
