/**
 * Jest setup: mocks native modules that ALL tests need.
 * React/React Native are NOT mocked here — each test file
 * mocks them as needed (simplified for hook-only tests,
 * real for renderHook tests).
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
const g = globalThis as any;

// ─── Mock state objects (accessible from tests via globalThis) ───

g.__bucksSecureStoreMock = {
  values: new Map<string, string>(),
  getError: null as Error | null,
  setError: null as Error | null,
  deleteError: null as Error | null,
  reset() {
    this.values.clear();
    this.getError = null;
    this.setError = null;
    this.deleteError = null;
  },
  async getItemAsync(key: string) {
    if (this.getError) throw this.getError;
    return this.values.get(key) ?? null;
  },
  async setItemAsync(key: string, value: string) {
    if (this.setError) throw this.setError;
    this.values.set(key, value);
  },
  async deleteItemAsync(key: string) {
    if (this.deleteError) throw this.deleteError;
    this.values.delete(key);
  },
};

g.__bucksFileSystemMock = {
  files: new Map<string, string>(),
  writeError: null as Error | null,
  reset() {
    this.files.clear();
  },
  async getInfoAsync(path: string) {
    return { exists: this.files.has(path) };
  },
  async readAsStringAsync(path: string) {
    if (!this.files.has(path)) throw new Error(`Missing mock file: ${path}`);
    return this.files.get(path);
  },
  async writeAsStringAsync(path: string, value: string) {
    if (this.writeError) throw this.writeError;
    this.files.set(path, value);
  },
  async deleteAsync(path: string) {
    this.files.delete(path);
  },
  async copyAsync({ from, to }: { from: string; to: string }) {
    if (!this.files.has(from)) {
      this.files.set(to, `content-from:${from}`);
    } else {
      this.files.set(to, this.files.get(from)!);
    }
  },
};

g.__bucksAlertMock = { alert: () => {} };
g.__bucksGoogleSigninMock = {
  getTokens: async () => ({ accessToken: "mock-token", idToken: "mock-id" }),
  signIn: async () => ({ data: null }),
  signOut: async () => {},
  hasPreviousSignIn: () => false,
  getCurrentUser: () => null,
  addScopes: async () => {},
  configure: () => {},
};

// ─── Native module mocks (no React dependency) ───

jest.mock("expo-secure-store", () => ({
  getItemAsync: (...args: unknown[]) => g.__bucksSecureStoreMock.getItemAsync(...args),
  setItemAsync: (...args: unknown[]) => g.__bucksSecureStoreMock.setItemAsync(...args),
  deleteItemAsync: (...args: unknown[]) => g.__bucksSecureStoreMock.deleteItemAsync(...args),
}));

jest.mock("expo-file-system/legacy", () => ({
  documentDirectory: "mock://document/",
  cacheDirectory: "mock://cache/",
  getInfoAsync: (...args: unknown[]) => g.__bucksFileSystemMock.getInfoAsync(...args),
  readAsStringAsync: (...args: unknown[]) => g.__bucksFileSystemMock.readAsStringAsync(...args),
  writeAsStringAsync: (...args: unknown[]) => g.__bucksFileSystemMock.writeAsStringAsync(...args),
  deleteAsync: (...args: unknown[]) => g.__bucksFileSystemMock.deleteAsync(...args),
  copyAsync: (...args: unknown[]) => g.__bucksFileSystemMock.copyAsync(...args),
}));

jest.mock("expo-print", () => ({
  printToFileAsync: (...args: unknown[]) => g.__bucksExpoPrintMock?.printToFileAsync?.(...args) ?? { uri: "mock://print.pdf" },
}));

jest.mock("expo-sharing", () => ({
  shareAsync: (...args: unknown[]) => g.__bucksExpoSharingMock?.shareAsync?.(...args) ?? Promise.resolve(),
}));

jest.mock("@expo/vector-icons/MaterialCommunityIcons", () => ({
  default: () => null,
}));

jest.mock("@react-native-google-signin/google-signin", () => ({
  GoogleSignin: {
    getTokens: async () => g.__bucksGoogleSigninMock.getTokens(),
    signIn: async () => g.__bucksGoogleSigninMock.signIn(),
    signOut: async () => g.__bucksGoogleSigninMock.signOut(),
    hasPreviousSignIn: () => g.__bucksGoogleSigninMock.hasPreviousSignIn(),
    getCurrentUser: () => g.__bucksGoogleSigninMock.getCurrentUser(),
    addScopes: async () => g.__bucksGoogleSigninMock.addScopes(),
    configure: () => g.__bucksGoogleSigninMock.configure(),
  },
}));

jest.mock("@/components/modals/ExportModal", () => {
  return jest.requireActual("@/components/modals/ExportConfig");
});
