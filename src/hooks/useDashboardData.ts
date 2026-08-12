import { useMemo } from "react";
import type { SummaryRow, Tag, Transaction } from "@/types";
import type { Palette } from "@/theme/colors";
import type { UiCopy } from "@/i18n";
import { UI_MONTH_NAMES } from "@/i18n";
import { getMonthYear } from "@/utils/dateUtils";
import {
  aggregateExpensesByTag,
  aggregateIncomesByTag,
  calculateMonthSummary,
  getTransactionMonthKey,
  type PieSlice,
} from "@/domain/bucksLogic";

export interface DashboardData {
  monthKey: string;
  prevMonthKey: string;
  monthTransactions: Transaction[];
  prevMonthTransactions: Transaction[];
  summary: SummaryRow;
  prevSummary: SummaryRow;
  expensePieData: PieSlice[];
  incomePieData: PieSlice[];
  recentTransactions: Transaction[];
  savingsRate: string;
  balanceChange: number;
  vsPrev: string;
  vsPrevPositive: boolean;
}

export function useDashboardData(
  allTransactions: Transaction[],
  month: number,
  year: number,
  tagColorMap: Record<string, string>,
  tagsList: Tag[],
  colors: Palette,
  copy: UiCopy,
): DashboardData {
  const localizedMonthNames = copy.languageCode === "en" ? UI_MONTH_NAMES.en : UI_MONTH_NAMES.es;
  const monthKey = `${localizedMonthNames[month]} ${year}`;
  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear = month === 0 ? year - 1 : year;
  const prevMonthName = UI_MONTH_NAMES[copy.languageCode === "en" ? "en" : "es"][prevMonth];
  const prevMonthKey = `${prevMonthName} ${prevYear}`;

  const transactionsByMonth = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const tx of allTransactions) {
      const key = getTransactionMonthKey(tx);
      const list = map.get(key);
      if (list) list.push(tx);
      else map.set(key, [tx]);
    }
    return map;
  }, [allTransactions]);

  const monthTransactions = useMemo(
    () => transactionsByMonth.get(getMonthYear(new Date(year, month, 1))) ?? [],
    [transactionsByMonth, year, month],
  );
  const prevMonthTransactions = useMemo(
    () => transactionsByMonth.get(getMonthYear(new Date(prevYear, prevMonth, 1))) ?? [],
    [transactionsByMonth, prevYear, prevMonth],
  );

  const summary = useMemo<SummaryRow>(
    () => {
      const emptyFreq: Record<string, number> = {};
      return calculateMonthSummary(monthTransactions, emptyFreq, monthKey);
    },
    [monthTransactions, monthKey],
  );

  const prevSummary = useMemo<SummaryRow>(
    () => {
      const emptyFreq: Record<string, number> = {};
      return calculateMonthSummary(prevMonthTransactions, emptyFreq, prevMonthKey);
    },
    [prevMonthTransactions, prevMonthKey],
  );

  const expensePieData = useMemo<PieSlice[]>(
    () => aggregateExpensesByTag(monthTransactions, tagColorMap, tagsList, colors.muted, copy.otherLabel),
    [monthTransactions, tagColorMap, tagsList, colors.muted, copy.otherLabel],
  );

  const incomePieData = useMemo<PieSlice[]>(
    () => aggregateIncomesByTag(monthTransactions, tagColorMap, tagsList, colors.income, copy.otherLabel),
    [monthTransactions, tagColorMap, tagsList, colors.income, copy.otherLabel],
  );

  const recentTransactions = useMemo(
    () => allTransactions.slice(-7).reverse(),
    [allTransactions],
  );

  const savingsRate = summary.totalIncome > 0
    ? `${Math.round(summary.netMonthly / summary.totalIncome * 100)}%`
    : "—";
  const prev = prevSummary.netMonthly;
  const balanceChange = prev !== 0
    ? Math.round((summary.netMonthly - prev) / Math.abs(prev) * 100)
    : (summary.netMonthly !== 0 ? 100 : 0);
  const vsPrev = prev !== 0 ? (balanceChange >= 0 ? `+${balanceChange}%` : `${balanceChange}%`) : "—";
  const vsPrevPositive = prev !== 0 ? balanceChange >= 0 : summary.netMonthly >= 0;

  return {
    monthKey,
    prevMonthKey,
    monthTransactions,
    prevMonthTransactions,
    summary,
    prevSummary,
    expensePieData,
    incomePieData,
    recentTransactions,
    savingsRate,
    balanceChange,
    vsPrev,
    vsPrevPositive,
  };
}
