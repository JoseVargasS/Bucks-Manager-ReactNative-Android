import { Alert } from "react-native";
import { useCallback, useRef } from "react";
import { getItemAsync, setItemAsync, deleteItemAsync } from "expo-secure-store";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { shouldRescanForSheetError } from "@/utils/errorHandler";
import { syncAccountInfo as syncAccountInfoBase } from "@/api/googleAuth";
import {
  isSheetTrashed,
  readTransactions,
  readSummaries,
  readTagsCatalog,
  readUiPreferences,
  writeUiPreferences as writeUiPreferencesApi,
  buildUiPreferences,
} from "@/api/googleWorkspace";
import { readHistory, writeHistory as writeHistoryApi } from "@/api/historyOps";
import { calculateSummaries } from "@/domain/bucksLogic";
import { loadFinancialCache, deleteFinancialCache, loadOfflineCache } from "@/data/localCache";
import { mergeTagsFromSheet, saveTags } from "@/utils/tags";
import { saveConnectedAccount, findAccountBySheet } from "@/data/connectedAccounts";
import { TOKEN_KEY, SHEET_KEY } from "@/theme/constants";
import type { LanguageMode, Tag, Transaction, SummaryRow, HistoryEntry } from "@/types";
import type { UiPreferencesSnapshot } from "@/hooks/usePreferences";
import type { SessionApi } from "./useSession";
import {
  handleOfflineAfterConnect,
  findOrCreateSpreadsheet,
  type OfflineConnectDeps,
} from "@/domain/connectFlow";

// ponytail: module-level promise chain serializes every Sheets mutation so a
// fast edit cannot race with the reconcile read of an earlier edit.
export const syncQueueRef = { current: Promise.resolve() };

// Max time the session restore may wait on network before releasing the splash.
const SESSION_REFRESH_TIMEOUT_MS = 8000;

