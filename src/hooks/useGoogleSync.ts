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
import { loadFinancialCache, deleteFinancialCache } from "@/data/localCache";
import { mergeTagsFromSheet, saveTags } from "@/utils/tags";
import { TOKEN_KEY, SHEET_KEY } from "@/theme/constants";
import type { Tag, Transaction, SummaryRow, HistoryEntry } from "@/types";
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
  } = session;
  const { applyFinancialState, persistFinancialState, hasLocalDataRef, freqIncomeRef, transactions: txList } = fin;
  const { tagsList, setTagsList } = tags;
  const { errMsg, authErr, copy, tagColors } = helpers;
  const remoteUiPreferencesRef = useRef<((prefs: UiPreferencesSnapshot) => void) | null>(null);
  const remoteHistoryRef = useRef<((entries: HistoryEntry[]) => void) | null>(null);

  async function restoreSession() {
    const [token, sheetId] = await Promise.all([
      getItemAsync(TOKEN_KEY),
      getItemAsync(SHEET_KEY),
    ]);
    if (token && sheetId) {
      setAccessToken(token);
      setSpreadsheetId(sheetId);
      syncAccountInfo();
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
          teardownSession({ catchErrors: true });
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
      const mergedTags = mergeTagsFromSheet(tagsList, sheetTags, tx, tagColors);
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

  async function connectGoogleWorkspace(
    token: string,
    preferredSheetId = "",
    forceScan = false,
  ) {
    setLoading(true);
    setIsSyncing(true);
    try {
      if (preferredSheetId && !forceScan) {
        try {
          await selectSpreadsheet(token, preferredSheetId, false);
          return;
        } catch (error) {
          if (!shouldRescanForSheetError(error)) throw error;
        }
      }
      const candidates = await findCompatibleSheets(token);
      const namedSheet = candidates.find(
        (c) => c.name.trim().toUpperCase() === SHEET_NAMES.transactions,
      );
      if (namedSheet) {
        await selectSpreadsheet(token, namedSheet.id);
        return;
      }
      const sheetId = await createBucksSpreadsheet(token);
      await selectSpreadsheet(token, sheetId);
    } catch (error) {
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
  };
}
