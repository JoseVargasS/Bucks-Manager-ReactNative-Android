import { memo, useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Animated, Pressable, ScrollView, View } from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

import { aggregateExpensesByTag, calculateSummaries, detectNonFreqSpike, formatMoney, groupSummariesByYear, MONTH_NAMES, type PieSlice } from "@/domain/bucksLogic";
import { UI_MONTH_NAMES, type UiCopy } from "@/i18n";
import { base } from "@/styles/baseStyles";
import { summaryStyles } from "@/components/screens/SummaryView.styles";

const styles = { ...base, ...summaryStyles };
import { type Palette } from "@/theme/colors";
import { type MaterialIconName, type SummaryRow, type Tag, type Transaction } from "@/types";
import { BarChart } from "@/components/ui/BarChart";
import { Kpi } from "@/components/ui/Kpi";
import { PieChart } from "@/components/ui/PieChart";
import { Select } from "@/components/ui/Select";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Text } from "@/components/ui/AppText";
import { MonthTagBreakdownModal, type MonthTagBreakdownHandle } from "@/components/modals/MonthTagBreakdownModal";
import { SavingsLineChart } from "@/components/ui/SavingsLineChart";
import type { SavingsTrendMode } from "@/domain/bucksLogic";

const ALL_YEARS = -1;

const SummaryHeader = memo(function SummaryHeader({
  colors,
  copy,
  subLabel,
  filterYear,
  yearOptions,
  setFilterYear,
  scrollY,
}: {
  colors: Palette;
  copy: UiCopy;
  subLabel: string;
  filterYear: number;
  yearOptions: { label: string; value: string }[];
  setFilterYear: (v: number) => void;
  scrollY: Animated.Value;
}) {
  return (
    <Animated.View style={{ opacity: scrollY.interpolate({ inputRange: [0, 5], outputRange: [1, 0], extrapolate: "clamp" }) }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: "700" }}>{copy.annualOverview}</Text>
          <Text style={{ color: colors.muted, fontSize: 13, fontWeight: "500", marginTop: 2 }}>{subLabel}</Text>
        </View>
        <Select
          value={String(filterYear)}
          options={yearOptions}
          onSelect={(value) => setFilterYear(Number(value))}
          colors={colors}
          title={copy.selectYear}
          style={{ width: 124 }}
          hideArrow
          buttonStyle={{ borderRadius: 50, borderColor: "transparent", minHeight: 46 }}
        />
      </View>
    </Animated.View>
  );
});

const SummaryStickyHeader = memo(function SummaryStickyHeader({
  colors,
  copy,
  subLabel,
  filterYear,
  yearOptions,
  setFilterYear,
  scrollY,
  scrolled,
  topInset,
}: {
  colors: Palette;
  copy: UiCopy;
  subLabel: string;
  filterYear: number;
  yearOptions: { label: string; value: string }[];
  setFilterYear: (v: number) => void;
  scrollY: Animated.Value;
  scrolled: boolean;
  topInset: number;
}) {
  return (
    <Animated.View
      pointerEvents={scrolled ? "box-none" : "none"}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        paddingTop: topInset,
        paddingHorizontal: 14,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingBottom: 4,
        opacity: scrollY.interpolate({
          inputRange: [0, 5],
          outputRange: [0, 1],
          extrapolate: "clamp",
        }),
      }}
    >
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: "700" }}>{copy.annualOverview}</Text>
        <Text style={{ color: colors.muted, fontSize: 13, fontWeight: "500", marginTop: 2 }}>{subLabel}</Text>
      </View>
      <Select
        value={String(filterYear)}
        options={yearOptions}
        onSelect={(value) => setFilterYear(Number(value))}
        colors={colors}
        title={copy.selectYear}
        style={{ width: 124 }}
        hideArrow
        buttonStyle={{ borderRadius: 50, borderColor: "transparent", minHeight: 46 }}
      />
    </Animated.View>
  );
});

