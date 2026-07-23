import { memo } from "react";
import { ScrollView, View } from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { formatMoney, type SavingsTrendMode } from "@/domain/bucksLogic";
import { type UiCopy } from "@/i18n";
import { base } from "@/styles/baseStyles";
import { summaryStyles } from "@/components/screens/SummaryView.styles";

const styles = { ...base, ...summaryStyles };
import { type Palette } from "@/theme/colors";
import { type SummaryRow, type Tag, type Transaction } from "@/types";
import { BarChart } from "@/components/ui/BarChart";
import { PieChart } from "@/components/ui/PieChart";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Text } from "@/components/ui/AppText";
import { MonthTagBreakdownModal } from "@/components/modals/MonthTagBreakdownModal";
import { SavingsLineChart } from "@/components/ui/SavingsLineChart";
import { monthLabel } from "@/components/screens/summaryHelpers";
import { Insight, Legend, CompositionContent } from "@/components/screens/SummarySubComponents";
import { SummaryHeader, SummaryStickyHeader } from "@/components/screens/SummaryViewHeader";
import { SummaryMonthlyTable } from "@/components/screens/SummaryMonthlyTable";
import { SummaryKpiSection } from "@/components/screens/SummaryKpiSection";
import { useSummaryState } from "@/components/screens/useSummaryState";

export const SummaryView = memo(function SummaryView({ colors, copy, summaries, transactions, freqIncome, tagsList, availableYears, topInset, currencySymbol }: {
  colors: Palette; copy: UiCopy; summaries: SummaryRow[]; transactions: Transaction[]; freqIncome: Record<string, number>;
  tagsList: Tag[]; availableYears: number[]; topInset?: number; currencySymbol: string;
}) {
  const state = useSummaryState({ summaries, transactions, freqIncome, tagsList, availableYears, currencySymbol, colors, copy });
  const {
    filtered, chartRows, totals, savings, averageExpense, positiveMonths, bestMonth, bestIncomeMonth,
    highestExpenseMonth, avgIncome, incomeBreakdown, expenseBreakdown, fm, handleMonthPress, handleBarSelectMonth, nonFreqAlert,
    scrollY, scrolled, setScrolled, filterYear, setFilterYear, kpiSegment, setKpiSegment, compSegment, setCompSegment,
    trendMode, setTrendMode, tagBreakdownRef, isAllYears, topCategoriesPieData, yearOptions, kpiSegmentOptions,
    compSegmentOptions, trendSegmentOptions, subLabel,
  } = state;

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
        </View>
        <Text numberOfLines={1} style={{ color: totals.net >= 0 ? colors.primary : colors.expense, fontSize: 34, fontWeight: "700", marginTop: 10, fontVariant: ["tabular-nums"] }}>
          {formatMoney(totals.net, currencySymbol, 0)}
        </Text>
        <View style={{ flexDirection: "row", gap: 10, marginTop: 18 }}>
          <Insight
            label={isAllYears ? copy.bestYear : copy.bestMonth}
            value={bestMonth ? (isAllYears ? String(Number(bestMonth.monthYear.split(" ")[1] || 0)) : monthLabel(bestMonth, copy.languageCode)) : "—"}
            icon="trophy-outline" color={colors.warn} colors={colors}
          />
          <Insight
            label={isAllYears ? copy.yearlyAverage : copy.monthlyAverage}
            value={fm(averageExpense)} icon="calendar-month-outline" color={colors.info} colors={colors}
          />
        </View>
      </View>

      <SummaryKpiSection
        colors={colors} copy={copy} kpiSegment={kpiSegment} setKpiSegment={setKpiSegment}
        kpiSegmentOptions={kpiSegmentOptions} fm={fm} totals={totals} savings={savings}
        filtered={filtered} isAllYears={isAllYears} bestIncomeMonth={bestIncomeMonth}
        monthLabel={monthLabel} avgIncome={avgIncome}
        averageExpense={averageExpense} positiveMonths={positiveMonths}
        incomeBreakdown={incomeBreakdown} expenseBreakdown={expenseBreakdown}
        highestExpenseMonth={highestExpenseMonth}
      />

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
          rows={chartRows} colors={colors} language={copy.languageCode === "en" ? "en" : "es"}
          isYearly={isAllYears} currencySymbol={currencySymbol}
          onSelectMonth={tagsList.length > 0 ? handleBarSelectMonth : undefined}
        />
      </View>

      {tagsList.length > 0 && topCategoriesPieData.length > 0 && (
        <View style={{ backgroundColor: colors.card, borderRadius: 14, padding: 15 }}>
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: "700", marginBottom: 10 }}>{copy.topCategories}</Text>
          <PieChart
            data={topCategoriesPieData} colors={colors} currencySymbol={currencySymbol}
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
          colors={colors} copy={copy} filtered={filtered} currencySymbol={currencySymbol}
          monthLabel={monthLabel} fm={fm} handleMonthPress={handleMonthPress}
        />
      )}
    </ScrollView>
    {topInset !== undefined && (
      <SummaryStickyHeader
        colors={colors} copy={copy} subLabel={subLabel} filterYear={filterYear}
        yearOptions={yearOptions} setFilterYear={setFilterYear} scrollY={scrollY}
        scrolled={scrolled} topInset={topInset}
      />
    )}
    <MonthTagBreakdownModal
      ref={tagBreakdownRef} colors={colors} currencySymbol={currencySymbol} copy={copy} tagsList={tagsList}
    />
  </View>);
});
