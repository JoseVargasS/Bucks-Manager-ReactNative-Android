jest.mock("react-native", () => ({
  Alert: { alert: jest.fn() },
}));

jest.mock("expo-constants", () => ({
  default: { expoConfig: { extra: {} } },
}));

import { renderHook, act } from "@testing-library/react-native";
import { useSession } from "@/hooks/useSession";

const g = globalThis as any;
const secureStore = g.__bucksSecureStoreMock;
const googleMock = g.__bucksGoogleSigninMock;

const TOKEN_KEY = "bucks_google_access_token";
const SHEET_KEY = "bucks_spreadsheet_id";
const SCOPES = "https://www.googleapis.com/auth/drive.metadata.readonly https://www.googleapis.com/auth/spreadsheets";

const copy = { googleSignInError: "ERR_SIGNIN" } as any;
const errMsg = (e: unknown) => (e instanceof Error ? e.message : "ERR");

function seedStore(token: string | null, sheetId: string | null) {
  if (token) secureStore.values.set(TOKEN_KEY, token);
  if (sheetId) secureStore.values.set(SHEET_KEY, sheetId);
}

function seedAccount(account: Record<string, unknown>) {
  secureStore.values.set("bucks_connected_accounts", JSON.stringify([account]));
}

function tokeninfoAlive() {
  g.__testFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    ({ ok: true, json: async () => ({ scope: SCOPES }) }) as any) as any;
}

function tokeninfoDead() {
  g.__testFetch = globalThis.fetch;
  globalThis.fetch = (async () => ({ ok: false, json: async () => ({}) }) as any) as any;
}

function restoreFetch() {
  if (g.__testFetch) globalThis.fetch = g.__testFetch;
  g.__testFetch = undefined;
}

beforeEach(() => {
  secureStore.reset();
  restoreFetch();
  googleMock.getTokens = async () => ({ accessToken: "mock-token", idToken: "mock-id" });
  googleMock.signIn = async () => ({ data: null });
  googleMock.signInSilently = async () => {
    throw new Error("SIGN_IN_REQUIRED");
  };
  googleMock.signOut = async () => {};
  googleMock.hasPlayServices = async () => {};
  googleMock.getCurrentUser = () => null;
  googleMock.addScopes = async () => ({});
  googleMock.configure = () => {};
});

afterEach(() => {
  restoreFetch();
});

async function setupHook(onConnect: jest.Mock = jest.fn(async () => {})) {
  const onReset = jest.fn();
  const { result } = await renderHook(() => useSession(copy, errMsg, onReset, onConnect));
  return { result, onConnect, onReset };
}

async function loginA(result: any) {
  await act(async () => {
    result.current.setAccessToken("tok-a");
    result.current.setSpreadsheetId("sheet-a");
    result.current.setAccountInfo({ name: "A", email: "a@x.com" });
    result.current.setOffline(false);
  });
  seedStore("tok-a", "sheet-a");
}

