import { formatDateToISO } from "@/domain/bucksLogic";
import { UI_COPY, type UiCopy } from "@/i18n";
import type { Palette } from "@/theme/colors";

export const DEFAULT_LOCALE = "en-US";

export function formatCreatedTime(createdAt?: string): string {
  if (!createdAt) return "-";
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return createdAt;
  return date.toLocaleTimeString(DEFAULT_LOCALE, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export function formatDateGroupLabel(
  rawDate: string,
  copy: UiCopy = UI_COPY.es,
): string {
  const date = new Date(rawDate);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const locale = copy.languageCode === "en" ? "en-US" : DEFAULT_LOCALE;
  const shortDate = date
    .toLocaleDateString(locale, { month: "short", day: "2-digit" })
    .toUpperCase();

  if (formatDateToISO(date) === formatDateToISO(today))
    return `${copy.today} - ${shortDate}`;
  if (formatDateToISO(date) === formatDateToISO(yesterday))
    return `${copy.yesterday} - ${shortDate}`;
  return date
    .toLocaleDateString(locale, {
      month: "short",
      day: "2-digit",
      year: "numeric",
    })
    .toUpperCase();
}

const TYPE_CONFIG: Record<string, { colorKey: "green" | "red" | "yellow"; fillKey: "incomeSoft" | "expenseSoft" | "warnSoft" }> = {
  "INGRESO FRECUENTE": { colorKey: "green", fillKey: "incomeSoft" },
  "INGRESO NO FRECUENTE": { colorKey: "green", fillKey: "incomeSoft" },
  "GASTO FRECUENTE": { colorKey: "red", fillKey: "expenseSoft" },
  "GASTO NO FRECUENTE": { colorKey: "yellow", fillKey: "warnSoft" },
};

const TYPE_LABELS: Record<string, { short: keyof UiCopy; full: keyof UiCopy }> = {
  "INGRESO FRECUENTE": { short: "freqIncome", full: "freqIncomeFull" },
  "INGRESO NO FRECUENTE": { short: "nonFreqIncome", full: "nonFreqIncomeFull" },
  "GASTO FRECUENTE": { short: "freqExpense", full: "freqExpenseFull" },
  "GASTO NO FRECUENTE": { short: "nonFreqExpense", full: "nonFreqExpenseFull" },
};

export function typeColor(type: string, colors: Palette): string {
  const cfg = TYPE_CONFIG[type];
  return cfg ? colors[cfg.colorKey] : colors.yellow;
}

export function typeFill(type: string, colors: Palette): string {
  const cfg = TYPE_CONFIG[type];
  return cfg ? colors[cfg.fillKey] : colors.warnSoft;
}

export function typeLabel(type: string, copy: UiCopy) {
  const labels = TYPE_LABELS[type];
  return labels ? copy[labels.short] : copy.nonFreqExpense;
}

export function typeLabelFull(type: string, copy: UiCopy) {
  const labels = TYPE_LABELS[type];
  return labels ? copy[labels.full] : copy.nonFreqExpenseFull;
}
