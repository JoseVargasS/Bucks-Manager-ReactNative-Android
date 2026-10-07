import { Fragment, memo } from "react";
import { View } from "react-native";
import type { Palette } from "@/theme/colors";
import type { Transaction } from "@/types";
import { UI_MONTH_NAMES, type UiCopy } from "@/i18n";
import { Text } from "@/components/ui/AppText";
import { TransactionRow, type TagButtonRef } from "@/components/screens/TransactionRow";
import type { TagBubble } from "@/components/screens/TagBubble";
import { base } from "@/styles/baseStyles";
import { RADIUS } from "@/theme/radii";

export const DashboardRecentList = memo(function DashboardRecentList({
  colors,
  currencySymbol,
  copy,
  transactions,
  tagColorMap,
  tagLabelMap,
  tagButtonRefs,
  setTagBubble,
  onOpenDetail,
}: {
  colors: Palette;
  currencySymbol: string;
  copy: UiCopy;
  transactions: Transaction[];
  tagColorMap: Record<string, string>;
  tagLabelMap: Record<string, string>;
  tagButtonRefs: React.MutableRefObject<Record<number, TagButtonRef | null>>;
  setTagBubble: (bubble: TagBubble | null) => void;
  onOpenDetail: (tx: Transaction) => void;
}) {
  if (transactions.length === 0) {
    return (
      <View
        style={[
          base.mobileEmptyCard,
          {
            backgroundColor: colors.card,
            alignItems: "center",
            padding: 24,
          },
        ]}
      >
        <Text style={[base.empty, { color: colors.muted }]}>
          {copy.noMovements}
        </Text>
      </View>
    );
  }

  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderRadius: RADIUS.xl,
      }}
    >
      {transactions.map((tx, index) => {
        const txDate = new Date(tx.rawDate);
        const dateKey = Number.isNaN(txDate.getTime()) ? "" : txDate.toISOString().slice(0, 10);
        const prevKey = index > 0
          ? new Date(transactions[index - 1].rawDate).toISOString().slice(0, 10)
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
              sectionLength={transactions.length}
              selected={false}
              colors={colors}
              currencySymbol={currencySymbol}
              copy={copy}
              searchActive={false}
              searchText=""
              tagColorMap={tagColorMap}
              tagLabelMap={tagLabelMap}
              onOpenDetail={onOpenDetail}
              onMove={() => {}}
              onToggleSelection={() => {}}
              setTagBubble={setTagBubble}
              tagButtonRefs={tagButtonRefs}
            />
          </Fragment>
        );
      })}
    </View>
  );
});
