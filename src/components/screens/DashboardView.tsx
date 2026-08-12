import { Fragment, memo, useMemo, useCallback, useEffect, useRef, useState } from "react";
import { Animated, Easing, ScrollView, View } from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

import { formatMoney, calculateMonthSummary, aggregateExpensesByTag, aggregateIncomesByTag, getTransactionMonthKey, type PieSlice } from "@/domain/bucksLogic";
import { getMonthYear } from "@/utils/dateUtils";
import { base } from "@/styles/baseStyles";
import { dashboardStyles } from "@/components/screens/DashboardView.styles";
import { txStyles } from "@/styles/transactionRow";

const styles = { ...base, ...dashboardStyles, ...txStyles };
import { type Palette } from "@/theme/colors";
import { type SummaryRow, type Tag, type Transaction } from "@/types";
import { UI_MONTH_NAMES, type UiCopy } from "@/i18n";
import { StatCard } from "@/components/ui/StatCard";
import { PieChart } from "@/components/ui/PieChart";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Text } from "@/components/ui/AppText";
import { useTagMaps } from "@/hooks/useTagMaps";
import { TransactionRow, type TagButtonRef } from "@/components/screens/TransactionRow";
import { PeriodControls } from "@/components/layout/PeriodControls";
import { DashboardBubble } from "@/components/ui/DashboardBubble";
import { useModalTransition } from "@/components/ui/useModalTransition";

