import { memo } from "react";
import { Pressable, View } from "react-native";
import { formatMoney } from "@/domain/bucksLogic";
import { type Palette } from "@/theme/colors";
import { type SummaryRow } from "@/types";
import { type UiCopy } from "@/i18n";
import { Text } from "@/components/ui/AppText";

export const SummaryMonthlyTable = memo(function SummaryMonthlyTable({
  colors, copy, filtered, currencySymbol, monthLabel, fm, handleMonthPress,
}: {
  colors: Palette; copy: UiCopy; filtered: SummaryRow[]; currencySymbol: string;
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
            minHeight: 74, paddingHorizontal: 14, paddingVertical: 12,
            flexDirection: "row", alignItems: "center", gap: 11,
            borderTopWidth: index === 0 ? 0 : 0.5, borderColor: colors.border,
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