describe("switchToAccount", () => {
  test("cuenta vieja (+10 dias) igual intenta en silencio sin picker", async () => {
    tokeninfoDead(); // fast-path no aplica: sin token cacheado
    seedAccount({
      email: "b@x.com",
      name: "B",
      lastUsedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      spreadsheetId: "sheet-b",
      scopesGranted: true,
    });
    googleMock.signInSilently = async () => ({
      type: "success",
      data: { user: { email: "b@x.com" }, scopes: SCOPES.split(" ") },
    });
    googleMock.getCurrentUser = () => ({ scopes: SCOPES.split(" ") });
    googleMock.getTokens = async () => ({ accessToken: "tok-silent-b", idToken: "id-b" });

    const { result, onConnect } = await setupHook();
    await loginA(result);
    const signInSpy = jest.fn(googleMock.signIn);
    googleMock.signIn = signInSpy;

    await act(async () => {
      await result.current.switchToAccount("b@x.com");
    });

    // Sin picker: el silent alcanzó y conectó con la hoja guardada de B.
    expect(signInSpy).not.toHaveBeenCalled();
    expect(onConnect).toHaveBeenCalledWith("tok-silent-b", "sheet-b", false, false);
    expect(secureStore.values.get(TOKEN_KEY)).toBe("tok-silent-b");
    // El token fresco queda persistido para el próximo switch directo.
    const accounts = JSON.parse(secureStore.values.get("bucks_connected_accounts"));
    expect(accounts.find((a: any) => a.email === "b@x.com")?.accessToken).toBe("tok-silent-b");
  });

  test("fast-path fallido restaura la sesión A y sigue al flujo con Google", async () => {
    tokeninfoAlive(); // el token cacheado de B pasa la pre-validación...
    seedAccount({
      email: "b@x.com",
      name: "B",
      lastUsedAt: new Date().toISOString(),
      spreadsheetId: "sheet-b",
      scopesGranted: true,
      accessToken: "tok-b",
    });
    // ...pero el connect de B falla (red caída a mitad del reload).
    const onConnect = jest.fn(async (token: string) => {
      if (token === "tok-b") throw new Error("Network fail");
    });
    googleMock.signIn = async () => ({
      type: "success",
      data: { user: { email: "b@x.com" } },
    });
    googleMock.getCurrentUser = () => ({ scopes: SCOPES.split(" ") });
    googleMock.getTokens = async () => ({ accessToken: "tok-picker-b", idToken: "id-b" });

    const { result } = await setupHook(onConnect);
    await loginA(result);

    await act(async () => {
      await result.current.switchToAccount("b@x.com");
    });

    const calls = onConnect.mock.calls.map((c: any[]) => [c[0], c[1]]);
    // 1) intento B, 2) restore de A, 3) picker B confirma.
    expect(calls[0]).toEqual(["tok-b", "sheet-b"]);
    expect(calls).toContainEqual(["tok-a", "sheet-a"]);
    expect(calls[calls.length - 1]).toEqual(["tok-picker-b", "sheet-b"]);
    expect(secureStore.values.get(TOKEN_KEY)).toBe("tok-picker-b");
  });

  test("picker cancelado conserva la sesión A intacta", async () => {
    tokeninfoDead();
    seedAccount({
      email: "b@x.com",
      name: "B",
      lastUsedAt: new Date().toISOString(),
      spreadsheetId: "sheet-b",
      scopesGranted: true,
    });
    googleMock.signIn = async () => ({ type: "cancelled" });

    const { result, onConnect } = await setupHook();
    await loginA(result);

    await act(async () => {
      await result.current.switchToAccount("b@x.com");
    });

    expect(onConnect).not.toHaveBeenCalled();
    expect(result.current.accessToken).toBe("tok-a");
    expect(result.current.spreadsheetId).toBe("sheet-a");
    expect(secureStore.values.get(TOKEN_KEY)).toBe("tok-a");
    expect(secureStore.values.get(SHEET_KEY)).toBe("sheet-a");
  });

  test("fallback avisa accountName al SDK para entrar sin selector", async () => {
    tokeninfoDead();
    seedAccount({
      email: "b@x.com",
      name: "B",
      lastUsedAt: new Date().toISOString(),
      spreadsheetId: "sheet-b",
      scopesGranted: true,
    });
    const configureSpy = jest.fn();
    googleMock.configure = configureSpy;
    const signInSpy = jest.fn(async () => ({
      type: "success",
      data: { user: { email: "b@x.com" } },
    }));
    googleMock.signIn = signInSpy;
    googleMock.getCurrentUser = () => ({ scopes: SCOPES.split(" ") });
    googleMock.getTokens = async () => ({ accessToken: "tok-hint-b", idToken: "id-b" });

    const { result, onConnect } = await setupHook();
    await loginA(result);

    await act(async () => {
      await result.current.switchToAccount("b@x.com");
    });

    expect(configureSpy).toHaveBeenCalledWith({ accountName: "b@x.com" });
    // El hint va antes del signIn.
    expect(configureSpy.mock.invocationCallOrder[0]).toBeLessThan(
      signInSpy.mock.invocationCallOrder[0],
    );
    expect(onConnect).toHaveBeenCalledWith("tok-hint-b", "sheet-b", false, false);
  });

  test("no hace nada si ya estoy en esa cuenta", async () => {
    const { result, onConnect } = await setupHook();
    await loginA(result);
    await act(async () => {
      await result.current.switchToAccount("a@x.com");
    });
    expect(onConnect).not.toHaveBeenCalled();
  });
});
