import { memo, useCallback, useEffect, useRef } from "react";
import { Animated, Dimensions, Easing, Pressable, StyleSheet, View } from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { formatMoney } from "@/domain/bucksLogic";
import { formatCreatedTime, typeColor, typeFill, typeLabelFull } from "@/utils/formats";
import { abbreviateTag, tagTextColor } from "@/utils/tags";
import { useFreshCreatedAt } from "@/utils/freshRows";
import { ANIM_ROW_FLASH } from "@/theme/constants";
import { txStyles } from "@/styles/transactionRow";
import { HighlightedText } from "@/components/ui/HighlightedText";
import { type Palette } from "@/theme/colors";
import { RADIUS } from "@/theme/radii";
import { type Transaction, type MaterialIconName } from "@/types";
import { type UiCopy } from "@/i18n";
import { Text } from "@/components/ui/AppText";

import { type TagBubble } from "@/components/screens/TagBubble";

export type TagButtonRef = {
  measureInWindow?: (
    cb: (x: number, y: number, width: number, height: number) => void,
  ) => void;
};

type TransactionRowProps = {
  tx: Transaction;
  index: number;
  sectionLength: number;
  selected: boolean;
  colors: Palette;
  currencySymbol: string;
  copy: UiCopy;
  searchActive: boolean;
  searchText: string;
  tagColorMap: Record<string, string>;
  tagLabelMap: Record<string, string>;
  onOpenDetail: (tx: Transaction) => void;
  onMove: (tx: Transaction) => void;
  onToggleSelection: (tx: Transaction) => void;
  setTagBubble: (bubble: TagBubble | null) => void;
  tagButtonRefs: { current: Record<number, TagButtonRef | null> };
};

