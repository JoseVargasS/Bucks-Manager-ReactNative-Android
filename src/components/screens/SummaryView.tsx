import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { calculateSummaries } from "../../domain/bucksLogic";
import { formatMoney } from "../../utils/formats";
import { styles } from "../../styles/globalStyles";
import { Kpi } from "../ui/Kpi";
import { PieCard } from "../ui/PieCard";
import { BarChart } from "../ui/BarChart";
import { Select } from "../ui/Select";
import { Palette } from "../../theme/colors";
import { SummaryRow, Transaction } from "../../types";

export function SummaryView({ colors, summaries, transactions, freqIncome, compact, availableYears }: {
  colors: Palette; summaries: SummaryRow[]; transactions: Transaction[]; freqIncome: Record<string, number>;
  compact: boolean; availableYears: number[];
}) {
  const [filterYear, setFilterYear] = useState<number | null>(null);
  const computed = summaries.length ? summaries : calculateSummaries(transactions, freqIncome);
  const filtered = filterYear ? computed.filter((r) => r.monthYear.endsWith(String(filterYear))) : computed;
  const totals = filtered.reduce(
    (acc, row) => ({
      income: acc.income + row.totalIncome,
      expense: acc.expense + Math.abs(row.totalExpense),
      net: acc.net + row.netMonthly,
    }),
    { income: 0, expense: 0, net: 0 },
  );
  const savings = totals.income > 0 ? Math.round((totals.net / totals.income) * 100) : 0;
  const incomeTypes = [
    { label: "Ing. Frecuente", value: computed.reduce((a, r) => a + r.freqIncome, 0), color: colors.green },
    { label: "Ing. No Frec.", value: computed.reduce((a, r) => a + r.nonFreqIncome, 0), color: colors.blue },
  ];
  const expenseTypes = [
    { label: "Gasto Frecuente", value: computed.reduce((a, r) => a + Math.abs(r.freqExpense), 0), color: colors.red },
    { label: "Gasto No Frec.", value: computed.reduce((a, r) => a + Math.abs(r.nonFreqExpense), 0), color: colors.yellow },
  ];
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.pageScroll, compact && styles.pageScrollMobile]}>
      <View style={[{ flexDirection: "row", gap: 8, marginBottom: 10 }]}>
        <Select
          value={filterYear ? String(filterYear) : ""}
          options={[{ label: "Todos los años", value: "" }, ...availableYears.map((y) => ({ label: String(y), value: String(y) }))]}
          onSelect={(v: string) => { setFilterYear(v ? Number(v) : null); }}
          colors={colors}
          placeholder="Seleccionar año"
          style={{ flex: 1 }}
        />
      </View>
      <View style={[styles.kpiGrid, compact && styles.kpiGridMobile]}>
        <Kpi title="Ingresos Totales" value={`S/ ${totals.income.toFixed(2)}`} icon="trending-up" color={colors.green} colors={colors} />
        <Kpi title="Gastos Totales" value={`S/ ${totals.expense.toFixed(2)}`} icon="trending-down" color={colors.red} colors={colors} />
        <Kpi title="Balance Neto" value={`S/ ${totals.net.toFixed(2)}`} icon="wallet" color={totals.net >= 0 ? colors.blue : colors.red} colors={colors} />
        <Kpi title="Sin Ing. Frec." value={`S/ ${filtered.reduce((a, r) => a + r.netNoFreq, 0).toFixed(2)}`} icon="cash-remove" color={colors.yellow} colors={colors} />
        <Kpi title="Tasa de Ahorro" value={`${savings}%`} icon="piggy-bank" color={colors.blue} colors={colors} />
      </View>
      <BarChart rows={filtered} colors={colors} />
      <View style={[styles.chartRow, compact && styles.chartRowMobile]}>
        <PieCard title="Ingresos" values={incomeTypes.map((t) => t.value)} colors={colors} labels={incomeTypes.map((t) => t.label)} tints={incomeTypes.map((t) => t.color)} />
        <PieCard title="Gastos" values={expenseTypes.map((t) => t.value)} colors={colors} labels={expenseTypes.map((t) => t.label)} tints={expenseTypes.map((t) => t.color)} danger />
      </View>
      <View style={[styles.tableCard, compact && styles.summaryTableMobile, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.gasTableHeader, { backgroundColor: colors.input, borderColor: colors.border }]}>
          <Text style={[styles.gasTableHeadCell, { color: colors.muted, flex: 1.2 }]}>MES</Text>
          <Text style={[styles.gasTableHeadCell, { color: colors.muted }]}>ING. FREC.</Text>
          <Text style={[styles.gasTableHeadCell, { color: colors.muted }]}>ING. N/FREC</Text>
          <Text style={[styles.gasTableHeadCell, { color: colors.green }]}>TOT. ING</Text>
          <Text style={[styles.gasTableHeadCell, { color: colors.muted }]}>G. FREC.</Text>
          <Text style={[styles.gasTableHeadCell, { color: colors.muted }]}>G. N/FREC</Text>
          <Text style={[styles.gasTableHeadCell, { color: colors.red }]}>TOT. G.</Text>
          <Text style={[styles.gasTableHeadCell, { color: colors.blue }]}>NETO</Text>
          <Text style={[styles.gasTableHeadCell, { color: colors.yellow }]}>NETO SIN IF</Text>
        </View>
        {filtered.map((row) => (
          <View key={row.monthYear} style={[styles.gasTableRow, { borderColor: colors.border }]}>
            <Text style={[styles.gasTableCell, { color: colors.text, flex: 1.2, fontWeight: "900" }]}>{row.monthYear}</Text>
            <Text style={[styles.gasTableCell, { color: colors.green }]}>{formatMoney(row.freqIncome)}</Text>
            <Text style={[styles.gasTableCell, { color: colors.green }]}>{formatMoney(row.nonFreqIncome)}</Text>
            <Text style={[styles.gasTableCell, { color: colors.green, fontWeight: "900" }]}>{formatMoney(row.totalIncome)}</Text>
            <Text style={[styles.gasTableCell, { color: colors.red }]}>{formatMoney(row.freqExpense)}</Text>
            <Text style={[styles.gasTableCell, { color: colors.red }]}>{formatMoney(row.nonFreqExpense)}</Text>
            <Text style={[styles.gasTableCell, { color: colors.red, fontWeight: "900" }]}>{formatMoney(row.totalExpense)}</Text>
            <Text style={[styles.gasTableCell, { color: row.netMonthly >= 0 ? colors.green : colors.red, fontWeight: "900" }]}>{formatMoney(row.netMonthly)}</Text>
            <Text style={[styles.gasTableCell, { color: colors.yellow, fontWeight: "900" }]}>{formatMoney(row.netNoFreq)}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
