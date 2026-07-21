import { MONTH_NAMES } from "@/domain/bucksLogic";
import { UI_MONTH_NAMES } from "@/i18n";
import type { SummaryRow } from "@/types";

export function monthIndex(row: SummaryRow) {
  const name = row.monthYear.split(" ")[0];
  return Math.max(0, MONTH_NAMES.findIndex((month) => month.toLowerCase() === name.toLowerCase()));
}

export function monthLabel(row: SummaryRow, language: string) {
  return UI_MONTH_NAMES[language === "en" ? "en" : "es"][monthIndex(row)];
}

export function emptySummary(monthYear: string): SummaryRow {
  return { monthYear, freqIncome: 0, nonFreqIncome: 0, totalIncome: 0, freqExpense: 0, nonFreqExpense: 0, totalExpense: 0, netMonthly: 0, netNoFreq: 0 };
}
