const g = globalThis as any;

beforeEach(() => {
  g.__bucksGoogleSigninMock.getTokens = async () => ({ accessToken: "mock-token", idToken: "mock-id" });
  g.__bucksGoogleSigninMock.signIn = async () => ({ data: null });
  g.__bucksGoogleSigninMock.getCurrentUser = () => null;
  g.__bucksGoogleSigninMock.addScopes = async () => ({});
});

import { getWorkspaceAccessToken, syncAccountInfo } from "@/api/googleAuth";
import { GoogleSignin } from "@react-native-google-signin/google-signin";

const mockGoogleSignin = GoogleSignin as jest.Mocked<typeof GoogleSignin>;

describe("getWorkspaceAccessToken", () => {
  test("returns tokens when user is already authenticated with scopes", async () => {
    mockGoogleSignin.getCurrentUser = jest.fn().mockReturnValue({
      scopes: [
        "https://www.googleapis.com/auth/drive.metadata.readonly",
        "https://www.googleapis.com/auth/spreadsheets",
      ],
    });
    mockGoogleSignin.getTokens = jest.fn().mockResolvedValue({ accessToken: "tok-123", idToken: "id-123" });

    const result = await getWorkspaceAccessToken(false);
    expect(result.accessToken).toBe("tok-123");
  });

  test("calls signInSilently when no current user", async () => {
    mockGoogleSignin.getCurrentUser = jest.fn().mockReturnValue(null);
    mockGoogleSignin.signInSilently = jest.fn().mockResolvedValue({
      type: "success",
      data: {
        scopes: [
          "https://www.googleapis.com/auth/drive.metadata.readonly",
          "https://www.googleapis.com/auth/spreadsheets",
        ],
      },
    });
    mockGoogleSignin.getTokens = jest.fn().mockResolvedValue({ accessToken: "tok-silent", idToken: "id-silent" });

    const result = await getWorkspaceAccessToken(false);
    expect(result.accessToken).toBe("tok-silent");
  });

  test("adds scopes interactively when missing", async () => {
    mockGoogleSignin.getCurrentUser = jest.fn().mockReturnValue({
      scopes: ["https://www.googleapis.com/auth/drive.metadata.readonly"],
    });
    mockGoogleSignin.addScopes = jest.fn().mockResolvedValue({ type: "success" });
    mockGoogleSignin.getTokens = jest.fn().mockResolvedValue({ accessToken: "tok-scoped", idToken: "id-scoped" });

    const result = await getWorkspaceAccessToken(true);
    expect(result.accessToken).toBe("tok-scoped");
  });

  test("throws when non-interactive and scopes missing", async () => {
    mockGoogleSignin.getCurrentUser = jest.fn().mockReturnValue({
      scopes: [],
    });

    await expect(getWorkspaceAccessToken(false)).rejects.toThrow("Faltan permisos");
  });

  test("throws when addScopes rejected", async () => {
    mockGoogleSignin.getCurrentUser = jest.fn().mockReturnValue({ scopes: [] });
    mockGoogleSignin.addScopes = jest.fn().mockResolvedValue({ type: "error" });

    await expect(getWorkspaceAccessToken(true)).rejects.toThrow("No se autorizaron");
  });
});

describe("syncAccountInfo", () => {
  test("returns name and email from current user", () => {
    mockGoogleSignin.getCurrentUser = jest.fn().mockReturnValue({
      data: { user: { name: "Juan", email: "juan@test.com" } },
    });
    const info = syncAccountInfo();
    expect(info?.name).toBe("Juan");
    expect(info?.email).toBe("juan@test.com");
  });

  test("returns null when no user", () => {
    mockGoogleSignin.getCurrentUser = jest.fn().mockReturnValue(null);
    expect(syncAccountInfo()).toBeNull();
  });

  test("returns null when user data is empty", () => {
    mockGoogleSignin.getCurrentUser = jest.fn().mockReturnValue(undefined);
    expect(syncAccountInfo()).toBeNull();
  });
});
