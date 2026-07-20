import { useMemo, useRef, useState, useCallback } from "react";

import {
  applySearch,
  calculateSummaries,
  MONTH_NAMES,
  recalculateSummariesForMonths,
} from "@/domain/bucksLogic";
import {
  sortTransactionsDesc,
  filterTransactionsByRollingPeriod,
} from "@/utils/transactions";
import { saveFinancialCache, saveOfflineCache } from "@/data/localCache";
import { getPeriodRange, getAvailableMonthsForYear } from "@/utils/helpers";
import {
  emptySearchFilters,
} from "@/components/modals/SearchModal";
import type { SearchFilters, SummaryRow, Tag, Transaction } from "@/types";

function renumberTransactions(items: Transaction[]) {
  return items.map((item, idx) => ({ ...item, rowId: idx + 2 }));
}

type FinancialState = {
  transactions: Transaction[];
  summaries: SummaryRow[];
  freqIncome: Record<string, number>;
  freqIncomeRef: React.MutableRefObject<Record<string, number>>;
  hasLocalData: boolean;
  hasLocalDataRef: React.MutableRefObject<boolean>;
  lastSyncedAt: string | null;
  month: number;
  year: number;
  loadedMonthCount: number;
  searchFilters: SearchFilters;
  searchActive: boolean;
  selectedRows: number[];
  replaceTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  recalcAndReplaceTransactions: (next: Transaction[], affectedMonths: string[]) => void;
  removeFromSelection: (rowId: number) => void;
  setPeriod: (month: number, year: number) => void;
  toggleSearchActive: (active: boolean) => void;
  clearSelection: () => void;
  periodRange: { minYear: number; maxYear: number };
  availableYears: number[];
  availableMonths: number[];
  currentSummary: SummaryRow;
  visibleTransactions: Transaction[];
  tagLabelsById: Record<string, string>;
  didSetInitialPeriodRef: React.MutableRefObject<boolean>;
  applyFinancialState: (
    nextTransactions: Transaction[],
    nextSummaries: SummaryRow[],
    nextFreqIncome: Record<string, number>,
    syncedAt: string | null,
    fromCache?: boolean,
  ) => void;
  persistFinancialState: (
    nextTransactions: Transaction[],
    nextSummaries: SummaryRow[],
    nextFreqIncome: Record<string, number>,
    syncedAt?: string | null,
    sheetId?: string,
  ) => void;
  resetFinancial: () => void;
  renumberTransactions: (items: Transaction[]) => Transaction[];
  updateInitialPeriod: (source: Transaction[]) => void;
  selectPeriod: (nextMonth: number, nextYear: number) => void;
  goToday: () => void;
  goPrevMonth: () => void;
  goNextMonth: () => void;
  loadOlder: () => void;
  applySearchFilters: (nextFilters: SearchFilters) => void;
  clearSearchFilters: () => void;
  toggleSelection: (tx: Transaction) => void;
};

