import { BlurView } from "expo-blur";
import {
  hideAsync,
  preventAutoHideAsync,
  setOptions as setSplashOptions,
} from "expo-splash-screen";
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  AppState,
  Easing,
  View,
  StatusBar as NativeStatusBar,
} from "react-native";

import { ThemeProvider, useTheme } from "@/theme/ThemeContext";
import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
  safe: { flex: 1 },
  shell: { flex: 1, flexDirection: "row", padding: 12, gap: 12 },
  shellCompact: { flexDirection: "column", padding: 0, gap: 0 },
  content: { flex: 1 },
});
import { BottomNav } from "@/components/layout/BottomNav";
import { PinScreen } from "@/components/screens/PinScreen";
import { TransactionModal } from "@/components/modals/TransactionModal";
import { DetailModal } from "@/components/modals/DetailModal";
import { SearchModal } from "@/components/modals/SearchModal";
import { OptionSheet } from "@/components/modals/OptionSheet";
import { PinSetupModal } from "@/components/modals/PinSetupModal";

const ExportModal = lazy(
  () => import("@/components/modals/ExportModal").then((m) => ({ default: m.ExportModal })),
);
const ConfirmModal = lazy(
  () => import("@/components/modals/ConfirmModal").then((m) => ({ default: m.ConfirmModal })),
);
const HistoryModal = lazy(
  () => import("@/components/modals/HistoryModal").then((m) => ({ default: m.HistoryModal })),
);
const TagEditorModal = lazy(
  () => import("@/components/modals/TagEditorModal").then((m) => ({ default: m.TagEditorModal })),
);
import {
  type HistoryEntry,
  type Tag,
} from "@/types";

import {
  TAB_ORDER,
  COLOR_SCHEME_OPTIONS,
} from "@/theme/constants";
import { useFinancialState } from "@/hooks/useFinancialState";
import { useAppModals } from "@/hooks/useAppModals";
import { useDerivedSyncStatus } from "@/hooks/useDerivedSyncStatus";
import { usePreferences, CURRENCY_OPTIONS } from "@/hooks/usePreferences";
import { useExport } from "@/hooks/useExport";
import { usePin } from "@/hooks/usePin";
import { useSession } from "@/hooks/useSession";
import { useGoogleSync } from "@/hooks/useGoogleSync";
import { useTransactionMutations } from "@/hooks/useTransactionMutations";
import { useThemeCrossfade } from "@/hooks/useThemeCrossfade";
import { useDebouncedSheetWrites } from "@/hooks/useDebouncedSheetWrites";
import { usePickerCallbacks } from "@/hooks/usePickerCallbacks";
import { useTabNavigation } from "@/hooks/useTabNavigation";
import { useBootstrap } from "@/hooks/useBootstrap";
import { useConfirmCallbacks } from "@/hooks/useConfirmDialog";
import { useTagSyncEffects } from "@/hooks/useTagSync";
import { useHistoryPanel } from "@/hooks/useHistoryPanel";
import { useTransactionActions } from "@/hooks/useTransactionActions";
import { getErrorMessage, isAuthError, logError } from "@/utils/errorHandler";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ConnectBanner } from "@/components/ui/ConnectBanner";
import { ConnectingOverlay } from "@/components/ui/ConnectingOverlay";
import { MergePromptModal } from "@/components/modals/MergePromptModal";
import { CurrencyPickerModal } from "@/components/modals/CurrencyPickerModal";
import {
  StartupSplash,
  TabPage,
  HeaderShell,
} from "@/components/AppShell";

preventAutoHideAsync().catch(() => undefined);
// ponytail: native fade disabled, JS StartupSplash (video) owns the 220ms exit;
// windowBackground stays #000000 so early hideAsync still shows black, not plomo
setSplashOptions({ duration: 0, fade: false });

