import { BlurView } from "expo-blur";
import {
  preventAutoHideAsync,
  setOptions as setSplashOptions,
} from "expo-splash-screen";
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
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
import {
  TransactionModal,
  type TransactionModalHandle,
} from "@/components/modals/TransactionModal";
import {
  DetailModal,
  type DetailModalHandle,
} from "@/components/modals/DetailModal";
import {
  SearchModal,
  type SearchModalHandle,
} from "@/components/modals/SearchModal";
import {
  OptionSheet,
  type OptionSheetHandle,
} from "@/components/modals/OptionSheet";
import { type ConfirmConfig } from "@/components/modals/ConfirmModal";

const ExportModal = lazy(
  () => import("@/components/modals/ExportModal").then((m) => ({ default: m.ExportModal })),
);
const ConfirmModal = lazy(
  () => import("@/components/modals/ConfirmModal").then((m) => ({ default: m.ConfirmModal })),
);
const HistoryModal = lazy(
  () => import("@/components/modals/HistoryModal").then((m) => ({ default: m.HistoryModal })),
);
const PinSetupModal = lazy(
  () => import("@/components/modals/PinSetupModal").then((m) => ({ default: m.PinSetupModal })),
);
const TagEditorModal = lazy(
  () => import("@/components/modals/TagEditorModal").then((m) => ({ default: m.TagEditorModal })),
);
import {
  type HistoryEntry,
  type Tag,
} from "@/types";

import {
  ANIM_SPLASH_DURATION,
  TAB_ORDER,
  COLOR_SCHEME_OPTIONS,
} from "@/theme/constants";
import { useFinancialState } from "@/hooks/useFinancialState";
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
import { getErrorMessage, isAuthError } from "@/utils/errorHandler";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ConnectBanner } from "@/components/ui/ConnectBanner";
import { ConnectingOverlay } from "@/components/ui/ConnectingOverlay";
import { MergePromptModal, type MergePromptConfig } from "@/components/modals/MergePromptModal";
import { CurrencyPickerModal } from "@/components/modals/CurrencyPickerModal";
import {
  StartupSplash,
  TabPage,
  HeaderShell,
} from "@/components/AppShell";

preventAutoHideAsync().catch(() => undefined);
setSplashOptions({ duration: ANIM_SPLASH_DURATION, fade: true });

function AppContent() {
  const { colors, theme, colorScheme: accentColorScheme, toggleTheme } = useTheme();
  const {
    language,
    currencySymbol,
    fontPreference,
    copy,
    saveLanguage,
    saveCurrencySymbol,
    saveFontPreference,
    saveColorScheme,
    colorScheme,
    theme: prefTheme,
    saveTheme,
    restorePreferences,
    applyRemotePreferences,
    needsCurrencyPick,
    dismissCurrencyPick,
  } = usePreferences();
  const { themeProgressBg, toggleThemeWithCrossfade } = useThemeCrossfade(
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
  const closePinSetup = useCallback(() => setPinSetupVisible(false), [setPinSetupVisible]);

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
    isOffline,
    connectionStatus,
    runGoogleSignIn,
    disconnectGoogle, removeGoogleAccount,
  } = session;

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

  // ─── History panel ───────────────────────────────────────────────
  const {
    historyEntries,
    setHistoryEntries,
    historyVisible,
    openHistory,
    closeHistory,
  } = useHistoryPanel();

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
  const mergeCallbacksRef = useRef<{ onMerge: () => void; onRemoteOnly: () => void } | null>(null);
  const [mergePrompt, setMergePrompt] = useState<MergePromptConfig | null>(null);
  useEffect(() => {
    syncApi.wireMergePrompt((cfg) => {
      mergeCallbacksRef.current = { onMerge: cfg.onMerge, onRemoteOnly: cfg.onRemoteOnly };
      setMergePrompt({ localCount: cfg.localCount, remoteCount: cfg.remoteCount });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // ─── Debounced sheet writes ──────────────────────────────────────
  useDebouncedSheetWrites(
    accessToken,
    spreadsheetId,
    { language, currencySymbol, fontPreference, colorScheme, theme: prefTheme },
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
  const [confirmConfig, setConfirmConfig] = useState<ConfirmConfig | null>(null);
  const {
    requestDisconnectGoogle,
    requestDelete,
    requestDeleteSelected,
    handleConfirm,
    closeConfirm,
  } = useConfirmCallbacks({
    deleteTx: mutations.deleteTx,
    deleteSelectedRows: mutations.deleteSelectedRows,
    removeGoogleAccount,
    disconnectGoogle,
    selectedRowsLength: selectedRows.length,
    setConfirmConfig,
  });

  // ─── Derived values ──────────────────────────────────────────────
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

  // ─── Modal refs (before pickers which consume optionSheetRef) ─────
  const transactionModalRef = useRef<TransactionModalHandle>(null);
  const detailModalRef = useRef<DetailModalHandle>(null);
  const searchModalRef = useRef<SearchModalHandle>(null);
  const optionSheetRef = useRef<OptionSheetHandle>(null);

  // ─── Picker callbacks ────────────────────────────────────────────
  const {
    openLanguagePicker,
    openCurrencyPicker,
    openFontPicker,
    openColorSchemePicker,
    openAccountManager,
  } = usePickerCallbacks({
    optionSheetRef,
    copy,
    language,
    currencySymbol,
    fontPreference,
    saveLanguage,
    saveCurrencySymbol,
    saveFontPreference,
    saveColorScheme,
    colorScheme,
    theme,
    colors,
    runGoogleSignIn,
    setConfirmConfig,
  });

  // ─── Tab navigation ──────────────────────────────────────────────
  const tabNav = useTabNavigation();
  const {
    tab,
    tabRef,
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
    transactionModalRef,
    detailModalRef,
    searchModalRef,
    optionSheetRef,
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
  const tabPageProps = useMemo(
    () => ({
      tabWidth,
      dashboard: {
        contentTopInset: headerTopInset + 62,
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
      },
      expenses: {
        contentTopInset: headerTopInset + 62,
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
      theme,
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

  // ─── Render ──────────────────────────────────────────────────────
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
          tab={tabRef.current}
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
      <Suspense fallback={null}>
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
        <TagEditorModal
          visible={tagEditorVisible}
          colors={colors}
          copy={copy}
          tags={tagsList}
          setTags={setTagsList}
          onClose={closeTagEditor}
        />
      </Suspense>
      <MergePromptModal
        config={mergePrompt}
        colors={colors}
        copy={{
          mergeTitle: "Datos en Drive",
          mergeMsg: "Tienes registros en tu hoja. ¿Combinarlos con estos?",
          mergeOption: "Sí, combinar",
          mergeRemoteOnly: "No",
        }}
        onClose={() => setMergePrompt(null)}
        onMerge={() => {
          mergeCallbacksRef.current?.onMerge();
          setMergePrompt(null);
          mergeCallbacksRef.current = null;
        }}
        onRemoteOnly={() => {
          mergeCallbacksRef.current?.onRemoteOnly();
          setMergePrompt(null);
          mergeCallbacksRef.current = null;
        }}
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
        ref={searchModalRef}
        colors={colors}
        copy={copy}
        currencySymbol={currencySymbol}
        tags={tagsList}
        onClear={clearSearchFilters}
        onSubmit={applySearchFilters}
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