const SummaryMonthlyTable = memo(function SummaryMonthlyTable({
  colors,
  copy,
  filtered,
  currencySymbol,
  monthLabel,
  fm,
  handleMonthPress,
}: {
  colors: Palette;
  copy: UiCopy;
  filtered: SummaryRow[];
  currencySymbol: string;
  monthLabel: (row: SummaryRow, lang: string) => string;
  fm: (v: number) => string;
  handleMonthPress: (row: SummaryRow) => void;
}) {
  return (
    <View style={{ backgroundColor: colors.card, borderRadius: 14, overflow: "hidden" }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10 }}>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: "700" }}>{copy.monthlyDetail}</Text>
      </View>
      {filtered.length ? [...filtered].reverse().map((row, index) => (
        <Pressable
          key={row.monthYear}
          onPress={() => handleMonthPress(row)}
          style={({ pressed }) => ({
            minHeight: 74,
            paddingHorizontal: 14,
            paddingVertical: 12,
            flexDirection: "row",
            alignItems: "center",
            gap: 11,
            borderTopWidth: index === 0 ? 0 : 0.5,
            borderColor: colors.border,
            backgroundColor: pressed ? colors.input : "transparent",
          })}
        >
          <View style={{ width: 44, height: 44, borderRadius: 13, backgroundColor: colors.input, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: colors.text, fontSize: 13, fontWeight: "700" }}>{monthLabel(row, copy.languageCode).slice(0, 3).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text numberOfLines={1} style={{ color: colors.text, fontSize: 16, fontWeight: "600" }}>{monthLabel(row, copy.languageCode)}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
              <Text numberOfLines={1} style={{ color: colors.income, fontSize: 13, fontWeight: "600", fontVariant: ["tabular-nums"], flexShrink: 1 }}>{fm(row.totalIncome)}</Text>
              <Text style={{ color: colors.muted, fontSize: 11 }}>•</Text>
              <Text numberOfLines={1} style={{ color: colors.expense, fontSize: 13, fontWeight: "600", fontVariant: ["tabular-nums"], flexShrink: 1 }}>{fm(Math.abs(row.totalExpense))}</Text>
            </View>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text numberOfLines={1} style={{ color: row.netMonthly >= 0 ? colors.income : colors.expense, fontSize: 16, fontWeight: "700", fontVariant: ["tabular-nums"] }}>{formatMoney(row.netMonthly, currencySymbol, 0)}</Text>
            <Text style={{ color: colors.muted, fontSize: 13, fontWeight: "500", marginTop: 3 }}>{row.totalIncome > 0 ? Math.round((row.netMonthly / row.totalIncome) * 100) : 0}%</Text>
          </View>
        </Pressable>
      )) : (
        <Text style={{ color: colors.muted, padding: 18, textAlign: "center", fontWeight: "500" }}>{copy.noAnalysisData}</Text>
      )}
    </View>
  );
});

