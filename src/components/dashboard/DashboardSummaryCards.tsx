import { memo, useEffect, useRef } from "react";
import { Animated, Easing, View } from "react-native";
import { formatMoney } from "@/domain/bucksLogic";
import type { Palette } from "@/theme/colors";
import type { SummaryRow } from "@/types";
import type { UiCopy } from "@/i18n";
import { StatCard } from "@/components/ui/StatCard";
import { Text } from "@/components/ui/AppText";

export type BubbleKind = "income" | "expense" | "balance";

export const DashboardSummaryCards = memo(function DashboardSummaryCards({
  colors,
  currencySymbol,
  copy,
  summary,
  savingsRate,
  vsPrev,
  vsPrevPositive,
  incomeCardRef,
  expenseCardRef,
  balanceCardRef,
  onOpenBubble,
}: {
  colors: Palette;
  currencySymbol: string;
  copy: UiCopy;
  summary: SummaryRow;
  savingsRate: string;
  vsPrev: string;
  vsPrevPositive: boolean;
  incomeCardRef: React.RefObject<View | null>;
  expenseCardRef: React.RefObject<View | null>;
  balanceCardRef: React.RefObject<View | null>;
  onOpenBubble: (kind: BubbleKind) => void;
}) {
  const cardAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(cardAnim, {
      toValue: 1,
      duration: 400,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [cardAnim]);

  return (
    <View style={{ gap: 8 }}>
      <Animated.View
        style={{
          flexDirection: "row",
          gap: 8,
          opacity: cardAnim,
          transform: [{ translateY: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
        }}
      >
        <View style={{ flex: 1, gap: 8 }}>
          <View ref={incomeCardRef} collapsable={false}>
            <StatCard
              title={copy.income}
              value={formatMoney(summary.totalIncome, currencySymbol)}
              tone="income"
              icon="cash"
              colors={colors}
              onPress={() => onOpenBubble("income")}
            />
          </View>
          <View ref={expenseCardRef} collapsable={false}>
            <StatCard
              title={copy.expensesLabel}
              value={formatMoney(summary.totalExpense, currencySymbol)}
              tone="expense"
              icon="credit-card"
              colors={colors}
              onPress={() => onOpenBubble("expense")}
            />
          </View>
        </View>
        <View ref={balanceCardRef} collapsable={false} style={{ flex: 1 }}>
          <StatCard
            title={copy.balance}
            value={formatMoney(summary.netMonthly, currencySymbol)}
            tone="balance"
            icon="wallet"
            colors={colors}
            onPress={() => onOpenBubble("balance")}
          >
            <View style={{ borderTopWidth: 1, borderTopColor: colors.border, marginTop: 8, paddingTop: 8, gap: 6 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ fontSize: 12, color: colors.muted }}>{copy.savingsRate}</Text>
                <Text style={{ fontSize: 12, fontWeight: "600", color: colors.text, fontVariant: ["tabular-nums"] }}>
                  {savingsRate}
                </Text>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ fontSize: 12, color: colors.muted }}>{copy.vsPrevMonth}</Text>
                <Text style={{ fontSize: 12, fontWeight: "600", color: vsPrevPositive ? colors.income : colors.expense, fontVariant: ["tabular-nums"] }}>
                  {vsPrev}
                </Text>
              </View>
            </View>
          </StatCard>
        </View>
      </Animated.View>
    </View>
  );
});
