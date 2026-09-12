import { useMemo } from "react";
import type { Palette } from "@/theme/colors";
import type { FontPreference, LanguageMode, SummaryRow, Tab, Tag, ThemeMode, Transaction } from "@/types";
import type { UiCopy } from "@/i18n";

type UsePagePropsParams = {
  tab: Tab;
  tabWidth: number;
  headerTopInset: number;
  headerFadeHeight: number;
  historyCount: number;
  colors: Palette;
  theme: ThemeMode;
  copy: UiCopy;
  transactions: Transaction[];
  visibleTransactions: Transaction[];
  summaries: SummaryRow[];
  freqIncome: Record<string, number>;
  tagsList: Tag[];
  currencySymbol: string;
  month: number;
  year: number;
  availableYears: number[];
  availableMonths: number[];
  searchActive: boolean;
  searchText: string;
  selectedRows: number[];
  language: LanguageMode;
  accountInfo: { name?: string; email?: string } | null;
  fontPreference: FontPreference;
  fontSizeScale: number;
  colorSchemeLabel: string;
  pinEnabled: boolean;
  loading: boolean;
  syncStatusText: string;
  pendingSync: boolean;
  isSyncing: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  selectPeriod: (month: number, year: number) => void;
  goToday: () => void;
  goPrevMonth: () => void;
  goNextMonth: () => void;
  loadOlder: () => void;
  handleTransactionPress: (tx: Transaction) => void;
  toggleSelection: (tx: Transaction) => void;
  exitSearch: () => void;
  openEdit: (tx: Transaction) => void;
  requestDeleteSelected: () => void;
  openMoveMenu: (tx: Transaction) => void;
  openSearch: () => void;
  openHistory: () => void;
  openExport: () => void;
  openLanguagePicker: () => void;
  openCurrencyPicker: () => void;
  openFontPicker: () => void;
  openFontSizePicker: () => void;
  openColorSchemePicker: () => void;
  handlePinOpen: () => void;
  openTagEditor: () => void;
  openAccountManager: () => void;
  requestDisconnectGoogle: () => void;
  toggleThemeWithCrossfade: () => void;
  openPrivacy: () => void;
  openTerms: () => void;
  openDeleteAccount: () => void;
  openContact: () => void;
  openRate: () => void;
};

/**
 * Owns the memoized page-prop blocks (dashboard/expenses/summary/settings/
 * loadingBar + tabPage/header composition) so App.tsx stays a thin shell.
 * Deps mirror the previous inline memos one-to-one.
 */