export interface GoogleSyncApi {
  restoreSession: () => Promise<void>;
  refreshStoredSession: (token: string, sheetId: string, hadCache: boolean) => Promise<void>;
  reloadFromGoogle: (token?: string, sheetId?: string, showLoader?: boolean, forceFresh?: boolean) => Promise<void>;
  syncGoogleInBackground: (task: (freshToken: string) => Promise<void>, title: string) => void;
  refreshSessionToken: () => Promise<string | null>;
  connectGoogleWorkspace: (token: string, preferredSheetId?: string, forceScan?: boolean, wasOffline?: boolean) => Promise<void>;
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
    didSetInitialPeriodRef?: React.MutableRefObject<boolean>;
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
    accountInfo,
    setAccountInfo,
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
  const spreadsheetIdRef = useRef(spreadsheetId);
  spreadsheetIdRef.current = spreadsheetId;

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
        // ponytail: la cache ya se hidrato; libera el splash y revalida en
        // background (la app entra al toque aunque la red este lenta).
        setRehydratingCache(false);
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
    // ponytail: signInSilently/googleFetch cuelgan con red muerta. Se libera el
    // splash tras SESSION_REFRESH_TIMEOUT_MS aunque la revalidacion siga en
    // background (aplica datos remotos cuando la red vuelve).
    const work = (async () => {
      try {
        const fresh = await getWorkspaceAccessToken(false);
        const candidate = fresh.accessToken || token;
        // HALLAZGO 1: el SDK puede estar parado en otra cuenta (el fast switch
        // no pasa por UI). Si el sheet guardado tiene dueño conocido y el token
        // fresco es de otro, no se adopta ni se persiste: se reintenta con el
        // guardado y el catch común deja offline amable o pide login.
        const owner = await findAccountBySheet(sheetId);
        const ownerEmail = (owner?.email || "").toLowerCase();
        const sdkEmail = (syncAccountInfoBase()?.email || "").toLowerCase();
        if (owner && ownerEmail && sdkEmail && sdkEmail !== ownerEmail) {
          await reloadFromGoogle(token, sheetId, false);
          setAuthError("");
          setAccountInfo({ name: owner.name, email: owner.email });
          return;
        }
        activeToken = candidate;
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
            session.setOffline(true);
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
      }
    })();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<void>((resolve) => {
      timer = setTimeout(resolve, SESSION_REFRESH_TIMEOUT_MS);
    });
    try {
      await Promise.race([work.catch(() => undefined), timeout]);
    } finally {
      if (timer) clearTimeout(timer);
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
    const expectedSheetId = sheetId;
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
      // Descarta reload stale si mientras tanto se cambió de cuenta (sheetId ya es otro)
      if (expectedSheetId !== spreadsheetIdRef.current) {
        if (showLoader) setLoading(false);
        setIsSyncing(false);
        setIsFirstRemoteLoad(false);
        reloadPromiseRef.current = null;
        return;
      }
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
            fontSizeScale: sheetUiPreferences.fontSizeScale,
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

  // Token para escrituras: el SDK sigue al último usuario que vio UI de Google,
  // pero el fast switch no pasa por UI — si el SDK quedó en la otra cuenta, el
  // token de sesión manda (si no, cada escritura de fondo da 403 cruzado).
  async function getEffectiveWriteToken(): Promise<string> {
    const appEmail = (accountInfo?.email || "").toLowerCase();
    const sdkEmail = (syncAccountInfoBase()?.email || "").toLowerCase();
    if (appEmail && sdkEmail && sdkEmail !== appEmail) {
      if (!accessToken) throw new Error(copy.sessionExpired);
      return accessToken;
    }
    const tokens = await GoogleSignin.getTokens();
    return tokens.accessToken || accessToken;
  }

  // Token fresco sin UI para el reload de foreground. Nunca lanza: null si no
  // se pudo refrescar (se reintenta con el token en memoria). Si el SDK quedó
  // en la otra cuenta, no se acepta su token (sería 403 seguro).
  async function refreshSessionToken(): Promise<string | null> {
    try {
      const appEmail = (accountInfo?.email || "").toLowerCase();
      const fresh = await getWorkspaceAccessToken(false, appEmail || undefined);
      if (!fresh.accessToken) return null;
      const sdkEmail = (syncAccountInfoBase()?.email || "").toLowerCase();
      if (appEmail && sdkEmail && sdkEmail !== appEmail) return null;
      if (fresh.accessToken !== accessToken) {
        setAccessToken(fresh.accessToken);
        await setItemAsync(TOKEN_KEY, fresh.accessToken).catch(() => undefined);
      }
      return fresh.accessToken;
    } catch {
      return null;
    }
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
        const fresh = await getEffectiveWriteToken();
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
    wasOfflineOverride?: boolean,
  ) {
    setLoading(true);
    setIsSyncing(true);
    // Limpia estado de sync previo para que el reload del nuevo Drive no sea bloqueado
    // y aisla por cuenta: nada de A pasa a B nunca.
    reloadPromiseRef.current = null;
    pendingSyncRef.current = false;
    setPendingSync(false);
    syncQueueRef.current = Promise.resolve();
    lastRemoteTxCountRef.current = 0;
    lastRemoteTxsRef.current = [];
    // Reset autoritativo del periodo antes de cualquier await — evita mes pegado si runSwitchCleanup es lento
    if (fin.didSetInitialPeriodRef) fin.didSetInitialPeriodRef.current = false;
    // Aislamiento por cuenta: limpia tags en memoria (spreadsheetId aún "" → no dispara write al sheet viejo)
    setTagsList([]);
    tagsListRef.current = [];
    const wasOffline = wasOfflineOverride ?? session.isOffline;
    // A→B nunca trae offline: wasOfflineOverride===false fuerza [] aunque txList aún tenga restos de A
    const offlineTxs = wasOfflineOverride === false ? [] : (wasOffline && txList.length > 0 ? [...txList] : []);
    try {
      if (preferredSheetId && !forceScan) {
        try {
          setConnectionStatus("loading");
          await selectSpreadsheet(token, preferredSheetId, false);
          setConnectionStatus(null);
          session.setOffline(false);
          const acc = syncAccountInfoBase();
          if (acc?.email) void saveConnectedAccount({ email: acc.email, name: acc.name, lastUsedAt: new Date().toISOString(), spreadsheetId: preferredSheetId, scopesGranted: true, accessToken: token });
          return;
        } catch (error) {
          if (!shouldRescanForSheetError(error)) throw error;
        }
      }
      setConnectionStatus("scanning");
      const { sheetId, isNewSheet } = await findOrCreateSpreadsheet(token);
      setConnectionStatus("loading");
      await selectSpreadsheet(token, sheetId);
      {
        const acc = syncAccountInfoBase();
        if (acc?.email) void saveConnectedAccount({ email: acc.email, name: acc.name, lastUsedAt: new Date().toISOString(), spreadsheetId: sheetId, scopesGranted: true, accessToken: token });
      }
      void handleOfflineAfterConnect(
        offlineTxs,
        wasOffline,
        isNewSheet,
        sheetId,
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
      // ponytail: el 401/403 se relanza para que el switch caiga al flujo
      // silent/picker en vez de quedarse en sesión rota; el Alert crudo con el
      // JSON de Google nunca se muestra (errMsg lo mapea a "Sesión expirada").
      const friendly = authErr(error) ? copy.sessionExpired : errMsg(error);
      setSyncError(friendly);
      if (authErr(error)) throw new Error(friendly, { cause: error });
      if (!hasLocalDataRef.current)
        Alert.alert("Google Sheets", friendly);
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
    refreshSessionToken,
    connectGoogleWorkspace,
    selectSpreadsheet,
    writeUiPreferences,
    wireRemoteUiPreferences,
    writeHistory,
    wireRemoteHistory,
    wireMergePrompt,
  };
}