function AppContent() {
  const { colors, theme, colorScheme: accentColorScheme, toggleTheme } = useTheme();
  const {
    language,
    currencySymbol,
    fontPreference,
    fontSizeScale,
    copy,
    saveLanguage,
    saveCurrencySymbol,
    saveFontPreference,
    saveFontSizeScale,
    saveColorScheme,
    colorScheme,
    theme: prefTheme,
    saveTheme,
    restorePreferences,
    applyRemotePreferences,
    resetToDefaults,
    needsCurrencyPick,
    dismissCurrencyPick,
  } = usePreferences();
  const {
    themeBg,
    themeDarkOverlay,
    themeLightOverlay,
    themeProgressContentOpacity,
    toggleThemeWithCrossfade,
    snapThemeProgress,
  } = useThemeCrossfade(
    theme,
    accentColorScheme,
    toggleTheme,
    saveTheme,
  );
  const errMsg = useCallback((error: unknown) => getErrorMessage(error, copy.syncError), [copy.syncError]);
  const authErr = useCallback((error: unknown) => isAuthError(error, copy.syncError), [copy.syncError]);

  // ─── Pin (called early so restorePinState is available for bootstrap) ──
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

  // ─── Core state: tags, finance, session, sync ────────────────────
  const [tagsList, setTagsList] = useState<Tag[]>([]);
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
    replaceTransactions,
    recalcAndReplaceTransactions,
    setPeriod,
    toggleSearchActive,
    clearSelection,
    removeFromSelection,
    applySearchFilters: hookApplySearchFilters,
    clearSearchFilters: hookClearSearchFilters,
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

  // History panel defined early so handleResetFinancial can clear it on account switch (aislamiento por cuenta)
  const {
    historyEntries,
    setHistoryEntries,
    historyVisible,
    openHistory,
    closeHistory,
  } = useHistoryPanel();

  const handleResetFinancial = useCallback(() => {
    resetFinancial();
    setTagsList([]);
    setHistoryEntries([]);
  }, [resetFinancial, setHistoryEntries]);

  const connectRef = useRef<((token: string, sheetId?: string, forceScan?: boolean, wasOffline?: boolean) => Promise<void>) | undefined>(undefined);
  const session = useSession(copy, errMsg, handleResetFinancial, (token, sheetId, forceScan, wasOffline) => {
    return connectRef.current?.(token, sheetId, forceScan, wasOffline) ?? Promise.resolve();
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
    isOffline,
    connectionStatus,
    runGoogleSignIn,
    switchToAccount,
    disconnectGoogle, removeGoogleAccount,
  } = session;

  // Envuelve disconnect/remove para regresar al diseño por defecto (no quedar con tema de cuenta quitada)
  const wrappedDisconnect = useCallback(async () => {
    await disconnectGoogle();
    resetToDefaults();
  }, [disconnectGoogle, resetToDefaults]);

  const wrappedRemove = useCallback(async () => {
    await removeGoogleAccount();
    const { loadConnectedAccounts } = await import("@/data/connectedAccounts");
    const remaining = await loadConnectedAccounts();
    if (remaining.length) {
      try {
        await switchToAccount(remaining[0].email);
        return;
      } catch (_e) { void _e; }
    }
    resetToDefaults();
  }, [removeGoogleAccount, resetToDefaults, switchToAccount]);

  // ─── Google sync & mutations ─────────────────────────────────────
  const reloadPromiseRef = useRef<Promise<void> | null>(null);
  const syncApi = useGoogleSync(
    session,
    fin,
    { tagsList, setTagsList },
    { errMsg, authErr, copy: copy as unknown as { syncError: string; sessionExpired: string; showingSavedData: string; pendingSyncStatus: string; syncing: string; deleteRecord: string; deleteSelection: string; moveRecord: string; moveRecordError: string; undoAction: string }, tagColors: colors.tagColors, language },
    reloadPromiseRef,
  );
  useEffect(() => {
    connectRef.current = syncApi.connectGoogleWorkspace;
  }, [syncApi.connectGoogleWorkspace]);

  // ─── Tag lifecycle effects ───────────────────────────────────────
  const { tagEditorVisible, openTagEditor, closeTagEditor } = useTagSyncEffects(
    language,
    replaceTransactions,
    accessToken,
    spreadsheetId,
    tagsList,
    setTagsList,
  );

  // ─── Bootstrap ───────────────────────────────────────────────────
  const bootstrapping = useBootstrap(
    restorePreferences,
    syncApi.restoreSession,
    restorePinState,
  );

  // Retain the splash mounted while it plays its exit fade.
  const [splashGone, setSplashGone] = useState(false);
  const hideSplash = useCallback(() => {
    hideAsync().catch(() => undefined);
    setSplashGone(true);
  }, []);
  const splashWanted =
    bootstrapping ||
    accountTransition ||
    rehydratingCache ||
    (accessToken && isFirstRemoteLoad && !hasLocalData);
  useEffect(() => {
    if (splashWanted) setSplashGone(false);
  }, [splashWanted]);

  // Black veil after video: first frame post-splash stays #000000 then fades
  // 120ms hold + 280ms out, so there's no 1-frame plomo flash before dashboard
  const postSplashBlack = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!splashGone) return;
    postSplashBlack.setValue(1);
    Animated.timing(postSplashBlack, {
      toValue: 0,
      duration: 280,
      delay: 120,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [splashGone, postSplashBlack]);

  // Wire remote history (sheet → local) once on mount.
  useEffect(() => {
    syncApi.wireRemoteHistory((sheetHistory) => {
      setHistoryEntries((prev) => {
        const byId = new Map<string, HistoryEntry>();
        for (const e of prev) byId.set(e.id, e);
        for (const e of sheetHistory) byId.set(e.id, e);
        return Array.from(byId.values());
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Wire the remote-applier (sheet → local) once on mount.
  useEffect(() => {
    syncApi.wireRemoteUiPreferences(applyRemotePreferences);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applyRemotePreferences]);

  // ─── Merge prompt ─────────────────────────────────────────────────
  // ─── Export ──────────────────────────────────────────────────────
  const {
    exportVisible,
    exportConfig,
    exportMinDate,
    setExportConfig,
    openExport,
    closeExport,
    startExport,
  } = useExport(transactions, currencySymbol, copy, errMsg);

  // ─── Modal refs and state ────────────────────────────────────────
  const modals = useAppModals({
    exportVisible,
    openExport,
    closeExport,
    historyVisible,
    openHistory,
    closeHistory,
    pinSetupVisible,
    setPinSetupVisible,
    tagEditorVisible,
    openTagEditor,
    closeTagEditor,
  });

  // Wire the merge prompt (sheet → local) once on mount.
  useEffect(() => {
    syncApi.wireMergePrompt(modals.openers.openMergePrompt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Debounced sheet writes ──────────────────────────────────────
  useDebouncedSheetWrites(
    accessToken,
    spreadsheetId,
    { language, currencySymbol, fontPreference, fontSizeScale, colorScheme, theme: prefTheme },
    syncApi.writeUiPreferences,
    historyEntries,
    syncApi.writeHistory,
    tagsList,
  );

  // ─── Mutations ───────────────────────────────────────────────────
  const mutations = useTransactionMutations(
    {
      transactions, recalcAndReplaceTransactions,
      summaries,
      freqIncome,
      month, year, setPeriod, toggleSearchActive, clearSelection, removeFromSelection,
      selectedRows,
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

  // ─── Confirm dialog ──────────────────────────────────────────────
  const {
    requestDisconnectGoogle,
    requestDelete,
    requestDeleteSelected,
    handleConfirm,
    closeConfirm,
  } = useConfirmCallbacks({
    deleteTx: mutations.deleteTx,
    deleteSelectedRows: mutations.deleteSelectedRows,
    removeGoogleAccount: wrappedRemove,
    disconnectGoogle: wrappedDisconnect,
    selectedRowsLength: selectedRows.length,
    setConfirmConfig: modals.openers.openConfirm,
    optionSheetRef: modals.refs.optionSheetRef,
  });

  // ─── Derived values ──────────────────────────────────────────────
  const selectedColorScheme =
    COLOR_SCHEME_OPTIONS.find((option) => option.value === colorScheme) ||
    COLOR_SCHEME_OPTIONS[0];
  const colorSchemeLabel =
    language === "en"
      ? selectedColorScheme.labelEn
      : selectedColorScheme.labelEs;
  const syncStatusText = useDerivedSyncStatus({
    authError,
    syncError,
    hasLocalData,
    pendingSync,
    isSyncing,
    copy,
  });

  // ─── Picker callbacks ────────────────────────────────────────────
  const {
    openLanguagePicker,
    openCurrencyPicker,
    openFontPicker,
    openFontSizePicker,
    openColorSchemePicker,
    openAccountManager,
  } = usePickerCallbacks({
    optionSheetRef: modals.refs.optionSheetRef,
    copy,
    language,
    currencySymbol,
    fontPreference,
    fontSizeScale,
    saveLanguage,
    saveCurrencySymbol,
    saveFontPreference,
    saveFontSizeScale,
    saveColorScheme,
    colorScheme,
    theme,
    colors,
    runGoogleSignIn,
    switchToAccount,
    setConfirmConfig: modals.openers.openConfirm,
    accountInfo,
  });

  // ─── Tab navigation ──────────────────────────────────────────────
  const tabNav = useTabNavigation();
  const {
    tab,
    pagerTranslateX,
    tabWidth,
    headerTopInset,
    headerFadeHeight,
    changeTab,
  } = tabNav;

  // ─── Transaction actions ─────────────────────────────────────────
  const {
    openAdd,
    openEdit,
    applySearchFilters,
    clearSearchFilters,
    handleTransactionPress,
    openMoveMenu,
    exitSearch,
    openSearch,
  } = useTransactionActions({
    transactionModalRef: modals.refs.transactionModalRef,
    detailModalRef: modals.refs.detailModalRef,
    searchModalRef: modals.refs.searchModalRef,
    optionSheetRef: modals.refs.optionSheetRef,
    clearSelection,
    toggleSelection,
    changeTab,
    hookApplySearchFilters,
    hookClearSearchFilters,
    toggleSearchActive,
    searchFilters,
    moveTx: mutations.moveTx,
    copy: copy as { moveRecord: string; moveUpOnePosition: string; moveDownOnePosition: string },
    colors: { info: colors.info, warn: colors.warn },
    selectedRows,
  });

  // ─── Memoised page props ─────────────────────────────────────────
  const contentInset = headerTopInset + 62;

  const dashboardProps = useMemo(() => ({
    contentTopInset: contentInset,
    colors,
    theme,
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
  }), [contentInset, colors, theme, copy, transactions, tagsList, currencySymbol, month, year, fin.availableYears, fin.availableMonths, selectPeriod, goToday, goPrevMonth, goNextMonth, handleTransactionPress]);

  const expensesProps = useMemo(() => ({
    contentTopInset: contentInset,
    colors,
    theme,
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
  }), [contentInset, colors, theme, fin.visibleTransactions, searchActive, searchFilters.text, selectedRows, currencySymbol, copy, month, year, fin.availableYears, fin.availableMonths, exitSearch, handleTransactionPress, openEdit, requestDeleteSelected, openMoveMenu, fin.toggleSelection, loadOlder, selectPeriod, goToday, goPrevMonth, goNextMonth, tagsList]);

  const summaryProps = useMemo(() => ({
    contentTopInset: contentInset,
    colors,
    copy,
    summaries,
    transactions,
    freqIncome,
    availableYears: fin.availableYears,
    currencySymbol,
    tagsList,
    theme,
  }), [contentInset, colors, copy, summaries, transactions, freqIncome, fin.availableYears, currencySymbol, tagsList, theme]);

  const settingsProps = useMemo(() => ({
    contentTopInset: contentInset,
    colors,
    copy,
    language,
    accountInfo,
    currencySymbol,
    fontPreference,
    fontSizeScale,
    colorSchemeLabel,
    pinEnabled,
    tagsCount: tagsList.length,
    onOpenLanguage: openLanguagePicker,
    onOpenCurrency: openCurrencyPicker,
    onOpenFont: openFontPicker,
    onOpenFontSize: openFontSizePicker,
    onOpenColorScheme: openColorSchemePicker,
    onOpenPin: handlePinOpen,
    onOpenTags: openTagEditor,
    onSwitch: openAccountManager,
    onDisconnect: requestDisconnectGoogle,
    onOpenExport: openExport,
  }), [contentInset, colors, copy, language, accountInfo, currencySymbol, fontPreference, fontSizeScale, colorSchemeLabel, pinEnabled, tagsList.length, openLanguagePicker, openCurrencyPicker, openFontPicker, openFontSizePicker, openColorSchemePicker, handlePinOpen, openTagEditor, openAccountManager, requestDisconnectGoogle, openExport]);

  const loadingBarProps = useMemo(() => ({
    visible: Boolean(loading || (syncStatusText && !pendingSync && !isSyncing)),
    syncing: loading || isSyncing,
    cardColor: colors.card,
    primaryColor: colors.primary,
    mutedColor: colors.muted,
    text: syncStatusText || copy.syncing,
  }), [loading, syncStatusText, pendingSync, isSyncing, colors.card, colors.primary, colors.muted, copy.syncing]);

  const tabPageProps = useMemo(() => ({
    tabWidth,
    dashboard: dashboardProps,
    expenses: expensesProps,
    summary: summaryProps,
    settings: settingsProps,
    loadingBar: loadingBarProps,
  }), [tabWidth, dashboardProps, expensesProps, summaryProps, settingsProps, loadingBarProps]);

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

  // ─── Unlock transition ─────────────────────────────────────────
  // Content is gated only while the PIN screen actually blocks it. usePin sets
  // pinVerified to false whenever the app backgrounds — even with PIN
  // disabled — so keying the unlock animation off pinVerified alone would leave
  // the content invisible (black screen) on return.
  const pinGated = pinEnabled && !pinVerified;
  const unlockAnim = useRef(new Animated.Value(pinGated ? 0 : 1)).current;
  useEffect(() => {
    if (pinGated) {
      unlockAnim.setValue(0);
    } else {
      Animated.timing(unlockAnim, {
        toValue: 1,
        duration: 380,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    }
  }, [pinGated, unlockAnim]);

  // ─── Foreground resume ─────────────────────────────────────────
  // The screen can come back blank when the app resumes: the native splash
  // may still be up, or an interrupted unlock/toggle animation may have left
  // content invisible. The token refresh is real but heavy (a full sheet
  // read + applyFinancialState), so it is debounced well past the user's
  // first interaction to avoid stealing the JS thread on resume.
  const onForegroundRef = useRef<() => void>(() => {});
  const foregroundReloadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const accessTokenRef = useRef(accessToken);
  accessTokenRef.current = accessToken;
  const spreadsheetIdRefForFg = useRef(spreadsheetId);
  spreadsheetIdRefForFg.current = spreadsheetId;
  const splashGoneRef = useRef(splashGone);
  splashGoneRef.current = splashGone;
  const pinGatedRef = useRef(pinGated);
  pinGatedRef.current = pinGated;
  const reloadFromGoogleRef = useRef(syncApi.reloadFromGoogle);
  reloadFromGoogleRef.current = syncApi.reloadFromGoogle;
  useEffect(() => {
    onForegroundRef.current = () => {
      if (splashGoneRef.current) hideAsync().catch(() => undefined);
      unlockAnim.stopAnimation();
      unlockAnim.setValue(pinGatedRef.current ? 0 : 1);
      snapThemeProgress();
      const token = accessTokenRef.current;
      const sheetId = spreadsheetIdRefForFg.current;
      if (token && sheetId) {
        if (foregroundReloadTimerRef.current)
          clearTimeout(foregroundReloadTimerRef.current);
        foregroundReloadTimerRef.current = setTimeout(() => {
          // Usa refs actuales para no disparar reload con sheetId viejo tras A→B
          const freshToken = accessTokenRef.current;
          const freshSheetId = spreadsheetIdRefForFg.current;
          if (!freshToken || !freshSheetId) return;
          if (freshSheetId !== sheetId) return;
          reloadFromGoogleRef.current(freshToken, freshSheetId, false)
            .catch((error) => logError(error, "foreground:reload"));
        }, 1500);
      }
    };
  });
  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      if (next === "active") onForegroundRef.current();
      if (next !== "active" && foregroundReloadTimerRef.current) {
        clearTimeout(foregroundReloadTimerRef.current);
        foregroundReloadTimerRef.current = null;
      }
    });
    return () => {
      sub.remove();
      if (foregroundReloadTimerRef.current)
        clearTimeout(foregroundReloadTimerRef.current);
    };
  }, []);

  // ─── Render ──────────────────────────────────────────────────────
  if (!splashGone) {
    return <StartupSplash exiting={!splashWanted} onExitComplete={hideSplash} />;
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
    <View style={[styles.safe, { backgroundColor: themeBg }]}>
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, themeDarkOverlay]}
      />
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, themeLightOverlay]}
      />
      <Animated.View
        style={{
          flex: 1,
          opacity: Animated.multiply(unlockAnim, themeProgressContentOpacity) as unknown as number,
          transform: [
            {
              scale: unlockAnim.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }),
            },
          ],
        }}
      >
      <NativeStatusBar
        barStyle={theme === "dark" ? "light-content" : "dark-content"}
        translucent
        backgroundColor="transparent"
      />
      <View style={[styles.shell, styles.shellCompact, { paddingTop: 0 }]}>
        <ConnectingOverlay
          status={connectionStatus as "scanning" | "loading" | "creating" | "merging" | "syncing" | null}
          copy={{
            scanning: copy.connectingScanning,
            loading: copy.connectingLoading,
            creating: copy.connectingCreating,
            merging: copy.connectingMerging,
            syncing: copy.connectingSyncing,
          }}
        />
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

        <BottomNav
          copy={copy}
          tab={tab}
          setTab={changeTab}
          onAdd={openAdd}
        />
        {isOffline && canConnect && (
          <ConnectBanner
            onPress={() => runGoogleSignIn(false)}
            copy={{ connectBanner: copy.connectBanner }}
          />
        )}
      </View>

      <TransactionModal
        ref={modals.refs.transactionModalRef}
        colors={colors}
        tags={tagsList}
        copy={copy}
        currencySymbol={currencySymbol}
        onSubmit={mutations.submitDraft}
        onAddTag={(tag) => setTagsList((prev) => [...prev.filter((t) => t.id !== tag.id), tag])}
      />
      <DetailModal
        ref={modals.refs.detailModalRef}
        colors={colors}
        currencySymbol={currencySymbol}
        copy={copy}
        tags={tagsList}
        onEdit={openEdit}
        onDelete={requestDelete}
      />
      <OptionSheet ref={modals.refs.optionSheetRef} colors={colors} />
      <Suspense fallback={null}>
        <ConfirmModal
          config={modals.state.confirmConfig}
          colors={colors}
          currencySymbol={currencySymbol}
          copy={copy}
          onClose={closeConfirm}
          onConfirm={handleConfirm}
        />
        <HistoryModal
          visible={modals.state.historyVisible}
          entries={historyEntries}
          colors={colors}
          currencySymbol={currencySymbol}
          copy={copy}
          onClose={modals.closers.closeHistory}
          onUndo={mutations.undoDeleteEntry}
        />
        <PinSetupModal
          visible={modals.state.pinSetupVisible}
          colors={colors}
          copy={copy}
          onClose={modals.closers.closePinSetup}
          onSave={handlePinSave}
        />
        <ExportModal
          visible={modals.state.exportVisible}
          colors={colors}
          copy={copy}
          config={exportConfig}
          setConfig={setExportConfig}
          minDate={exportMinDate}
          onClose={modals.closers.closeExport}
          onExport={startExport}
        />
        <TagEditorModal
          visible={modals.state.tagEditorVisible}
          colors={colors}
          copy={copy}
          tags={tagsList}
          setTags={setTagsList}
          onClose={modals.closers.closeTagEditor}
        />
      </Suspense>
      <MergePromptModal
        config={modals.state.mergePrompt}
        colors={colors}
        copy={{
          mergeTitle: "Datos en Drive",
          mergeMsg: "Tienes registros en tu hoja. ¿Combinarlos con estos?",
          mergeOption: "Sí, combinar",
          mergeRemoteOnly: "No",
        }}
        onClose={modals.closers.closeMergePrompt}
        onMerge={modals.closers.confirmMerge}
        onRemoteOnly={modals.closers.remoteOnlyMerge}
      />
      <CurrencyPickerModal
        visible={needsCurrencyPick}
        colors={colors}
        copy={{ chooseCurrency: "Elige tu moneda", continue: "Continuar" }}
        options={CURRENCY_OPTIONS.map((o) => ({
          label: language === "en" ? o.labelEn : o.labelEs,
          value: o.value,
        }))}
        onConfirm={(val) => {
          saveCurrencySymbol(val);
          dismissCurrencyPick();
        }}
        onClose={() => dismissCurrencyPick()}
      />
      <SearchModal
        ref={modals.refs.searchModalRef}
        colors={colors}
        copy={copy}
        currencySymbol={currencySymbol}
        tags={tagsList}
        onClear={clearSearchFilters}
        onSubmit={applySearchFilters}
      />
      </Animated.View>
      {/* ponytail: black veil hides 1-frame plomo flash after video; fades 120+280ms */}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: "#000000", opacity: postSplashBlack }]} />
    </View>
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
