import { memo } from "react";
import { View } from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { formatMoney } from "@/domain/bucksLogic";
import type { Palette } from "@/theme/colors";
import type { SummaryRow } from "@/types";
import type { UiCopy } from "@/i18n";
import { Text } from "@/components/ui/AppText";

export const DashboardBubbleContent = memo(function DashboardBubbleContent({
  kind,
  colors,
  currencySymbol,
  copy,
  summary,
}: {
  kind: "income" | "expense" | "balance";
  colors: Palette;
  currencySymbol: string;
  copy: UiCopy;
  summary: SummaryRow;
}) {
  if (kind === "income") {
    const total = summary.totalIncome;
    const freqPct = total > 0 ? Math.round(summary.freqIncome / total * 100) : 0;
    const nonFreqPct = total > 0 ? Math.round(summary.nonFreqIncome / total * 100) : 0;
    return (
      <>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
          <MaterialCommunityIcons name="cash" size={18} color={colors.income} />
          <Text style={{ fontSize: 14, fontWeight: "600", color: colors.text }}>{copy.income}</Text>
        </View>
        <Text style={{ fontSize: 20, fontWeight: "700", color: colors.income, fontVariant: ["tabular-nums"], marginBottom: 12 }}>
          {formatMoney(total, currencySymbol)}
        </Text>
        <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.input, overflow: "hidden", flexDirection: "row", marginBottom: 12 }}>
          {freqPct > 0 && <View style={{ flex: freqPct, backgroundColor: colors.income }} />}
          {nonFreqPct > 0 && <View style={{ flex: nonFreqPct, backgroundColor: colors.incomeSoft }} />}
        </View>
        <View style={{ gap: 4 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flex: 1 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.income }} />
              <Text style={{ fontSize: 13, color: colors.muted, flex: 1 }} numberOfLines={1}>{copy.freqIncomeFull}</Text>
            </View>
            <Text style={{ fontSize: 13, fontWeight: "600", color: colors.text, fontVariant: ["tabular-nums"] }}>{freqPct}%</Text>
          </View>
          <Text style={{ fontSize: 14, fontWeight: "600", color: colors.text, fontVariant: ["tabular-nums"], marginBottom: 8, marginLeft: 14 }}>
            {formatMoney(summary.freqIncome, currencySymbol)}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flex: 1 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.incomeSoft }} />
              <Text style={{ fontSize: 13, color: colors.muted, flex: 1 }} numberOfLines={1}>{copy.nonFreqIncomeFull}</Text>
            </View>
            <Text style={{ fontSize: 13, fontWeight: "600", color: colors.text, fontVariant: ["tabular-nums"] }}>{nonFreqPct}%</Text>
          </View>
          <Text style={{ fontSize: 14, fontWeight: "600", color: colors.text, fontVariant: ["tabular-nums"], marginLeft: 14 }}>
            {formatMoney(summary.nonFreqIncome, currencySymbol)}
          </Text>
        </View>
      </>
    );
  }

  if (kind === "expense") {
    const total = Math.abs(summary.totalExpense);
    const freqVal = Math.abs(summary.freqExpense);
    const nonFreqVal = Math.abs(summary.nonFreqExpense);
    const freqPct = total > 0 ? Math.round(freqVal / total * 100) : 0;
    const nonFreqPct = total > 0 ? Math.round(nonFreqVal / total * 100) : 0;
    return (
      <>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
          <MaterialCommunityIcons name="credit-card" size={18} color={colors.expense} />
          <Text style={{ fontSize: 14, fontWeight: "600", color: colors.text }}>{copy.expensesLabel}</Text>
        </View>
        <Text style={{ fontSize: 20, fontWeight: "700", color: colors.expense, fontVariant: ["tabular-nums"], marginBottom: 12 }}>
          {formatMoney(summary.totalExpense, currencySymbol)}
        </Text>
        <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.input, overflow: "hidden", flexDirection: "row", marginBottom: 12 }}>
          {freqPct > 0 && <View style={{ flex: freqPct, backgroundColor: colors.expense }} />}
          {nonFreqPct > 0 && <View style={{ flex: nonFreqPct, backgroundColor: colors.warnSoft }} />}
        </View>
        <View style={{ gap: 4 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flex: 1 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.expense }} />
              <Text style={{ fontSize: 13, color: colors.muted, flex: 1 }} numberOfLines={1}>{copy.freqExpenseFull}</Text>
            </View>
            <Text style={{ fontSize: 13, fontWeight: "600", color: colors.text, fontVariant: ["tabular-nums"] }}>{freqPct}%</Text>
          </View>
          <Text style={{ fontSize: 14, fontWeight: "600", color: colors.text, fontVariant: ["tabular-nums"], marginBottom: 8, marginLeft: 14 }}>
            {formatMoney(summary.freqExpense, currencySymbol)}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flex: 1 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.warnSoft }} />
              <Text style={{ fontSize: 13, color: colors.muted, flex: 1 }} numberOfLines={1}>{copy.nonFreqExpenseFull}</Text>
            </View>
            <Text style={{ fontSize: 13, fontWeight: "600", color: colors.text, fontVariant: ["tabular-nums"] }}>{nonFreqPct}%</Text>
          </View>
          <Text style={{ fontSize: 14, fontWeight: "600", color: colors.text, fontVariant: ["tabular-nums"], marginLeft: 14 }}>
            {formatMoney(summary.nonFreqExpense, currencySymbol)}
          </Text>
        </View>
      </>
    );
  }

  const current = summary.netMonthly;
  return (
    <>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
        <MaterialCommunityIcons name="wallet" size={18} color={colors.info} />
        <Text style={{ fontSize: 14, fontWeight: "600", color: colors.text }}>{copy.balance}</Text>
      </View>
      <Text style={{ fontSize: 20, fontWeight: "700", color: current >= 0 ? colors.income : colors.expense, fontVariant: ["tabular-nums"], marginBottom: 12 }}>
        {formatMoney(current, currencySymbol)}
      </Text>
      <View style={{ gap: 8 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={{ fontSize: 13, color: colors.muted }}>{copy.income}</Text>
          <Text style={{ fontSize: 13, fontWeight: "600", color: colors.income, fontVariant: ["tabular-nums"] }}>
            {formatMoney(summary.totalIncome, currencySymbol)}
          </Text>
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={{ fontSize: 13, color: colors.muted }}>{copy.expensesLabel}</Text>
          <Text style={{ fontSize: 13, fontWeight: "600", color: colors.expense, fontVariant: ["tabular-nums"] }}>
            {formatMoney(summary.totalExpense, currencySymbol)}
          </Text>
        </View>
      </View>
    </>
  );
});
