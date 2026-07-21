import { View } from "react-native";
import { type UiCopy } from "@/i18n";
import { type Palette } from "@/theme/colors";
import { type SummaryRow } from "@/types";
import { Kpi } from "@/components/ui/Kpi";
import { SegmentedControl } from "@/components/ui/SegmentedControl";

export function SummaryKpiSection({
  colors, copy, kpiSegment, setKpiSegment, kpiSegmentOptions,
  fm, totals, savings, filtered, isAllYears, bestIncomeMonth, monthLabel,
  avgIncome, stableMonths, averageExpense, positiveMonths,
}: {
  colors: Palette; copy: UiCopy; kpiSegment: string; setKpiSegment: (v: string) => void;
  kpiSegmentOptions: { key: string; label: string }[];
  fm: (v: number) => string; totals: { income: number; expense: number; net: number };
  savings: number; filtered: SummaryRow[]; isAllYears: boolean;
  bestIncomeMonth: SummaryRow | null;
  monthLabel: (row: SummaryRow, lang: string) => string;
  avgIncome: number; stableMonths: number; averageExpense: number; positiveMonths: number;
}) {
  return (
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
  );
}
