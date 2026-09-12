import { memo, useCallback, useRef, useState } from "react";
import { RefreshControl, ScrollView, View } from "react-native";

import { base } from "@/styles/baseStyles";
import { dashboardStyles } from "@/components/screens/DashboardView.styles";
import { txStyles } from "@/styles/transactionRow";

const styles = { ...base, ...dashboardStyles, ...txStyles };
import type { Palette } from "@/theme/colors";
import type { Tag, Transaction } from "@/types";
import type { UiCopy } from "@/i18n";
import { Text } from "@/components/ui/AppText";
import { T } from "@/theme/typography";
import { useTagMaps } from "@/hooks/useTagMaps";
import type { TagButtonRef } from "@/components/screens/TransactionRow";
import { PeriodControls } from "@/components/layout/PeriodControls";
import { DashboardBubble } from "@/components/ui/DashboardBubble";
import { useModalTransition } from "@/components/ui/useModalTransition";
import { useDashboardData } from "@/hooks/useDashboardData";
import { DashboardSummaryCards, type BubbleKind } from "@/components/dashboard/DashboardSummaryCards";
import { DashboardPieSection } from "@/components/dashboard/DashboardPieSection";
import { DashboardRecentList } from "@/components/dashboard/DashboardRecentList";
import { DashboardBubbleContent } from "@/components/dashboard/DashboardBubbleContent";

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
  refreshing,
  onRefresh,
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
  refreshing: boolean;
  onRefresh: () => void;
}) {
  const { tagColorMap, tagLabelMap } = useTagMaps(tagsList);
  const [dashBreakdownTab, setDashBreakdownTab] = useState("expense");
  const tagButtonRefs = useRef<Record<number, TagButtonRef | null>>({});

  const [bubbleKind, setBubbleKind] = useState<BubbleKind | null>(null);
  const [bubbleFrame, setBubbleFrame] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const bubbleTransition = useModalTransition(Boolean(bubbleKind), 6, 0.95, () => setBubbleKind(null));
  const incomeCardRef = useRef<View>(null);
  const expenseCardRef = useRef<View>(null);
  const balanceCardRef = useRef<View>(null);

  const handleOpenBubble = useCallback((kind: BubbleKind) => {
    const refMap = { income: incomeCardRef, expense: expenseCardRef, balance: balanceCardRef };
    refMap[kind].current?.measureInWindow((x: number, y: number, width: number, height: number) => {
      setBubbleFrame({ x, y, width, height });
      setBubbleKind(kind);
    });
  }, []);

  const data = useDashboardData(
    allTransactions,
    month,
    year,
    tagColorMap,
    tagsList,
    colors,
    copy,
  );

  const handleDetail = useCallback(
    (tx: Transaction) => onOpenDetail(tx),
    [onOpenDetail],
  );

  return (
    <>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} progressBackgroundColor={colors.card} progressViewOffset={topInset ?? 0} />
        }
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
            style={[{ color: colors.text, marginBottom: 10 }, T.section]}
          >
            {`${copy.dashboardSubtitle} · ${data.monthKey}`}
          </Text>
          <DashboardSummaryCards
            colors={colors}
            currencySymbol={currencySymbol}
            copy={copy}
            summary={data.summary}
            savingsRate={data.savingsRate}
            vsPrev={data.vsPrev}
            vsPrevPositive={data.vsPrevPositive}
            incomeCardRef={incomeCardRef}
            expenseCardRef={expenseCardRef}
            balanceCardRef={balanceCardRef}
            onOpenBubble={handleOpenBubble}
          />
        </View>

        {tagsList.length > 0 && (data.expensePieData.length > 0 || data.incomePieData.length > 0) && (
          <DashboardPieSection
            colors={colors}
            currencySymbol={currencySymbol}
            copy={copy}
            month={month}
            expensePieData={data.expensePieData}
            incomePieData={data.incomePieData}
            activeTab={dashBreakdownTab}
            onTabChange={setDashBreakdownTab}
          />
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
          <DashboardRecentList
            colors={colors}
            currencySymbol={currencySymbol}
            copy={copy}
            transactions={data.recentTransactions}
            tagColorMap={tagColorMap}
            tagLabelMap={tagLabelMap}
            tagButtonRefs={tagButtonRefs}
            onOpenDetail={handleDetail}
          />
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
        {bubbleKind && (
          <DashboardBubbleContent
            kind={bubbleKind}
            colors={colors}
            currencySymbol={currencySymbol}
            copy={copy}
            summary={data.summary}
          />
        )}
      </DashboardBubble>
    </>
  );
});
