jest.mock("react", () => ({
  ...jest.requireActual("react"),
  useMemo: (fn: () => unknown) => fn(),
}));

import { usePageProps } from "@/hooks/usePageProps";
import { UI_COPY } from "@/i18n";
import { dark } from "@/theme/colors";
import type { Transaction } from "@/types";

const noop = () => {};
const selectPeriod = (_month: number, _year: number) => {};
const openTx = (_tx: Transaction) => {};
const toggleTx = (_tx: Transaction) => {};

function baseParams(overrides: { refreshing: boolean; onRefresh: () => void }) {
  return {
    tab: "expenses" as const,
    tabWidth: 400,
    headerTopInset: 20,
    headerFadeHeight: 100,
    historyCount: 0,
    colors: dark,
    theme: "dark" as const,
    copy: UI_COPY.es,
    transactions: [],
    visibleTransactions: [],
    summaries: [],
    freqIncome: {},
    tagsList: [],
    currencySymbol: "S/",
    month: 8,
    year: 2026,
    availableYears: [2026],
    availableMonths: [0, 1, 2, 3, 4, 5, 6, 7, 8],
    searchActive: false,
    searchText: "",
    selectedRows: [],
    language: "es" as const,
    accountInfo: null,
    fontPreference: "inter" as const,
    fontSizeScale: 1,
    colorSchemeLabel: "Cyprus",
    pinEnabled: false,
    loading: false,
    syncStatusText: "",
    pendingSync: false,
    isSyncing: false,
    selectPeriod,
    goToday: noop,
    goPrevMonth: noop,
    goNextMonth: noop,
    loadOlder: noop,
    handleTransactionPress: openTx,
    toggleSelection: toggleTx,
    exitSearch: noop,
    openEdit: openTx,
    requestDeleteSelected: noop,
    openMoveMenu: openTx,
    openSearch: noop,
    openHistory: noop,
    openExport: noop,
    openLanguagePicker: noop,
    openCurrencyPicker: noop,
    openFontPicker: noop,
    openFontSizePicker: noop,
    openColorSchemePicker: noop,
    handlePinOpen: noop,
    openTagEditor: noop,
    openAccountManager: noop,
    requestDisconnectGoogle: noop,
    toggleThemeWithCrossfade: noop,
    openPrivacy: noop,
    openTerms: noop,
    openDeleteAccount: noop,
    openContact: noop,
    openRate: noop,
    ...overrides,
  };
}

describe("usePageProps pull-to-refresh", () => {
  test("threads refreshing + onRefresh into the four tab blocks", () => {
    const onRefresh = jest.fn();
    const { tabPageProps } = usePageProps(
      baseParams({ refreshing: true, onRefresh }),
    );
    expect(tabPageProps.dashboard.refreshing).toBe(true);
    expect(tabPageProps.dashboard.onRefresh).toBe(onRefresh);
    expect(tabPageProps.expenses.refreshing).toBe(true);
    expect(tabPageProps.expenses.onRefresh).toBe(onRefresh);
    expect(tabPageProps.summary.refreshing).toBe(true);
    expect(tabPageProps.summary.onRefresh).toBe(onRefresh);
    expect(tabPageProps.settings.refreshing).toBe(true);
    expect(tabPageProps.settings.onRefresh).toBe(onRefresh);
  });

  test("refreshing follows the syncing flag", () => {
    const onRefresh = jest.fn();
    const { tabPageProps } = usePageProps(
      baseParams({ refreshing: false, onRefresh }),
    );
    expect(tabPageProps.dashboard.refreshing).toBe(false);
    expect(tabPageProps.expenses.refreshing).toBe(false);
    expect(tabPageProps.summary.refreshing).toBe(false);
    expect(tabPageProps.settings.refreshing).toBe(false);
  });
});