export function useFinancialState(tagsList: Tag[]): FinancialState {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summaries, setSummaries] = useState<SummaryRow[]>([]);
  const [freqIncome, setFreqIncome] = useState<Record<string, number>>({});
  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());
  const [hasLocalData, setHasLocalData] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [loadedMonthCount, setLoadedMonthCount] = useState(1);
  const [searchFilters, setSearchFilters] =
    useState<SearchFilters>(emptySearchFilters);
  const [searchActive, setSearchActive] = useState(false);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);

  const freqIncomeRef = useRef<Record<string, number>>({});
  const hasLocalDataRef = useRef(false);
  const didSetInitialPeriodRef = useRef(false);

  // --- Derived data ---

  const tagLabelsById = useMemo(() => {
    const map: Record<string, string> = {};
    tagsList.forEach((tag) => {
      map[tag.id] = tag.label;
    });
    return map;
  }, [tagsList]);

  const visibleTransactions = useMemo(() => {
    const source = searchActive
      ? applySearch(transactions, searchFilters, tagLabelsById)
      : filterTransactionsByRollingPeriod(
          transactions,
          month,
          year,
          loadedMonthCount,
        );
    return sortTransactionsDesc(source);
  }, [
    transactions,
    month,
    year,
    loadedMonthCount,
    searchActive,
    searchFilters,
    tagLabelsById,
  ]);

  const currentSummary = useMemo(() => {
    const key = `${MONTH_NAMES[month]} ${year}`;
    return (
      summaries.find((row) => row.monthYear === key) || {
        monthYear: key,
        freqIncome: freqIncome[key] || 0,
        nonFreqIncome: 0,
        totalIncome: freqIncome[key] || 0,
        freqExpense: 0,
        nonFreqExpense: 0,
        totalExpense: 0,
        netMonthly: freqIncome[key] || 0,
        netNoFreq: 0,
      }
    );
  }, [summaries, month, year, freqIncome]);

  const periodRange = useMemo(
    () => getPeriodRange(transactions),
    [transactions],
  );

  const availableYears = useMemo(
    () =>
      Array.from(
        { length: periodRange.maxYear - periodRange.minYear + 1 },
        (_, index) => periodRange.maxYear - index,
      ),
    [periodRange],
  );

  const availableMonths = useMemo(
    () => getAvailableMonthsForYear(year, periodRange),
    [year, periodRange],
  );

  // --- Pure helpers ---

  // --- Actions ---

  function applyFinancialState(
    nextTransactions: Transaction[],
    nextSummaries: SummaryRow[],
    nextFreqIncome: Record<string, number>,
    syncedAt: string | null,
    fromCache = false,
  ) {
    const summariesToUse = nextSummaries.length
      ? nextSummaries
      : calculateSummaries(nextTransactions, nextFreqIncome);
    setTransactions(nextTransactions);
    setSummaries(summariesToUse);
    setFreqIncome(nextFreqIncome);
    freqIncomeRef.current = nextFreqIncome;
    setLastSyncedAt(syncedAt);
    const nextHasLocalData =
      nextTransactions.length > 0 || summariesToUse.length > 0;
    setHasLocalData(nextHasLocalData);
    hasLocalDataRef.current = nextHasLocalData;
    if (fromCache || nextTransactions.length) updateInitialPeriod(nextTransactions);
  }

  function persistFinancialState(
    nextTransactions: Transaction[],
    nextSummaries: SummaryRow[],
    nextFreqIncome: Record<string, number>,
    syncedAt = lastSyncedAt,
    sheetId = "",
  ) {
    const summariesToUse = nextSummaries.length
      ? nextSummaries
      : calculateSummaries(nextTransactions, nextFreqIncome);
    const nextHasLocalData =
      nextTransactions.length > 0 || summariesToUse.length > 0;
    setHasLocalData(nextHasLocalData);
    hasLocalDataRef.current = nextHasLocalData;
    if (sheetId) {
      saveFinancialCache({
        spreadsheetId: sheetId,
        transactions: nextTransactions,
        summaries: summariesToUse,
        freqIncome: nextFreqIncome,
        lastSyncedAt: syncedAt,
      }).catch(() => undefined);
    } else {
      saveOfflineCache(nextTransactions, summariesToUse, nextFreqIncome).catch(() => undefined);
    }
  }

  function resetFinancial() {
    setTransactions([]);
    setSummaries([]);
    setFreqIncome({});
    freqIncomeRef.current = {};
    setHasLocalData(false);
    hasLocalDataRef.current = false;
    setLastSyncedAt(null);
    didSetInitialPeriodRef.current = false;
  }

  function updateInitialPeriod(source: Transaction[]) {
    if (didSetInitialPeriodRef.current || !source.length) return;
    const today = new Date();
    let latest: Date | null = null;
    for (const tx of source) {
      const date = new Date(tx.rawDate);
      if (Number.isNaN(date.getTime()) || date > today) continue;
      if (!latest || date.getTime() > latest.getTime()) latest = date;
    }
    if (latest) {
      setMonth(latest.getMonth());
      setYear(latest.getFullYear());
      setLoadedMonthCount(1);
    }
    didSetInitialPeriodRef.current = true;
  }

  const selectPeriod = useCallback(
    (nextMonth: number, nextYear: number) => {
      const validMonths = getAvailableMonthsForYear(nextYear, periodRange);
      const clampedMonth = validMonths.includes(nextMonth)
        ? nextMonth
        : validMonths.reduce(
            (closest, item) =>
              Math.abs(item - nextMonth) < Math.abs(closest - nextMonth)
                ? item
                : closest,
            validMonths[0] ?? nextMonth,
          );
      setMonth(clampedMonth);
      setYear(nextYear);
      setSearchActive(false);
      setLoadedMonthCount(1);
      setSelectedRows([]);
    },
    [periodRange],
  );

  const goToday = useCallback(() => {
    const today = new Date();
    selectPeriod(today.getMonth(), today.getFullYear());
  }, [selectPeriod]);

  const goPrevMonth = useCallback(() => {
    const total = month - 1;
    selectPeriod((total + 12) % 12, year + Math.floor(total / 12));
  }, [month, year, selectPeriod]);

  const goNextMonth = useCallback(() => {
    const total = month + 1;
    selectPeriod((total + 12) % 12, year + Math.floor(total / 12));
  }, [month, year, selectPeriod]);

  const loadOlder = useCallback(
    () => setLoadedMonthCount((count) => count + 1),
    [],
  );

  const applySearchFilters = useCallback(
    (nextFilters: SearchFilters) => {
      setSearchFilters(nextFilters);
      setSearchActive(true);
    },
    [],
  );

  const clearSearchFilters = useCallback(() => {
    setSearchFilters(emptySearchFilters);
    setSearchActive(false);
  }, []);

  const toggleSelection = useCallback((tx: Transaction) => {
    setSelectedRows((current) =>
      current.includes(tx.rowId)
        ? current.filter((r) => r !== tx.rowId)
        : [...current, tx.rowId],
    );
  }, []);

  const setPeriod = useCallback(
    (nextMonth: number, nextYear: number) => {
      setMonth(nextMonth);
      setYear(nextYear);
    },
    [],
  );

  const toggleSearchActive = useCallback(
    (active: boolean) => setSearchActive(active),
    [],
  );

  const clearSelection = useCallback(
    () => setSelectedRows([]),
    [],
  );

  const removeFromSelection = useCallback(
    (rowId: number) => setSelectedRows((current) => current.filter((r) => r !== rowId)),
    [],
  );

  const recalcAndReplaceTransactions = useCallback(
    (next: Transaction[], affectedMonths: string[]) => {
      const nextSummaries = recalculateSummariesForMonths(next, freqIncome, affectedMonths, summaries);
      setTransactions(next);
      setSummaries(nextSummaries);
    },
    [freqIncome, summaries],
  );

  return {
    transactions,
    summaries,
    freqIncome,
    freqIncomeRef,
    hasLocalData,
    hasLocalDataRef,
    lastSyncedAt,
    month,
    year,
    loadedMonthCount,
    searchFilters,
    searchActive,
    selectedRows,
    replaceTransactions: setTransactions,
    recalcAndReplaceTransactions,
    removeFromSelection,
    setPeriod,
    toggleSearchActive,
    clearSelection,
    periodRange,
    availableYears,
    availableMonths,
    currentSummary,
    visibleTransactions,
    tagLabelsById,
    didSetInitialPeriodRef,
    applyFinancialState,
    persistFinancialState,
    resetFinancial,
    renumberTransactions,
    updateInitialPeriod,
    selectPeriod,
    goToday,
    goPrevMonth,
    goNextMonth,
    loadOlder,
    applySearchFilters,
    clearSearchFilters,
    toggleSelection,
  };
}
