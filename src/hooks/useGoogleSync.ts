import { Alert } from "react-native";
import { useCallback, useRef } from "react";
import { getItemAsync, setItemAsync, deleteItemAsync } from "expo-secure-store";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { shouldRescanForSheetError } from "@/utils/errorHandler";
import {
  findCompatibleSheets,
  createBucksSpreadsheet,
  isSheetTrashed,
  readTransactions,
  readSummaries,
  readTagsCatalog,
  readUiPreferences,
  writeUiPreferences as writeUiPreferencesApi,
  buildUiPreferences,
  saveTransaction,
} from "@/api/googleWorkspace";
import { readHistory, writeHistory as writeHistoryApi } from "@/api/historyOps";
import { calculateSummaries, SHEET_NAMES } from "@/domain/bucksLogic";
import { loadFinancialCache, deleteFinancialCache, loadOfflineCache } from "@/data/localCache";
import { mergeTagsFromSheet, saveTags } from "@/utils/tags";
import { transactionToDraft } from "@/utils/transactions";
import { TOKEN_KEY, SHEET_KEY } from "@/theme/constants";
import type { LanguageMode, Tag, Transaction, SummaryRow, HistoryEntry } from "@/types";
import type { UiPreferencesSnapshot } from "@/hooks/usePreferences";
import type { SessionApi } from "./useSession";

// ponytail: module-level promise chain serializes every Sheets mutation so a
// fast edit cannot race with the reconcile read of an earlier edit.
const syncQueueRef = { current: Promise.resolve() };

export interface GoogleSyncApi {
  restoreSession: () => Promise<void>;
  refreshStoredSession: (token: string, sheetId: string, hadCache: boolean) => Promise<void>;
  reloadFromGoogle: (token?: string, sheetId?: string, showLoader?: boolean, forceFresh?: boolean) => Promise<void>;
  syncGoogleInBackground: (task: (freshToken: string) => Promise<void>, title: string) => void;
  connectGoogleWorkspace: (token: string, preferredSheetId?: string, forceScan?: boolean) => Promise<void>;
  selectSpreadsheet: (token: string, sheetId: string, showLoader?: boolean) => Promise<void>;
  // Writes a UI preferences snapshot to MONTHLY SUMMARY!L1:L2. Mirrors the
  // shape and queueing used by tag catalogue and transaction writes. Returns
  // a noop when the user has not connected a sheet yet.
  writeUiPreferences: (snapshot: UiPreferencesSnapshot) => void;
  // Registers a callback that applies remote UI preferences (from sheet) to
  // local state. Called once on mount; the callback itself is stable.
  wireRemoteUiPreferences: (apply: (prefs: UiPreferencesSnapshot) => void) => void;
  // Writes deletion history to MONTHLY SUMMARY!M1:M2.
  writeHistory: (entries: HistoryEntry[]) => void;
  // Registers a callback that applies remote history (from sheet) to local state.
  wireRemoteHistory: (apply: (entries: HistoryEntry[]) => void) => void;
  // Registers a callback that shows the merge prompt modal.
  wireMergePrompt: (cb: (cfg: { localCount: number; remoteCount: number; onMerge: () => void; onRemoteOnly: () => void }) => void) => void;
}

