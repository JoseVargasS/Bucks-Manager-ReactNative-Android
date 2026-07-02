import { MONTH_NAMES_EN } from "@/i18n";

const SHORT_MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

const MONTH_ABBR: Record<string, number> = {
  jan: 0, ene: 0,
  feb: 1,
  mar: 2,
  apr: 3, abr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7, ago: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11, dic: 11,
};

export function formatDateToISO(date: Date | string): string {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function formatDateForSheet(date: Date): string {
  return `${String(date.getDate()).padStart(2, "0")}-${SHORT_MONTHS[date.getMonth()]}-${String(date.getFullYear()).slice(-2)}`;
}

export function parseSpanishDate(value: string): Date | null {
  const parts = value.split("-");
  if (parts.length !== 3) return null;
  const month = MONTH_ABBR[parts[1].toLowerCase()];
  if (month === undefined) return null;
  const day = Number(parts[0]);
  let year = Number(parts[2]);
  if (!Number.isInteger(day) || !Number.isInteger(year) || day < 1) return null;
  if (year >= 0 && year < 100) year += 2000;
  const date = new Date(year, month, day);
  return date.getFullYear() === year && date.getMonth() === month && date.getDate() === day
    ? date
    : null;
}

const MONTH_NAMES = MONTH_NAMES_EN;

export function getMonthYear(date: Date): string {
  return `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
}

export function parseCreatedAtMs(createdAt?: string): number {
  if (!createdAt) return 0;
  const timeMatch = createdAt.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (timeMatch) {
    const h = parseInt(timeMatch[1], 10);
    const m = parseInt(timeMatch[2], 10);
    const s = timeMatch[3] ? parseInt(timeMatch[3], 10) : 0;
    return h * 3600000 + m * 60000 + s * 1000;
  }
  return Date.parse(createdAt) || 0;
}

function isValidDraftDate(value: string): boolean {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(`${value}T00:00:00`);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

export { isValidDraftDate };

function parseLocalDate(rawDate: string): Date {
  if (!rawDate) return new Date(NaN);
  const isoMatch = rawDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]) - 1;
    const day = Number(isoMatch[3]);
    return new Date(year, month, day);
  }
  return new Date(rawDate);
}

function monthYearToDate(monthYear: string): Date {
  const [monthName, year] = monthYear.split(" ");
  const month = MONTH_NAMES.findIndex((name) => name.toLowerCase() === monthName.toLowerCase());
  return new Date(Number(year), Math.max(0, month), 1);
}

export { parseLocalDate, monthYearToDate };
