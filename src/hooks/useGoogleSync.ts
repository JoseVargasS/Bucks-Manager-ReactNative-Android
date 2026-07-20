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
} from "@/api/googleWorkspace";
import { readHistory, writeHistory as writeHistoryApi } from "@/api/historyOps";
import { calculateSummaries, SHEET_NAMES } from "@/domain/bucksLogic";
import { loadFinancialCache, deleteFinancialCache, loadOfflineCache } from "@/data/localCache";
import { mergeTagsFromSheet, saveTags } from "@/utils/tags";
import { TOKEN_KEY, SHEET_KEY } from "@/theme/constants";
import type { LanguageMode, Tag, Transaction, SummaryRow, HistoryEntry } from "@/types";
import type { UiPreferencesSnapshot } from "@/hooks/usePreferences";
import type { SessionApi } from "./useSession";
import {
  handleOfflineAfterConnect,
  type OfflineConnectDeps,
} from "./connectFlow";

// ponytail: module-level promise chain serializes every Sheets mutation so a
// fast edit cannot race with the reconcile read of an earlier edit.
export const syncQueueRef = { current: Promise.resolve() };

export interface GoogleSyncApi {
  restoreSession: () => Promise<void>;
  refreshStoredSession: (token: string, sheetId: string, hadCache: boolean) => Promise<void>;
  reloadFromGoogle: (token?: string, sheetId?: string, showLoader?: boolean, forceFresh?: boolean) => Promise<void>;
  syncGoogleInBackground: (task: (freshToken: string) => Promise<void>, title: string) => void;
  connectGoogleWorkspace: (token: string, preferredSheetId?: string, forceScan?: boolean) => Promise<void>;
  selectSpreadsheet: (token: string, sheetId: string, showLoader?: boolean) => Promise<void>;
  writeUiPreferences: (snapshot: UiPreferencesSnapshot) => void;
  wireRemoteUiPreferences: (apply: (prefs: UiPreferencesSnapshot) => void) => void;
  writeHistory: (entries: HistoryEntry[]) => void;
  wireRemoteHistory: (apply: (entries: HistoryEntry[]) => void) => void;
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
  const tagsListRef = useRef(tagsList);
  tagsListRef.current = tagsList;
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
      const mergedTags = mergeTagsFromSheet(tagsListRef.current, sheetTags, tx, tagColors, language);
      if (mergedTags !== tagsListRef.current) {
        saveTags(mergedTags).catch(() => undefined);
        setTagsList(mergedTags);
      }
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

  const connectDeps: OfflineConnectDeps = {
    syncQueueRef,
    setPendingSync,
    pendingSyncRef,
    reloadFromGoogle,
  };

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
      void handleOfflineAfterConnect(
        offlineTxs,
        isNewSheet,
        connectedSheetId,
        fin,
        { tagsListRef, setTagsList },
        { tagColors, language },
        connectDeps,
        { setConnectionStatus, setOffline: session.setOffline },
        mergePromptRef,
        { current: { count: lastRemoteTxCountRef.current, txs: lastRemoteTxsRef.current } },
      );
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
