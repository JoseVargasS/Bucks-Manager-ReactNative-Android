import { useRef, useState } from "react";
import { Alert } from "react-native";
import Constants from "expo-constants";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { deleteItemAsync, getItemAsync, setItemAsync } from "expo-secure-store";
import { getWorkspaceAccessToken as getWorkspaceAccessTokenBase, syncAccountInfo as syncAccountInfoBase } from "@/api/googleAuth";
import { deleteFinancialCache, deleteOfflineCache } from "@/data/localCache";
import { saveConnectedAccount, removeConnectedAccount, loadConnectedAccounts } from "@/data/connectedAccounts";
import { type UiCopy } from "@/i18n";
import { TOKEN_KEY, SHEET_KEY } from "@/theme/constants";

const GOOGLE_ANDROID_CLIENT_ID = Constants.expoConfig?.extra?.googleAndroidClientId || "";
const GOOGLE_WEB_CLIENT_ID = Constants.expoConfig?.extra?.googleWebClientId || "";

export interface SessionApi {
  accessToken: string;
  setAccessToken: (token: string) => void;
  spreadsheetId: string;
  setSpreadsheetId: (id: string) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  accountTransition: boolean;
  setAccountTransition: (v: boolean) => void;
  isSyncing: boolean;
  setIsSyncing: (v: boolean) => void;
  isFirstRemoteLoad: boolean;
  setIsFirstRemoteLoad: (v: boolean) => void;
  syncError: string;
  setSyncError: (e: string) => void;
  authError: string;
  setAuthError: (e: string) => void;
  pendingSync: boolean;
  setPendingSync: (v: boolean) => void;
  accountInfo: { name?: string; email?: string } | null;
  setAccountInfo: (info: { name?: string; email?: string } | null) => void;
  rehydratingCache: boolean;
  setRehydratingCache: (v: boolean) => void;
  canConnect: boolean;
  pendingSyncRef: React.MutableRefObject<boolean>;
  isOffline: boolean;
  setOffline: (v: boolean) => void;
  connectionStatus: string | null;
  setConnectionStatus: (status: string | null) => void;
  runGoogleSignIn: (switchingAccount: boolean) => Promise<void>;
  switchToAccount: (targetEmail: string) => Promise<void>;
  getWorkspaceAccessToken: (useCached: boolean, targetEmail?: string) => Promise<{ accessToken: string | null }>;
  syncAccountInfo: () => void;
  teardownSession: (options?: { clearToken?: boolean; catchErrors?: boolean; clearSheetId?: boolean }) => Promise<void>;
  clearGoogleSession: () => Promise<void>;
  disconnectGoogle: () => Promise<void>;
  removeGoogleAccount: () => Promise<void>;
  resetFinancialState: () => void;
}