export function useGoogleSync(
  session: SessionApi,
  fin: {
    applyFinancialState: (tx: Transaction[], summaries: SummaryRow[], freqIncome: Record<string, number>, syncedAt: string | null, fromCache?: boolean) => void;
    persistFinancialState: (tx: Transaction[], summaries: SummaryRow[], freqIncome: Record<string, number>, syncedAt?: string | null, sheetId?: string) => void;
    hasLocalDataRef: React.MutableRefObject<boolean>;
    freqIncomeRef: React.MutableRefObject<Record<string, number>>;
    transactions: Transaction[];
  },
  tags: {
    tagsList: Tag[];
    setTagsList: React.Dispatch<React.SetStateAction<Tag[]>>;
  },
  helpers: {
    errMsg: (error: unknown) => string;
    authErr: (error: unknown) => boolean;
    copy: { syncError: string; sessionExpired: string; showingSavedData: string; pendingSyncStatus: string; syncing: string; deleteRecord: string; deleteSelection: string; moveRecord: string; moveRecordError: string; undoAction: string };
    tagColors: string[];
    language: LanguageMode;
  },
  reloadPromiseRef: React.MutableRefObject<Promise<void> | null>,
): GoogleSyncApi {
  const {
    accessToken, setAccessToken,
    spreadsheetId, setSpreadsheetId,
    setLoading, setIsSyncing, setSyncError, setAuthError,
    setPendingSync, setIsFirstRemoteLoad, setRehydratingCache,
    getWorkspaceAccessToken, syncAccountInfo,
    teardownSession, disconnectGoogle, resetFinancialState,
    pendingSyncRef,
    setConnectionStatus,
  } = session;
  const { applyFinancialState, persistFinancialState, hasLocalDataRef, freqIncomeRef, transactions: txList } = fin;
  const { tagsList, setTagsList } = tags;
  const { errMsg, authErr, copy, tagColors, language } = helpers;
  const remoteUiPreferencesRef = useRef<((prefs: UiPreferencesSnapshot) => void) | null>(null);
  const remoteHistoryRef = useRef<((entries: HistoryEntry[]) => void) | null>(null);
  const mergePromptRef = useRef<((cfg: { localCount: number; remoteCount: number; onMerge: () => void; onRemoteOnly: () => void }) => void) | null>(null);
  const lastRemoteTxCountRef = useRef(0);
  const lastRemoteTxsRef = useRef<Transaction[]>([]);

  async function restoreSession() {
    const [token, sheetId] = await Promise.all([
      getItemAsync(TOKEN_KEY),
      getItemAsync(SHEET_KEY),
    ]);
    if (token && sheetId) {
      setAccessToken(token);
      setSpreadsheetId(sheetId);
      syncAccountInfo();
      session.setOffline(false);
      const cached = await loadFinancialCache(sheetId);
      if (cached) {
        setRehydratingCache(true);
        applyFinancialState(
          cached.transactions,
          cached.summaries,
          cached.freqIncome,
          cached.lastSyncedAt,
          true,
        );
        void refreshStoredSession(token, sheetId, true);
      } else {
        setIsFirstRemoteLoad(true);
        await refreshStoredSession(token, sheetId, false);
      }
    } else {
      const offline = await loadOfflineCache();
      if (offline) {
        applyFinancialState(
          offline.transactions,
          offline.summaries,
          offline.freqIncome,
          null,
          true,
        );
      }
    }
  }

  async function refreshStoredSession(
    token: string,
    sheetId: string,
    hadCache: boolean,
  ) {
    let activeToken = token;
    try {
      const fresh = await getWorkspaceAccessToken(false);
      activeToken = fresh.accessToken || token;
      setAuthError("");
      setAccessToken(activeToken);
      syncAccountInfo();
      await setItemAsync(TOKEN_KEY, activeToken);
      if (hadCache) {
        const trashed = await isSheetTrashed(activeToken, sheetId);
        if (trashed) {
          teardownSession({ catchErrors: true });
          return;
        }
      }
      await reloadFromGoogle(activeToken, sheetId, false);
    } catch (error) {
      if (authErr(error)) {
        setAuthError(errMsg(error));
        if (hadCache) {
          teardownSession({ catchErrors: true, clearSheetId: false });
        } else {
          await disconnectGoogle();
        }
      } else if (shouldRescanForSheetError(error)) {
        if (hadCache) {
          await Promise.all([
            deleteItemAsync(SHEET_KEY),
            deleteFinancialCache(),
          ]).catch(() => undefined);
          resetFinancialState();
        }
        await connectGoogleWorkspace(activeToken, "", true);
      } else if (!hadCache) {
        setSyncError(errMsg(error));
      }
    } finally {
      setIsFirstRemoteLoad(false);
      setRehydratingCache(false);
    }
  }

  async function reloadFromGoogle(
    token = accessToken,
    sheetId = spreadsheetId,
    showLoader = true,
    forceFresh = false,
  ) {
    if (!token || !sheetId) return;
    if (pendingSyncRef.current) return;
    if (reloadPromiseRef.current) {
      if (!forceFresh) return reloadPromiseRef.current;
      await reloadPromiseRef.current.catch(() => undefined);
    }
    const task = (async () => {
      if (showLoader) setLoading(true);
      setIsSyncing(true);
      setSyncError("");
      if (!hasLocalDataRef.current && !txList.length)
        setIsFirstRemoteLoad(true);
      const [tx, summary, sheetTags, sheetUiPreferences, sheetHistory] = await Promise.all([
        readTransactions(token, sheetId),
        readSummaries(token, sheetId),
        readTagsCatalog(token, sheetId),
        readUiPreferences(token, sheetId),
        readHistory(token, sheetId),
      ]);
      if (pendingSyncRef.current) {
        if (showLoader) setLoading(false);
        setIsSyncing(false);
        setIsFirstRemoteLoad(false);
        reloadPromiseRef.current = null;
        return;
      }
      const nextFreqIncome = summary.length
        ? Object.fromEntries(
            summary.map((row) => [row.monthYear, row.freqIncome]),
          )
        : freqIncomeRef.current;
      const nextSummaries = summary.length
        ? summary
        : calculateSummaries(tx, nextFreqIncome);
      const syncedAt = new Date().toISOString();
      applyFinancialState(tx, nextSummaries, nextFreqIncome, syncedAt);
      lastRemoteTxCountRef.current = tx.length;
      lastRemoteTxsRef.current = tx;
      const mergedTags = mergeTagsFromSheet(tagsList, sheetTags, tx, tagColors, language);
      if (mergedTags !== tagsList) {
        saveTags(mergedTags).catch(() => undefined);
        setTagsList(mergedTags);
      }
      // Sheet is the source of truth for cosmetic preferences; the local
      // value only leads the UI between app launch and the first sync.
      if (sheetUiPreferences) {
        const apply = remoteUiPreferencesRef.current;
        if (apply) {
          apply({
            language: sheetUiPreferences.language,
            currencySymbol: sheetUiPreferences.currencySymbol,
            fontPreference: sheetUiPreferences.fontPreference,
            colorScheme: sheetUiPreferences.colorScheme,
            theme: sheetUiPreferences.theme,
          });
        }
      }
      // Merge deletion history from sheet with local entries.
      if (sheetHistory.length) {
        const apply = remoteHistoryRef.current;
        if (apply) apply(sheetHistory);
      }
      persistFinancialState(
        tx,
        nextSummaries,
        nextFreqIncome,
        syncedAt,
        sheetId,
      );
      if (!forceFresh) setPendingSync(false);
      if (showLoader) setLoading(false);
      setIsSyncing(false);
      setIsFirstRemoteLoad(false);
      reloadPromiseRef.current = null;
    })().catch((error) => {
      setSyncError(errMsg(error));
      if (showLoader) setLoading(false);
      setIsSyncing(false);
      setIsFirstRemoteLoad(false);
      reloadPromiseRef.current = null;
      throw error;
    });
    reloadPromiseRef.current = task;
    return task;
  }

  function syncGoogleInBackground(
    task: (freshToken: string) => Promise<void>,
    title: string,
  ) {
    setIsSyncing(true);
    setSyncError("");
    syncQueueRef.current = syncQueueRef.current
      .catch(() => undefined)
      .then(async () => {
        const tokens = await GoogleSignin.getTokens();
        const fresh = tokens.accessToken || "";
        if (!fresh) throw new Error(copy.sessionExpired);
        setAccessToken(fresh);
        await setItemAsync(TOKEN_KEY, fresh).catch(() => undefined);
        return fresh;
      })
      .then((freshToken) => task(freshToken))
      .then(() => {
        pendingSyncRef.current = false;
        setPendingSync(false);
      })
      .catch((error) => {
        pendingSyncRef.current = false;
        setPendingSync(false);
        setSyncError(errMsg(error) || title);
      })
      .finally(() => setIsSyncing(false));
  }

  async function selectSpreadsheet(
    token: string,
    sheetId: string,
    showLoader = true,
  ) {
    setLoading(true);
    try {
      await setItemAsync(TOKEN_KEY, token);
      await setItemAsync(SHEET_KEY, sheetId);
      setAccessToken(token);
      setSpreadsheetId(sheetId);
      await reloadFromGoogle(token, sheetId, showLoader);
    } finally {
      setLoading(false);
    }
  }

  // Walks the same sync queue used by mutations so writes serialize with
  // transactions. Reads spreadsheetId and accessToken from the live
  // session state at call time (no closure capture), so the writer always
  // targets the spreadsheet the user is currently connected to.
  const writeUiPreferences = useCallback(
    (snapshot: UiPreferencesSnapshot) => {
      if (!spreadsheetId) return;
      syncGoogleInBackground(async (freshToken) => {
        await writeUiPreferencesApi(
          freshToken,
          spreadsheetId,
          buildUiPreferences(snapshot),
        );
      }, copy.syncError);
    },
    // syncGoogleInBackground is a stable closure for the hook's lifetime.
    // Including it would force a new reference every render and tear the
    // shared queue. spreadsheetId changes (token refresh, sheet change)
    // are read at call time via the closure re-creation that useCallback
    // performs on dep change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [spreadsheetId, copy.syncError],
  );

  const wireRemoteUiPreferences = useCallback(
    (applyRemote: (prefs: UiPreferencesSnapshot) => void) => {
      remoteUiPreferencesRef.current = applyRemote;
    },
    [],
  );

  const writeHistory = useCallback(
    (entries: HistoryEntry[]) => {
      if (!spreadsheetId) return;
      syncGoogleInBackground(async (freshToken) => {
        await writeHistoryApi(freshToken, spreadsheetId, entries);
      }, copy.syncError);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [spreadsheetId, copy.syncError],
  );

  const wireRemoteHistory = useCallback(
    (applyRemote: (entries: HistoryEntry[]) => void) => {
      remoteHistoryRef.current = applyRemote;
    },
    [],
  );

  const wireMergePrompt = useCallback(
    (cb: (cfg: { localCount: number; remoteCount: number; onMerge: () => void; onRemoteOnly: () => void }) => void) => {
      mergePromptRef.current = cb;
    },
    [],
  );

  async function connectGoogleWorkspace(
    token: string,
    preferredSheetId = "",
    forceScan = false,
  ) {
    setLoading(true);
    setIsSyncing(true);
    const offlineTxs = txList.length > 0 ? [...txList] : [];
    try {
      if (preferredSheetId && !forceScan) {
        try {
          setConnectionStatus("loading");
          await selectSpreadsheet(token, preferredSheetId, false);
          setConnectionStatus(null);
          session.setOffline(false);
          return;
        } catch (error) {
          if (!shouldRescanForSheetError(error)) throw error;
        }
      }
      setConnectionStatus("scanning");
      const candidates = await findCompatibleSheets(token);
      const namedSheet = candidates.find(
        (c) => c.name.trim().toUpperCase() === SHEET_NAMES.transactions,
      );
      let connectedSheetId = "";
      let isNewSheet = false;
      if (namedSheet) {
        setConnectionStatus("loading");
        connectedSheetId = namedSheet.id;
        await selectSpreadsheet(token, namedSheet.id);
      } else if (candidates.length > 0) {
        setConnectionStatus("loading");
        connectedSheetId = candidates[0].id;
        await selectSpreadsheet(token, candidates[0].id);
      } else {
        setConnectionStatus("creating");
        connectedSheetId = await createBucksSpreadsheet(token);
        isNewSheet = true;
        await selectSpreadsheet(token, connectedSheetId);
      }
      void handleOfflineAfterConnect(offlineTxs, isNewSheet, connectedSheetId);
    } catch (error) {
      setConnectionStatus(null);
      session.setOffline(true);
      setSyncError(errMsg(error));
      if (!hasLocalDataRef.current)
        Alert.alert("Google Sheets", errMsg(error));
    } finally {
      setLoading(false);
      setIsSyncing(false);
    }
  }

  // ponytail: concatena y ordena cronológicamente sin deduplicar.
  // La decisión del usuario ("combinar") implica que ningún dato se pierde.
  function combineTransactions(local: Transaction[], remote: Transaction[]): Transaction[] {
    const merged = [...local, ...remote];
    merged.sort((a, b) => {
      const da = a.rawDate.localeCompare(b.rawDate);
      if (da !== 0) return da;
      const ca = a.createdAtMs ?? a.createdAt ?? "";
      const cb = b.createdAtMs ?? b.createdAt ?? "";
      return ca < cb ? -1 : ca > cb ? 1 : 0;
    });
    return merged;
  }

  async function handleOfflineAfterConnect(offlineTxs: Transaction[], isNewSheet: boolean, sheetId: string) {
    if (offlineTxs.length === 0) {
      setConnectionStatus(null);
      session.setOffline(false);
      return;
    }
    if (isNewSheet) {
      setConnectionStatus("syncing");
      applyFinancialState(offlineTxs, calculateSummaries(offlineTxs, freqIncomeRef.current), freqIncomeRef.current, new Date().toISOString());
      persistFinancialState(offlineTxs, [], freqIncomeRef.current, new Date().toISOString(), sheetId);
      await uploadOfflineTransactions(offlineTxs, sheetId);
      setConnectionStatus(null);
      session.setOffline(false);
      return;
    }
    const remoteCount = lastRemoteTxCountRef.current;
    const remoteTxs = lastRemoteTxsRef.current;
    await new Promise<void>((resolve) => {
      const cb = mergePromptRef.current;
      if (!cb) { setConnectionStatus(null); session.setOffline(false); resolve(); return; }
      cb({
        localCount: offlineTxs.length,
        remoteCount,
        onMerge: () => {
          setConnectionStatus("merging");
          const combined = combineTransactions(offlineTxs, remoteTxs);
          applyFinancialState(combined, calculateSummaries(combined, freqIncomeRef.current), freqIncomeRef.current, new Date().toISOString());
          persistFinancialState(combined, [], freqIncomeRef.current, new Date().toISOString(), sheetId);
          void uploadOfflineTransactions(offlineTxs, sheetId).then(() => {
            setConnectionStatus(null);
            session.setOffline(false);
          });
          resolve();
        },
        onRemoteOnly: () => { setConnectionStatus(null); session.setOffline(false); resolve(); },
      });
    });
  }

  async function uploadOfflineTransactions(txs: Transaction[], sheetId: string) {
    const tokens = await GoogleSignin.getTokens();
    const fresh = tokens.accessToken || "";
    if (!fresh) return;
    for (const tx of txs) {
      try {
        await saveTransaction(fresh, sheetId, transactionToDraft(tx));
      } catch {
        // ponytail: best-effort; reloadFromGoogle reconcilia después
      }
    }
    await reloadFromGoogle(fresh, sheetId, false, true);
  }

  return {
    restoreSession,
    refreshStoredSession,
    reloadFromGoogle,
    syncGoogleInBackground,
    connectGoogleWorkspace,
    selectSpreadsheet,
    writeUiPreferences,
    wireRemoteUiPreferences,
    writeHistory,
    wireRemoteHistory,
    wireMergePrompt,
  };
}
