import type { Transaction } from "../types";
import type { ExportConfig } from "../components/modals/ExportModal";
import { MONTH_NAMES } from "../domain/bucksLogic";

export function buildExportFileName(cfg: ExportConfig) {
  const fmtDate = (value: string) => value;
  const fmtMonth = (value: string) => {
    const [year, month] = value.split("-").map(Number);
    if (!year || !month) return "mes";
    const name = (MONTH_NAMES[month - 1] || "mes").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    return `${name}-${year}`;
  };
  const fmt = cfg.rangeMode === "months" ? fmtMonth : fmtDate;
  const start = cfg.startDate ? `desde_${fmt(cfg.startDate)}` : "";
  const end = cfg.endDate ? `hasta_${fmt(cfg.endDate)}` : "";
  const range = cfg.startDate && cfg.endDate ? `${fmt(cfg.startDate)}_a_${fmt(cfg.endDate)}` : start || end || "todo";
  return `bucks-manager_${range}`;
}

export function getPeriodRange(transactions: Transaction[]) {
  const today = new Date();
  const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  let first: Date | null = null;
  let last: Date | null = null;
  for (const tx of transactions) {
    const date = new Date(tx.rawDate);
    if (Number.isNaN(date.getTime()) || date > today) continue;
    if (!first || date < first) first = date;
    if (!last || date > last) last = date;
  }
  if (!first || !last) {
    return {
      minYear: currentMonthStart.getFullYear(),
      minMonth: currentMonthStart.getMonth(),
      maxYear: currentMonthStart.getFullYear(),
      maxMonth: currentMonthStart.getMonth(),
    };
  }
  return {
    minYear: first.getFullYear(),
    minMonth: first.getMonth(),
    maxYear: last.getFullYear(),
    maxMonth: last.getMonth(),
  };
}

export function getAvailableMonthsForYear(year: number, range: ReturnType<typeof getPeriodRange>) {
  if (year < range.minYear || year > range.maxYear) return [];
  const start = year === range.minYear ? range.minMonth : 0;
  const end = year === range.maxYear ? range.maxMonth : 11;
  return Array.from({ length: Math.max(0, end - start + 1) }, (_, index) => start + index);
}

export function detectDeviceLanguage(): "es" | "en" {
  return (Intl.DateTimeFormat().resolvedOptions().locale || "es").toLowerCase().startsWith("es") ? "es" : "en";
}

export function detectDeviceCurrencySymbol() {
  const rawLocale = Intl.DateTimeFormat().resolvedOptions().locale || "";
  const parts = rawLocale.split("-");
  const region = parts.find((p) => /^[A-Z]{2}$/.test(p))?.toUpperCase();
  const lang = parts[0]?.toLowerCase();
  if (region) {
    const regionMap: Record<string, string> = {
      PE: "S/",
      US: "$",
      EC: "$",
      PA: "$",
      SV: "$",
      ES: "\u20ac",
      FR: "\u20ac",
      DE: "\u20ac",
      IT: "\u20ac",
      PT: "\u20ac",
      GB: "\u00a3",
      JP: "\u00a5",
      BR: "R$",
      MX: "MX$",
      CO: "COP$",
      CL: "CLP$",
      AR: "ARS$",
      UY: "UYU$",
      BO: "BOB",
      PY: "Gs.",
      CR: "\u20a1",
      DO: "RD$",
      GT: "GTQ",
      HN: "HNL",
      NI: "NIO",
      CA: "CA$",
      AU: "A$",
      NZ: "NZ$",
      CN: "\u00a5",
      KR: "\u20a9",
      IN: "\u20b9",
      RU: "\u20bd",
      ZA: "R",
      TR: "\u20ba",
      CH: "CHF",
      VE: "VES",
      CU: "CUP",
    };
    if (regionMap[region]) return regionMap[region];
  }
  if (lang) {
    const langMap: Record<string, string> = {
      es: "S/",
      en: "$",
      pt: "R$",
      fr: "\u20ac",
      de: "\u20ac",
      it: "\u20ac",
      nl: "\u20ac",
      ja: "\u00a5",
      ko: "\u20a9",
      zh: "\u00a5",
      ru: "\u20bd",
      ar: "\ufdfc",
      hi: "\u20b9",
    };
    if (langMap[lang]) return langMap[lang];
  }
  return "$";
}

