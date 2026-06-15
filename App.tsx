import Constants from "expo-constants";
import { StatusBar } from "expo-status-bar";
import * as FileSystem from "expo-file-system/legacy";
import * as Print from "expo-print";
import * as SecureStore from "expo-secure-store";
import * as Sharing from "expo-sharing";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, SafeAreaView, Text, TouchableOpacity, View, StatusBar as NativeStatusBar } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { GoogleSignin } from "@react-native-google-signin/google-signin";

import {
  applySearch, buildTransactionFromDraft, calculateSummaries,
  formatDateToISO, getMonthYear, MONTH_NAMES, SHEET_NAMES,
} from "./src/domain/bucksLogic";
import {
  createBucksSpreadsheet, findCompatibleSheets, moveTransaction as moveGoogleTransaction,
  readSummaries, readTransactions, saveTransaction, updateFreqIncome as updateGoogleFreqIncome,
  updateTransaction as updateGoogleTransaction, deleteTransaction as deleteGoogleTransaction,
} from "./src/api/googleWorkspace";
import { dark, light, Palette } from "./src/theme/colors";
import { getBlankDraft, compareTransactionsDesc, filterTransactionsByRollingPeriod } from "./src/utils/transactions";
import { formatMoney, formatCreatedTime } from "./src/utils/formats";
import { styles } from "./src/styles/globalStyles";
import { SkeletonScreen } from "./src/components/ui/SkeletonScreen";
import { BottomNav } from "./src/components/layout/BottomNav";
import { PeriodControls } from "./src/components/layout/PeriodControls";
import { LoginScreen } from "./src/components/screens/LoginScreen";
import { ExpensesView } from "./src/components/screens/ExpensesView";
import { SearchPage } from "./src/components/screens/SearchPage";
import { SummaryView } from "./src/components/screens/SummaryView";
import { SettingsView } from "./src/components/screens/SettingsView";
import { TransactionModal } from "./src/components/modals/TransactionModal";
import { DetailModal } from "./src/components/modals/DetailModal";
import { FreqIncomeModal } from "./src/components/modals/FreqIncomeModal";
import { ExportModal, ExportConfig } from "./src/components/modals/ExportModal";
import { SheetChooserModal } from "./src/components/modals/SheetChooserModal";
import { OptionSheet, PickerConfig } from "./src/components/modals/OptionSheet";
import { ExportFormat, SearchFilters, SheetCandidate, SummaryRow, Transaction, TransactionDraft, TransactionType } from "./src/types";

const GOOGLE_ANDROID_CLIENT_ID = Constants.expoConfig?.extra?.googleAndroidClientId || "";
const GOOGLE_WEB_CLIENT_ID = Constants.expoConfig?.extra?.googleWebClientId || "";
const TOKEN_KEY = "bucks_google_access_token";
const SHEET_KEY = "bucks_spreadsheet_id";

type Tab = "expenses" | "search" | "summary" | "settings";
type ThemeMode = "dark" | "light";

const emptySearch: SearchFilters = { text: "", minAmount: "", maxAmount: "", startDate: "", endDate: "" };
const defaultExportConfig: ExportConfig = {
  format: "xlsx" as ExportFormat,
  rangeMode: "dates" as const,
  startDate: "",
  endDate: "",
  startMonth: new Date().getMonth(),
  startYear: new Date().getFullYear(),
  endMonth: new Date().getMonth(),
  endYear: new Date().getFullYear(),
};

