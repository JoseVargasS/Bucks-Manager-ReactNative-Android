import { BlurView } from "expo-blur";
import {
  preventAutoHideAsync,
  setOptions as setSplashOptions,
} from "expo-splash-screen";
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Linking,
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
  type Tag,
} from "@/types";

import {
  TAB_ORDER,
  COLOR_SCHEME_OPTIONS,
  LEGAL_URLS,
  PLAY_MARKET_URL,
  PLAY_STORE_URL,
  SUPPORT_EMAIL,
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
import { usePageProps } from "@/hooks/usePageProps";
import { useBootstrap } from "@/hooks/useBootstrap";
import { useAppShell } from "@/hooks/useAppShell";
import { useConfirmCallbacks } from "@/hooks/useConfirmDialog";
import { useTagSyncEffects } from "@/hooks/useTagSync";
import { useHistoryPanel } from "@/hooks/useHistoryPanel";
import { useTransactionActions } from "@/hooks/useTransactionActions";
import { getErrorMessage, isAuthError } from "@/utils/errorHandler";
import { clearDeletedTagIds } from "@/utils/tags";
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
  // ponytail: los 401/403 nunca muestran el JSON crudo de Google — se mapean
  // a "Sesión expirada" para que ningún Alert/syncError exponga el dump.
  const errMsg = useCallback((error: unknown) => isAuthError(error, copy.syncError) ? copy.sessionExpired : getErrorMessage(error, copy.syncError), [copy.syncError, copy.sessionExpired]);
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

  // Ediciones de tags hechas por el usuario (editor o crear desde registro):
  // limpian tombstones de los ids presentes y suben al sheet de inmediato,
  // sin esperar el debounce, para que un reload no los pise con valores viejos.
  const handleUserSetTags = useCallback((next: Tag[]) => {
    void clearDeletedTagIds(next.map((t) => t.id));
    setTagsList(next);
  }, []);
  const handleAddTag = useCallback((tag: Tag) => {
    void clearDeletedTagIds([tag.id]);
    const next = [...tagsList.filter((t) => t.id !== tag.id), tag];
    setTagsList(next);
    syncApi.writeTagsNow(next);
  }, [tagsList, syncApi]);
  useEffect(() => {
    connectRef.current = syncApi.connectGoogleWorkspace;
  }, [syncApi.connectGoogleWorkspace]);

  // Pull-to-refresh: el spinner solo responde al jalón del usuario, nunca a
  // los syncs de fondo (guardar registro, escrituras con debounce, foreground:
  // esos van en silencio y los datos aparecen solos). Contador en vez de
  // booleano para que un doble jalón no apague el spinner antes de tiempo.
  // syncApi se recrea por render, por eso va por ref para no romper los memo.
  const reloadRef = useRef(syncApi.reloadFromGoogle);
  reloadRef.current = syncApi.reloadFromGoogle;
  const [refreshCount, setRefreshCount] = useState(0);
  const handleRefresh = useCallback(() => {
    setRefreshCount((c) => c + 1);
    const done = () => setRefreshCount((c) => Math.max(0, c - 1));
    const p = reloadRef.current(accessToken, spreadsheetId, false, true);
    if (!p) {
      done();
      return;
    }
    void p.then(done, done);
  }, [accessToken, spreadsheetId]);

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
    paging,
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

  // ─── Legal & store links ─────────────────────────────────────────
  const openUrl = useCallback((url: string) => {
    Linking.openURL(url).catch(() => undefined);
  }, []);
  const legalLang = language === "en" ? "en" : "es";
  const openPrivacy = useCallback(() => openUrl(LEGAL_URLS.privacy(legalLang)), [openUrl, legalLang]);
  const openTerms = useCallback(() => openUrl(LEGAL_URLS.terms(legalLang)), [openUrl, legalLang]);
  const openDeleteAccount = useCallback(() => openUrl(LEGAL_URLS.deleteAccount(legalLang)), [openUrl, legalLang]);
  const openContact = useCallback(() => openUrl(`mailto:${SUPPORT_EMAIL}`), [openUrl]);
  const openRate = useCallback(async () => {
    try {
      const supported = await Linking.canOpenURL(PLAY_MARKET_URL);
      await Linking.openURL(supported ? PLAY_MARKET_URL : PLAY_STORE_URL);
    } catch {
      // ignore
    }
  }, []);

  // ─── Memoised page props (extracted hook) ────────────────────────
  const { tabPageProps, headerProps } = usePageProps({
    tab,
    tabWidth,
    headerTopInset,
    headerFadeHeight,
    historyCount: historyEntries.length,
    colors,
    theme,
    copy,
    transactions,
    visibleTransactions: fin.visibleTransactions,
    summaries,
    freqIncome,
    tagsList,
    currencySymbol,
    month,
    year,
    availableYears: fin.availableYears,
    availableMonths: fin.availableMonths,
    searchActive,
    searchText: searchFilters.text,
    selectedRows,
    language,
    accountInfo,
    fontPreference,
    fontSizeScale,
    colorSchemeLabel,
    pinEnabled,
    loading,
    syncStatusText,
    pendingSync,
    isSyncing,
    refreshing: refreshCount > 0,
    onRefresh: handleRefresh,
    selectPeriod,
    goToday,
    goPrevMonth,
    goNextMonth,
    loadOlder,
    handleTransactionPress,
    toggleSelection: fin.toggleSelection,
    exitSearch,
    openEdit,
    requestDeleteSelected,
    openMoveMenu,
    openSearch,
    openHistory,
    openExport,
    openLanguagePicker,
    openCurrencyPicker,
    openFontPicker,
    openFontSizePicker,
    openColorSchemePicker,
    handlePinOpen,
    openTagEditor,
    openAccountManager,
    requestDisconnectGoogle,
    toggleThemeWithCrossfade,
    openPrivacy,
    openTerms,
    openDeleteAccount,
    openContact,
    openRate,
  });

  // ─── Shell lifecycle: splash, sheet wiring, PIN gate, resume ──
  const { splashWanted, splashVisible, hideSplash, postSplashBlack, unlockAnim } = useAppShell({
    bootstrapping,
    accountTransition,
    rehydratingCache,
    accessToken,
    spreadsheetId,
    isFirstRemoteLoad,
    hasLocalData,
    pinEnabled,
    pinVerified,
    snapThemeProgress,
    reloadFromGoogle: syncApi.reloadFromGoogle,
    refreshSessionToken: syncApi.refreshSessionToken,
    isAuthFailure: authErr,
    accountEmail: accountInfo?.email,
    wireRemoteHistory: syncApi.wireRemoteHistory,
    wireRemoteUiPreferences: syncApi.wireRemoteUiPreferences,
    wireMergePrompt: syncApi.wireMergePrompt,
    applyRemotePreferences,
    setHistoryEntries,
    openMergePrompt: modals.openers.openMergePrompt,
  });

  // ─── Render ──────────────────────────────────────────────────────
  // ponytail: keep shell mounted behind splash to avoid plomo flash; splash is overlay, veil bridges black→theme
  // splashVisible (mount) lags splashGone (logic) until the veil fade ends
  let mainContent: React.ReactNode;
  if (pinLoading) {
    mainContent = (
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
  } else if (pinEnabled && (!pinVerified || pinLockedRef.current)) {
    mainContent = (
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
  } else {
    mainContent = (
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
            renderToHardwareTextureAndroid={paging}
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
        onAddTag={handleAddTag}
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
          setTags={handleUserSetTags}
          onClose={modals.closers.closeTagEditor}
          onCommitTags={(next) => syncApi.writeTagsNow(next)}
        />
      </Suspense>
      <MergePromptModal
        config={splashVisible ? null : modals.state.mergePrompt}
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
        visible={needsCurrencyPick && !splashVisible}
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
    </View>
    );
  }

  return (
    <View style={[styles.safe, { backgroundColor: "#000000" }]}>
      {mainContent}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: "#000000", opacity: postSplashBlack }]} />
      {splashVisible && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: "#000000" }]} pointerEvents="auto">
          <StartupSplash exiting={!splashWanted} onExitComplete={hideSplash} />
        </View>
      )}
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
