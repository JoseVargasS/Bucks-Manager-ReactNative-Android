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
  RefreshControl,
  SectionList,
  Pressable,
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
const AnimatedSectionList = Animated.createAnimatedComponent(
  SectionList,
) as unknown as typeof SectionList;
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

const ExpensesListHeader = memo(function ExpensesListHeader({
  colors,
  copy,
  searchActive,
  onExitSearch,
  scrollY,
  periodBar,
}: {
  colors: Palette;
  copy: UiCopy;
  searchActive: boolean;
  onExitSearch: () => void;
  scrollY: Animated.Value;
  periodBar: React.ReactNode;
}) {
  return (
    <>
      <Animated.View style={{ opacity: scrollY.interpolate({ inputRange: [0, 5], outputRange: [1, 0], extrapolate: "clamp" }) }}>
        <View style={{ paddingHorizontal: 14, paddingBottom: 4 }}>
          {periodBar}
        </View>
      </Animated.View>

      {searchActive && (
        <View
          style={[
            styles.searchBanner,
            styles.searchBannerMobile,
            { backgroundColor: colors.infoSoft, borderColor: colors.info },
          ]}
        >
          <Text style={{ color: colors.info, fontWeight: "600" }}>
            {copy.searchResults}
          </Text>
          <Pressable onPress={onExitSearch}>
            <Text style={{ color: colors.info, fontWeight: "700" }}>
              {copy.exit}
            </Text>
          </Pressable>
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
  );
});

const ExpensesListFooter = memo(function ExpensesListFooter({
  colors,
  copy,
  searchActive,
  sections,
  onLoadOlder,
}: {
  colors: Palette;
  copy: UiCopy;
  searchActive: boolean;
  sections: TransactionSection[];
  onLoadOlder: () => void;
}) {
  if (searchActive) return null;
  return (
    <Pressable
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
    </Pressable>
  );
});

const ExpensesStickyHeader = memo(function ExpensesStickyHeader({
  scrollY,
  scrolled,
  topInset,
  periodBar,
}: {
  scrollY: Animated.Value;
  scrolled: boolean;
  topInset: number;
  periodBar: React.ReactNode;
}) {
  return (
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
        {periodBar}
      </View>
    </Animated.View>
  );
});

export const ExpensesView = memo(function ExpensesView({
  colors,
  theme,
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
  refreshing,
  onRefresh,
}: {
  colors: Palette;
  theme: "dark" | "light";
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
  refreshing: boolean;
  onRefresh: () => void;
}) {
  const scrollYRef = useRef<Animated.Value | null>(null);
  if (!scrollYRef.current) scrollYRef.current = new Animated.Value(0);
  const scrollY = scrollYRef.current;
  const [scrolled, setScrolled] = useState(false);
  const lastScrollTimestampRef = useRef(0);

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const now = Date.now();
      if (now - lastScrollTimestampRef.current < 150) return;
      lastScrollTimestampRef.current = now;
      const y = e.nativeEvent.contentOffset.y;
      setScrolled((prev) => (prev !== (y > 10) ? y > 10 : prev));
    },
    [],
  );

  const periodBar = useMemo(() => (
    <PeriodControls
      colors={colors}
      theme={theme}
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
  ), [colors, theme, copy, year, month, availableYears, availableMonths, onSelectPeriod, goToday, goPrevMonth, goNextMonth]);
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

  return (
    <View style={{ flex: 1 }}>
      <AnimatedSectionList
        style={{ flex: 1 }}
        sections={sections}
        keyExtractor={keyExtractor}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} progressBackgroundColor={colors.card} progressViewOffset={topInset ?? 0} />
        }
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        ListHeaderComponent={<ExpensesListHeader colors={colors} copy={copy} searchActive={searchActive} onExitSearch={onExitSearch} scrollY={scrollY} periodBar={periodBar} />}
        ListEmptyComponent={renderListEmpty}
        ListFooterComponent={<ExpensesListFooter colors={colors} copy={copy} searchActive={searchActive} sections={sections} onLoadOlder={onLoadOlder} />}
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
          { useNativeDriver: true, listener: handleScroll },
        )}
      />

      {topInset !== undefined && (
        <ExpensesStickyHeader
          scrollY={scrollY}
          scrolled={scrolled}
          topInset={topInset}
          periodBar={periodBar}
        />
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
