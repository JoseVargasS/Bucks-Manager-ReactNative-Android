import assert from "node:assert/strict";
import { test } from "node:test";
import { secureStoreMock } from "./setup.mjs";

const emptyFin = {
  applyFinancialState: () => {},
  persistFinancialState: () => {},
  hasLocalDataRef: { current: false },
  freqIncomeRef: { current: {} },
  transactions: [],
};

const emptyTags = { tagsList: [], setTagsList: () => {} };

const emptyHelpers = {
  errMsg: (e) => String(e),
  authErr: () => false,
  copy: {
    syncError: "", sessionExpired: "",
    showingSavedData: "", pendingSyncStatus: "", syncing: "",
    deleteRecord: "", deleteSelection: "", moveRecord: "", moveRecordError: "", undoAction: "",
  },
  tagColors: ["#f43f5e"],
};

test("reloadFromGoogle returns early when token is empty", async () => {
  const { useGoogleSync } = await import("../src/hooks/useGoogleSync.ts");
  const api = useGoogleSync(
    { accessToken: "", setAccessToken: () => {}, spreadsheetId: "", setSpreadsheetId: () => {},
      setLoading: () => {}, setIsSyncing: () => {}, setSyncError: () => {}, setAuthError: () => {},
      setPendingSync: () => {}, setIsFirstRemoteLoad: () => {}, setRehydratingCache: () => {},
      getWorkspaceAccessToken: async () => ({ accessToken: "" }), syncAccountInfo: () => {},
      teardownSession: () => {}, disconnectGoogle: async () => {}, resetFinancialState: () => {},
      pendingSyncRef: { current: false } },
    emptyFin, emptyTags, emptyHelpers, { current: null },
  );

  const result = await api.reloadFromGoogle("", "");
  assert.equal(result, undefined);
});

test("reloadFromGoogle returns early when pendingSync is true", async () => {
  const { useGoogleSync } = await import("../src/hooks/useGoogleSync.ts");
  const api = useGoogleSync(
    { accessToken: "", setAccessToken: () => {}, spreadsheetId: "", setSpreadsheetId: () => {},
      setLoading: () => {}, setIsSyncing: () => {}, setSyncError: () => {}, setAuthError: () => {},
      setPendingSync: () => {}, setIsFirstRemoteLoad: () => {}, setRehydratingCache: () => {},
      getWorkspaceAccessToken: async () => ({ accessToken: "" }), syncAccountInfo: () => {},
      teardownSession: () => {}, disconnectGoogle: async () => {}, resetFinancialState: () => {},
      pendingSyncRef: { current: true } },
    emptyFin, emptyTags, emptyHelpers, { current: null },
  );

  const result = await api.reloadFromGoogle("t", "s", false);
  assert.equal(result, undefined);
});
