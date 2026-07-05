import { BlurView } from "expo-blur";
import {
  preventAutoHideAsync,
  setOptions as setSplashOptions,
  hideAsync,
} from "expo-splash-screen";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  useWindowDimensions,
  View,
  StatusBar as NativeStatusBar,
} from "react-native";
import { GoogleSignin } from "@react-native-google-signin/google-signin";

import { formatDateToISO } from "@/utils/dateUtils";
import { removeTagFromAllRows, writeTagsCatalog } from "@/api/googleWorkspace";

import { getPalette } from "@/theme/colors";
import { ThemeProvider, useTheme } from "@/theme/ThemeContext";
import { getBlankDraft } from "@/utils/transactions";
import { loadHistory } from "@/utils/history";

import { loadTags, migrateTransactionTags } from "@/utils/tags";
import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
  safe: { flex: 1 },
  shell: { flex: 1, flexDirection: "row", padding: 12, gap: 12 },
  shellCompact: { flexDirection: "column", padding: 0, gap: 0 },
  content: { flex: 1 },
});
import { BottomNav } from "@/components/layout/BottomNav";
import { LoginScreen } from "@/components/screens/LoginScreen";
import { PinScreen } from "@/components/screens/PinScreen";
import {
  TransactionModal,
  type TransactionModalHandle,
} from "@/components/modals/TransactionModal";
import {
  DetailModal,
  type DetailModalHandle,
} from "@/components/modals/DetailModal";
import { ExportModal } from "@/components/modals/ExportModal";
import {
  ConfirmModal,
  type ConfirmConfig,
} from "@/components/modals/ConfirmModal";
import { HistoryModal } from "@/components/modals/HistoryModal";
import { PinSetupModal } from "@/components/modals/PinSetupModal";
import {
  SearchModal,
  type SearchModalHandle,
  emptySearchFilters,
} from "@/components/modals/SearchModal";
import { TagEditorModal } from "@/components/modals/TagEditorModal";
import {
  OptionSheet,
  type OptionSheetHandle,
} from "@/components/modals/OptionSheet";
import {
  type HistoryEntry,
  type SearchFilters,
  type Tab,

  type Tag,
  type Transaction,
} from "@/types";

import {
  ANIM_SPLASH_DURATION,
  ANIM_TAB_PAGER,
  TAB_ORDER,
  COLOR_SCHEME_OPTIONS,
} from "@/theme/constants";
import { useFinancialState } from "@/hooks/useFinancialState";
import {
  usePreferences, CURRENCY_OPTIONS, getFontPickerOptions,
} from "@/hooks/usePreferences";
import { useExport } from "@/hooks/useExport";
import { usePin } from "@/hooks/usePin";
import { useSession } from "@/hooks/useSession";
import { useGoogleSync } from "@/hooks/useGoogleSync";
import { useTransactionMutations } from "@/hooks/useTransactionMutations";
import { getErrorMessage, isAuthError } from "@/utils/errorHandler";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import {
  StartupSplash,
  BottomFade,
  TabPage,
  HeaderShell,
} from "@/components/AppShell";

preventAutoHideAsync().catch(() => undefined);
setSplashOptions({ duration: ANIM_SPLASH_DURATION, fade: true });

