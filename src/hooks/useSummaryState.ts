import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Animated } from "react-native";
import {
  aggregateExpensesByTag, calculateSummaries, detectNonFreqSpike,
  formatMoney, groupSummariesByYear, MONTH_NAMES, type PieSlice,
  type SavingsTrendMode,
} from "@/domain/bucksLogic";
import { UI_MONTH_NAMES, type UiCopy } from "@/i18n";
import { type Palette } from "@/theme/colors";
import { type SummaryRow, type Tag, type Transaction } from "@/types";
import { monthIndex, monthLabel, emptySummary } from "@/components/screens/summaryHelpers";
import type { MonthTagBreakdownHandle } from "@/components/modals/MonthTagBreakdownModal";

const ALL_YEARS = -1;

export function useSummaryState({
  summaries, transactions, freqIncome, tagsList, availableYears, currencySymbol, colors, copy,
}: {
  summaries: SummaryRow[]; transactions: Transaction[]; freqIncome: Record<string, number>;
  tagsList: Tag[]; availableYears: number[]; currencySymbol: string; colors: Palette; copy: UiCopy;
}) {
  const scrollYRef = useRef<Animated.Value | null>(null);
  if (!scrollYRef.current) scrollYRef.current = new Animated.Value(0);
  const scrollY = scrollYRef.current;
  const [scrolled, setScrolled] = useState(false);
  const initialYear = availableYears[0] || new Date().getFullYear();
  const [filterYear, setFilterYear] = useState(initialYear);
  const [kpiSegment, setKpiSegment] = useState("general");
  const [compSegment, setCompSegment] = useState("expense");
  const [trendMode, setTrendMode] = useState<SavingsTrendMode>("income");
  const tagBreakdownRef = useRef<MonthTagBreakdownHandle>(null);

  const computed = useMemo(
    () => (summaries.length ? summaries : calculateSummaries(transactions, freqIncome)),
    [summaries, transactions, freqIncome],
  );
  const isAllYears = filterYear === ALL_YEARS;

  useEffect(() => {
    if (!isAllYears && !availableYears.includes(filterYear))
      setFilterYear(availableYears[0] || new Date().getFullYear());
  }, [availableYears, filterYear, isAllYears]);

  const filtered = useMemo(() => {
    if (isAllYears) return [...computed].sort((a, b) => monthIndex(a) - monthIndex(b));
    return computed
      .filter((row) => Number(row.monthYear.split(" ").pop()) === filterYear)
      .sort((a, b) => monthIndex(a) - monthIndex(b));
  }, [computed, isAllYears, filterYear]);

  const yearTransactions = useMemo(() => {
    if (isAllYears) return transactions;
    return transactions.filter((tx) => {
      const d = tx.rawDateMs != null ? new Date(tx.rawDateMs) : new Date(tx.rawDate);
      return d.getFullYear() === filterYear;
    });
  }, [transactions, isAllYears, filterYear]);

  const monthTransactionsMap = useMemo(() => {
    if (isAllYears) return new Map<string, Transaction[]>();
    const map = new Map<string, Transaction[]>();
    yearTransactions.forEach((tx) => {
      const d = tx.rawDateMs != null ? new Date(tx.rawDateMs) : new Date(tx.rawDate);
      const key = `${d.getMonth()}`;
      const list = map.get(key) || [];
      list.push(tx);
      map.set(key, list);
    });
    return map;
  }, [yearTransactions, isAllYears]);

  const tagColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    tagsList.forEach((t) => { map[t.id] = t.color; });
    return map;
  }, [tagsList]);

  const topCategoriesPieData = useMemo<PieSlice[]>(
    () => aggregateExpensesByTag(yearTransactions, tagColorMap, tagsList, colors.muted, copy.otherLabel),
    [yearTransactions, tagColorMap, tagsList, colors.muted, copy.otherLabel],
  );

  const chartRows = useMemo(() => {
    if (isAllYears) return groupSummariesByYear(filtered);
    const rowsByMonth = new Map(filtered.map((row) => [monthIndex(row), row]));
    return MONTH_NAMES.map((monthName, index) => rowsByMonth.get(index) || emptySummary(`${monthName} ${filterYear}`));
  }, [filtered, isAllYears, filterYear]);

  const totals = useMemo(() => filtered.reduce(
    (acc, row) => ({
      income: acc.income + row.totalIncome,
      expense: acc.expense + Math.abs(row.totalExpense),
      net: acc.net + row.netMonthly,
    }),
    { income: 0, expense: 0, net: 0 },
  ), [filtered]);

  const savings = totals.income > 0 ? Math.round((totals.net / totals.income) * 100) : 0;
  const averageExpense = totals.expense / Math.max(1, filtered.length);
  const positiveMonths = filtered.filter((row) => row.netMonthly >= 0).length;
  const bestMonth = filtered.reduce<SummaryRow | null>((best, row) => !best || row.netMonthly > best.netMonthly ? row : best, null);
  const bestIncomeMonth = filtered.reduce<SummaryRow | null>((best, row) => !best || row.totalIncome > best.totalIncome ? row : best, null);
  const highestExpenseMonth = filtered.reduce<SummaryRow | null>((max, row) => !max || Math.abs(row.totalExpense) > Math.abs(max.totalExpense) ? row : max, null);
  const avgIncome = totals.income / Math.max(1, filtered.length);
  const avgIncomeThreshold = avgIncome * 0.7;
  const stableMonths = filtered.filter((row) => row.totalIncome >= avgIncomeThreshold).length;

  const incomeBreakdown = [
    { label: copy.freqIncomeFull, value: filtered.reduce((sum, row) => sum + row.freqIncome, 0), color: colors.income },
    { label: copy.nonFreqIncomeFull, value: filtered.reduce((sum, row) => sum + row.nonFreqIncome, 0), color: colors.info },
  ];
  const expenseBreakdown = [
    { label: copy.freqExpenseFull, value: filtered.reduce((sum, row) => sum + Math.abs(row.freqExpense), 0), color: colors.expense },
    { label: copy.nonFreqExpenseFull, value: filtered.reduce((sum, row) => sum + Math.abs(row.nonFreqExpense), 0), color: colors.warn },
  ];
  const fm = (value: number) => formatMoney(value, currencySymbol, 0).replace("+ ", "");

  const handleMonthPress = useCallback((row: SummaryRow) => {
    if (isAllYears) return;
    const mi = monthIndex(row);
    const monthTxs = monthTransactionsMap.get(`${mi}`) || [];
    const label = monthLabel(row, copy.languageCode);
    tagBreakdownRef.current?.open(label, monthTxs);
  }, [monthTransactionsMap, copy.languageCode, isAllYears]);

  const handleBarSelectMonth = useCallback((monthYear: string) => {
    const row = chartRows.find((r) => r.monthYear === monthYear);
    if (!row) return;
    const mi = monthIndex(row);
    const monthTxs = monthTransactionsMap.get(`${mi}`) || [];
    if (!isAllYears && monthTxs.length > 0) {
      const label = monthLabel(row, copy.languageCode);
      tagBreakdownRef.current?.open(label, monthTxs);
    }
  }, [chartRows, monthTransactionsMap, copy.languageCode, isAllYears]);

  const nonFreqAlert = useMemo(() => {
    if (isAllYears) return null;
    const spike = detectNonFreqSpike(filtered);
    if (!spike) return null;
    const [monthName] = spike.monthYear.split(" ");
    const mi = MONTH_NAMES.findIndex((name) => name.toLowerCase() === (monthName || "").toLowerCase());
    const label = UI_MONTH_NAMES[copy.languageCode === "en" ? "en" : "es"][Math.max(0, mi)];
    return { monthLabel: label, amount: spike.amount, avg: spike.avg, pct: spike.ratioPct };
  }, [filtered, copy.languageCode, isAllYears]);

  const yearOptions = useMemo(() => {
    const opts = availableYears.map((year) => ({ label: String(year), value: String(year) }));
    return [{ label: copy.allYears, value: String(ALL_YEARS) }, ...opts];
  }, [availableYears, copy.allYears]);

  const kpiSegmentOptions = useMemo(() => [
    { key: "general", label: copy.general },
    { key: "income", label: copy.income },
    { key: "expense", label: copy.expensesLabel },
  ], [copy.general, copy.income, copy.expensesLabel]);

  const compSegmentOptions = useMemo(() => [
    { key: "expense", label: copy.expensesLabel },
    { key: "income", label: copy.income },
  ], [copy.expensesLabel, copy.income]);

  const trendSegmentOptions = useMemo(() => [
    { key: "income", label: copy.income },
    { key: "expense", label: copy.expensesLabel },
  ], [copy.income, copy.expensesLabel]);

  const subLabel = isAllYears
    ? `${chartRows.length} ${copy.yearsAnalyzed} (${filtered.length} ${filtered.length === 1 ? copy.monthsAnalyzedSingular : copy.monthsAnalyzed})`
    : `${filtered.length} ${copy.monthsAnalyzed}`;

  return {
    scrollY, scrolled, setScrolled,
    filterYear, setFilterYear,
    kpiSegment, setKpiSegment,
    compSegment, setCompSegment,
    trendMode, setTrendMode,
    tagBreakdownRef, isAllYears,
    filtered, yearTransactions, monthTransactionsMap,
    tagColorMap, topCategoriesPieData, chartRows,
    totals, savings, averageExpense, positiveMonths,
    bestMonth, bestIncomeMonth, highestExpenseMonth, avgIncome, stableMonths,
    incomeBreakdown, expenseBreakdown,
    fm, handleMonthPress, handleBarSelectMonth,
    nonFreqAlert, yearOptions,
    kpiSegmentOptions, compSegmentOptions, trendSegmentOptions,
    subLabel,
  };
}
