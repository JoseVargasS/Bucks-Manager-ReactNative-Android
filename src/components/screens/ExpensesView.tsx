import {
  memo,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Animated,
  SectionList,
  TouchableOpacity,
  View,
} from "react-native";
import type {
  NativeScrollEvent,
  NativeSyntheticEvent,
} from "react-native";
import { groupTransactionsByDate } from "@/utils/transactions";
import { base } from "@/styles/baseStyles";
import { expensesStyles } from "@/components/screens/ExpensesView.styles";
import { txStyles } from "@/styles/transactionRow";

const styles = { ...base, ...expensesStyles, ...txStyles };
import { PeriodControls } from "@/components/layout/PeriodControls";
import { type Palette } from "@/theme/colors";
import { type Tag, type Transaction } from "@/types";
import { type UiCopy } from "@/i18n";
import { useModalTransition } from "@/components/ui/useModalTransition";
import { Text } from "@/components/ui/AppText";
import { useTagMaps } from "@/hooks/useTagMaps";
import { TransactionRow, type TagButtonRef } from "@/components/screens/TransactionRow";
import { SelectionBar } from "@/components/screens/SelectionBar";
import { TagBubblePopup, type TagBubble } from "@/components/screens/TagBubble";

type TransactionSection = {
  key: string;
  title: string;
  data: Transaction[];
};