export function usePageProps(p: UsePagePropsParams) {
  const contentInset = p.headerTopInset + 62;

  const dashboardProps = useMemo(() => ({
    contentTopInset: contentInset,
    colors: p.colors,
    theme: p.theme,
    copy: p.copy,
    allTransactions: p.transactions,
    tagsList: p.tagsList,
    currencySymbol: p.currencySymbol,
    month: p.month,
    year: p.year,
    availableYears: p.availableYears,
    availableMonths: p.availableMonths,
    onSelectPeriod: p.selectPeriod,
    goToday: p.goToday,
    goPrevMonth: p.goPrevMonth,
    goNextMonth: p.goNextMonth,
    onOpenDetail: p.handleTransactionPress,
    refreshing: p.refreshing,
    onRefresh: p.onRefresh,
  }), [contentInset, p.colors, p.theme, p.copy, p.transactions, p.tagsList, p.currencySymbol, p.month, p.year, p.availableYears, p.availableMonths, p.selectPeriod, p.goToday, p.goPrevMonth, p.goNextMonth, p.handleTransactionPress, p.refreshing, p.onRefresh]);

  const expensesProps = useMemo(() => ({
    contentTopInset: contentInset,
    colors: p.colors,
    theme: p.theme,
    transactions: p.visibleTransactions,
    searchActive: p.searchActive,
    searchText: p.searchText,
    selectedRows: p.selectedRows,
    currencySymbol: p.currencySymbol,
    copy: p.copy,
    month: p.month,
    year: p.year,
    availableYears: p.availableYears,
    availableMonths: p.availableMonths,
    onExitSearch: p.exitSearch,
    onOpenDetail: p.handleTransactionPress,
    onEdit: p.openEdit,
    onDeleteSelected: p.requestDeleteSelected,
    onMove: p.openMoveMenu,
    onToggleSelection: p.toggleSelection,
    onLoadOlder: p.loadOlder,
    onSelectPeriod: p.selectPeriod,
    goToday: p.goToday,
    goPrevMonth: p.goPrevMonth,
    goNextMonth: p.goNextMonth,
    tagsList: p.tagsList,
    refreshing: p.refreshing,
    onRefresh: p.onRefresh,
  }), [contentInset, p.colors, p.theme, p.visibleTransactions, p.searchActive, p.searchText, p.selectedRows, p.currencySymbol, p.copy, p.month, p.year, p.availableYears, p.availableMonths, p.exitSearch, p.handleTransactionPress, p.openEdit, p.requestDeleteSelected, p.openMoveMenu, p.toggleSelection, p.loadOlder, p.selectPeriod, p.goToday, p.goPrevMonth, p.goNextMonth, p.tagsList, p.refreshing, p.onRefresh]);

  const summaryProps = useMemo(() => ({
    contentTopInset: contentInset,
    colors: p.colors,
    copy: p.copy,
    summaries: p.summaries,
    transactions: p.transactions,
    freqIncome: p.freqIncome,
    availableYears: p.availableYears,
    currencySymbol: p.currencySymbol,
    tagsList: p.tagsList,
    theme: p.theme,
    refreshing: p.refreshing,
    onRefresh: p.onRefresh,
  }), [contentInset, p.colors, p.copy, p.summaries, p.transactions, p.freqIncome, p.availableYears, p.currencySymbol, p.tagsList, p.theme, p.refreshing, p.onRefresh]);

  const settingsProps = useMemo(() => ({
    contentTopInset: contentInset,
    colors: p.colors,
    copy: p.copy,
    language: p.language,
    accountInfo: p.accountInfo,
    currencySymbol: p.currencySymbol,
    fontPreference: p.fontPreference,
    fontSizeScale: p.fontSizeScale,
    colorSchemeLabel: p.colorSchemeLabel,
    pinEnabled: p.pinEnabled,
    tagsCount: p.tagsList.length,
    onOpenLanguage: p.openLanguagePicker,
    onOpenCurrency: p.openCurrencyPicker,
    onOpenFont: p.openFontPicker,
    onOpenFontSize: p.openFontSizePicker,
    onOpenColorScheme: p.openColorSchemePicker,
    onOpenPin: p.handlePinOpen,
    onOpenTags: p.openTagEditor,
    onSwitch: p.openAccountManager,
    onDisconnect: p.requestDisconnectGoogle,
    onOpenExport: p.openExport,
    onOpenPrivacy: p.openPrivacy,
    onOpenTerms: p.openTerms,
    onOpenDeleteAccount: p.openDeleteAccount,
    onOpenContact: p.openContact,
    onOpenRate: p.openRate,
    refreshing: p.refreshing,
    onRefresh: p.onRefresh,
    refreshOffset: contentInset,
  }), [contentInset, p.colors, p.copy, p.language, p.accountInfo, p.currencySymbol, p.fontPreference, p.fontSizeScale, p.colorSchemeLabel, p.pinEnabled, p.tagsList.length, p.openLanguagePicker, p.openCurrencyPicker, p.openFontPicker, p.openFontSizePicker, p.openColorSchemePicker, p.handlePinOpen, p.openTagEditor, p.openAccountManager, p.requestDisconnectGoogle, p.openExport, p.openPrivacy, p.openTerms, p.openDeleteAccount, p.openContact, p.openRate, p.refreshing, p.onRefresh]);

  const loadingBarProps = useMemo(() => ({
    visible: Boolean(p.loading || (p.syncStatusText && !p.pendingSync && !p.isSyncing)),
    syncing: p.loading || p.isSyncing,
    cardColor: p.colors.card,
    primaryColor: p.colors.primary,
    mutedColor: p.colors.muted,
    text: p.syncStatusText || p.copy.syncing,
  }), [p.loading, p.syncStatusText, p.pendingSync, p.isSyncing, p.colors.card, p.colors.primary, p.colors.muted, p.copy.syncing]);

  const tabPageProps = useMemo(() => ({
    tabWidth: p.tabWidth,
    dashboard: dashboardProps,
    expenses: expensesProps,
    summary: summaryProps,
    settings: settingsProps,
    loadingBar: loadingBarProps,
  }), [p.tabWidth, dashboardProps, expensesProps, summaryProps, settingsProps, loadingBarProps]);

  const headerProps = useMemo(
    () => ({
      tab: p.tab,
      bg: p.colors.bg,
      isDark: p.theme === "dark",
      headerTopInset: p.headerTopInset,
      headerFadeHeight: p.headerFadeHeight,
      historyTint: p.historyCount ? p.colors.primary : p.colors.muted,
      onToggleTheme: p.toggleThemeWithCrossfade,
      onOpenHistory: p.openHistory,
      onOpenSearch: p.openSearch,
      copy: p.copy,
    }),
    [
      p.tab,
      p.colors,
      p.theme,
      p.headerTopInset,
      p.headerFadeHeight,
      p.historyCount,
      p.toggleThemeWithCrossfade,
      p.openHistory,
      p.openSearch,
      p.copy,
    ],
  );

  return { tabPageProps, headerProps };
}
