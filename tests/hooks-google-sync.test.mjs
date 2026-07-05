import assert from "node:assert/strict";
import { test } from "node:test";
import "./setup.mjs";

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

function json(value, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json" } });
}

function makeSession(overrides = {}) {
  return {
    accessToken: "tok",
    setAccessToken: () => {},
    spreadsheetId: "sheet-1",
    setSpreadsheetId: () => {},
    setLoading: () => {},
    setIsSyncing: () => {},
    setSyncError: () => {},
    setAuthError: () => {},
    setPendingSync: () => {},
    setIsFirstRemoteLoad: () => {},
    setRehydratingCache: () => {},
    getWorkspaceAccessToken: async () => ({ accessToken: "fresh-tok" }),
    syncAccountInfo: () => {},
    teardownSession: () => {},
    disconnectGoogle: async () => {},
    resetFinancialState: () => {},
    pendingSyncRef: { current: false },
    ...overrides,
  };
}

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

test("writeUiPreferences is a no-op when no spreadsheet is selected", async () => {
  const { useGoogleSync } = await import("../src/hooks/useGoogleSync.ts");
  const original = globalThis.fetch;
  let called = false;
  globalThis.fetch = () => {
    called = true;
    return json({});
  };
  try {
    const api = useGoogleSync(
      makeSession({ spreadsheetId: "" }),
      emptyFin, emptyTags, emptyHelpers, { current: null },
    );
    api.writeUiPreferences({
      language: "es",
      currencySymbol: "S/",
      fontPreference: "dmsans",
      colorScheme: "sky",
    });
    // Give the queue a microtask to flush.
    await new Promise((resolve) => setTimeout(resolve, 10));
    assert.equal(called, false, "should not hit the network when spreadsheetId is empty");
  } finally {
    globalThis.fetch = original;
  }
});

test("writeUiPreferences hits L1:L2 with header + JSON when a sheet is selected", async () => {
  const { useGoogleSync } = await import("../src/hooks/useGoogleSync.ts");
  const original = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (input, init = {}) => {
    const url = decodeURIComponent(String(input));
    const body = init.body ? JSON.parse(init.body) : null;
    requests.push({ url, method: init.method || "GET", body });
    return json({});
  };
  try {
    const api = useGoogleSync(
      makeSession({ spreadsheetId: "sheet-xyz" }),
      emptyFin, emptyTags, emptyHelpers, { current: null },
    );
    api.writeUiPreferences({
      language: "en",
      currencySymbol: "$",
      fontPreference: "inter",
      colorScheme: "vulcanico",
    });
    // The queue is async (token refresh → write). Wait for it to drain.
    await new Promise((resolve) => setTimeout(resolve, 30));
    const put = requests.find(({ method }) => method === "PUT");
    assert.ok(put, "should issue a PUT to write UI preferences");
    assert.ok(put.url.includes("MONTHLY SUMMARY!L1:L2"), `expected L1:L2, got ${put.url}`);
    assert.equal(put.body.values[0][0], "UI PREFERENCES");
    const payload = JSON.parse(put.body.values[1][0]);
    assert.equal(payload.colorScheme, "vulcanico");
    assert.equal(payload.language, "en");
    assert.equal(payload.fontPreference, "inter");
    assert.equal(payload.currencySymbol, "$");
    assert.equal(payload.v, 1);
  } finally {
    globalThis.fetch = original;
  }
});

test("writeUiPreferences picks up a fresh spreadsheetId after the session prop changes", async () => {
  const { useGoogleSync } = await import("../src/hooks/useGoogleSync.ts");
  // First render with sheet-old; second render with sheet-new. The
  // returned writeUiPreferences should always use the live spreadsheetId.
  const original = globalThis.fetch;
  const seen = [];
  globalThis.fetch = async (input) => {
    seen.push(decodeURIComponent(String(input)));
    return json({});
  };
  try {
    const session1 = makeSession({ spreadsheetId: "sheet-old" });
    const api1 = useGoogleSync(session1, emptyFin, emptyTags, emptyHelpers, { current: null });
    // Capture the writer while it still targets sheet-old.
    const writerFromFirstRender = api1.writeUiPreferences;
    // Now the hook re-renders against a new session with sheet-new.
    const session2 = makeSession({ spreadsheetId: "sheet-new" });
    const api2 = useGoogleSync(session2, emptyFin, emptyTags, emptyHelpers, { current: null });
    // The fresh writer must use sheet-new.
    api2.writeUiPreferences({
      language: "es",
      currencySymbol: "S/",
      fontPreference: "dmsans",
      colorScheme: "sky",
    });
    await new Promise((resolve) => setTimeout(resolve, 30));
    const lastPut = seen.filter((u) => u.includes("MONTHLY SUMMARY!L1:L2")).pop();
    assert.ok(lastPut && lastPut.includes("sheet-new"),
      `latest write should target sheet-new, got: ${lastPut}`);
    // And the captured writer from the first render is now stale — but
    // it was captured against session1, so calling it now would still
    // target sheet-old. That's a known limitation: the only safe path
    // is to use the writer returned by the current render.
    writerFromFirstRender({
      language: "es",
      currencySymbol: "S/",
      fontPreference: "dmsans",
      colorScheme: "sky",
    });
    await new Promise((resolve) => setTimeout(resolve, 30));
    const puts = seen.filter((u) => u.includes("MONTHLY SUMMARY!L1:L2"));
    const oldPuts = puts.filter((u) => u.includes("sheet-old"));
    assert.ok(oldPuts.length >= 1, "the stale writer should still target sheet-old");
  } finally {
    globalThis.fetch = original;
  }
});