export const SummaryView = memo(function SummaryView({ colors, copy, summaries, transactions, freqIncome, tagsList, availableYears, topInset, currencySymbol }: {
  colors: Palette; copy: UiCopy; summaries: SummaryRow[]; transactions: Transaction[]; freqIncome: Record<string, number>;
  tagsList: Tag[]; availableYears: number[]; topInset?: number; currencySymbol: string;
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
    if (!isAllYears && !availableYears.includes(filterYear)) setFilterYear(availableYears[0] || new Date().getFullYear());
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
    return {
      monthLabel: label,
      amount: spike.amount,
      avg: spike.avg,
      pct: spike.ratioPct,
    };
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

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.pageScroll, styles.pageScrollMobile, { gap: 12 }, topInset !== undefined && { paddingTop: topInset }]}
        onScroll={(e) => { const y = e.nativeEvent.contentOffset.y; scrollY.setValue(y); setScrolled(y > 2); }}
      >
      <SummaryHeader colors={colors} copy={copy} subLabel={subLabel} filterYear={filterYear} yearOptions={yearOptions} setFilterYear={setFilterYear} scrollY={scrollY} />

      <View style={{ backgroundColor: colors.card, borderRadius: 18, padding: 18, overflow: "hidden" }}>
        <View style={{ position: "absolute", width: 150, height: 150, borderRadius: 75, right: -48, top: -68, backgroundColor: colors.primarySoft }} />
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <Text style={{ color: colors.muted, fontSize: 13, fontWeight: "600", textTransform: "uppercase" }}>{isAllYears ? copy.totalBalance : copy.annualBalance}</Text>
          <View style={{ backgroundColor: colors.primarySoft, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 }}>
            <Text style={{ color: colors.primary, fontSize: 13, fontWeight: "700", fontVariant: ["tabular-nums"] }}>{isAllYears ? copy.allYears : String(filterYear)}</Text>
          </View>
        </View>
        <Text numberOfLines={1} style={{ color: totals.net >= 0 ? colors.primary : colors.expense, fontSize: 34, fontWeight: "700", marginTop: 10, fontVariant: ["tabular-nums"] }}>
          {formatMoney(totals.net, currencySymbol, 0)}
        </Text>
        <View style={{ flexDirection: "row", gap: 10, marginTop: 18 }}>
          <Insight
            label={isAllYears ? copy.bestYear : copy.bestMonth}
            value={bestMonth
              ? (isAllYears
                  ? String(Number(bestMonth.monthYear.split(" ")[1] || 0))
                  : monthLabel(bestMonth, copy.languageCode))
              : "—"}
            icon="trophy-outline"
            color={colors.warn}
            colors={colors}
          />
          <Insight
            label={isAllYears ? copy.yearlyAverage : copy.monthlyAverage}
            value={fm(averageExpense)}
            icon="calendar-month-outline"
            color={colors.info}
            colors={colors}
          />
        </View>
      </View>

      <View style={{ backgroundColor: colors.card, borderRadius: 14, padding: 15, gap: 10 }}>
        <SegmentedControl options={kpiSegmentOptions} selected={kpiSegment} onSelect={setKpiSegment} colors={colors} />
        <View style={{ gap: 8 }}>
          {kpiSegment === "general" && (
            <>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Kpi title={copy.income} value={fm(totals.income)} icon="trending-up" color={colors.income} colors={colors} />
                <Kpi title={copy.expensesLabel} value={fm(totals.expense)} icon="trending-down" color={colors.expense} colors={colors} />
              </View>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Kpi title={copy.savingsRate} value={`${savings}%`} icon="piggy-bank" color={savings >= 0 ? colors.info : colors.expense} colors={colors} />
                <Kpi title={isAllYears ? copy.positiveYears : copy.positiveMonths} value={filtered.length ? `${positiveMonths}/${filtered.length}` : "—"} icon="check-circle-outline" color={colors.warn} colors={colors} />
              </View>
            </>
          )}
          {kpiSegment === "income" && (
            <>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Kpi title={isAllYears ? copy.bestIncomeYear : copy.bestIncomeMonth} value={bestIncomeMonth ? (isAllYears ? String(Number(bestIncomeMonth.monthYear.split(" ")[1] || 0)) : monthLabel(bestIncomeMonth, copy.languageCode)) : "—"} icon="trophy-outline" color={colors.income} colors={colors} />
                <Kpi title={copy.avgIncome} value={fm(avgIncome)} icon="cash" color={colors.income} colors={colors} />
              </View>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Kpi title={copy.incomeStability} value={filtered.length ? `${stableMonths}/${filtered.length} ${isAllYears ? copy.stableYears : copy.stableMonths}` : "—"} icon="chart-bar" color={colors.info} colors={colors} />
                <Kpi title={copy.savingsRate} value={`${savings}%`} icon="piggy-bank" color={savings >= 0 ? colors.info : colors.expense} colors={colors} />
              </View>
            </>
          )}
          {kpiSegment === "expense" && (
            <>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Kpi title={copy.expensesLabel} value={fm(totals.expense)} icon="trending-down" color={colors.expense} colors={colors} />
                <Kpi title={isAllYears ? copy.yearlyAverage : copy.monthlyAverage} value={fm(averageExpense)} icon="calendar-month-outline" color={colors.warn} colors={colors} />
              </View>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Kpi title={isAllYears ? copy.positiveYears : copy.positiveMonths} value={filtered.length ? `${positiveMonths}/${filtered.length}` : "—"} icon="check-circle-outline" color={colors.warn} colors={colors} />
                <Kpi title={copy.savingsRate} value={`${savings}%`} icon="piggy-bank" color={savings >= 0 ? colors.info : colors.expense} colors={colors} />
              </View>
            </>
          )}
        </View>
      </View>

      {nonFreqAlert && (
        <View style={{ backgroundColor: colors.card, borderRadius: 14, padding: 15 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.warnSoft, alignItems: "center", justifyContent: "center" }}>
              <MaterialCommunityIcons name="alert-outline" size={18} color={colors.warn} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontSize: 14, fontWeight: "700" }}>
                {copy.nonFreqAlert}: {nonFreqAlert.monthLabel}
              </Text>
              <Text style={{ color: colors.muted, fontSize: 12, fontWeight: "500", marginTop: 2 }}>
                {copy.nonFreqExpenseFull} {fm(nonFreqAlert.amount)} ({nonFreqAlert.pct}% vs. promedio {fm(nonFreqAlert.avg)})
              </Text>
            </View>
          </View>
        </View>
      )}

      <View style={[styles.chartCard, { backgroundColor: colors.card, alignItems: "stretch", marginBottom: 0 }]}>
        <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 10 }]}>{copy.trend}</Text>
        <SegmentedControl options={trendSegmentOptions} selected={trendMode} onSelect={(k) => setTrendMode(k as SavingsTrendMode)} colors={colors} />
        <SavingsLineChart rows={chartRows} colors={colors} language={copy.languageCode === "en" ? "en" : "es"} mode={trendMode} currencySymbol={currencySymbol} isYearly={isAllYears} />
      </View>

      <View style={[styles.chartCard, { backgroundColor: colors.card, alignItems: "stretch", marginBottom: 0 }]}>
        <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 3 }]}>{copy.monthlyActivity}</Text>
            <Text style={{ color: colors.muted, fontSize: 13, fontWeight: "500" }}>{copy.incomeVsExpenses}</Text>
          </View>
          <View style={{ gap: 5 }}>
            <Legend color={colors.income} label={copy.income} colors={colors} />
            <Legend color={colors.expense} label={copy.expensesLabel} colors={colors} />
          </View>
        </View>
        <BarChart
          rows={chartRows}
          colors={colors}
          language={copy.languageCode === "en" ? "en" : "es"}
          isYearly={isAllYears}
          currencySymbol={currencySymbol}
          onSelectMonth={tagsList.length > 0 ? handleBarSelectMonth : undefined}
        />
      </View>

      {tagsList.length > 0 && topCategoriesPieData.length > 0 && (
        <View style={{ backgroundColor: colors.card, borderRadius: 14, padding: 15 }}>
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: "700", marginBottom: 10 }}>
            {copy.topCategories}
          </Text>
          <PieChart
            data={topCategoriesPieData}
            colors={colors}
            currencySymbol={currencySymbol}
            formatValue={(v) => formatMoney(v, currencySymbol, 1).replace(/^\+ /, "")}
            totalLabel={copy.total}
          />
        </View>
      )}

      <View style={{ backgroundColor: colors.card, borderRadius: 14, padding: 15, gap: 10 }}>
        <Text style={{ color: colors.text, fontSize: 16, fontWeight: "700" }}>{copy.composition}</Text>
        <SegmentedControl options={compSegmentOptions} selected={compSegment} onSelect={setCompSegment} colors={colors} />
        {compSegment === "expense" ? (
          <CompositionContent items={expenseBreakdown} total={totals.expense} colors={colors} format={fm} />
        ) : (
          <CompositionContent items={incomeBreakdown} total={totals.income} colors={colors} format={fm} />
        )}
      </View>

      {!isAllYears && (
        <SummaryMonthlyTable
          colors={colors}
          copy={copy}
          filtered={filtered}
          currencySymbol={currencySymbol}
          monthLabel={monthLabel}
          fm={fm}
          handleMonthPress={handleMonthPress}
        />
      )}
    </ScrollView>
    {topInset !== undefined && (
      <SummaryStickyHeader
        colors={colors}
        copy={copy}
        subLabel={subLabel}
        filterYear={filterYear}
        yearOptions={yearOptions}
        setFilterYear={setFilterYear}
        scrollY={scrollY}
        scrolled={scrolled}
        topInset={topInset}
      />
    )}
    <MonthTagBreakdownModal
      ref={tagBreakdownRef}
      colors={colors}
      currencySymbol={currencySymbol}
      copy={copy}
      tagsList={tagsList}
    />
  </View>);
});

