import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState } from "react";
import { Animated, BackHandler, ScrollView, StyleSheet, Pressable, View } from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { base } from "@/styles/baseStyles";
import { monthTagBreakdownStyles } from "@/components/modals/MonthTagBreakdownModal.styles";

const styles = { ...base, ...monthTagBreakdownStyles };
import { type Palette } from "@/theme/colors";
import { Z_INDEX_DETAIL } from "@/theme/constants";
import { type Tag, type Transaction } from "@/types";
import { aggregateExpensesByTag, aggregateIncomesByTag, type PieSlice } from "@/domain/bucksLogic";
import { type UiCopy } from "@/i18n";
import { useModalTransition } from "@/components/ui/useModalTransition";
import { PieChart } from "@/components/ui/PieChart";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Text } from "@/components/ui/AppText";

export type MonthTagBreakdownHandle = {
  open: (monthLabel: string, monthTransactions: Transaction[]) => void;
  close: () => void;
};

export const MonthTagBreakdownModal = forwardRef<
  MonthTagBreakdownHandle,
  {
    colors: Palette;
    currencySymbol: string;
    copy: UiCopy;
    tagsList: Tag[];
  }
>(function MonthTagBreakdownModal({ colors, currencySymbol, copy, tagsList }, ref) {
  const [visible, setVisible] = useState(false);
  const [monthLabel, setMonthLabel] = useState("");
  const [monthTransactions, setMonthTransactions] = useState<Transaction[]>([]);
  const [breakdownTab, setBreakdownTab] = useState("expenses");
  const transition = useModalTransition(visible, 12, 0.985);

  const tabOptions = useMemo(() => [
    { key: "expenses", label: copy.expenseBreakdown },
    { key: "income", label: copy.incomeBreakdown },
  ], [copy.expenseBreakdown, copy.incomeBreakdown]);

  const tagColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    tagsList.forEach((t) => { map[t.id] = t.color; });
    return map;
  }, [tagsList]);

  const expenseData = useMemo<PieSlice[]>(
    () => aggregateExpensesByTag(monthTransactions, tagColorMap, tagsList, colors.muted, copy.otherLabel),
    [monthTransactions, tagColorMap, tagsList, colors.muted, copy.otherLabel],
  );

  const incomeData = useMemo<PieSlice[]>(
    () => aggregateIncomesByTag(monthTransactions, tagColorMap, tagsList, colors.income, copy.otherLabel),
    [monthTransactions, tagColorMap, tagsList, colors.income, copy.otherLabel],
  );

  const activeData = breakdownTab === "expenses" ? expenseData : incomeData;
  const activeEmptyLabel = breakdownTab === "expenses" ? copy.noTagsData : copy.incomeBreakdownEmpty;

  const close = useCallback(() => setVisible(false), []);

  useImperativeHandle(ref, () => ({
    open(label: string, txs: Transaction[]) {
      setMonthLabel(label);
      setMonthTransactions(txs);
      setVisible(true);
    },
    close,
  }), [close]);

  useEffect(() => {
    if (!visible) return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      close();
      return true;
    });
    return () => subscription.remove();
  }, [close, visible]);

  if (!transition.modalVisible) return null;

  return (
    <Animated.View
      pointerEvents={transition.modalVisible ? "auto" : "none"}
      accessibilityViewIsModal={visible}
      importantForAccessibility={transition.modalVisible ? "yes" : "no-hide-descendants"}
      style={[StyleSheet.absoluteFill, styles.modalOverlay, { backgroundColor: colors.overlay, zIndex: Z_INDEX_DETAIL, elevation: Z_INDEX_DETAIL }, transition.containerStyle]}
    >
      <Pressable style={styles.optionBackdrop} onPress={close} />
      <Animated.View style={[styles.modal, { backgroundColor: colors.card }, transition.panelStyle]}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {copy.monthlyTagBreakdownTitle} {monthLabel}
          </Text>
          <Pressable style={[styles.closeBtn, { backgroundColor: colors.input }]} onPress={close}>
            <MaterialCommunityIcons name="close" size={22} color={colors.text} />
          </Pressable>
        </View>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          <SegmentedControl
            options={tabOptions}
            selected={breakdownTab}
            onSelect={setBreakdownTab}
            colors={colors}
          />
          <View style={{ height: 10 }} />
          {activeData.length > 0 ? (
            <PieChart
              data={activeData}
              colors={colors}
              currencySymbol={currencySymbol}
              totalLabel={copy.total}
            />
          ) : (
            <Text style={[styles.emptyText, { color: colors.muted, fontSize: 14 }]}>
              {activeEmptyLabel}
            </Text>
          )}
        </ScrollView>
      </Animated.View>
    </Animated.View>
  );
});