export const DashboardView = memo(function DashboardView({
  colors,
  theme,
  copy,
  currencySymbol,
  allTransactions,
  tagsList,
  month,
  year,
  availableYears,
  availableMonths,
  onSelectPeriod,
  goToday,
  goPrevMonth,
  goNextMonth,
  onOpenDetail,
  topInset,
}: {
  colors: Palette;
  theme: "dark" | "light";
  copy: UiCopy;
  currencySymbol: string;
  allTransactions: Transaction[];
  tagsList: Tag[];
  month: number;
  year: number;
  availableYears: number[];
  availableMonths: number[];
  onSelectPeriod: (month: number, year: number) => void;
  goToday: () => void;
  goPrevMonth: () => void;
  goNextMonth: () => void;
  onOpenDetail: (tx: Transaction) => void;
  topInset?: number;
}) {
  const { tagColorMap, tagLabelMap } = useTagMaps(tagsList);
  const [dashBreakdownTab, setDashBreakdownTab] = useState("expense");
  const tagButtonRefs = useRef<Record<number, TagButtonRef | null>>({});

  const [bubbleKind, setBubbleKind] = useState<"income" | "expense" | "balance" | null>(null);
  const [bubbleFrame, setBubbleFrame] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const bubbleTransition = useModalTransition(Boolean(bubbleKind), 6, 0.95, () => setBubbleKind(null));
  const incomeCardRef = useRef<View>(null);
  const expenseCardRef = useRef<View>(null);
  const balanceCardRef = useRef<View>(null);

  const handleOpenBubble = useCallback((kind: "income" | "expense" | "balance") => {
    const refMap = { income: incomeCardRef, expense: expenseCardRef, balance: balanceCardRef };
    refMap[kind].current?.measureInWindow((x: number, y: number, width: number, height: number) => {
      setBubbleFrame({ x, y, width, height });
      setBubbleKind(kind);
    });
  }, []);

  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear = month === 0 ? year - 1 : year;
  const prevMonthName = UI_MONTH_NAMES[copy.languageCode === "en" ? "en" : "es"][prevMonth];
  const prevMonthKey = `${prevMonthName} ${prevYear}`;
  const localizedMonthNames = copy.languageCode === "en" ? UI_MONTH_NAMES.en : UI_MONTH_NAMES.es;
  const monthKey = `${localizedMonthNames[month]} ${year}`;

  const transactionsByMonth = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const tx of allTransactions) {
      const key = getTransactionMonthKey(tx);
      const list = map.get(key);
      if (list) list.push(tx);
      else map.set(key, [tx]);
    }
    return map;
  }, [allTransactions]);

  const monthTransactions = useMemo(
    () => transactionsByMonth.get(getMonthYear(new Date(year, month, 1))) ?? [],
    [transactionsByMonth, year, month],
  );
  const prevMonthTransactions = useMemo(
    () => transactionsByMonth.get(getMonthYear(new Date(prevYear, prevMonth, 1))) ?? [],
    [transactionsByMonth, prevYear, prevMonth],
  );

  const prevSummary = useMemo<SummaryRow>(
    () => {
      const emptyFreq: Record<string, number> = {};
      return calculateMonthSummary(prevMonthTransactions, emptyFreq, prevMonthKey);
    },
    [prevMonthTransactions, prevMonthKey],
  );

  const summary = useMemo<SummaryRow>(
    () => {
      const emptyFreq: Record<string, number> = {};
      return calculateMonthSummary(monthTransactions, emptyFreq, monthKey);
    },
    [monthTransactions, monthKey],
  );

  const expensePieData = useMemo<PieSlice[]>(
    () => aggregateExpensesByTag(monthTransactions, tagColorMap, tagsList, colors.muted, copy.otherLabel),
    [monthTransactions, tagColorMap, tagsList, colors.muted, copy.otherLabel],
  );

  const incomePieData = useMemo<PieSlice[]>(
    () => aggregateIncomesByTag(monthTransactions, tagColorMap, tagsList, colors.income, copy.otherLabel),
    [monthTransactions, tagColorMap, tagsList, colors.income, copy.otherLabel],
  );

  const activePieData = dashBreakdownTab === "expense" ? expensePieData : incomePieData;
  const dashTabOptions = useMemo(() => [
    { key: "expense", label: copy.expenseBreakdown },
    { key: "income", label: copy.incomeBreakdown },
  ], [copy.expenseBreakdown, copy.incomeBreakdown]);

  const recentTransactions = useMemo(
    () => allTransactions.slice(-7).reverse(),
    [allTransactions],
  );

  const savingsRate = summary.totalIncome > 0
    ? `${Math.round(summary.netMonthly / summary.totalIncome * 100)}%`
    : "—";
  const prev = prevSummary.netMonthly;
  const balanceChange = prev !== 0
    ? Math.round((summary.netMonthly - prev) / Math.abs(prev) * 100)
    : (summary.netMonthly !== 0 ? 100 : 0);
  const vsPrev = prev !== 0 ? (balanceChange >= 0 ? `+${balanceChange}%` : `${balanceChange}%`) : "—";
  const vsPrevPositive = prev !== 0 ? balanceChange >= 0 : summary.netMonthly >= 0;

  const handleDetail = useCallback(
    (tx: Transaction) => onOpenDetail(tx),
    [onOpenDetail],
  );

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
    <>
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[
        styles.pageScroll,
        styles.pageScrollMobile,
        { gap: 16 },
        topInset !== undefined && { paddingTop: topInset },
      ]}
    >
      <PeriodControls
        colors={colors}
        theme={theme}
        copy={copy}
        month={month}
        year={year}
        availableYears={availableYears}
        availableMonths={availableMonths}
        onSelectPeriod={onSelectPeriod}
        goToday={goToday}
        goPrevMonth={goPrevMonth}
        goNextMonth={goNextMonth}
      />
      <View>
        <Text
          style={{
            color: colors.text,
            fontSize: 18,
            fontWeight: "700",
            marginBottom: 10,
          }}
        >
          {`${copy.dashboardSubtitle} · ${monthKey}`}
        </Text>
        <View style={{ gap: 8 }}>
          <Animated.View style={{ flexDirection: "row", gap: 8, opacity: cardAnim, transform: [{ translateY: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }}>
            <View style={{ flex: 1, gap: 8 }}>
              <View ref={incomeCardRef} collapsable={false}>
                <StatCard
                  title={copy.income}
                  value={formatMoney(summary.totalIncome, currencySymbol)}
                  tone="income"
                  icon="cash"
                  colors={colors}
                  onPress={() => handleOpenBubble("income")}
                />
              </View>
              <View ref={expenseCardRef} collapsable={false}>
                <StatCard
                  title={copy.expensesLabel}
                  value={formatMoney(summary.totalExpense, currencySymbol)}
                  tone="expense"
                  icon="credit-card"
                  colors={colors}
                  onPress={() => handleOpenBubble("expense")}
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
                onPress={() => handleOpenBubble("balance")}
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
      </View>

      {tagsList.length > 0 && (expensePieData.length > 0 || incomePieData.length > 0) && (
        <View
          style={{
            backgroundColor: colors.card,
            borderRadius: 14,
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
          <SegmentedControl options={dashTabOptions} selected={dashBreakdownTab} onSelect={setDashBreakdownTab} colors={colors} />
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
              {dashBreakdownTab === "income" ? copy.incomeBreakdownEmpty : copy.noTagsData}
            </Text>
          )}
        </View>
      )}

      <View>
        <Text
          style={{
            color: colors.text,
            fontSize: 16,
            fontWeight: "700",
            marginBottom: 10,
          }}
        >
          {copy.recentMovements}
        </Text>
        {recentTransactions.length > 0 ? (
          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: 14,
            }}
          >
            {recentTransactions.map((tx, index) => {
              const txDate = new Date(tx.rawDate);
              const dateKey = Number.isNaN(txDate.getTime()) ? "" : txDate.toISOString().slice(0, 10);
              const prevKey = index > 0
                ? new Date(recentTransactions[index - 1].rawDate).toISOString().slice(0, 10)
                : "";
              const showDate = index === 0 || (!!dateKey && dateKey !== prevKey);
              return (
                <Fragment key={`${tx.rowId}-${tx.rawDate}-${tx.createdAtMs ?? tx.createdAt ?? ""}`}>
                  {showDate && dateKey && (
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: "600",
                        color: colors.textSubtle,
                        paddingHorizontal: 16,
                        paddingTop: index === 0 ? 8 : 4,
                        paddingBottom: 2,
                        lineHeight: 14,
                      }}
                    >
                      {txDate.getDate()} {UI_MONTH_NAMES[copy.languageCode === "en" ? "en" : "es"][txDate.getMonth()].slice(0, 3)}
                    </Text>
                  )}
                  <TransactionRow
                    tx={tx}
                    index={index}
                    sectionLength={recentTransactions.length}
                    selected={false}
                    colors={colors}
                    currencySymbol={currencySymbol}
                    copy={copy}
                    searchActive={false}
                    searchText=""
                    tagColorMap={tagColorMap}
                    tagLabelMap={tagLabelMap}
                    onOpenDetail={handleDetail}
                    onMove={() => {}}
                    onToggleSelection={() => {}}
                    setTagBubble={() => {}}
                    tagButtonRefs={tagButtonRefs}
                  />
                </Fragment>
              );
            })}
          </View>
        ) : (
          <View
            style={[
              styles.mobileEmptyCard,
              {
                backgroundColor: colors.card,
                alignItems: "center",
                padding: 24,
              },
            ]}
          >
            <Text style={[styles.empty, { color: colors.muted }]}>
              {copy.noMovements}
            </Text>
          </View>
        )}
      </View>
    </ScrollView>

      <DashboardBubble
        visible={bubbleTransition.modalVisible}
        frame={bubbleFrame}
        containerStyle={bubbleTransition.containerStyle}
        panelStyle={bubbleTransition.panelStyle}
        colors={colors}
        onClose={() => setBubbleKind(null)}
      >
        {bubbleKind === "income" && (() => {
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
        })()}

        {bubbleKind === "expense" && (() => {
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
        })()}

        {bubbleKind === "balance" && (() => {
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
        })()}
      </DashboardBubble>
    </>
  );
});
