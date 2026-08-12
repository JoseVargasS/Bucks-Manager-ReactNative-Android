import type { SummaryRow, Transaction } from "@/types";
import { getMonthYear, parseLocalDate, monthYearToDate } from "@/utils/dateUtils";

export type MonthSummary = SummaryRow;

export function calculateMonthSummary(
  transactions: Transaction[],
  freqIncomeByMonth: Record<string, number>,
  monthKey: string,
): SummaryRow {
  const row: SummaryRow = {
    monthYear: monthKey,
    freqIncome: 0,
    nonFreqIncome: 0,
    totalIncome: 0,
    freqExpense: 0,
    nonFreqExpense: 0,
    totalExpense: 0,
    netMonthly: 0,
    netNoFreq: 0,
  };
  transactions.forEach((tx) => {
    if (tx.type === "INGRESO FRECUENTE") row.freqIncome += Number(tx.amount) || 0;
    if (tx.type === "INGRESO NO FRECUENTE") row.nonFreqIncome += Number(tx.amount) || 0;
    if (tx.type === "GASTO FRECUENTE") row.freqExpense += Number(tx.amount) || 0;
    if (tx.type === "GASTO NO FRECUENTE") row.nonFreqExpense += Number(tx.amount) || 0;
  });
  if (row.freqIncome === 0) {
    row.freqIncome = freqIncomeByMonth[monthKey] || 0;
  }
  row.totalIncome = row.freqIncome + row.nonFreqIncome;
  row.totalExpense = row.freqExpense + row.nonFreqExpense;
  row.netMonthly = row.totalIncome + row.totalExpense;
  row.netNoFreq = row.totalIncome + row.totalExpense - row.freqIncome;
  return row;
}

export function getTransactionMonthKey(tx: Transaction): string {
  const date = tx.rawDateMs != null ? new Date(tx.rawDateMs) : parseLocalDate(tx.rawDate);
  return getMonthYear(date);
}

export function recalculateSummariesForMonths(
  transactions: Transaction[],
  freqIncomeByMonth: Record<string, number>,
  monthKeys: string[],
  existingSummaries: SummaryRow[],
): SummaryRow[] {
  if (monthKeys.length === 0) return existingSummaries;
  const monthSet = new Set(monthKeys);
  const byMonth = new Map<string, Transaction[]>();
  transactions.forEach((tx) => {
    const key = getTransactionMonthKey(tx);
    if (!monthSet.has(key)) return;
    const list = byMonth.get(key);
    if (list) list.push(tx);
    else byMonth.set(key, [tx]);
  });
  const updated = existingSummaries.map((row) =>
    monthSet.has(row.monthYear)
      ? calculateMonthSummary(byMonth.get(row.monthYear) || [], freqIncomeByMonth, row.monthYear)
      : row,
  );
  monthKeys.forEach((key) => {
    if (!updated.some((row) => row.monthYear === key)) {
      updated.push(calculateMonthSummary(byMonth.get(key) || [], freqIncomeByMonth, key));
    }
  });
  updated.sort((a, b) => monthYearToDate(a.monthYear).getTime() - monthYearToDate(b.monthYear).getTime());
  return updated;
}

export function uniqueMonthKeys(transactions: Transaction[]): string[] {
  const set = new Set<string>();
  transactions.forEach((tx) => set.add(getTransactionMonthKey(tx)));
  return Array.from(set);
}

export function calculateSummaries(
  transactions: Transaction[],
  freqIncomeByMonth: Record<string, number>,
): SummaryRow[] {
  const byMonth = new Map<string, Transaction[]>();
  transactions.forEach((tx) => {
    const key = getTransactionMonthKey(tx);
    const list = byMonth.get(key);
    if (list) list.push(tx);
    else byMonth.set(key, [tx]);
  });

  const monthKeys = new Set<string>(byMonth.keys());
  Object.keys(freqIncomeByMonth).forEach((key) => monthKeys.add(key));

  const rows = Array.from(monthKeys).map((monthKey) =>
    calculateMonthSummary(byMonth.get(monthKey) || [], freqIncomeByMonth, monthKey),
  );
  rows.sort((a, b) => monthYearToDate(a.monthYear).getTime() - monthYearToDate(b.monthYear).getTime());
  return rows;
}

export function groupSummariesByYear(monthlyRows: SummaryRow[]): SummaryRow[] {
  if (!monthlyRows.length) return [];
  const byYear = new Map<number, SummaryRow>();
  monthlyRows.forEach((row) => {
    const y = Number(row.monthYear.split(" ").pop()) || 0;
    const existing = byYear.get(y);
    if (existing) {
      existing.freqIncome += row.freqIncome;
      existing.nonFreqIncome += row.nonFreqIncome;
      existing.totalIncome += row.totalIncome;
      existing.freqExpense += row.freqExpense;
      existing.nonFreqExpense += row.nonFreqExpense;
      existing.totalExpense += row.totalExpense;
      existing.netMonthly += row.netMonthly;
      existing.netNoFreq += row.netNoFreq;
    } else {
      byYear.set(y, { ...row, monthYear: `Year ${y}` });
    }
  });
  return Array.from(byYear.values()).sort(
    (a, b) => Number((a.monthYear.split(" ")[1] || "0")) - Number((b.monthYear.split(" ")[1] || "0")),
  );
}
