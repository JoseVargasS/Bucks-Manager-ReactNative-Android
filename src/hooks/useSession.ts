import { useRef, useState } from "react";
import { Alert } from "react-native";
import Constants from "expo-constants";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { deleteItemAsync, getItemAsync, setItemAsync } from "expo-secure-store";
import { getWorkspaceAccessToken as getWorkspaceAccessTokenBase, syncAccountInfo as syncAccountInfoBase } from "@/api/googleAuth";
import { deleteFinancialCache } from "@/data/localCache";
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
  getWorkspaceAccessToken: (useCached: boolean) => Promise<{ accessToken: string | null }>;
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
  onConnectGoogleWorkspace: (token: string, sheetId?: string, forceScan?: boolean) => Promise<void>,
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

  function getWorkspaceAccessToken(useCached: boolean) {
    return getWorkspaceAccessTokenBase(useCached);
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
    try {
      await GoogleSignin.signOut();
    } catch {
      /* ok */
    }
    await clearGoogleSession();
  }

  async function removeGoogleAccount() {
    setLoading(true);
    setAccountTransition(true);
    try {
      await GoogleSignin.revokeAccess();
      await clearGoogleSession();
    } catch (error) {
      Alert.alert("Google", errMsg(error));
    } finally {
      setLoading(false);
      setAccountTransition(false);
    }
  }

  async function runSwitchCleanup() {
    setAccountTransition(true);
    await Promise.all([deleteItemAsync(SHEET_KEY), deleteFinancialCache()]);
    void teardownSession({ clearToken: false });
  }

  async function finalizeSignIn(token: string) {
    const savedSheetId = await getItemAsync(SHEET_KEY);
    await setItemAsync(TOKEN_KEY, token);
    setAccessToken(token);
    setIsFirstRemoteLoad(true);
    setSyncError("");
    syncAccountInfo();
    await onConnectGoogleWorkspace(token, savedSheetId || "", !savedSheetId);
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
      if (switchingAccount) await runSwitchCleanup();
      await finalizeSignIn(tokens.accessToken);
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
    getWorkspaceAccessToken,
    syncAccountInfo,
    teardownSession,
    clearGoogleSession,
    disconnectGoogle,
    removeGoogleAccount,
    resetFinancialState,
  };
}
