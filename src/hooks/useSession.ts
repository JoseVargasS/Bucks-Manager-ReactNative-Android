import { useRef, useState } from "react";
import { Alert } from "react-native";
import Constants from "expo-constants";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { deleteItemAsync, getItemAsync, setItemAsync } from "expo-secure-store";
import { getWorkspaceAccessToken as getWorkspaceAccessTokenBase, syncAccountInfo as syncAccountInfoBase, isTokenAlive, googleSigninBaseConfig } from "@/api/googleAuth";
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
      void saveConnectedAccount({ email: info.email, name: info.name, lastUsedAt: new Date().toISOString(), accessToken: token, scopesGranted: true });
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
      // ponytail: errMsg mapea 401/403 a "Sesión expirada" — nunca el JSON crudo.
      const message = error instanceof Error ? errMsg(error) : copy.googleSignInError;
      const isDeveloperError = message.includes("DEVELOPER_ERROR") || message.includes("code: 10");
      Alert.alert("Google", isDeveloperError ? copy.oauthConfigRejected : message);
    } finally {
      setLoading(false);
      setIsFirstRemoteLoad(false);
      setAccountTransition(false);
    }
  }

  // Switch directo sin picker para cuentas ya conectadas. Sin puerta de días:
  // siempre se intenta en silencio primero y la vigencia real la decide Google
  // (tokeninfo/silent); solo si eso falla se va al picker. La sesión actual
  // nunca se pierde: si la destino no confirma o cancelan, se restaura A tal cual.
  async function switchToAccount(targetEmail: string) {
    const current = (accountInfo?.email || syncAccountInfoBase()?.email || "").toLowerCase();
    if (!targetEmail || targetEmail.toLowerCase() === current) return;
    if (loading) return;
    setLoading(true);
    setAccountTransition(true);
    setConnectionStatus("loading");
    // Snapshot de A: por si B no confirma, se vuelve sin haber perdido nada.
    const snapshot = { token: accessToken, sheetId: spreadsheetId, info: accountInfo };
    const restoreSessionA = async () => {
      if (!snapshot.token || !snapshot.sheetId) {
        await clearGoogleSession().catch(() => undefined);
        return;
      }
      await setItemAsync(TOKEN_KEY, snapshot.token).catch(() => undefined);
      await setItemAsync(SHEET_KEY, snapshot.sheetId).catch(() => undefined);
      setAccessToken(snapshot.token);
      setSpreadsheetId(snapshot.sheetId);
      if (snapshot.info) setAccountInfo(snapshot.info);
      setSyncError("");
      setOffline(false);
      await onConnectGoogleWorkspace(snapshot.token, snapshot.sheetId, false, false).catch(() => undefined);
    };
    let cleanedForSwitch = false;
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const accounts = await loadConnectedAccounts();
      const target = accounts.find((a) => a.email.toLowerCase() === targetEmail.toLowerCase());
      let preferredSheetId = target?.spreadsheetId || "";
      // Fast path: token cacheado pre-validado con tokeninfo (sin UI ni estado).
      // Si venció se sigue al silent/picker con la sesión de A intacta.
      const cachedToken = target?.accessToken;
      const cachedAlive = !!cachedToken && (await isTokenAlive(cachedToken));
      if (cachedAlive && target?.accessToken && target?.scopesGranted && target?.spreadsheetId) {
        await runSwitchCleanup();
        cleanedForSwitch = true;
        await setItemAsync(TOKEN_KEY, target.accessToken);
        setAccessToken(target.accessToken);
        setAccountInfo({ name: target.name, email: target.email });
        setIsFirstRemoteLoad(true);
        setSyncError("");
        try {
          await onConnectGoogleWorkspace(target.accessToken, target.spreadsheetId, false, false);
          void saveConnectedAccount({ email: target.email, lastUsedAt: new Date().toISOString(), accessToken: target.accessToken });
          return;
        } catch {
          // B no confirmó: restaura A y sigue al flujo con Google sin haber perdido nada.
          void saveConnectedAccount({ email: target.email, lastUsedAt: new Date().toISOString(), accessToken: undefined });
          await restoreSessionA();
          cleanedForSwitch = false;
          setAccountTransition(true);
          setConnectionStatus("loading");
        }
      }
      // Intenta silent primero si la cuenta ya es conocida (sin popup ni puerta
      // de días: si el silencio falla, recién ahí va al picker).
      const alreadyGranted = !!target?.scopesGranted;
      let token: string | null = null;
      let silentOk = false;
      let effectiveEmail = targetEmail;
      if (target) {
        try {
          const silent = await GoogleSignin.signInSilently();
          const silentEmail = (silent.type === "success" ? ((silent.data as unknown as { user?: { email?: string }; email?: string })?.user?.email || (silent.data as unknown as { email?: string })?.email || "") : "").toLowerCase();
          if (silent.type === "success" && silentEmail === targetEmail.toLowerCase()) {
            try {
              const tokens = await getWorkspaceAccessToken(alreadyGranted ? false : true, targetEmail);
              if (tokens.accessToken) {
                token = tokens.accessToken;
                silentOk = true;
                void saveConnectedAccount({ email: targetEmail, lastUsedAt: new Date().toISOString(), accessToken: tokens.accessToken });
              }
            } catch (_e) {
              if (alreadyGranted) {
                const tokens = await getWorkspaceAccessToken(true, targetEmail);
                if (tokens.accessToken) {
                  token = tokens.accessToken;
                  silentOk = true;
                  void saveConnectedAccount({ email: targetEmail, lastUsedAt: new Date().toISOString(), accessToken: tokens.accessToken });
                }
              } else {
                throw _e;
              }
            }
          }
        } catch (_e) { void _e; }
      }
      if (!silentOk) {
        // Fallback con hint: se avisa al SDK qué cuenta se quiere para que
        // entre directo sin mostrar el selector (el permiso ya vive). Si la
        // cuenta no está en el celu o el permiso murió, Google muestra el
        // selector solo como degradación segura.
        await GoogleSignin.signOut().catch(() => undefined);
        try { GoogleSignin.configure({ ...googleSigninBaseConfig(), accountName: targetEmail }); } catch (_e) { void _e; }
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
      cleanedForSwitch = true;
      // Usa el sheetId guardado para este email si existe, evita rescan Drive
      await setItemAsync(TOKEN_KEY, token);
      setAccessToken(token);
      setIsFirstRemoteLoad(true);
      setSyncError("");
      syncAccountInfo();
      const info = syncAccountInfoBase();
      if (info?.email) {
        void saveConnectedAccount({ email: info.email, name: info.name, lastUsedAt: new Date().toISOString(), spreadsheetId: preferredSheetId || undefined, scopesGranted: true, accessToken: token });
      }
      await onConnectGoogleWorkspace(token, preferredSheetId, !preferredSheetId, false);
    } catch (error) {
      setConnectionStatus(null);
      // Si ya se había limpiado para el switch, restaura A antes de avisar.
      if (cleanedForSwitch) await restoreSessionA();
      // ponytail: errMsg mapea 401/403 a "Sesión expirada" — nunca el JSON crudo.
      const message = error instanceof Error ? errMsg(error) : copy.googleSignInError;
      Alert.alert("Google", message);
    } finally {
      setLoading(false);
      setIsFirstRemoteLoad(false);
      setAccountTransition(false);
      try { GoogleSignin.configure({ ...googleSigninBaseConfig() }); } catch (_e) { void _e; }
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
