import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { calculateSummaries } from "../../domain/bucksLogic";
import { styles } from "../../styles/globalStyles";
import { Kpi } from "../ui/Kpi";
import { PieCard } from "../ui/PieCard";
import { BarChart } from "../ui/BarChart";
import { Select } from "../ui/Select";
import { Palette } from "../../theme/colors";
import { SummaryRow, Transaction } from "../../types";

export function SummaryView({ colors, summaries, transactions, freqIncome, compact, availableYears, topInset }: {
  colors: Palette; summaries: SummaryRow[]; transactions: Transaction[]; freqIncome: Record<string, number>;
  compact: boolean; availableYears: number[]; topInset?: number;
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
  const netNoFreq = filtered.reduce((acc, row) => acc + row.netNoFreq, 0);
  const compactMoney = (value: number, signed = false) => {
    const sign = signed && value < 0 ? "- " : "";
    return `${sign}S/ ${Math.abs(value).toFixed(0)}`;
  };
  const incomeTypes = [
    { label: "Ing. Frecuente", value: computed.reduce((a, r) => a + r.freqIncome, 0), color: colors.green },
    { label: "Ing. No Frec.", value: computed.reduce((a, r) => a + r.nonFreqIncome, 0), color: colors.blue },
  ];
  const expenseTypes = [
    { label: "Gasto Frecuente", value: computed.reduce((a, r) => a + Math.abs(r.freqExpense), 0), color: colors.red },
    { label: "Gasto No Frec.", value: computed.reduce((a, r) => a + Math.abs(r.nonFreqExpense), 0), color: colors.yellow },
  ];
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.pageScroll, compact && styles.pageScrollMobile, topInset !== undefined && { paddingTop: topInset }]}>
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
      <View style={[styles.kpiGridMobile, { gap: 8, marginBottom: 12 }]}>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Kpi title="Ingresos" value={compactMoney(totals.income)} icon="trending-up" color={colors.green} colors={colors} />
          <Kpi title="Gastos" value={compactMoney(totals.expense)} icon="trending-down" color={colors.red} colors={colors} />
        </View>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Kpi title="Balance Neto" value={compactMoney(totals.net, true)} icon="wallet" color={totals.net >= 0 ? colors.blue : colors.red} colors={colors} />
          <Kpi title="Tasa de Ahorro" value={`${savings}%`} icon="piggy-bank" color={colors.blue} colors={colors} />
        </View>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Kpi title="Sin Ing. Frec." value={compactMoney(netNoFreq, true)} icon="cash-remove" color={colors.yellow} colors={colors} />
        </View>
      </View>
      <View style={[styles.chartCard, { backgroundColor: colors.card, alignItems: "stretch" }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Evolucion mensual</Text>
        <BarChart rows={filtered} colors={colors} />
      </View>
      <View style={[styles.chartRow, compact && styles.chartRowMobile]}>
        <PieCard title="Ingresos" values={incomeTypes.map((t) => t.value)} colors={colors} labels={incomeTypes.map((t) => t.label)} tints={incomeTypes.map((t) => t.color)} />
        <PieCard title="Gastos" values={expenseTypes.map((t) => t.value)} colors={colors} labels={expenseTypes.map((t) => t.label)} tints={expenseTypes.map((t) => t.color)} danger />
      </View>
      <View style={[styles.tableCard, compact && styles.summaryTableMobile, { backgroundColor: colors.card }]}>
        <View style={[styles.gasTableHeader, { backgroundColor: colors.input }]}>
          <Text style={[styles.gasTableHeadCell, { color: colors.muted, flex: 1.35 }]}>MES</Text>
          <Text style={[styles.gasTableHeadCell, { color: colors.green }]}>ING.</Text>
          <Text style={[styles.gasTableHeadCell, { color: colors.red }]}>GASTO</Text>
          <Text style={[styles.gasTableHeadCell, { color: colors.blue }]}>NETO</Text>
          <Text style={[styles.gasTableHeadCell, { color: colors.muted }]}>AHORRO</Text>
        </View>
        {filtered.map((row) => {
          const rowSavings = row.totalIncome > 0 ? Math.round((row.netMonthly / row.totalIncome) * 100) : 0;
          const [monthName, year] = row.monthYear.split(" ");
          const monthLabel = `${monthName.slice(0, 3).toUpperCase()} ${year?.slice(-2) || ""}`.trim();
          return (
            <View key={row.monthYear} style={[styles.gasTableRow, { borderColor: colors.border }]}>
              <Text numberOfLines={1} style={[styles.gasTableCell, { color: colors.text, flex: 1.35, fontWeight: "600" }]}>{monthLabel}</Text>
              <Text numberOfLines={1} style={[styles.gasTableCell, { color: colors.green }]}>{compactMoney(row.totalIncome)}</Text>
              <Text numberOfLines={1} style={[styles.gasTableCell, { color: colors.red }]}>{compactMoney(row.totalExpense)}</Text>
              <Text numberOfLines={1} style={[styles.gasTableCell, { color: row.netMonthly >= 0 ? colors.green : colors.red, fontWeight: "700" }]}>{compactMoney(row.netMonthly, true)}</Text>
              <Text numberOfLines={1} style={[styles.gasTableCell, { color: rowSavings >= 0 ? colors.blue : colors.red }]}>{rowSavings}%</Text>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}