function Insight({ label, value, icon, color, colors }: { label: string; value: string; icon: MaterialIconName; color: string; colors: Palette }) {
  return (
    <View style={{ flex: 1, minWidth: 0, backgroundColor: colors.input, borderRadius: 13, padding: 12 }}>
      <MaterialCommunityIcons name={icon} size={18} color={color} />
      <Text numberOfLines={1} style={{ color: colors.muted, fontSize: 11, fontWeight: "600", textTransform: "uppercase", marginTop: 8 }}>{label}</Text>
      <Text numberOfLines={1} style={{ color: colors.text, fontSize: 15, fontWeight: "700", marginTop: 3, fontVariant: ["tabular-nums"] }}>{value}</Text>
    </View>
  );
}

function Legend({ color, label, colors }: { color: string; label: string; colors: Palette }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
      <View style={{ width: 8, height: 8, borderRadius: 3, backgroundColor: color }} />
      <Text style={{ color: colors.muted, fontSize: 11, fontWeight: "600" }}>{label}</Text>
    </View>
  );
}

function CompositionContent({ items, total, colors, format }: {
  items: { label: string; value: number; color: string }[];
  total: number;
  colors: Palette;
  format: (value: number) => string;
}) {
  const safeTotal = total || 1;
  return (
    <>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <Text numberOfLines={1} style={{ color: colors.text, fontSize: 15, fontWeight: "700", fontVariant: ["tabular-nums"] }}>{format(total)}</Text>
      </View>
      <View style={{ height: 9, borderRadius: 999, overflow: "hidden", backgroundColor: colors.input, flexDirection: "row" }}>
        {items.map((item) => item.value > 0 && <View key={item.label} style={{ flex: item.value / safeTotal, backgroundColor: item.color }} />)}
      </View>
      <View style={{ gap: 8 }}>
        {items.map((item) => (
          <View key={item.label} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View style={{ width: 9, height: 9, borderRadius: 3, backgroundColor: item.color }} />
            <Text numberOfLines={1} style={{ flex: 1, color: colors.muted, fontSize: 13, fontWeight: "500" }}>{item.label}</Text>
            <Text style={{ color: item.color, fontSize: 13, fontWeight: "700", fontVariant: ["tabular-nums"] }}>{format(item.value)}</Text>
          </View>
        ))}
      </View>
    </>
  );
}

function monthIndex(row: SummaryRow) {
  const name = row.monthYear.split(" ")[0];
  return Math.max(0, MONTH_NAMES.findIndex((month) => month.toLowerCase() === name.toLowerCase()));
}

function monthLabel(row: SummaryRow, language: string) {
  return UI_MONTH_NAMES[language === "en" ? "en" : "es"][monthIndex(row)];
}

function emptySummary(monthYear: string): SummaryRow {
  return { monthYear, freqIncome: 0, nonFreqIncome: 0, totalIncome: 0, freqExpense: 0, nonFreqExpense: 0, totalExpense: 0, netMonthly: 0, netNoFreq: 0 };
}