export const TransactionRow = memo(function TransactionRow({
  tx,
  index,
  sectionLength,
  selected,
  colors,
  currencySymbol,
  copy,
  searchActive,
  searchText,
  tagColorMap,
  tagLabelMap,
  onOpenDetail,
  onMove,
  onToggleSelection,
  setTagBubble,
  tagButtonRefs,
}: TransactionRowProps) {
  const icon =
    tx.amount >= 0
      ? "bank-transfer-in"
      : tx.type === "GASTO FRECUENTE"
        ? "credit-card-outline"
        : "basket-outline";
  const isFreqExpense = tx.type === "GASTO FRECUENTE";
  const hasLineItems = !!tx.lineItems?.length;
  const displayText = hasLineItems ? (tx.detail.split(":")[0] || tx.detail) : tx.detail;
  const showPill = tx.type !== "GASTO NO FRECUENTE";
  const tags = (tx.tags || []).filter((t) => tagColorMap[t] || tagLabelMap[t]);
  const visibleTags = tags.slice(0, 2);
  const fresh = useFreshCreatedAt(tx.createdAtMs);
  const hiddenTagCount = Math.max(0, tags.length - visibleTags.length);

  const handlePress = useCallback(() => onOpenDetail(tx), [onOpenDetail, tx]);
  const handleLongPress = useCallback(
    () => (selected ? onMove(tx) : onToggleSelection(tx)),
    [onMove, onToggleSelection, selected, tx],
  );
  const handleTagRef = useCallback(
    (ref: TagButtonRef | null) => {
      if (ref) tagButtonRefs.current[tx.rowId] = ref;
      else delete tagButtonRefs.current[tx.rowId];
    },
    [tagButtonRefs, tx.rowId],
  );
  const handleHiddenTagsPress = useCallback(() => {
    const allTags = (tx.tags || []).filter((t) => tagColorMap[t] || tagLabelMap[t]);
    const hiddenTags = allTags.slice(2);
    if (!hiddenTags.length) return;
    tagButtonRefs.current[tx.rowId]?.measureInWindow?.((x, y) => {
      const screen = Dimensions.get("window");
      setTagBubble({
        x: Math.min(x, screen.width - 176),
        y: Math.min(y, screen.height - 190),
        tags: hiddenTags,
      });
    });
  }, [setTagBubble, tagButtonRefs, tagColorMap, tagLabelMap, tx.rowId, tx.tags]);

  return (
    <Pressable
      onPress={handlePress}
      onLongPress={handleLongPress}
      style={[
        txStyles.groupedTxRow,
        txStyles.sectionCardRow,
        { backgroundColor: colors.card },
        index > 0 && { borderTopWidth: 0.5, borderColor: colors.border },
        index === 0 && txStyles.sectionCardFirstRow,
        index === sectionLength - 1 && txStyles.sectionCardLastRow,
        isFreqExpense && { backgroundColor: colors.freqExpenseRow },
        selected && { backgroundColor: colors.primarySoft },
      ]}
    >
      <View
        style={[
          txStyles.txIcon,
          {
            backgroundColor: selected
              ? colors.infoSoft
              : typeFill(tx.type, colors),
          },
        ]}
      >
        <MaterialCommunityIcons
          name={selected ? "check" : (icon as MaterialIconName)}
          size={18}
          color={selected ? colors.info : typeColor(tx.type, colors)}
        />
      </View>
      <View style={txStyles.groupedTxMain}>
        <HighlightedText
          text={displayText}
          query={searchActive ? searchText : ""}
          style={[txStyles.groupedTxTitle, { color: colors.text }]}
          highlightStyle={{
            color: colors.onPrimary,
            backgroundColor: colors.primary,
            borderRadius: 4,
          }}
        />
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            marginTop: 3,
          }}
        >
          {showPill && (
            <View
              style={{
                paddingHorizontal: 7,
                paddingVertical: 2,
                borderRadius: RADIUS.pill,
                backgroundColor: typeFill(tx.type, colors),
              }}
            >
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: "600",
                  color: typeColor(tx.type, colors),
                }}
              >
                {typeLabelFull(tx.type, copy)}
              </Text>
            </View>
          )}
          <Text style={[txStyles.groupedTxMeta, { color: colors.muted }]}>
            {formatCreatedTime(tx.createdAt).slice(0, 5)}
          </Text>
          {visibleTags.map((tag) => {
            const tagColor = tagColorMap[tag] || colors.muted;
            const tagLabel = tagLabelMap[tag] || tag;
            return (
              <View
                key={tag}
                style={{
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  borderRadius: RADIUS.pill,
                  backgroundColor: tagColor,
                }}
              >
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: "700",
                    color: tagTextColor(tagColor, colors),
                  }}
                >
                  {abbreviateTag(tagLabel)}
                </Text>
              </View>
            );
          })}
          {hiddenTagCount > 0 && (
            <Pressable
              ref={handleTagRef}
              onPress={handleHiddenTagsPress}
              style={{
                paddingHorizontal: 6,
                paddingVertical: 2,
                borderRadius: RADIUS.pill,
                backgroundColor: colors.primary,
              }}
            >
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: "700",
                  color: colors.onPrimary,
                }}
              >
                +{hiddenTagCount}
              </Text>
            </Pressable>
          )}
        </View>
      </View>
      <Text
        numberOfLines={1}
        style={[
          txStyles.groupedTxAmount,
          { color: tx.amount >= 0 ? colors.income : colors.expense },
        ]}
      >
        {formatMoney(tx.amount, currencySymbol)}
      </Text>
      {selected && (
        <MaterialCommunityIcons
          name="drag-vertical"
          size={18}
          color={colors.muted}
        />
      )}
      <FreshRowFlash active={fresh} color={colors.primarySoft} first={index === 0} last={index === sectionLength - 1} />
    </Pressable>
  );
});

// One-shot entrance for just-created/edited rows: plays once per mount while
// the row's createdAtMs is marked fresh (see freshRows). Recycled SectionList
// instances render other txs whose marks read false; scroll never triggers it.
const FreshRowFlash = memo(function FreshRowFlash({
  active, color, first, last,
}: {
  active: boolean; color: string; first: boolean; last: boolean;
}) {
  const valueRef = useRef<Animated.Value | null>(null);
  if (!valueRef.current) valueRef.current = new Animated.Value(active ? 0.55 : 0);
  const playedRef = useRef(false);
  useEffect(() => {
    if (!active || playedRef.current || !valueRef.current) return;
    playedRef.current = true;
    const value = valueRef.current;
    value.stopAnimation();
    value.setValue(0.55);
    Animated.timing(value, {
      toValue: 0,
      duration: ANIM_ROW_FLASH,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [active]);
  if (!active) return null;
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        {
          backgroundColor: color,
          opacity: valueRef.current,
          borderTopLeftRadius: first ? RADIUS.xl : 0,
          borderTopRightRadius: first ? RADIUS.xl : 0,
          borderBottomLeftRadius: last ? RADIUS.xl : 0,
          borderBottomRightRadius: last ? RADIUS.xl : 0,
        },
      ]}
    />
  );
});