export function useSession(
  copy: UiCopy,
  errMsg: (error: unknown) => string,
  onResetFinancial: () => void,
  onConnectGoogleWorkspace: (token: string, sheetId?: string, forceScan?: boolean, wasOffline?: boolean) => Promise<void>,
): SessionApi {
  const [accessToken, setAccessToken] = useState("");
  const [spreadsheetId, setSpreadsheetId] = useState("");
  const [loading, setLoading] = useState(false);
  const [accountTransition, setAccountTransition] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isFirstRemoteLoad, setIsFirstRemoteLoad] = useState(false);
  const [syncError, setSyncError] = useState("");
  const [authError, setAuthError] = useState("");
  const [pendingSync, setPendingSync] = useState(false);
  const [accountInfo, setAccountInfo] = useState<{ name?: string; email?: string } | null>(null);
  const [rehydratingCache, setRehydratingCache] = useState(false);
  const [isOffline, setOffline] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<string | null>(null);
  const pendingSyncRef = useRef(false);

  const canConnect = Boolean(GOOGLE_ANDROID_CLIENT_ID || GOOGLE_WEB_CLIENT_ID);

  function getWorkspaceAccessToken(useCached: boolean, targetEmail?: string) {
    return getWorkspaceAccessTokenBase(useCached, targetEmail);
  }

  function syncAccountInfo() {
    const info = syncAccountInfoBase();
    if (info) setAccountInfo(info);
  }

  async function teardownSession(options: { clearToken?: boolean; catchErrors?: boolean; clearSheetId?: boolean } = {}) {
    const { clearToken = true, catchErrors = false, clearSheetId = true } = options;
    try {
      await Promise.all([
        deleteItemAsync(TOKEN_KEY),
        clearSheetId ? deleteItemAsync(SHEET_KEY) : Promise.resolve(),
        deleteFinancialCache(),
        deleteOfflineCache(),
      ]);
    } catch (e) {
      if (!catchErrors) throw e;
    } finally {
      if (clearToken) setAccessToken("");
      onResetFinancial();
      setSpreadsheetId("");
      setAccountInfo(null);
      setSyncError("");
      setAuthError("");
      setPendingSync(false);
      setIsSyncing(false);
      setOffline(true);
      pendingSyncRef.current = false;
    }
  }

  function resetFinancialState() {
    void teardownSession({ clearToken: false });
  }

  async function clearGoogleSession() {
    await teardownSession();
  }

  async function disconnectGoogle() {
    const currentEmail = accountInfo?.email || syncAccountInfoBase()?.email;
    if (currentEmail) void removeConnectedAccount(currentEmail);
    try {
      await GoogleSignin.signOut();
    } catch {
      /* ok */
    }
    await clearGoogleSession();
  }

  async function removeGoogleAccount() {
    const currentEmail = accountInfo?.email || syncAccountInfoBase()?.email;
    if (currentEmail) void removeConnectedAccount(currentEmail);
    setLoading(true);
    setAccountTransition(true);
    try {
      await GoogleSignin.revokeAccess();
    } catch (error) {
      const msg = errMsg(error);
      // No bloquees el borrado local si revoke falla por sesión expirada (última cuenta)
      if (!msg.includes("SIGN_IN_REQUIRED") && !msg.includes("signInSilently")) {
        Alert.alert("Google", msg);
      }
    } finally {
      await clearGoogleSession().catch(() => undefined);
      setLoading(false);
      setAccountTransition(false);
    }
  }

  async function runSwitchCleanup() {
    setAccountTransition(true);
    await Promise.all([deleteItemAsync(SHEET_KEY), deleteFinancialCache(), deleteOfflineCache()]);
    await teardownSession({ clearToken: false });
  }

  async function finalizeSignIn(token: string, wasOffline?: boolean) {
    const savedSheetId = await getItemAsync(SHEET_KEY);
    await setItemAsync(TOKEN_KEY, token);
    setAccessToken(token);
    setIsFirstRemoteLoad(true);
    setSyncError("");
    syncAccountInfo();
    const info = syncAccountInfoBase();
    if (info?.email) {
      void saveConnectedAccount({ email: info.email, name: info.name, lastUsedAt: new Date().toISOString() });
    }
    await onConnectGoogleWorkspace(token, savedSheetId || "", !savedSheetId, wasOffline);
  }

  async function runGoogleSignIn(switchingAccount: boolean) {
    if (!GOOGLE_ANDROID_CLIENT_ID && !GOOGLE_WEB_CLIENT_ID) {
      Alert.alert(copy.googleOAuth, copy.missingEnvCredentials);
      return;
    }
    if (loading) return;
    setLoading(true);
    setConnectionStatus("scanning");
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      if (switchingAccount) await GoogleSignin.signOut();
      const response = await GoogleSignin.signIn();
      if (response.type !== "success") { setConnectionStatus(null); return; }
      const tokens = await getWorkspaceAccessToken(true);
      if (!tokens.accessToken) throw new Error(copy.googleSignInError);
      const wasOfflineBefore = isOffline;
      if (switchingAccount) await runSwitchCleanup();
      await finalizeSignIn(tokens.accessToken, wasOfflineBefore);
    } catch (error) {
      setConnectionStatus(null);
      const message = error instanceof Error ? error.message : copy.googleSignInError;
      const isDeveloperError = message.includes("DEVELOPER_ERROR") || message.includes("code: 10");
      Alert.alert("Google", isDeveloperError ? copy.oauthConfigRejected : message);
    } finally {
      setLoading(false);
      setIsFirstRemoteLoad(false);
      setAccountTransition(false);
    }
  }

  // Switch directo sin picker para cuentas ya conectadas (usa accountName hint + silent)
  async function switchToAccount(targetEmail: string) {
    const current = (accountInfo?.email || syncAccountInfoBase()?.email || "").toLowerCase();
    if (!targetEmail || targetEmail.toLowerCase() === current) return;
    if (loading) return;
    setLoading(true);
    setAccountTransition(true);
    setConnectionStatus("loading");
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const accounts = await loadConnectedAccounts();
      const target = accounts.find((a) => a.email.toLowerCase() === targetEmail.toLowerCase());
      let preferredSheetId = target?.spreadsheetId || "";
      // Fast path: si la cuenta ya tiene token y Drive, entra directo sin Google UI ni picker
      if (target?.accessToken && target?.scopesGranted && target?.spreadsheetId) {
        try {
          await runSwitchCleanup();
          await setItemAsync(TOKEN_KEY, target.accessToken);
          setAccessToken(target.accessToken);
          setAccountInfo({ name: target.name, email: target.email });
          setIsFirstRemoteLoad(true);
          setSyncError("");
          await onConnectGoogleWorkspace(target.accessToken, target.spreadsheetId, false, false);
          void saveConnectedAccount({ email: target.email, lastUsedAt: new Date().toISOString() });
          return;
        } catch (_e) { void _e;
          // Token cacheado vencido — limpia y cae al flujo con Google
          void saveConnectedAccount({ email: target.email, lastUsedAt: new Date().toISOString(), accessToken: undefined });
          await clearGoogleSession().catch(() => undefined);
          setAccountTransition(true);
          setConnectionStatus("loading");
        }
      }
      // Intenta silent primero si la cuenta ya tenía Drive (sin popup)
      const alreadyGranted = !!target?.scopesGranted;
      let token: string | null = null;
      let silentOk = false;
      let effectiveEmail = targetEmail;
      try {
        const silent = await GoogleSignin.signInSilently();
        const silentEmail = (silent.type === "success" ? ((silent.data as unknown as { user?: { email?: string }; email?: string })?.user?.email || (silent.data as unknown as { email?: string })?.email || "") : "").toLowerCase();
        if (silent.type === "success" && silentEmail === targetEmail.toLowerCase()) {
          try {
            const tokens = await getWorkspaceAccessToken(alreadyGranted ? false : true, targetEmail);
            if (tokens.accessToken) {
              token = tokens.accessToken;
              silentOk = true;
            }
          } catch (_e) {
            if (alreadyGranted) {
              const tokens = await getWorkspaceAccessToken(true, targetEmail);
              if (tokens.accessToken) {
                token = tokens.accessToken;
                silentOk = true;
              }
            } else {
              throw _e;
            }
          }
        }
      } catch (_e) { void _e; }
      if (!silentOk) {
        // Fallback: picker real (como el banner) — más confiable que accountName hint
        await GoogleSignin.signOut().catch(() => undefined);
        // Limpia hint previo para no confundir al SDK
        try { GoogleSignin.configure(); } catch (_e) { void _e; }
        const response = await GoogleSignin.signIn();
        if (response.type !== "success") { setConnectionStatus(null); return; }
        const signedEmail = ((response.data as unknown as { user?: { email?: string }; email?: string })?.user?.email || (response.data as unknown as { email?: string })?.email || targetEmail) as string;
        effectiveEmail = signedEmail || targetEmail;
        const tokens = await getWorkspaceAccessToken(true, effectiveEmail);
        if (!tokens.accessToken) throw new Error(copy.googleSignInError);
        token = tokens.accessToken;
        // Si el usuario eligió otra cuenta distinta a la que tocó, usa su hoja
        const picked = accounts.find((a) => a.email.toLowerCase() === effectiveEmail.toLowerCase());
        if (picked?.spreadsheetId) {
          preferredSheetId = picked.spreadsheetId;
        }
      }
      if (!token) throw new Error(copy.googleSignInError);
      await runSwitchCleanup();
      // Usa el sheetId guardado para este email si existe, evita rescan Drive
      await setItemAsync(TOKEN_KEY, token);
      setAccessToken(token);
      setIsFirstRemoteLoad(true);
      setSyncError("");
      syncAccountInfo();
      const info = syncAccountInfoBase();
      if (info?.email) {
        void saveConnectedAccount({ email: info.email, name: info.name, lastUsedAt: new Date().toISOString(), spreadsheetId: preferredSheetId || undefined, scopesGranted: true });
      }
      await onConnectGoogleWorkspace(token, preferredSheetId, !preferredSheetId, false);
    } catch (error) {
      setConnectionStatus(null);
      const message = error instanceof Error ? error.message : copy.googleSignInError;
      Alert.alert("Google", message);
    } finally {
      setLoading(false);
      setIsFirstRemoteLoad(false);
      setAccountTransition(false);
      try { GoogleSignin.configure(); } catch (_e) { void _e; }
    }
  }

  return {
    accessToken, setAccessToken,
    spreadsheetId, setSpreadsheetId,
    loading, setLoading,
    accountTransition, setAccountTransition,
    isSyncing, setIsSyncing,
    isFirstRemoteLoad, setIsFirstRemoteLoad,
    syncError, setSyncError,
    authError, setAuthError,
    pendingSync, setPendingSync,
    accountInfo, setAccountInfo,
    rehydratingCache, setRehydratingCache,
    canConnect,
    pendingSyncRef,
    isOffline, setOffline,
    connectionStatus, setConnectionStatus,
    runGoogleSignIn,
    switchToAccount,
    getWorkspaceAccessToken,
    syncAccountInfo,
    teardownSession,
    clearGoogleSession,
    disconnectGoogle,
    removeGoogleAccount,
    resetFinancialState,
  };
}