function AppContent() {
  const { colors, theme, colorScheme, toggleTheme } = useTheme();
  const themeProgress = useRef(
    new Animated.Value(theme === "dark" ? 1 : 0),
  ).current;
  const themeAnimRef = useRef<Animated.CompositeAnimation | null>(null);
  const themeBgDark = useMemo(
    () => getPalette("dark", colorScheme).bg,
    [colorScheme],
  );
  const themeBgLight = useMemo(
    () => getPalette("light", colorScheme).bg,
    [colorScheme],
  );
  const themeProgressBg = useMemo(
    () =>
      themeProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [themeBgLight, themeBgDark],
      }),
    [themeProgress, themeBgLight, themeBgDark],
  );
  const toggleThemeWithCrossfade = useCallback(() => {
    const goingDark = theme !== "dark";
    const target = goingDark ? 1 : 0;
    themeAnimRef.current?.stop();
    themeAnimRef.current = Animated.timing(themeProgress, {
      toValue: target,
      duration: 180,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: false,
    });
    themeAnimRef.current.start();
    toggleTheme();
  }, [theme, themeProgress, toggleTheme]);
  const {
    language,
    currencySymbol,
    fontPreference,
    copy,
    saveLanguage,
    saveCurrencySymbol,
    saveFontPreference,
    saveColorScheme,
    restorePreferences,
  } = usePreferences();
  const errMsg = useCallback((error: unknown) => getErrorMessage(error, copy.syncError), [copy.syncError]);
  const authErr = useCallback((error: unknown) => isAuthError(error, copy.syncError), [copy.syncError]);
  const [tagsList, setTagsList] = useState<Tag[]>([]);
  const [tagEditorVisible, setTagEditorVisible] = useState(false);
  const fin = useFinancialState(tagsList);
  const {
    transactions,
    summaries,
    freqIncome,
    hasLocalData,
    month,
    year,
    searchFilters,
    searchActive,
    selectedRows,
    setTransactions,
    setSummaries,
    setMonth,
    setYear,
    setSearchFilters,
    setSearchActive,
    setSelectedRows,
    persistFinancialState,
    resetFinancial,
    renumberTransactions,
    selectPeriod,
    goToday,
    goPrevMonth,
    goNextMonth,
    loadOlder,
    toggleSelection,
  } = fin;
  const connectRef = useRef<((token: string, sheetId?: string, forceScan?: boolean) => Promise<void>) | undefined>(undefined);
  const session = useSession(copy, errMsg, resetFinancial, (token, sheetId, forceScan) => {
    return connectRef.current?.(token, sheetId, forceScan) ?? Promise.resolve();
  });
  const {
    accessToken,
    spreadsheetId,
    loading,
    accountTransition,
    isSyncing,
    isFirstRemoteLoad,
    syncError,
    authError,
    pendingSync,
    accountInfo,
    rehydratingCache,
    pendingSyncRef,
    canConnect,
    runGoogleSignIn,
    disconnectGoogle, removeGoogleAccount,
  } = session;
  const [bootstrapping, setBootstrapping] = useState(true);
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([]);
  const [historyVisible, setHistoryVisible] = useState(false);
  const {
    exportVisible,
    exportConfig,
    exportMinDate,
    setExportConfig,
    openExport,
    closeExport,
    startExport,
  } = useExport(transactions, currencySymbol, copy, errMsg);
  const [confirmConfig, setConfirmConfig] = useState<ConfirmConfig | null>(
    null,
  );
  const {
    pinEnabled,
    pinVerified,
    pinLoading,
    pinSetupVisible,
    setPinSetupVisible,
    pinWrong,
    pinLockedRef,
    restorePinState,
    handlePinOpen,
    handlePinSave,
    handlePinVerify,
  } = usePin(copy, errMsg);
  const closePinSetup = useCallback(() => setPinSetupVisible(false), [setPinSetupVisible]);
  const [tab, setTab] = useState<Tab>("dashboard");
  const transactionModalRef = useRef<TransactionModalHandle>(null);
  const detailModalRef = useRef<DetailModalHandle>(null);
  const searchModalRef = useRef<SearchModalHandle>(null);
  const optionSheetRef = useRef<OptionSheetHandle>(null);
  const reloadPromiseRef = useRef<Promise<void> | null>(null);
  const tabRef = useRef<Tab>(tab);
  const pagerTranslateX = useRef(new Animated.Value(0)).current;
  const { width: tabWidth } = useWindowDimensions();
  const statusBarInset = NativeStatusBar.currentHeight || 0;
  const headerTopInset = statusBarInset + 6;
  const headerFadeHeight = Math.max(headerTopInset + 28, 56);
  const bottomFadeHeight = 128;

  const changeTab = useCallback(
    (next: Tab) => {
      if (next === tabRef.current) return;
      tabRef.current = next;
      pagerTranslateX.stopAnimation();
      Animated.timing(pagerTranslateX, {
        toValue: -TAB_ORDER.indexOf(next) * tabWidth,
        duration: ANIM_TAB_PAGER,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished && tabRef.current === next) setTab(next);
      });
    },
    [pagerTranslateX, tabWidth],
  );
  const openHistory = useCallback(() => setHistoryVisible(true), []);

  const syncApi = useGoogleSync(
    session,
    fin,
    { tagsList, setTagsList },
    { errMsg, authErr, copy: copy as unknown as { syncError: string; sessionExpired: string; showingSavedData: string; pendingSyncStatus: string; syncing: string; deleteRecord: string; deleteSelection: string; moveRecord: string; moveRecordError: string; undoAction: string }, tagColors: colors.tagColors },
    reloadPromiseRef,
  );
  connectRef.current = syncApi.connectGoogleWorkspace;

  const mutations = useTransactionMutations(
    {
      transactions, setTransactions,
      summaries, setSummaries,
      freqIncome,
      month, year, setMonth, setYear,
      selectedRows, setSelectedRows, setSearchActive,
      renumberTransactions, persistFinancialState,
    },
    { accessToken, spreadsheetId },
    {
      reloadFromGoogle: syncApi.reloadFromGoogle,
      syncGoogleInBackground: syncApi.syncGoogleInBackground,
      pendingSyncRef,
    },
    { setHistoryEntries },
    copy as unknown as { incompleteData: string; completeRequired: string; editRecord: string; newRecord: string; deleteRecord: string; deleteSelection: string; moveRecord: string; moveRecordError: string; undoAction: string },
  );

  useEffect(() => {
    GoogleSignin.configure();
    void Promise.all([
      restorePreferences(),
      syncApi.restoreSession(),
      restorePinState(),
    ])
      .catch(() => undefined)
      .finally(() => setBootstrapping(false));
    loadHistory()
      .then(setHistoryEntries)
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadTags(language)
      .then((loaded) => {
        setTagsList(loaded);
        const validIds = new Set(loaded.map((t) => t.id));
        setTransactions((current) => {
          const migrated = migrateTransactionTags(current, loaded);
          return migrated.map((tx) => {
            if (!tx.tags?.length) return tx;
            const cleaned = tx.tags.filter((t) => validIds.has(t));
            return cleaned.length === tx.tags.length
              ? tx
              : { ...tx, tags: cleaned };
          });
        });
        setSummaries((current) => current);
      })
      .catch(() => undefined);
  }, [language, setTransactions, setSummaries]);

  const prevTagsListRef = useRef<Tag[]>([]);
  useEffect(() => {
    if (!tagsList.length) return;
    const validIds = new Set(tagsList.map((t) => t.id));
    const prevIds = new Set(prevTagsListRef.current.map((t) => t.id));
    const removedIds = [...prevIds].filter((id) => !validIds.has(id));
    prevTagsListRef.current = tagsList;
    setTransactions((current) => {
      let changed = false;
      const next = current.map((tx) => {
        if (!tx.tags?.length) return tx;
        const cleaned = tx.tags.filter((t) => validIds.has(t));
        if (cleaned.length === tx.tags.length) return tx;
        changed = true;
        return { ...tx, tags: cleaned };
      });
      return changed ? next : current;
    });
    if (removedIds.length && accessToken && spreadsheetId) {
      for (const tagId of removedIds) {
        removeTagFromAllRows(accessToken, spreadsheetId, tagId).catch(
          () => undefined,
        );
      }
    }
  }, [tagsList, accessToken, spreadsheetId, setTransactions]);

  useEffect(() => {
    if (!bootstrapping) hideAsync().catch(() => undefined);
  }, [bootstrapping]);

  const prevTagsRef = useRef(tagsList);
  useEffect(() => {
    if (!accessToken || !spreadsheetId) return;
    if (prevTagsRef.current === tagsList) return;
    prevTagsRef.current = tagsList;
    const timer = setTimeout(() => {
      writeTagsCatalog(accessToken, spreadsheetId, tagsList).catch(() => undefined);
    }, 1500);
    return () => clearTimeout(timer);
  }, [tagsList, accessToken, spreadsheetId]);

  const lastTabWidthRef = useRef(tabWidth);
  useEffect(() => {
    if (lastTabWidthRef.current === tabWidth) return;
    lastTabWidthRef.current = tabWidth;
    pagerTranslateX.stopAnimation();
    pagerTranslateX.setValue(-TAB_ORDER.indexOf(tabRef.current) * tabWidth);
  }, [pagerTranslateX, tabWidth]);

  const selectedColorScheme =
    COLOR_SCHEME_OPTIONS.find((option) => option.value === colorScheme) ||
    COLOR_SCHEME_OPTIONS[0];
  const colorSchemeLabel =
    language === "en"
      ? selectedColorScheme.labelEn
      : selectedColorScheme.labelEs;
  const syncStatusText = (() => {
    if (authError) return authError;
    if (syncError) return hasLocalData ? copy.showingSavedData : syncError;
    if (pendingSync) return copy.pendingSyncStatus;
    if (isSyncing)
      return hasLocalData
        ? `${copy.showingSavedData} · ${copy.syncing.toLowerCase()}`
        : copy.syncing;
    return "";
  })();

  const openLanguagePicker = useCallback(() => {
    optionSheetRef.current?.open({
      title: copy.language,
      selectedValue: language,
      options: [
        { label: copy.spanish, value: "es", icon: "translate" },
        { label: copy.english, value: "en", icon: "translate" },
      ],
      onSelect: saveLanguage,
    });
  }, [copy, language, saveLanguage]);

  const openCurrencyPicker = useCallback(() => {
    optionSheetRef.current?.open({
      title: copy.currencySymbol,
      selectedValue: currencySymbol,
      options: CURRENCY_OPTIONS.map((option) => ({
        label: language === "en" ? option.labelEn : option.labelEs,
        value: option.value,
        icon: option.icon,
      })),
      onSelect: saveCurrencySymbol,
    });
  }, [copy.currencySymbol, currencySymbol, language, saveCurrencySymbol]);

  const fontPickerOptions = useMemo(
    () => getFontPickerOptions(copy),
    [copy],
  );

  const openFontPicker = useCallback(() => {
    optionSheetRef.current?.open({
      title: copy.fontStyle,
      selectedValue: fontPreference,
      options: fontPickerOptions,
      onSelect: saveFontPreference,
    });
  }, [copy.fontStyle, fontPreference, fontPickerOptions, saveFontPreference]);

  const openColorSchemePicker = useCallback(() => {
    optionSheetRef.current?.open({
      title: copy.colorPalette,
      selectedValue: colorScheme,
      options: COLOR_SCHEME_OPTIONS.map((option) => ({
        label: language === "en" ? option.labelEn : option.labelEs,
        value: option.value,
        icon: option.icon,
        tone: getPalette(theme, option.value).primary,
      })),
      onSelect: saveColorScheme,
    });
  }, [colorScheme, copy.colorPalette, language, saveColorScheme, theme]);

  const openAccountManager = useCallback(() => {
    optionSheetRef.current?.open({
      title: copy.googleAccounts,
      selectedValue: "",
      options: [
        { label: copy.switchAccount, value: "switch", icon: "account-switch" },
        {
          label: copy.removeCurrentAccount,
          value: "remove",
          icon: "account-remove",
          tone: colors.expense,
        },
      ],
      onSelect: (value) => {
        if (value === "switch") void runGoogleSignIn(true);
        if (value === "remove") setConfirmConfig({ kind: "removeAccount" });
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colors.expense, copy]);

  const requestDisconnectGoogle = useCallback(() => {
    setConfirmConfig({ kind: "disconnect" });
  }, []);

  const openAdd = useCallback(() => {
    transactionModalRef.current?.open(getBlankDraft());
  }, []);

  const openEdit = useCallback((tx: Transaction) => {
    detailModalRef.current?.close();
    const concepto = tx.lineItems ? (tx.detail.split(":")[0] || "") : "";
    const lineItems = tx.lineItems
      ? tx.lineItems.map((li) => ({
          id: li.id,
          amount: li.formula ? `=${li.formula}` : String(li.amount),
          description: li.description,
          tags: li.tags,
        }))
      : [{ id: "li-1", amount: tx.formula ? `=${tx.formula}` : String(tx.amount), description: tx.detail, tags: tx.tags || [] }];
    transactionModalRef.current?.open(
      {
        date: formatDateToISO(tx.rawDate),
        amount: tx.formula ? `=${tx.formula}` : String(tx.amount),
        detail: tx.detail,
        type: tx.type,
        createdAt: tx.createdAt,
        tags: tx.tags || [],
        concepto,
        lineItems,
      },
      tx,
    );
    requestAnimationFrame(() => setSelectedRows([]));
  }, [setSelectedRows]);

  const applySearchFilters = useCallback(
    (nextFilters: SearchFilters) => {
      requestAnimationFrame(() => {
        setSearchFilters(nextFilters);
        setSearchActive(true);
        changeTab("expenses");
        setSelectedRows([]);
      });
    },
    [changeTab, setSearchActive, setSearchFilters, setSelectedRows],
  );

  const clearSearchFilters = useCallback(() => {
    requestAnimationFrame(() => {
      setSearchFilters(emptySearchFilters);
      setSearchActive(false);
    });
  }, [setSearchFilters, setSearchActive]);

  const selectedRowsRef = useRef(selectedRows);
  selectedRowsRef.current = selectedRows;
  const handleTransactionPress = useCallback(
    (tx: Transaction) => {
      if (selectedRowsRef.current.length) {
        toggleSelection(tx);
        return;
      }
      detailModalRef.current?.open(tx);
    },
    [toggleSelection],
  );

  const openMoveMenu = useCallback(
    (tx: Transaction) => {
      optionSheetRef.current?.open({
        title: copy.moveRecord,
        selectedValue: "",
        options: [
          {
            label: copy.moveUpOnePosition,
            value: "up",
            icon: "arrow-up",
            tone: colors.info,
          },
          {
            label: copy.moveDownOnePosition,
            value: "down",
            icon: "arrow-down",
            tone: colors.warn,
          },
        ],
        onSelect: (direction: string) => mutations.moveTx(tx, direction as "up" | "down"),
      });
    },
    [
      colors.info,
      colors.warn,
      copy.moveDownOnePosition,
      copy.moveRecord,
      copy.moveUpOnePosition,
      mutations,
    ],
  );

  const requestDelete = useCallback((tx: Transaction) => {
    setConfirmConfig({ kind: "delete", tx });
  }, []);

  const requestDeleteSelected = useCallback(() => {
    if (!selectedRows.length) return;
    setConfirmConfig({ kind: "deleteSelected", count: selectedRows.length });
  }, [selectedRows.length]);

  function handleConfirm(cfg: ConfirmConfig) {
    if (cfg.kind === "delete" && cfg.tx) mutations.deleteTx(cfg.tx);
    else if (cfg.kind === "deleteSelected") mutations.deleteSelectedRows();
    else if (cfg.kind === "removeAccount") void removeGoogleAccount();
    else if (cfg.kind === "disconnect") void disconnectGoogle();
  }

  const exitSearch = useCallback(
    () => setSearchActive(false),
    [setSearchActive],
  );
  const openTagEditor = useCallback(() => setTagEditorVisible(true), []);
  const openSearch = useCallback(
    () => searchModalRef.current?.open(searchFilters),
    [searchFilters],
  );
  const closeConfirm = useCallback(() => setConfirmConfig(null), []);
  const closeHistory = useCallback(() => setHistoryVisible(false), []);
  const closeTagEditor = useCallback(() => setTagEditorVisible(false), []);

  const tabPageProps = useMemo(
    () => ({
      tabWidth,
      dashboard: {
        contentTopInset: headerTopInset + 62,
        colors,
        copy,
        allTransactions: transactions,
        tagsList,
        currencySymbol,
        month,
        year,
        availableYears: fin.availableYears,
        availableMonths: fin.availableMonths,
        onSelectPeriod: selectPeriod,
        goToday,
        goPrevMonth,
        goNextMonth,
        onOpenDetail: handleTransactionPress,
      },
      expenses: {
        contentTopInset: headerTopInset + 62,
        colors,
        transactions: fin.visibleTransactions,
        searchActive,
        searchText: searchFilters.text,
        selectedRows,
        currencySymbol,
        copy,
        month,
        year,
        availableYears: fin.availableYears,
        availableMonths: fin.availableMonths,
        onExitSearch: exitSearch,
        onOpenDetail: handleTransactionPress,
        onEdit: openEdit,
        onDeleteSelected: requestDeleteSelected,
        onMove: openMoveMenu,
        onToggleSelection: fin.toggleSelection,
        onLoadOlder: loadOlder,
        onSelectPeriod: selectPeriod,
        goToday,
        goPrevMonth,
        goNextMonth,
        tagsList,
      },
      summary: {
        contentTopInset: headerTopInset + 62,
        colors,
        copy,
        summaries,
        transactions,
        freqIncome,
        availableYears: fin.availableYears,
        currencySymbol,
        tagsList,
      },
      settings: {
        contentTopInset: headerTopInset + 62,
        colors,
        copy,
        language,
        accountInfo,
        currencySymbol,
        fontPreference,
        colorSchemeLabel,
        pinEnabled,
        tagsCount: tagsList.length,
        onOpenLanguage: openLanguagePicker,
        onOpenCurrency: openCurrencyPicker,
        onOpenFont: openFontPicker,
        onOpenColorScheme: openColorSchemePicker,
        onOpenPin: handlePinOpen,
        onOpenTags: openTagEditor,
        onSwitch: openAccountManager,
        onDisconnect: requestDisconnectGoogle,
        onOpenExport: openExport,
      },
      loadingBar: {
        visible: Boolean(
          loading || (syncStatusText && !pendingSync && !isSyncing),
        ),
        syncing: loading || isSyncing,
        cardColor: colors.card,
        primaryColor: colors.primary,
        mutedColor: colors.muted,
        text: syncStatusText || copy.syncing,
      },
    }),
    [
      tabWidth,
      headerTopInset,
      colors,
      fin.visibleTransactions,
      searchActive,
      searchFilters.text,
      selectedRows,
      currencySymbol,
      copy,
      month,
      year,
      fin.availableYears,
      fin.availableMonths,
      exitSearch,
      handleTransactionPress,
      openEdit,
      requestDeleteSelected,
      openMoveMenu,
      fin.toggleSelection,
      loadOlder,
      selectPeriod,
      goToday,
      goPrevMonth,
      goNextMonth,
      tagsList,
      summaries,
      transactions,
      freqIncome,
      accountInfo,
      language,
      fontPreference,
      colorSchemeLabel,
      pinEnabled,
      openLanguagePicker,
      openCurrencyPicker,
      openFontPicker,
      openColorSchemePicker,
      handlePinOpen,
      openTagEditor,
      openAccountManager,
      requestDisconnectGoogle,
      openExport,
      loading,
      syncStatusText,
      pendingSync,
      isSyncing,
    ],
  );

  const headerProps = useMemo(
    () => ({
      tab,
      bg: colors.bg,
      isDark: theme === "dark",
      headerTopInset,
      headerFadeHeight,
      historyTint: historyEntries.length ? colors.primary : colors.muted,
      onToggleTheme: toggleThemeWithCrossfade,
      onOpenHistory: openHistory,
      onOpenSearch: openSearch,
      copy,
    }),
    [
      tab,
      colors,
      theme,
      headerTopInset,
      headerFadeHeight,
      historyEntries.length,
      toggleThemeWithCrossfade,
      openHistory,
      openSearch,
      copy,
    ],
  );

  // --- Render ---
  if (!accessToken) {
    return (
      <View style={[styles.safe, { backgroundColor: colors.bg }]}>
        <NativeStatusBar
          barStyle={theme === "dark" ? "light-content" : "dark-content"}
          translucent
          backgroundColor="transparent"
        />
        <LoginScreen
          colors={colors}
          copy={copy}
          loading={loading}
          canConnect={canConnect}
          onSignIn={() => runGoogleSignIn(false)}
        />
      </View>
    );
  }

  if (
    bootstrapping ||
    accountTransition ||
    rehydratingCache ||
    (accessToken && isFirstRemoteLoad && !hasLocalData)
  ) {
    return <StartupSplash />;
  }

  if (pinLoading) {
    return (
      <View style={[styles.safe, { backgroundColor: colors.bg }]}>
        <NativeStatusBar
          barStyle={theme === "dark" ? "light-content" : "dark-content"}
          translucent
          backgroundColor="transparent"
        />
        <BlurView
          intensity={90}
          tint={theme === "dark" ? "dark" : "light"}
          style={{ flex: 1 }}
        />
      </View>
    );
  }

  if (pinEnabled && (!pinVerified || pinLockedRef.current)) {
    return (
      <View style={[styles.safe, { backgroundColor: colors.bg }]}>
        <NativeStatusBar
          barStyle={theme === "dark" ? "light-content" : "dark-content"}
          translucent
          backgroundColor="transparent"
        />
        <PinScreen
          colors={colors}
          copy={copy}
          title={copy.pinRequired}
          subtitle={copy.pinForgot}
          wrong={pinWrong}
          bgColor={colors.bg}
          onFill={handlePinVerify}
        />
      </View>
    );
  }

  return (
    <Animated.View style={[styles.safe, { backgroundColor: themeProgressBg }]}>
      <NativeStatusBar
        barStyle={theme === "dark" ? "light-content" : "dark-content"}
        translucent
        backgroundColor="transparent"
      />
      <View style={[styles.shell, styles.shellCompact, { paddingTop: 0 }]}>
        <View
          style={[
            styles.content,
            { width: "100%", position: "relative", overflow: "hidden" },
          ]}
        >
          <Animated.View
            style={{
              width: tabWidth * TAB_ORDER.length,
              height: "100%",
              flexDirection: "row",
              transform: [{ translateX: pagerTranslateX }],
              zIndex: 0,
            }}
          >
            <TabPage
              tab="dashboard"
              isCurrent={tab === "dashboard"}
              props={tabPageProps.dashboard}
              loadingBar={tabPageProps.loadingBar}
              tabWidth={tabPageProps.tabWidth}
            />
            <TabPage
              tab="expenses"
              isCurrent={tab === "expenses"}
              props={tabPageProps.expenses}
              loadingBar={tabPageProps.loadingBar}
              tabWidth={tabPageProps.tabWidth}
            />
            <TabPage
              tab="summary"
              isCurrent={tab === "summary"}
              props={tabPageProps.summary}
              loadingBar={tabPageProps.loadingBar}
              tabWidth={tabPageProps.tabWidth}
            />
            <TabPage
              tab="settings"
              isCurrent={tab === "settings"}
              props={tabPageProps.settings}
              loadingBar={tabPageProps.loadingBar}
              tabWidth={tabPageProps.tabWidth}
            />
          </Animated.View>

          <HeaderShell {...headerProps} colors={colors} />
        </View>

        <BottomFade color={colors.bg} height={bottomFadeHeight} />
        <BottomNav
          copy={copy}
          tab={tabRef.current}
          setTab={changeTab}
          onAdd={openAdd}
        />
      </View>

      <TransactionModal
        ref={transactionModalRef}
        colors={colors}
        tags={tagsList}
        copy={copy}
        currencySymbol={currencySymbol}
        onSubmit={mutations.submitDraft}
        onAddTag={(tag) => setTagsList((prev) => [...prev.filter((t) => t.id !== tag.id), tag])}
      />
      <DetailModal
        ref={detailModalRef}
        colors={colors}
        currencySymbol={currencySymbol}
        copy={copy}
        tags={tagsList}
        onEdit={openEdit}
        onDelete={requestDelete}
      />
      <OptionSheet ref={optionSheetRef} colors={colors} />
      <ConfirmModal
        config={confirmConfig}
        colors={colors}
        currencySymbol={currencySymbol}
        copy={copy}
        onClose={closeConfirm}
        onConfirm={handleConfirm}
      />
      <HistoryModal
        visible={historyVisible}
        entries={historyEntries}
        colors={colors}
        currencySymbol={currencySymbol}
        copy={copy}
        onClose={closeHistory}
        onUndo={mutations.undoDeleteEntry}
      />
      <PinSetupModal
        visible={pinSetupVisible}
        colors={colors}
        copy={copy}
        onClose={closePinSetup}
        onSave={handlePinSave}
      />
      <ExportModal
        visible={exportVisible}
        colors={colors}
        copy={copy}
        config={exportConfig}
        setConfig={setExportConfig}
        minDate={exportMinDate}
        onClose={closeExport}
        onExport={startExport}
      />
      <SearchModal
        ref={searchModalRef}
        colors={colors}
        copy={copy}
        currencySymbol={currencySymbol}
        tags={tagsList}
        onClear={clearSearchFilters}
        onSubmit={applySearchFilters}
      />
      <TagEditorModal
        visible={tagEditorVisible}
        colors={colors}
        copy={copy}
        tags={tagsList}
        setTags={setTagsList}
        onClose={closeTagEditor}
      />
    </Animated.View>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ErrorBoundary>
        <AppContent />
      </ErrorBoundary>
    </ThemeProvider>
  );
}
