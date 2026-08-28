import { memo, useMemo } from "react";
import { View } from "react-native";
import { formatMoney, type PieSlice } from "@/domain/bucksLogic";
import type { Palette } from "@/theme/colors";
import type { UiCopy } from "@/i18n";
import { PieChart } from "@/components/ui/PieChart";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Text } from "@/components/ui/AppText";
import { RADIUS } from "@/theme/radii";

export const DashboardPieSection = memo(function DashboardPieSection({
  colors,
  currencySymbol,
  copy,
  month,
  expensePieData,
  incomePieData,
  activeTab,
  onTabChange,
}: {
  colors: Palette;
  currencySymbol: string;
  copy: UiCopy;
  month: number;
  expensePieData: PieSlice[];
  incomePieData: PieSlice[];
  activeTab: string;
  onTabChange: (tab: string) => void;
}) {
  const activePieData = activeTab === "expense" ? expensePieData : incomePieData;
  const dashTabOptions = useMemo(() => [
    { key: "expense", label: copy.expenseBreakdown },
    { key: "income", label: copy.incomeBreakdown },
  ], [copy.expenseBreakdown, copy.incomeBreakdown]);

  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderRadius: RADIUS.xl,
        padding: 15,
      }}
    >
      <Text
        style={{
          color: colors.text,
          fontSize: 16,
          fontWeight: "700",
          marginBottom: 14,
        }}
      >
        {copy.expenseByTags}
      </Text>
      <SegmentedControl options={dashTabOptions} selected={activeTab} onSelect={onTabChange} colors={colors} />
      <View style={{ height: 10 }} />
      {activePieData.length > 0 ? (
        <PieChart
          key={`pie-${month}`}
          data={activePieData}
          colors={colors}
          currencySymbol={currencySymbol}
          formatValue={(v) => formatMoney(v, currencySymbol, 1).replace(/^\+ /, "")}
          totalLabel={copy.total}
        />
      ) : (
        <Text style={{ color: colors.muted, fontSize: 14, textAlign: "center", paddingVertical: 20 }}>
          {activeTab === "income" ? copy.incomeBreakdownEmpty : copy.noTagsData}
        </Text>
      )}
    </View>
  );
});