export default function App() {
  const [theme, setTheme] = useState<ThemeMode>("dark");
  const colors: Palette = theme === "dark" ? dark : light;
  const [tab, setTab] = useState<Tab>("expenses");
  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());
  const [accessToken, setAccessToken] = useState("");
  const [spreadsheetId, setSpreadsheetId] = useState("");
  const [bootstrapping, setBootstrapping] = useState(true);
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summaries, setSummaries] = useState<SummaryRow[]>([]);
  const [freqIncome, setFreqIncome] = useState<Record<string, number>>({});
  const [addVisible, setAddVisible] = useState(false);
  const [freqVisible, setFreqVisible] = useState(false);
  const [sheetCandidates, setSheetCandidates] = useState<SheetCandidate[]>([]);
  const [accountInfo, setAccountInfo] = useState<{ name?: string; email?: string } | null>(null);
  const [detailTx, setDetailTx] = useState<Transaction | null>(null);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [draft, setDraft] = useState<TransactionDraft>(getBlankDraft());
  const [searchFilters, setSearchFilters] = useState<SearchFilters>(emptySearch);
  const [searchActive, setSearchActive] = useState(false);
  const [loadedMonthCount, setLoadedMonthCount] = useState(1);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [picker, setPicker] = useState<PickerConfig>(null);
  const [deletedTx, setDeletedTx] = useState<Transaction | null>(null);
  const [freqInput, setFreqInput] = useState("");
  const [exportVisible, setExportVisible] = useState(false);
  const [exportConfig, setExportConfig] = useState<ExportConfig>(defaultExportConfig);
  const compact = true;
  const statusBarInset = NativeStatusBar.currentHeight || 0;

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: GOOGLE_WEB_CLIENT_ID || undefined,
      scopes: ["https://www.googleapis.com/auth/drive.metadata.readonly", "https://www.googleapis.com/auth/spreadsheets"],
    });
    restoreSession();
  }, []);

  // --- Derived data ---
  const visibleTransactions = useMemo(() => {
    const source = searchActive
      ? applySearch(transactions, searchFilters)
      : filterTransactionsByRollingPeriod(transactions, month, year, loadedMonthCount);
    return [...source].sort(compareTransactionsDesc);
  }, [transactions, month, year, loadedMonthCount, searchActive, searchFilters]);

  const currentSummary = useMemo(() => {
    const key = `${MONTH_NAMES[month]} ${year}`;
    return summaries.find((row) => row.monthYear === key) || {
      monthYear: key, freqIncome: freqIncome[key] || 0, nonFreqIncome: 0,
      totalIncome: freqIncome[key] || 0, freqExpense: 0, nonFreqExpense: 0,
      totalExpense: 0, netMonthly: freqIncome[key] || 0, netNoFreq: 0,
    };
  }, [summaries, month, year, freqIncome]);

  const availableYears = useMemo(() => {
    const years = new Set<number>([new Date().getFullYear()]);
    summaries.forEach((row) => { const yr = Number(row.monthYear.split(" ").pop()); if (yr) years.add(yr); });
    return Array.from(years).sort((a, b) => b - a);
  }, [summaries]);

  const pageTitle = tab === "expenses" ? "Gastos" : tab === "search" ? "Buscar" : tab === "summary" ? "Análisis" : "Ajustes";
  const pageSubtitle = tab === "expenses" ? "" : tab === "search" ? "Filtros de movimientos" : tab === "summary" ? "Resumen por mes" : "Cuenta y exportación";

  // --- Session management ---
  async function restoreSession() {
    try {
      const [token, sheetId] = await Promise.all([SecureStore.getItemAsync(TOKEN_KEY), SecureStore.getItemAsync(SHEET_KEY)]);
      if (token && sheetId) {
        try {
          const fresh = await GoogleSignin.getTokens();
          const activeToken = fresh.accessToken || token;
          setAccessToken(activeToken);
          syncAccountInfo();
          await connectGoogleWorkspace(activeToken, sheetId);
        } catch { await clearGoogleSession(); }
      }
    } finally { setBootstrapping(false); }
  }

  async function connectGoogleWorkspace(token: string, preferredSheetId = "") {
    setLoading(true);
    try {
      const candidates = await findCompatibleSheets(token);
      const namedSheet = candidates.find((c) => c.name.trim().toUpperCase() === SHEET_NAMES.transactions);
      const preferred = candidates.find((c) => c.id === preferredSheetId);
      if (namedSheet) { await selectSpreadsheet(token, namedSheet.id, namedSheet.name); return; }
      if (preferred) { await selectSpreadsheet(token, preferred.id, preferred.name); return; }
      if (candidates.length > 1) { setSheetCandidates(candidates); setAccessToken(token); return; }
      const sheetId = candidates[0]?.id || (await createBucksSpreadsheet(token));
      await selectSpreadsheet(token, sheetId, candidates[0]?.name || SHEET_NAMES.transactions);
    } catch (error) {
      Alert.alert("Google Sheets", error instanceof Error ? error.message : "No se pudo conectar la hoja");
    } finally { setLoading(false); }
  }

  async function selectSpreadsheet(token: string, sheetId: string, _name: string) {
    setLoading(true);
    try {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
      await SecureStore.setItemAsync(SHEET_KEY, sheetId);
      setAccessToken(token); setSpreadsheetId(sheetId); setSheetCandidates([]);
      await reloadFromGoogle(token, sheetId);
    } finally { setLoading(false); }
  }

  async function signInWithGoogle() {
    if (!GOOGLE_ANDROID_CLIENT_ID && !GOOGLE_WEB_CLIENT_ID) {
      Alert.alert("Google OAuth", "Faltan las credenciales en .env."); return;
    }
    setLoading(true);
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      await GoogleSignin.signIn();
      const tokens = await GoogleSignin.getTokens();
      if (!tokens.accessToken) throw new Error("Google no devolvió access token.");
      syncAccountInfo();
      await connectGoogleWorkspace(tokens.accessToken);
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo iniciar sesión con Google.";
      const isDeveloperError = message.includes("DEVELOPER_ERROR") || message.includes("code: 10");
      Alert.alert("Google", isDeveloperError
        ? "Google rechazó la configuración OAuth. En Google Cloud revisa que el cliente Android use package com.josev.bucksmanager y el SHA-1 debug actual. También confirma que GOOGLE_WEB_CLIENT_ID sea tipo Web application."
        : message);
    } finally { setLoading(false); }
  }

  function syncAccountInfo() {
    const current = GoogleSignin.getCurrentUser();
    const data = ((current as { data?: { user: { name?: string; email?: string } } })?.data || current) as { user?: { name?: string; email?: string }; name?: string; email?: string };
    if (data) setAccountInfo({ name: data.user?.name || data.name, email: data.user?.email || data.email });
  }

  async function clearGoogleSession() {
    await Promise.all([SecureStore.deleteItemAsync(TOKEN_KEY), SecureStore.deleteItemAsync(SHEET_KEY)]);
    setAccessToken(""); setSpreadsheetId(""); setTransactions([]); setSummaries([]);
    setFreqIncome({}); setAccountInfo(null); setDeletedTx(null);
  }

  async function disconnectGoogle() {
    try { await GoogleSignin.signOut(); } catch { /* ok */ }
    await clearGoogleSession();
  }

  async function switchGoogleAccount() {
    try { await GoogleSignin.signOut(); } catch { /* ok */ }
    await clearGoogleSession();
    await signInWithGoogle();
  }

  async function rescanDrive() { if (accessToken) await connectGoogleWorkspace(accessToken); }

  // --- Data operations ---
  async function reloadFromGoogle(token = accessToken, sheetId = spreadsheetId) {
    if (!token || !sheetId) return;
    setLoading(true);
    try {
      const [tx, summary] = await Promise.all([readTransactions(token, sheetId), readSummaries(token, sheetId)]);
      setTransactions(tx);
      setSummaries(summary.length ? summary : calculateSummaries(tx, freqIncome));
    } finally { setLoading(false); }
  }

  function selectPeriod(nextMonth: number, nextYear: number) {
    setMonth(nextMonth); setYear(nextYear); setSearchActive(false); setLoadedMonthCount(1); setSelectedRows([]);
  }
  const goToday = useCallback(() => {
    const today = new Date();
    selectPeriod(today.getMonth(), today.getFullYear());
  }, []);

  function openAdd(type?: TransactionType) { setEditingTx(null); setDraft(getBlankDraft(type)); setAddVisible(true); }

  function openEdit(tx: Transaction) {
    setDetailTx(null); setSelectedRows([]); setEditingTx(tx);
    setDraft({ date: formatDateToISO(tx.rawDate), amount: String(tx.formula || Math.abs(tx.amount)), detail: tx.detail, type: tx.type, createdAt: tx.createdAt });
    setAddVisible(true);
  }

  async function submitDraft() {
    if (!draft.date || !draft.amount || !draft.detail.trim()) {
      Alert.alert("Datos incompletos", "Completa fecha, monto y detalle."); return;
    }
    setLoading(true);
    try {
      if (accessToken && spreadsheetId) {
        if (editingTx) await updateGoogleTransaction(accessToken, spreadsheetId, editingTx.rowId, draft);
        else await saveTransaction(accessToken, spreadsheetId, draft);
        await reloadFromGoogle();
      } else if (editingTx) {
        const updated = buildTransactionFromDraft(draft, editingTx.rowId);
        const next = transactions.map((tx) => (tx.rowId === editingTx.rowId ? updated : tx));
        setTransactions(next); setSummaries(calculateSummaries(next, freqIncome));
      } else {
        const tx = buildTransactionFromDraft(draft, transactions.length + 2);
        const next = [...transactions, tx].sort((a, b) => new Date(a.rawDate).getTime() - new Date(b.rawDate).getTime());
        setTransactions(next.map((item, idx) => ({ ...item, rowId: idx + 2 })));
        setSummaries(calculateSummaries(next, freqIncome));
      }
      setAddVisible(false);
    } catch (error) {
      Alert.alert("Error", error instanceof Error ? error.message : "No se pudo guardar");
    } finally { setLoading(false); }
  }

  async function deleteTx(tx: Transaction) {
    setDeletedTx(tx); setDetailTx(null);
    setSelectedRows((current) => current.filter((rowId) => rowId !== tx.rowId));
    if (accessToken && spreadsheetId) {
      await deleteGoogleTransaction(accessToken, spreadsheetId, tx.rowId);
      await reloadFromGoogle(); return;
    }
    const next = transactions.filter((item) => item.rowId !== tx.rowId).map((item, idx) => ({ ...item, rowId: idx + 2 }));
    setTransactions(next); setSummaries(calculateSummaries(next, freqIncome));
  }

  async function deleteSelectedRows() {
    const selected = transactions.filter((tx) => selectedRows.includes(tx.rowId)).sort((a, b) => b.rowId - a.rowId);
    if (!selected.length) return;
    setDeletedTx(selected[0]); setLoading(true);
    try {
      if (accessToken && spreadsheetId) {
        for (const tx of selected) await deleteGoogleTransaction(accessToken, spreadsheetId, tx.rowId);
        await reloadFromGoogle();
      } else {
        const selectedIds = new Set(selected.map((tx) => tx.rowId));
        const next = transactions.filter((item) => !selectedIds.has(item.rowId)).map((item, idx) => ({ ...item, rowId: idx + 2 }));
        setTransactions(next); setSummaries(calculateSummaries(next, freqIncome));
      }
      setSelectedRows([]);
    } catch (error) {
      Alert.alert("Eliminar", error instanceof Error ? error.message : "No se pudo eliminar la selección.");
    } finally { setLoading(false); }
  }

  function toggleSelection(tx: Transaction) {
    setSelectedRows((current) => current.includes(tx.rowId) ? current.filter((r) => r !== tx.rowId) : [...current, tx.rowId]);
  }

  function handleTransactionPress(tx: Transaction) {
    if (selectedRows.length) { toggleSelection(tx); return; }
    setDetailTx(tx);
  }

  async function moveTx(tx: Transaction, direction: "up" | "down") {
    setLoading(true);
    try {
      if (accessToken && spreadsheetId) {
        await moveGoogleTransaction(accessToken, spreadsheetId, tx.rowId, direction);
        await reloadFromGoogle(); return;
      }
      const index = transactions.findIndex((item) => item.rowId === tx.rowId);
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (index < 0 || targetIndex < 0 || targetIndex >= transactions.length) return;
      const next = [...transactions];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      setTransactions(next.map((item, idx) => ({ ...item, rowId: idx + 2 })));
    } catch (error) {
      Alert.alert("Mover registro", error instanceof Error ? error.message : "No se pudo mover el registro.");
    } finally { setLoading(false); }
  }

  function openMoveMenu(tx: Transaction) {
    setPicker({
      title: "Mover registro", selectedValue: "",
      options: [
        { label: "Subir una posición", value: "up", icon: "arrow-up", tone: colors.blue },
        { label: "Bajar una posición", value: "down", icon: "arrow-down", tone: colors.yellow },
      ],
      onSelect: (direction: string) => moveTx(tx, direction as "up" | "down"),
    });
  }

  async function undoDelete() {
    if (!deletedTx) return;
    const next = [...transactions, deletedTx].sort((a, b) => new Date(a.rawDate).getTime() - new Date(b.rawDate).getTime());
    setTransactions(next.map((item, idx) => ({ ...item, rowId: idx + 2 })));
    setSummaries(calculateSummaries(next, freqIncome));
    setDeletedTx(null);
  }

  async function saveFreqIncome() {
    const amount = Number(freqInput);
    if (!Number.isFinite(amount) || amount < 0) { Alert.alert("Monto inválido", "Ingresa un monto válido."); return; }
    const key = `${MONTH_NAMES[month]} ${year}`;
    if (accessToken && spreadsheetId) await updateGoogleFreqIncome(accessToken, spreadsheetId, key, amount);
    const nextFreq = { ...freqIncome, [key]: amount };
    setFreqIncome(nextFreq);
    setSummaries(calculateSummaries(transactions, nextFreq));
    setFreqVisible(false);
  }

  async function exportRows(cfg: ExportConfig) {
    let rows: Transaction[];
    if (cfg.rangeMode === "dates") {
      const from = cfg.startDate ? new Date(cfg.startDate + "T00:00:00").getTime() : 0;
      const to = cfg.endDate ? new Date(cfg.endDate + "T23:59:59").getTime() : Infinity;
      rows = transactions.filter((tx) => { const t = new Date(tx.rawDate).getTime(); return t >= from && t <= to; });
    } else {
      rows = transactions.filter((tx) => {
        const d = new Date(tx.rawDate);
        const txYM = d.getFullYear() * 12 + d.getMonth();
        const fromYM = cfg.startDate ? (new Date(cfg.startDate + "-01").getFullYear() * 12 + new Date(cfg.startDate + "-01").getMonth()) : 0;
        const toYM = cfg.endDate ? (new Date(cfg.endDate + "-01").getFullYear() * 12 + new Date(cfg.endDate + "-01").getMonth()) : Infinity;
        return txYM >= fromYM && txYM <= toYM;
      });
    }
    if (!rows.length) { Alert.alert("Exportar", "No hay datos para exportar."); return; }
    if (cfg.format === "xlsx") {
      const csv = ["Fecha,Monto,Detalle,Tipo,Hora de creacion"]
        .concat(rows.map((tx) => `${tx.date},${tx.amount},"${tx.detail.replace(/"/g, '""')}",${tx.type},${formatCreatedTime(tx.createdAt)}`))
        .join("\n");
      const uri = `${FileSystem.cacheDirectory}bucks-manager.csv`;
      await FileSystem.writeAsStringAsync(uri, csv);
      await Sharing.shareAsync(uri, { mimeType: "text/csv", dialogTitle: "Exportar movimientos" });
    } else {
      const html = `<html><body><h1>Bucks Manager</h1><table border="1" cellspacing="0" cellpadding="6">${rows
        .map((tx) => `<tr><td>${tx.date}</td><td>${formatMoney(tx.amount)}</td><td>${tx.detail}</td><td>${tx.type}</td><td>${formatCreatedTime(tx.createdAt)}</td></tr>`)
        .join("")}</table></body></html>`;
      const pdf = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(pdf.uri, { mimeType: "application/pdf", dialogTitle: "Exportar PDF" });
    }
  }

  // --- Render ---
  if (bootstrapping) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
        <StatusBar style={theme === "dark" ? "light" : "dark"} />
        <SkeletonScreen colors={colors} />
      </SafeAreaView>
    );
  }

  if (!accessToken) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
        <StatusBar style={theme === "dark" ? "light" : "dark"} />
        <LoginScreen colors={colors} loading={loading} canConnect={Boolean(GOOGLE_ANDROID_CLIENT_ID || GOOGLE_WEB_CLIENT_ID)} onSignIn={signInWithGoogle} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      <StatusBar style={theme === "dark" ? "light" : "dark"} />
      <View style={[styles.shell, styles.shellCompact, { backgroundColor: colors.bg, paddingTop: statusBarInset + 6 }]}>
        <View style={[styles.content, { width: "100%", position: "relative" }]}>
          <View style={{ paddingTop: tab === "expenses" ? 154 : 62, flex: 1 }}>
            {loading && (
              <View style={styles.loadingBar}>
                <ActivityIndicator color={colors.primary} />
                <Text style={{ color: colors.muted }}>Sincronizando...</Text>
              </View>
            )}
            {tab === "expenses" ? (
              <ExpensesView
                colors={colors} summary={currentSummary} transactions={visibleTransactions}
                searchActive={searchActive} searchText={searchFilters.text} selectedRows={selectedRows}
                onEditFreq={() => { setFreqInput(String(currentSummary.freqIncome || 0)); setFreqVisible(true); }}
                onExitSearch={() => setSearchActive(false)}
                onOpenDetail={handleTransactionPress} onEdit={openEdit}
                onDeleteSelected={deleteSelectedRows} onMove={openMoveMenu}
                onToggleSelection={toggleSelection}
                onLoadOlder={() => setLoadedMonthCount((c) => c + 1)}
              />
            ) : tab === "search" ? (
              <SearchPage colors={colors} filters={searchFilters} setFilters={setSearchFilters}
                onSubmit={() => { setSearchActive(true); setTab("expenses"); setSelectedRows([]); }}
                onClear={() => { setSearchFilters(emptySearch); setSearchActive(false); }}
              />
            ) : tab === "summary" ? (
              <SummaryView colors={colors} summaries={summaries} transactions={transactions} freqIncome={freqIncome} compact={compact} availableYears={availableYears} />
            ) : (
              <SettingsView colors={colors} theme={theme} setTheme={setTheme} accountInfo={accountInfo}
                onRescan={rescanDrive} onSwitch={switchGoogleAccount} onDisconnect={disconnectGoogle} onOpenExport={() => setExportVisible(true)}
              />
            )}
          </View>

          <View style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 20 }}>
            <View style={{ position: "absolute", top: 0, left: 0, right: 0, height: tab === "expenses" ? 154 : 62, backgroundColor: `${colors.bg}0a` }} />
            <View style={{ position: "absolute", top: 0, left: 0, right: 0, height: 28, pointerEvents: "none" }}>
              {[0.45, 0.2, 0.06, 0].map((opacity, i) => (
                <View key={i} style={{ flex: 1, backgroundColor: `${colors.bg}${Math.round(opacity * 255).toString(16).padStart(2, "0")}` }} />
              ))}
            </View>
            <View>
              <View style={[styles.topBar, styles.topBarMobile, { backgroundColor: "transparent" }]}>
                <View style={styles.headerLeft}>
                  <View style={[styles.headerLogo, { backgroundColor: colors.primary }]}>
                    <MaterialCommunityIcons name="sack" size={19} color={colors.onPrimary} />
                  </View>
                  <View style={styles.titleBlock}>
                    <Text numberOfLines={1} style={[styles.pageTitle, styles.pageTitleMobile, { color: colors.text }]}>{pageTitle}</Text>
                    {!!pageSubtitle && <Text numberOfLines={1} style={[styles.pageSub, styles.pageSubMobile, { color: colors.muted }]}>{pageSubtitle}</Text>}
                  </View>
                </View>
              </View>
              {tab === "expenses" && (
                <PeriodControls colors={colors} year={year} month={month} availableYears={availableYears}
                  onSelectPeriod={selectPeriod} goToday={() => { const today = new Date(); selectPeriod(today.getMonth(), today.getFullYear()); }}
                />
              )}
            </View>
          </View>
        </View>

        {deletedTx && (
          <TouchableOpacity style={[styles.undoFab, compact && { left: 18 }, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={undoDelete}>
            <MaterialCommunityIcons name="undo" size={20} color={colors.blue} />
            <Text style={{ color: colors.text, fontWeight: "800" }}>Deshacer</Text>
          </TouchableOpacity>
        )}
        <BottomNav colors={colors} tab={tab} setTab={setTab} onAdd={() => openAdd()} />
      </View>

      <TransactionModal visible={addVisible} colors={colors} draft={draft} setDraft={setDraft}
        editing={!!editingTx} openPicker={setPicker} onClose={() => setAddVisible(false)} onSubmit={submitDraft} />
      <FreqIncomeModal visible={freqVisible} colors={colors} value={freqInput} setValue={setFreqInput}
        onClose={() => setFreqVisible(false)} onSubmit={saveFreqIncome} />
      <DetailModal tx={detailTx} colors={colors} onClose={() => setDetailTx(null)} onEdit={openEdit} onDelete={deleteTx} />
      <SheetChooserModal visible={sheetCandidates.length > 1} colors={colors} candidates={sheetCandidates}
        onClose={() => setSheetCandidates([])} onSelect={(c) => selectSpreadsheet(accessToken, c.id, c.name)} />
      <OptionSheet config={picker} colors={colors} onClose={() => setPicker(null)} />
      <ExportModal visible={exportVisible} colors={colors} config={exportConfig} setConfig={setExportConfig}
        minDate={transactions.length ? transactions.reduce((earliest, tx) => tx.rawDate < earliest ? tx.rawDate : earliest, transactions[0].rawDate).slice(0, 10) : ""}
        onClose={() => setExportVisible(false)} onExport={(cfg: ExportConfig) => { setExportVisible(false); exportRows(cfg); }} />
    </SafeAreaView>
  );
}
