import { Fragment, memo, useMemo, useCallback, useRef } from "react";
import { ScrollView, View } from "react-native";

import { formatMoney, calculateMonthSummary } from "@/domain/bucksLogic";
import { base } from "@/styles/baseStyles";
import { dashboardStyles } from "@/components/screens/DashboardView.styles";
import { txStyles } from "@/styles/transactionRow";

const styles = { ...base, ...dashboardStyles, ...txStyles };
import { type Palette } from "@/theme/colors";
import { type SummaryRow, type Tag, type Transaction } from "@/types";
import { UI_MONTH_NAMES, type UiCopy } from "@/i18n";
import { labelForTagId } from "@/utils/tags";
import { shiftColor } from "@/utils/color";
import { StatCard } from "@/components/ui/StatCard";
import { PieChart, type PieSlice } from "@/components/ui/PieChart";
import { Text } from "@/components/ui/AppText";
import { useTagMaps } from "@/hooks/useTagMaps";
import { TransactionRow, type TagButtonRef } from "@/components/screens/TransactionRow";
import { PeriodControls } from "@/components/layout/PeriodControls";

export const DashboardView = memo(function DashboardView({
  colors,
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
  const tagButtonRefs = useRef<Record<number, TagButtonRef | null>>({});
  const localizedMonthNames = copy.languageCode === "en" ? UI_MONTH_NAMES.en : UI_MONTH_NAMES.es;
  const monthKey = `${localizedMonthNames[month]} ${year}`;
  const monthTransactions = useMemo(
    () => allTransactions.filter((tx) => {
      const d = tx.rawDateMs != null ? new Date(tx.rawDateMs) : new Date(tx.rawDate);
      return d.getMonth() === month && d.getFullYear() === year;
    }),
    [allTransactions, month, year],
  );

  const summary = useMemo<SummaryRow>(
    () => {
      const emptyFreq: Record<string, number> = {};
      return calculateMonthSummary(monthTransactions, emptyFreq, monthKey);
    },
    [monthTransactions, monthKey],
  );

  const pieData = useMemo<PieSlice[]>(() => {
    const expenseTransactions = monthTransactions.filter(
      (tx) => tx.amount < 0 && tx.type.startsWith("GASTO"),
    );
    const tagTotals: Record<string, number> = {};
    let untaggedTotal = 0;
    let totalExpense = 0;
    expenseTransactions.forEach((tx) => {
      const lineItems = (tx.lineItems && tx.lineItems.length > 0)
        ? tx.lineItems
        : [{ amount: String(tx.amount), description: tx.detail ?? "", tags: tx.tags ?? [] }];
      lineItems.forEach((li) => {
        const liAmount = Math.abs(parseFloat(String(li.amount)));
        if (!Number.isFinite(liAmount) || liAmount === 0) return;
        totalExpense += liAmount;
        if (li.tags && li.tags.length > 0) {
          li.tags.forEach((tagId) => {
            tagTotals[tagId] = (tagTotals[tagId] || 0) + liAmount;
          });
        } else {
          untaggedTotal += liAmount;
        }
      });
    });
    if (totalExpense === 0) return [];

    const slices: { label: string; value: number; color: string }[] = [];
    const tagEntries = Object.entries(tagTotals).sort(([, a], [, b]) => b - a);
    const colorUsed = new Map<string, number>();
    tagEntries.forEach(([id, val]) => {
      const baseColor = tagColorMap[id] || colors.muted;
      const used = colorUsed.get(baseColor) || 0;
      slices.push({
        label: labelForTagId(id, tagsList),
        value: val,
        color: shiftColor(baseColor, used * 12),
      });
      colorUsed.set(baseColor, (colorUsed.get(baseColor) || 0) + 1);
    });
    if (untaggedTotal > 0) {
      slices.push({ label: copy.otherLabel, value: untaggedTotal, color: colors.muted });
    }
    slices.sort((a, b) => b.value - a.value);
    const grandTotal = slices.reduce((s, sl) => s + sl.value, 0) || 1;
    return slices.map((s) => ({
      ...s,
      percentage: (s.value / grandTotal) * 100,
    }));
  }, [monthTransactions, tagColorMap, tagsList, colors, copy.otherLabel]);

  const recentTransactions = useMemo(
    () =>
      [...allTransactions]
        .sort(
          (a, b) =>
            (b.rawDateMs ?? Date.parse(b.rawDate)) -
            (a.rawDateMs ?? Date.parse(a.rawDate)) ||
            (b.createdAtMs ?? 0) - (a.createdAtMs ?? 0),
        )
        .slice(0, 7),
    [allTransactions],
  );

  const handleDetail = useCallback(
    (tx: Transaction) => onOpenDetail(tx),
    [onOpenDetail],
  );

  return (
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
        <View style={[styles.statsGrid, styles.statsGridMobile, { paddingHorizontal: 0 }]}>
          <StatCard
            title={copy.freqIncome}
            value={formatMoney(summary.freqIncome, currencySymbol)}
            tone="income"
            icon="cash"
            colors={colors}
          />
          <StatCard
            title={copy.nonFreqIncome}
            value={formatMoney(summary.nonFreqIncome, currencySymbol)}
            tone="income"
            icon="trending-up"
            colors={colors}
          />
          <StatCard
            title={copy.freqExpense}
            value={formatMoney(summary.freqExpense, currencySymbol)}
            tone="expense"
            icon="credit-card"
            colors={colors}
          />
          <StatCard
            title={copy.nonFreqExpense}
            value={formatMoney(summary.nonFreqExpense, currencySymbol)}
            tone="expense"
            icon="trending-down"
            colors={colors}
          />
          <StatCard
            title={copy.totalExpense}
            value={formatMoney(summary.totalExpense, currencySymbol)}
            tone="warn"
            icon="basket"
            colors={colors}
          />
          <StatCard
            title={copy.balance}
            value={formatMoney(summary.netMonthly, currencySymbol)}
            tone="balance"
            icon="wallet"
            colors={colors}
          />
        </View>
      </View>

      {tagsList.length > 0 && pieData.length > 0 && (
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
          <PieChart
            key={`pie-${allTransactions.length}-${month}`}
            data={pieData}
            colors={colors}
            currencySymbol={currencySymbol}
            formatValue={(v) => formatMoney(v, currencySymbol, 1).replace(/^\+ /, "")}
            totalLabel={copy.total}
            otherLabel={copy.otherLabel}
          />
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
  );
});