export const ExpensesView = memo(function ExpensesView({
  colors,
  transactions,
  searchActive,
  searchText,
  selectedRows,
  currencySymbol,
  copy,
  onExitSearch,
  onOpenDetail,
  onEdit,
  onDeleteSelected,
  onMove,
  onToggleSelection,
  onLoadOlder,
  topInset,
  tagsList,
  month,
  year,
  availableYears,
  availableMonths,
  onSelectPeriod,
  goToday,
  goPrevMonth,
  goNextMonth,
}: {
  colors: Palette;
  transactions: Transaction[];
  searchActive: boolean;
  searchText: string;
  selectedRows: number[];
  currencySymbol: string;
  copy: UiCopy;
  onExitSearch: () => void;
  onOpenDetail: (tx: Transaction) => void;
  onEdit: (tx: Transaction) => void;
  onDeleteSelected: () => void;
  onMove: (tx: Transaction) => void;
  onToggleSelection: (tx: Transaction) => void;
  onLoadOlder: () => void;
  topInset?: number;
  tagsList: Tag[];
  month: number;
  year: number;
  availableYears: number[];
  availableMonths: number[];
  onSelectPeriod: (month: number, year: number) => void;
  goToday: () => void;
  goPrevMonth: () => void;
  goNextMonth: () => void;
}) {
  const scrollY = useRef(new Animated.Value(0)).current;
  const [scrolled, setScrolled] = useState(false);
  const groups = useMemo(
    () => groupTransactionsByDate(transactions, copy),
    [transactions, copy],
  );
  const sections = useMemo<TransactionSection[]>(
    () =>
      groups.map((group) => ({
        key: group.key,
        title: group.label,
        data: group.items,
      })),
    [groups],
  );
  const selectedRowSet = useMemo(() => new Set(selectedRows), [selectedRows]);
  const selectedCount = selectedRows.length;
  const firstSelectedRow = selectedRows[0];
  const selectedTx = useMemo(
    () => transactions.find((tx) => tx.rowId === firstSelectedRow),
    [transactions, firstSelectedRow],
  );
  const [tagBubble, setTagBubble] = useState<TagBubble | null>(null);
  const [displayTagBubble, setDisplayTagBubble] = useState<TagBubble | null>(
    null,
  );
  const tagBubbleTransition = useModalTransition(Boolean(tagBubble), 6, 0.99);
  const tagButtonRefs = useRef<Record<number, TagButtonRef | null>>({});
  const { tagColorMap, tagLabelMap } = useTagMaps(tagsList);
  // ponytail: stable id from rowId+date+created time. Avoids remounting rows when
  // the Sheet normalizes the amount or detail string back into a slightly different value.
  const keyExtractor = useCallback(
    (tx: Transaction) =>
      `${tx.rowId}-${tx.rawDate}-${tx.createdAtMs ?? tx.createdAt ?? ""}`,
    [],
  );

  const closeTagBubble = useCallback(() => setTagBubble(null), []);
  const currentTagBubble = tagBubble || displayTagBubble;

  useLayoutEffect(() => {
    if (tagBubble) setDisplayTagBubble(tagBubble);
  }, [tagBubble]);

  const renderListHeader = useCallback(
    () => (
      <>
        <Animated.View style={{ opacity: scrollY.interpolate({ inputRange: [0, 5], outputRange: [1, 0], extrapolate: "clamp" }) }}>
          <View style={{ paddingHorizontal: 14, paddingBottom: 4 }}>
            <PeriodControls
              colors={colors}
              copy={copy}
              year={year}
              month={month}
              availableYears={availableYears}
              availableMonths={availableMonths}
              onSelectPeriod={onSelectPeriod}
              goToday={goToday}
              goPrevMonth={goPrevMonth}
              goNextMonth={goNextMonth}
            />
          </View>
        </Animated.View>

        {searchActive && (
          <View
            style={[
              styles.searchBanner,
              styles.searchBannerMobile,
              { backgroundColor: colors.infoSoft, borderColor: colors.blue },
            ]}
          >
            <Text style={{ color: colors.blue, fontWeight: "600" }}>
              {copy.searchResults}
            </Text>
            <TouchableOpacity onPress={onExitSearch}>
              <Text style={{ color: colors.blue, fontWeight: "700" }}>
                {copy.exit}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <Text
          style={{
            paddingHorizontal: 18,
            paddingTop: 2,
            fontSize: 16,
            fontWeight: "700",
            color: colors.text,
          }}
        >
          {copy.movementsTitle}
        </Text>
      </>
    ),
    [
      colors,
      copy,
      searchActive,
      onExitSearch,
      scrollY,
      year,
      month,
      availableYears,
      availableMonths,
      onSelectPeriod,
      goToday,
      goPrevMonth,
      goNextMonth,
    ],
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: TransactionSection }) => (
      <View style={styles.sectionHeader}>
        <Text style={[styles.dateGroupLabel, { color: colors.muted }]}>
          {section.title}
        </Text>
      </View>
    ),
    [colors.muted],
  );

  const renderItem = useCallback(
    ({
      item,
      index,
      section,
    }: {
      item: Transaction;
      index: number;
      section: TransactionSection;
    }) => (
      <TransactionRow
        tx={item}
        index={index}
        sectionLength={section.data.length}
        selected={selectedRowSet.has(item.rowId)}
        colors={colors}
        currencySymbol={currencySymbol}
        copy={copy}
        searchActive={searchActive}
        searchText={searchText}
        tagColorMap={tagColorMap}
        tagLabelMap={tagLabelMap}
        onOpenDetail={onOpenDetail}
        onMove={onMove}
        onToggleSelection={onToggleSelection}
        setTagBubble={setTagBubble}
        tagButtonRefs={tagButtonRefs}
      />
    ),
    [
      colors,
      copy,
      currencySymbol,
      onMove,
      onOpenDetail,
      onToggleSelection,
      searchActive,
      searchText,
      selectedRowSet,
      tagColorMap,
      tagLabelMap,
    ],
  );

  const renderListEmpty = useCallback(
    () => (
      <View
        style={[
          styles.mobileEmptyCard,
          { backgroundColor: colors.card, marginHorizontal: 14, marginTop: 12 },
        ]}
      >
        <Text style={[styles.empty, { color: colors.muted }]}>
          {copy.noMovements}
        </Text>
      </View>
    ),
    [colors.card, colors.muted, copy.noMovements],
  );

  const renderListFooter = useCallback(() => {
    if (searchActive) return null;
    return (
      <TouchableOpacity
        style={[
          styles.loadOlderBtn,
          {
            backgroundColor: colors.card,
            marginHorizontal: 14,
            marginTop: sections.length ? 18 : 12,
          },
        ]}
        onPress={onLoadOlder}
      >
        <Text style={[styles.loadOlderText, { color: colors.text }]}>
          {copy.loadOlder}
        </Text>
      </TouchableOpacity>
    );
  }, [
    colors.card,
    colors.text,
    copy.loadOlder,
    onLoadOlder,
    searchActive,
    sections.length,
  ]);

  return (
    <View style={{ flex: 1 }}>
      <SectionList
        style={{ flex: 1 }}
        sections={sections}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        ListHeaderComponent={renderListHeader}
        ListEmptyComponent={renderListEmpty}
        ListFooterComponent={renderListFooter}
        contentContainerStyle={[
          styles.pageScroll,
          topInset !== undefined && { paddingTop: topInset },
          selectedCount > 0 && { paddingBottom: 100 },
        ]}
        extraData={selectedRowSet}
        initialNumToRender={12}
        maxToRenderPerBatch={10}
        windowSize={7}
        removeClippedSubviews={false}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
        onScrollBeginDrag={closeTagBubble}
        onMomentumScrollBegin={closeTagBubble}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false, listener: (e: NativeSyntheticEvent<NativeScrollEvent>) => setScrolled(e.nativeEvent.contentOffset.y > 2) },
        )}
      />

      {topInset !== undefined && (
        <Animated.View
          pointerEvents={scrolled ? "box-none" : "none"}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            paddingTop: topInset,
            opacity: scrollY.interpolate({
              inputRange: [0, 5],
              outputRange: [0, 1],
              extrapolate: "clamp",
            }),
          }}
        >
          <View style={{ paddingHorizontal: 14, paddingBottom: 4 }}>
            <PeriodControls
              colors={colors}
              copy={copy}
              year={year}
              month={month}
              availableYears={availableYears}
              availableMonths={availableMonths}
              onSelectPeriod={onSelectPeriod}
              goToday={goToday}
              goPrevMonth={goPrevMonth}
              goNextMonth={goNextMonth}
            />
          </View>
        </Animated.View>
      )}

      {selectedCount > 0 && (
        <SelectionBar
          selectedCount={selectedCount}
          selectedTx={selectedTx}
          copy={copy}
          colors={colors}
          onEdit={onEdit}
          onDeleteSelected={onDeleteSelected}
        />
      )}

      {currentTagBubble && (
        <TagBubblePopup
          data={currentTagBubble}
          visible={tagBubbleTransition.modalVisible}
          containerStyle={tagBubbleTransition.containerStyle}
          panelStyle={tagBubbleTransition.panelStyle}
          tagColorMap={tagColorMap}
          tagLabelMap={tagLabelMap}
          colors={colors}
          onClose={closeTagBubble}
        />
      )}
    </View>
  );
});
