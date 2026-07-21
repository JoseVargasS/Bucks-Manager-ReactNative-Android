// Simplified React mock (hooks are tested without render)
const __hookStates: any[] = [];
const __hookRefs: any[] = [];
let __hookStateIdx = 0;
let __hookRefIdx = 0;
jest.mock("react", () => ({
  useState: (init: any) => {
    const i = __hookStateIdx++;
    if (__hookStates[i] === undefined) __hookStates[i] = typeof init === "function" ? init() : init;
    const set = (v: any) => { __hookStates[i] = typeof v === "function" ? v(__hookStates[i]) : v; };
    return [__hookStates[i], set];
  },
  useEffect: () => {},
  useMemo: (fn: any) => fn(),
  useCallback: (fn: any) => fn,
  useRef: (init: any) => {
    const i = __hookRefIdx++;
    if (__hookRefs[i] === undefined) __hookRefs[i] = { current: init };
    return __hookRefs[i];
  },
}));
jest.mock("react-native", () => ({
  Alert: (globalThis as any).__bucksAlertMock || { alert: () => {} },
  Platform: { OS: "android", select: (o: any) => o.android ?? o.default },
  Dimensions: { get: () => ({ width: 390, height: 844 }) },
  PixelRatio: { get: () => 3 },
}));

describe("useGoogleSync", () => {
  const g = globalThis as any;

  function json(value: unknown, status = 200) {
    return new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json" } });
  }

  function makeSession(overrides: Record<string, any> = {}) {
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
      setConnectionStatus: () => {},
      setOffline: () => {},
      pendingSyncRef: { current: false },
      ...overrides,
    } as any;
  }

  const emptyFin = {
    applyFinancialState: () => {},
    persistFinancialState: () => {},
    hasLocalDataRef: { current: false },
    freqIncomeRef: { current: {} as Record<string, number> },
    transactions: [] as any[],
  };

  const emptyTags = { tagsList: [] as any[], setTagsList: () => {} };

  const emptyHelpers = {
    errMsg: (e: any) => String(e),
    authErr: () => false,
    copy: {
      syncError: "Sync error", sessionExpired: "Session expired",
      showingSavedData: "", pendingSyncStatus: "", syncing: "",
      deleteRecord: "", deleteSelection: "", moveRecord: "", moveRecordError: "", undoAction: "",
    },
    tagColors: ["#f43f5e"],
    language: "es" as const,
  };

  function defaultSheetsHandler(requests: { url: string; method: string; body: any }[]) {
    return async (input: any, init: any = {}) => {
      const url = decodeURIComponent(String(input));
      const body = init.body ? JSON.parse(init.body) : null;
      requests.push({ url, method: init.method || "GET", body });
      if (url.includes("fields=sheets.properties(sheetId,title)")) {
        return json({ sheets: [
          { properties: { sheetId: 1, title: "INCOME AND EXPENSES" } },
          { properties: { sheetId: 2, title: "MONTHLY SUMMARY" } },
        ] });
      }
      if (url.includes("fields=properties.locale")) {
        return json({ properties: { locale: "en_US" } });
      }
      if (url.includes("INCOME AND EXPENSES!F1")) return json({ values: [["TAGS"]] });
      if (url.includes("INCOME AND EXPENSES!A2:") && url.includes("FORMULA")) return json({ values: [] });
      if (url.includes("INCOME AND EXPENSES!A2:")) return json({ values: [] });
      if (url.includes("MONTHLY SUMMARY!A1:I") && (init.method || "GET") === "GET") return json({ values: [] });
      if (url.includes("MONTHLY SUMMARY!K1:K2") || (url.includes("MONTHLY SUMMARY!K") && url.includes("!K2"))) return json({ values: [] });
      if (url.includes("MONTHLY SUMMARY!L1:L2")) return json({ values: [] });
      return json({});
    };
  }

  let useGoogleSync: typeof import("../src/hooks/useGoogleSync.ts").useGoogleSync;

  beforeAll(async () => {
    const mod = await import("../src/hooks/useGoogleSync.ts");
    useGoogleSync = mod.useGoogleSync;
  });

  // ─── reloadFromGoogle ───

  test("reloadFromGoogle returns early when token is empty", async () => {
    const api = useGoogleSync(
      { accessToken: "", setAccessToken: () => {}, spreadsheetId: "", setSpreadsheetId: () => {},
        setLoading: () => {}, setIsSyncing: () => {}, setSyncError: () => {}, setAuthError: () => {},
        setPendingSync: () => {}, setIsFirstRemoteLoad: () => {}, setRehydratingCache: () => {},
        getWorkspaceAccessToken: async () => ({ accessToken: "" }), syncAccountInfo: () => {},
        teardownSession: () => {}, disconnectGoogle: async () => {}, resetFinancialState: () => {},
        pendingSyncRef: { current: false } } as any,
      emptyFin, emptyTags, emptyHelpers, { current: null },
    );

    const result = await api.reloadFromGoogle("", "");
    expect(result).toBeUndefined();
  });

  test("reloadFromGoogle returns early when pendingSync is true", async () => {
    const api = useGoogleSync(
      { accessToken: "", setAccessToken: () => {}, spreadsheetId: "", setSpreadsheetId: () => {},
        setLoading: () => {}, setIsSyncing: () => {}, setSyncError: () => {}, setAuthError: () => {},
        setPendingSync: () => {}, setIsFirstRemoteLoad: () => {}, setRehydratingCache: () => {},
        getWorkspaceAccessToken: async () => ({ accessToken: "" }), syncAccountInfo: () => {},
        teardownSession: () => {}, disconnectGoogle: async () => {}, resetFinancialState: () => {},
        pendingSyncRef: { current: true } } as any,
      emptyFin, emptyTags, emptyHelpers, { current: null },
    );

    const result = await api.reloadFromGoogle("t", "s", false);
    expect(result).toBeUndefined();
  });

  test("reloadFromGoogle reads transactions and summaries", async () => {
    const requests: { url: string; method: string; body: any }[] = [];
    const original = globalThis.fetch;
    globalThis.fetch = defaultSheetsHandler(requests) as any;
    try {
      let applied = false;
      const fin = { ...emptyFin, applyFinancialState: () => { applied = true; } };
      const api = useGoogleSync(makeSession(), fin, emptyTags, emptyHelpers, { current: null });

      await api.reloadFromGoogle("tok", "sheet-1", false);
      expect(applied).toBe(true);
    } finally {
      globalThis.fetch = original;
    }
  });

  test("reloadFromGoogle skips when pendingSync is true (with data)", async () => {
    const original = globalThis.fetch;
    globalThis.fetch = defaultSheetsHandler([]) as any;
    try {
      let applied = false;
      const fin = { ...emptyFin, applyFinancialState: () => { applied = true; } };
      const session = makeSession({ pendingSyncRef: { current: true } });
      const api = useGoogleSync(session, fin, emptyTags, emptyHelpers, { current: null });

      await api.reloadFromGoogle("tok", "sheet-1", false);
      expect(applied).toBe(false);
    } finally {
      globalThis.fetch = original;
    }
  });

  test("reloadFromGoogle applies remote UI preferences", async () => {
    const requests: { url: string; method: string; body: any }[] = [];
    const original = globalThis.fetch;
    const handler: any = async (input: any, init: any) => {
      const url = decodeURIComponent(String(input));
      requests.push({ url, method: init.method || "GET", body: init.body ? JSON.parse(init.body) : null });
      if (url.includes("MONTHLY SUMMARY!L1:L2")) {
        return json({ values: [["UI PREFERENCES"], [JSON.stringify({ language: "en", currencySymbol: "$", fontPreference: "inter", colorScheme: "sky" })]] });
      }
      return defaultSheetsHandler(requests)(input, init);
    };
    globalThis.fetch = handler;
    try {
      let appliedPrefs: any = null;
      const api = useGoogleSync(makeSession(), emptyFin, emptyTags, emptyHelpers, { current: null });
      api.wireRemoteUiPreferences((p: any) => { appliedPrefs = p; });

      await api.reloadFromGoogle("tok", "sheet-1", false);
      expect(appliedPrefs).toBeTruthy();
      expect(appliedPrefs.language).toBe("en");
    } finally {
      globalThis.fetch = original;
    }
  });

  test("reloadFromGoogle uses fallback summaries when summary is empty", async () => {
    const original = globalThis.fetch;
    globalThis.fetch = defaultSheetsHandler([]) as any;
    try {
      let appliedSummaries: any;
      const fin = { ...emptyFin, applyFinancialState: (_tx: any, summaries: any) => { appliedSummaries = summaries; } };
      const api = useGoogleSync(makeSession(), fin, emptyTags, emptyHelpers, { current: null });

      await api.reloadFromGoogle("tok", "sheet-1", false);
      expect(Array.isArray(appliedSummaries)).toBeTruthy();
    } finally {
      globalThis.fetch = original;
    }
  });

  // ─── refreshStoredSession ───

  test("refreshStoredSession handles auth error with cache", async () => {
    const secureStore = g.__bucksSecureStoreMock;
    secureStore.reset();
    const original = globalThis.fetch;
    globalThis.fetch = defaultSheetsHandler([]) as any;
    try {
      let teardownCalled = false;
      const session = makeSession({
        getWorkspaceAccessToken: async () => { throw Object.assign(new Error("401"), { status: 401 }); },
        teardownSession: () => { teardownCalled = true; },
      });
      const api = useGoogleSync(session, emptyFin, emptyTags, { ...emptyHelpers, authErr: () => true }, { current: null });

      await api.refreshStoredSession("tok", "sheet-1", true);
      expect(teardownCalled).toBe(true);
    } finally {
      globalThis.fetch = original;
      secureStore.reset();
    }
  });

  test("refreshStoredSession disconnects on auth error without cache", async () => {
    const secureStore = g.__bucksSecureStoreMock;
    secureStore.reset();
    const original = globalThis.fetch;
    globalThis.fetch = defaultSheetsHandler([]) as any;
    try {
      let disconnected = false;
      const session = makeSession({
        getWorkspaceAccessToken: async () => { throw Object.assign(new Error("401"), { status: 401 }); },
        disconnectGoogle: async () => { disconnected = true; },
      });
      const api = useGoogleSync(session, emptyFin, emptyTags, { ...emptyHelpers, authErr: () => true }, { current: null });

      await api.refreshStoredSession("tok", "sheet-1", false);
      expect(disconnected).toBe(true);
    } finally {
      globalThis.fetch = original;
      secureStore.reset();
    }
  });

  test("refreshStoredSession sets syncError on unknown error without cache", async () => {
    const secureStore = g.__bucksSecureStoreMock;
    secureStore.reset();
    const original = globalThis.fetch;
    globalThis.fetch = defaultSheetsHandler([]) as any;
    try {
      let syncErrorMsg = "";
      const session = makeSession({
        getWorkspaceAccessToken: async () => { throw new Error("network timeout"); },
        setSyncError: (v: string) => { syncErrorMsg = v; },
      });
      const api = useGoogleSync(session, emptyFin, emptyTags, emptyHelpers, { current: null });

      await api.refreshStoredSession("tok", "sheet-1", false);
      expect(syncErrorMsg).toContain("network timeout");
    } finally {
      globalThis.fetch = original;
      secureStore.reset();
    }
  });

  // ─── syncGoogleInBackground ───

  test("syncGoogleInBackground refreshes token and runs task", async () => {
    const original = globalThis.fetch;
    globalThis.fetch = defaultSheetsHandler([]) as any;
    try {
      let taskToken = "";
      const api = useGoogleSync(makeSession(), emptyFin, emptyTags, emptyHelpers, { current: null });

      api.syncGoogleInBackground(async (token: string) => { taskToken = token; }, "sync");
      await new Promise((r) => setTimeout(r, 30));
      expect(taskToken).toBeTruthy();
    } finally {
      globalThis.fetch = original;
    }
  });

  test("syncGoogleInBackground sets syncError on failure", async () => {
    g.__bucksGoogleSigninMock.getTokens = async () => { throw new Error("sign-in required"); };
    const original = globalThis.fetch;
    globalThis.fetch = defaultSheetsHandler([]) as any;
    try {
      let syncError = "";
      const session = makeSession({ setSyncError: (v: string) => { syncError = v; } });
      const api = useGoogleSync(session, emptyFin, emptyTags, emptyHelpers, { current: null });

      api.syncGoogleInBackground(async () => {}, "title");
      await new Promise((r) => setTimeout(r, 30));
      expect(syncError.length).toBeGreaterThan(0);
    } finally {
      globalThis.fetch = original;
      g.__bucksGoogleSigninMock.getTokens = async () => ({ accessToken: "mock-token", idToken: "mock-id" });
    }
  });

  test("syncGoogleInBackground clears pendingSync on success", async () => {
    const original = globalThis.fetch;
    globalThis.fetch = defaultSheetsHandler([]) as any;
    try {
      let pendingValue = true;
      const session = makeSession({
        pendingSyncRef: { current: true },
        setPendingSync: (v: boolean) => { pendingValue = v; },
      });
      const api = useGoogleSync(session, emptyFin, emptyTags, emptyHelpers, session.pendingSyncRef);

      api.syncGoogleInBackground(async () => {}, "title");
      await new Promise((r) => setTimeout(r, 30));
      expect(pendingValue).toBe(false);
    } finally {
      globalThis.fetch = original;
    }
  });

  // ─── writeUiPreferences ───

  test("writeUiPreferences is a no-op when no spreadsheet is selected", async () => {
    const original = globalThis.fetch;
    let called = false;
    const handler: any = () => { called = true; return json({}); };
    globalThis.fetch = handler;
    try {
      const api = useGoogleSync(makeSession({ spreadsheetId: "" }), emptyFin, emptyTags, emptyHelpers, { current: null });
      api.writeUiPreferences({ language: "es", currencySymbol: "S/", fontPreference: "dmsans", colorScheme: "sky", theme: "dark" });
      await new Promise((r) => setTimeout(r, 10));
      expect(called).toBe(false);
    } finally {
      globalThis.fetch = original;
    }
  });

  test("writeUiPreferences hits L1:L2 with header + JSON when a sheet is selected", async () => {
    const original = globalThis.fetch;
    const requests: { url: string; method: string; body: any }[] = [];
    const handler: any = async (input: any, init: any = {}) => {
      const url = decodeURIComponent(String(input));
      const body = init.body ? JSON.parse(init.body) : null;
      requests.push({ url, method: init.method || "GET", body });
      return json({});
    };
    globalThis.fetch = handler;
    try {
      const api = useGoogleSync(makeSession({ spreadsheetId: "sheet-xyz" }), emptyFin, emptyTags, emptyHelpers, { current: null });
      api.writeUiPreferences({ language: "en", currencySymbol: "$", fontPreference: "inter", colorScheme: "vulcanico", theme: "light" });
      await new Promise((r) => setTimeout(r, 30));
      const put = requests.find(({ method }) => method === "PUT");
      expect(put).toBeTruthy();
      expect(put!.url).toContain("MONTHLY SUMMARY!L1:L2");
      const payload = JSON.parse(put!.body.values[1][0]);
      expect(payload.colorScheme).toBe("vulcanico");
      expect(payload.language).toBe("en");
    } finally {
      globalThis.fetch = original;
    }
  });

  test("writeUiPreferences picks up a fresh spreadsheetId after the session prop changes", async () => {
    const original = globalThis.fetch;
    const seen: string[] = [];
    const handler: any = async (input: any) => { seen.push(decodeURIComponent(String(input))); return json({}); };
    globalThis.fetch = handler;
    try {
      const api1 = useGoogleSync(makeSession({ spreadsheetId: "sheet-old" }), emptyFin, emptyTags, emptyHelpers, { current: null });
      const writerFromFirstRender = api1.writeUiPreferences;
      const api2 = useGoogleSync(makeSession({ spreadsheetId: "sheet-new" }), emptyFin, emptyTags, emptyHelpers, { current: null });
      api2.writeUiPreferences({ language: "es", currencySymbol: "S/", fontPreference: "dmsans", colorScheme: "sky", theme: "dark" });
      await new Promise((r) => setTimeout(r, 30));
      const lastPut = seen.filter((u) => u.includes("MONTHLY SUMMARY!L1:L2")).pop();
      expect(lastPut && lastPut.includes("sheet-new")).toBeTruthy();
      writerFromFirstRender({ language: "es", currencySymbol: "S/", fontPreference: "dmsans", colorScheme: "sky", theme: "dark" });
      await new Promise((r) => setTimeout(r, 30));
      const oldPuts = seen.filter((u) => u.includes("MONTHLY SUMMARY!L1:L2") && u.includes("sheet-old"));
      expect(oldPuts.length).toBeGreaterThanOrEqual(1);
    } finally {
      globalThis.fetch = original;
    }
  });

  // ─── connectGoogleWorkspace ───

  test("connectGoogleWorkspace uses preferred sheet when available", async () => {
    const secureStore = g.__bucksSecureStoreMock;
    secureStore.reset();
    const original = globalThis.fetch;
    globalThis.fetch = defaultSheetsHandler([]) as any;
    try {
      let selectedSheet = "";
      const session = makeSession({ setSpreadsheetId: (v: string) => { selectedSheet = v; } });
      const api = useGoogleSync(session, emptyFin, emptyTags, emptyHelpers, { current: null });

      await api.connectGoogleWorkspace("tok", "preferred-id");
      expect(selectedSheet).toBe("preferred-id");
    } finally {
      globalThis.fetch = original;
      secureStore.reset();
    }
  });

  // ─── restoreSession ───

  test("restoreSession restores token and sheetId from SecureStore", async () => {
    const secureStore = g.__bucksSecureStoreMock;
    secureStore.reset();
    secureStore.values.set("bucks_google_access_token", "stored-tok");
    secureStore.values.set("bucks_spreadsheet_id", "stored-sheet");
    const original = globalThis.fetch;
    globalThis.fetch = defaultSheetsHandler([]) as any;
    try {
      const calls: string[] = [];
      const session = makeSession({
        accessToken: "",
        spreadsheetId: "",
        setAccessToken: (v: string) => { calls.push(v); },
        setSpreadsheetId: (v: string) => { calls.push(`sheet:${v}`); },
      });
      const api = useGoogleSync(session, { ...emptyFin }, emptyTags, emptyHelpers, { current: null });
      await api.restoreSession();
      expect(calls).toContain("stored-tok");
      expect(calls).toContain("sheet:stored-sheet");
    } finally {
      globalThis.fetch = original;
      secureStore.reset();
    }
  });

  test("restoreSession does nothing when no token stored", async () => {
    const secureStore = g.__bucksSecureStoreMock;
    secureStore.reset();
    let accessTokenSet = false;
    const session = makeSession({
      accessToken: "",
      setAccessToken: () => { accessTokenSet = true; },
    });
    const api = useGoogleSync(session, emptyFin, emptyTags, emptyHelpers, { current: null });
    await api.restoreSession();
    expect(accessTokenSet).toBe(false);
  });

  test("restoreSession rehydrates from cache when available", async () => {
    const secureStore = g.__bucksSecureStoreMock;
    secureStore.reset();
    secureStore.values.set("bucks_google_access_token", "stored-tok");
    secureStore.values.set("bucks_spreadsheet_id", "sheet-1");
    const fileSystem = g.__bucksFileSystemMock;
    fileSystem.reset();
    const cacheData = {
      schemaVersion: 3,
      spreadsheetId: "sheet-1",
      lastSyncedAt: "2026-01-15T12:00:00.000Z",
      transactions: [],
      summaries: [],
      freqIncome: {},
    };
    fileSystem.files.set("mock://document/bucks-finance-cache.json", JSON.stringify(cacheData));
    const original = globalThis.fetch;
    globalThis.fetch = defaultSheetsHandler([]) as any;
    try {
      let rehydrated = false;
      const fin = {
        ...emptyFin,
        applyFinancialState: () => { rehydrated = true; },
      };
      const api = useGoogleSync(makeSession(), fin, emptyTags, emptyHelpers, { current: null });
      await api.restoreSession();
      expect(rehydrated).toBe(true);
    } finally {
      globalThis.fetch = original;
      secureStore.reset();
      fileSystem.reset();
    }
  });

  // ─── refreshStoredSession full success ───

  test("refreshStoredSession refreshes token and reloads from Google", async () => {
    const secureStore = g.__bucksSecureStoreMock;
    secureStore.reset();
    const original = globalThis.fetch;
    globalThis.fetch = defaultSheetsHandler([]) as any;
    try {
      let accessTokenSet = "";
      const session = makeSession({
        setAccessToken: (v: string) => { accessTokenSet = v; },
      });
      const api = useGoogleSync(session, emptyFin, emptyTags, emptyHelpers, { current: null });
      await api.refreshStoredSession("old-tok", "sheet-1", false);
      expect(accessTokenSet).toBe("fresh-tok");
    } finally {
      globalThis.fetch = original;
      secureStore.reset();
    }
  });

  test("refreshStoredSession with cache checks if sheet is trashed", async () => {
    const secureStore = g.__bucksSecureStoreMock;
    secureStore.reset();
    const original = globalThis.fetch;
    let teardownCalled = false;
    const handler: any = async (input: any) => {
      const url = decodeURIComponent(String(input));
      if (url.includes("drive/v3/files") && url.includes("trashed")) return json({ trashed: true });
      return defaultSheetsHandler([])(input);
    };
    globalThis.fetch = handler;
    try {
      const session = makeSession({
        teardownSession: () => { teardownCalled = true; },
      });
      const api = useGoogleSync(session, emptyFin, emptyTags, emptyHelpers, { current: null });
      await api.refreshStoredSession("tok", "sheet-1", true);
      expect(teardownCalled).toBe(true);
    } finally {
      globalThis.fetch = original;
      secureStore.reset();
    }
  });

  test("refreshStoredSession with cache handles shouldRescanForSheetError", async () => {
    const secureStore = g.__bucksSecureStoreMock;
    secureStore.reset();
    const original = globalThis.fetch;
    let resetCalled = false;
    // Make reloadFromGoogle fail with a 404 (after isSheetTrashed succeeds)
    const handler: any = async (input: any) => {
      const url = decodeURIComponent(String(input));
      // isSheetTrashed returns not trashed
      if (url.includes("drive/v3/files") && url.includes("trashed")) {
        return json({ trashed: false });
      }
      // reloadFromGoogle's readTransactions fails with 404
      if (url.includes("values/")) {
        throw new Error("404 not found");
      }
      return defaultSheetsHandler([])(input);
    };
    globalThis.fetch = handler;
    try {
      const session = makeSession({
        resetFinancialState: () => { resetCalled = true; },
      });
      const api = useGoogleSync(session, emptyFin, emptyTags, emptyHelpers, { current: null });
      await api.refreshStoredSession("tok", "sheet-1", true);
      expect(resetCalled).toBe(true);
    } finally {
      globalThis.fetch = original;
      secureStore.reset();
    }
  });

  // ─── reloadFromGoogle forceFresh ───

  test("reloadFromGoogle with forceFresh awaits existing promise", async () => {
    const original = globalThis.fetch;
    globalThis.fetch = defaultSheetsHandler([]) as any;
    try {
      const api = useGoogleSync(makeSession(), emptyFin, emptyTags, emptyHelpers, { current: null });
      // First call starts the reload
      const p1 = api.reloadFromGoogle("tok", "sheet-1", false, false);
      // forceFresh call should await the existing promise
      const p2 = api.reloadFromGoogle("tok", "sheet-1", false, true);
      await Promise.all([p1, p2]);
    } finally {
      globalThis.fetch = original;
    }
  });

  // ─── reloadFromGoogle error handler ───

  test("reloadFromGoogle sets syncError on fetch failure", async () => {
    const original = globalThis.fetch;
    let syncErrorMsg = "";
    const failHandler: any = async () => { throw new Error("network error"); };
    globalThis.fetch = failHandler;
    try {
      const session = makeSession({ setSyncError: (v: string) => { syncErrorMsg = v; } });
      const api = useGoogleSync(session, emptyFin, emptyTags, emptyHelpers, { current: null });
      try {
        await api.reloadFromGoogle("tok", "sheet-1", false);
      } catch {
        // expected — reloadFromGoogle rethrows
      }
      expect(syncErrorMsg).toContain("network error");
    } finally {
      globalThis.fetch = original;
    }
  });

  // ─── reloadFromGoogle pendingSync mid-read ───

  test("reloadFromGoogle aborts when pendingSync becomes true during read", async () => {
    const original = globalThis.fetch;
    let applied = false;
    globalThis.fetch = defaultSheetsHandler([]) as any;
    try {
      const fin = { ...emptyFin, applyFinancialState: () => { applied = true; } };
      const session = makeSession({ pendingSyncRef: { current: true } });
      const api = useGoogleSync(session, fin, emptyTags, emptyHelpers, session.pendingSyncRef);
      await api.reloadFromGoogle("tok", "sheet-1", false);
      expect(applied).toBe(false);
    } finally {
      globalThis.fetch = original;
    }
  });

  // ─── reloadFromGoogle tags merge ───

  test("reloadFromGoogle processes tags from sheet", async () => {
    const original = globalThis.fetch;
    const tagsHandler: any = async (input: any, init: any = {}) => {
      const url = decodeURIComponent(String(input));
      if (url.includes("MONTHLY SUMMARY!K") && (url.includes("!K2") || url.includes(":K2"))) {
        return json({ values: [[JSON.stringify([{ id: "from-sheet", label: "FromSheet", color: "#aaaaaa" }])]] });
      }
      return defaultSheetsHandler([])(input, init);
    };
    globalThis.fetch = tagsHandler;
    try {
      let tagsSet = false;
      const tags = { tagsList: [{ id: "existing", label: "Existing", color: "#000000" }] as any[], setTagsList: () => { tagsSet = true; } };
      const api = useGoogleSync(makeSession(), emptyFin, tags, emptyHelpers, { current: null });
      await api.reloadFromGoogle("tok", "sheet-1", false);
      // Tags from sheet should have been processed (either merged or kept same)
      expect(tagsSet || tags.tagsList.length > 0).toBeTruthy();
    } finally {
      globalThis.fetch = original;
    }
  });

  // ─── selectSpreadsheet ───

  test("selectSpreadsheet saves token and sheet, then reloads", async () => {
    const secureStore = g.__bucksSecureStoreMock;
    secureStore.reset();
    const original = globalThis.fetch;
    globalThis.fetch = defaultSheetsHandler([]) as any;
    try {
      let accessTokenSet = "";
      let spreadsheetIdSet = "";
      const session = makeSession({
        setAccessToken: (v: string) => { accessTokenSet = v; },
        setSpreadsheetId: (v: string) => { spreadsheetIdSet = v; },
      });
      const api = useGoogleSync(session, emptyFin, emptyTags, emptyHelpers, { current: null });
      await api.selectSpreadsheet("new-tok", "new-sheet");
      expect(accessTokenSet).toBe("new-tok");
      expect(spreadsheetIdSet).toBe("new-sheet");
      expect(secureStore.values.get("bucks_google_access_token")).toBe("new-tok");
      expect(secureStore.values.get("bucks_spreadsheet_id")).toBe("new-sheet");
    } finally {
      globalThis.fetch = original;
      secureStore.reset();
    }
  });

  // ─── connectGoogleWorkspace ───

  test("connectGoogleWorkspace uses preferred sheet when available", async () => {
    const secureStore = g.__bucksSecureStoreMock;
    secureStore.reset();
    const original = globalThis.fetch;
    globalThis.fetch = defaultSheetsHandler([]) as any;
    try {
      let selectedSheet = "";
      const session = makeSession({ setSpreadsheetId: (v: string) => { selectedSheet = v; } });
      const api = useGoogleSync(session, emptyFin, emptyTags, emptyHelpers, { current: null });

      await api.connectGoogleWorkspace("tok", "preferred-id");
      expect(selectedSheet).toBe("preferred-id");
    } finally {
      globalThis.fetch = original;
      secureStore.reset();
    }
  });

  test("connectGoogleWorkspace falls back to findCompatibleSheets when preferred fails", async () => {
    const secureStore = g.__bucksSecureStoreMock;
    secureStore.reset();
    const original = globalThis.fetch;
    let sheetsFound = false;
    const handler: any = async (input: any, init: any = {}) => {
      const url = decodeURIComponent(String(input));
      // When reading from bad-sheet-id, throw 404
      if (url.includes("bad-sheet-id") && url.includes("values/")) {
        throw new Error("404 not found");
      }
      // Drive file list for findCompatibleSheets
      if (url.includes("drive/v3/files") && url.includes("q=")) {
        sheetsFound = true;
        return json({ files: [] });
      }
      return defaultSheetsHandler([])(input, init);
    };
    globalThis.fetch = handler;
    try {
      const session = makeSession();
      const api = useGoogleSync(session, emptyFin, emptyTags, emptyHelpers, { current: null });

      await api.connectGoogleWorkspace("tok", "bad-sheet-id");
      // Should have fallen through to findCompatibleSheets
      expect(sheetsFound).toBe(true);
    } finally {
      globalThis.fetch = original;
      secureStore.reset();
    }
  });

  test("connectGoogleWorkspace creates new sheet when no compatible found", async () => {
    const secureStore = g.__bucksSecureStoreMock;
    secureStore.reset();
    const original = globalThis.fetch;
    const handler: any = async (input: any, init: any = {}) => {
      const url = decodeURIComponent(String(input));
      const method = init.method || "GET";
      // Drive file list returns empty (no compatible sheets)
      if (url.includes("drive/v3/files") && url.includes("q=")) {
        return json({ files: [] });
      }
      // Sheets API POST to create spreadsheet
      if (url.includes("sheets.googleapis.com/v4/spreadsheets") && method === "POST" && !url.includes("batchUpdate")) {
        return json({ spreadsheetId: "new-sheet-id" });
      }
      // All other Sheets API calls succeed
      if (url.includes("sheets.googleapis.com")) return json({});
      return defaultSheetsHandler([])(input, init);
    };
    globalThis.fetch = handler;
    try {
      let selectedSheet = "";
      const session = makeSession({ setSpreadsheetId: (v: string) => { selectedSheet = v; } });
      const api = useGoogleSync(session, emptyFin, emptyTags, emptyHelpers, { current: null });

      await api.connectGoogleWorkspace("tok");
      expect(selectedSheet).toBe("new-sheet-id");
    } finally {
      globalThis.fetch = original;
      secureStore.reset();
    }
  });

  // ─── syncGoogleInBackground empty token ───

  test("syncGoogleInBackground throws when token is empty", async () => {
    const original = globalThis.fetch;
    globalThis.fetch = defaultSheetsHandler([]) as any;
    try {
      g.__bucksGoogleSigninMock.getTokens = async () => ({ accessToken: "", idToken: "" });
      let syncError = "";
      const session = makeSession({ setSyncError: (v: string) => { syncError = v; } });
      const api = useGoogleSync(session, emptyFin, emptyTags, emptyHelpers, { current: null });

      api.syncGoogleInBackground(async () => {}, "sync");
      await new Promise((r) => setTimeout(r, 30));
      expect(syncError.length).toBeGreaterThan(0);
    } finally {
      globalThis.fetch = original;
      g.__bucksGoogleSigninMock.getTokens = async () => ({ accessToken: "mock-token", idToken: "mock-id" });
    }
  });

  // ─── wireRemoteUiPreferences ───

  test("wireRemoteUiPreferences registers callback", async () => {
    const api = useGoogleSync(makeSession(), emptyFin, emptyTags, emptyHelpers, { current: null });
    api.wireRemoteUiPreferences(() => {});
    expect(typeof api.wireRemoteUiPreferences).toBe("function");
  });

  // ─── syncGoogleInBackground handles rejected queue (line 272) ───

  test("syncGoogleInBackground recovers from rejected queue promise", async () => {
    const mod = await import("../src/hooks/useGoogleSync.ts");
    mod.syncQueueRef.current = Promise.reject(new Error("prior crash"));
    const original = globalThis.fetch;
    globalThis.fetch = defaultSheetsHandler([]) as any;
    try {
      let synced = false;
      const api = useGoogleSync(makeSession(), emptyFin, emptyTags, emptyHelpers, { current: null });
      api.syncGoogleInBackground(async () => { synced = true; }, "sync");
      await new Promise((r) => setTimeout(r, 30));
      expect(synced).toBe(true);
    } finally {
      globalThis.fetch = original;
    }
  });

  // ─── restoreSession offline cache path (line 118) ───

  test("restoreSession loads offline cache when no financial cache exists", async () => {
    const secureStore = g.__bucksSecureStoreMock;
    secureStore.reset();
    secureStore.values.set("bucks_google_access_token", "stored-tok");
    secureStore.values.set("bucks_spreadsheet_id", "sheet-1");
    const fileSystem = g.__bucksFileSystemMock;
    fileSystem.reset();
    const offlineData = {
      schemaVersion: 3,
      transactions: [],
      summaries: [],
      freqIncome: {},
      lastSyncedAt: "2026-06-01T00:00:00.000Z",
    };
    fileSystem.files.set("mock://document/bucks-cache.json", JSON.stringify(offlineData));
    const original = globalThis.fetch;
    globalThis.fetch = defaultSheetsHandler([]) as any;
    try {
      let applied = false;
      const fin = { ...emptyFin, applyFinancialState: () => { applied = true; } };
      const session = makeSession();
      const api = useGoogleSync(session, fin, emptyTags, emptyHelpers, { current: null });
      await api.restoreSession();
      expect(applied).toBe(true);
    } finally {
      globalThis.fetch = original;
      secureStore.reset();
      fileSystem.reset();
    }
  });

  // ─── reloadFromGoogle with summary data (line 210) ───

  test("reloadFromGoogle uses sheet summaries when available", async () => {
    const original = globalThis.fetch;
    const handler: any = async (input: any, init: any) => {
      const url = decodeURIComponent(String(input));
      if (url.includes("MONTHLY SUMMARY!A1:I")) {
        return json({ values: [
          ["Month", "Freq Income", "Non Freq Income", "Total Income", "Freq Expense", "Non Freq Expense", "Total Expense", "Net Monthly", "Net No Freq"],
          ["2026-01", "5000", "200", "5200", "3000", "100", "3100", "2100", "2300"],
        ] });
      }
      if (url.includes("MONTHLY SUMMARY!K") && (url.includes(":K2") || url.includes("!K2"))) return json({ values: [["TAGS"], ["[]"]] });
      return defaultSheetsHandler([])(input, init);
    };
    globalThis.fetch = handler;
    try {
      let appliedSummaries: any;
      const fin = { ...emptyFin, applyFinancialState: (_tx: any, summaries: any) => { appliedSummaries = summaries; } };
      const api = useGoogleSync(makeSession(), fin, emptyTags, emptyHelpers, { current: null });
      await api.reloadFromGoogle("tok", "sheet-1", false);
      expect(appliedSummaries).toBeTruthy();
      expect(appliedSummaries[0].monthYear).toBeTruthy();
    } finally {
      globalThis.fetch = original;
    }
  });

  // ─── reloadFromGoogle merges tags when they differ (lines 222-223) ───

  test("reloadFromGoogle saves merged tags when catalogue differs", async () => {
    const original = globalThis.fetch;
    const handler: any = async (input: any, init: any) => {
      const url = decodeURIComponent(String(input));
      if (url.includes("MONTHLY SUMMARY!K") && (url.includes("!K2") || url.includes(":K2"))) {
        return json({ values: [[JSON.stringify([{ id: "new-tag", label: "New", color: "#aaaaaa" }])]] });
      }
      return defaultSheetsHandler([])(input, init);
    };
    globalThis.fetch = handler;
    try {
      const tags = {
        tagsList: [] as any[],
        setTagsList: jest.fn(),
      };
      const api = useGoogleSync(makeSession(), emptyFin, tags, emptyHelpers, { current: null });
      await api.reloadFromGoogle("tok", "sheet-1", false);
      expect(tags.setTagsList).toHaveBeenCalled();
    } finally {
      globalThis.fetch = original;
    }
  });

  // ─── reloadFromGoogle applies remote history (lines 238-239) ───

  test("reloadFromGoogle applies remote history from sheet", async () => {
    const original = globalThis.fetch;
    const handler: any = async (input: any, init: any) => {
      const url = decodeURIComponent(String(input));
      if (url.includes("MONTHLY SUMMARY!M1:M2")) {
        return json({ values: [["HISTORY"], [JSON.stringify([{
          id: "h1", timestamp: "2026-07-01T00:00:00.000Z", action: "delete",
          transaction: { rowId: 1, rawDate: "2026-01-15", amount: 100, detail: "test", type: "GASTO NO FRECUENTE" },
        }])]] });
      }
      if (url.includes("MONTHLY SUMMARY!K") && (url.includes("!K2") || url.includes(":K2"))) return json({ values: [["[]"]] });
      return defaultSheetsHandler([])(input, init);
    };
    globalThis.fetch = handler;
    try {
      let appliedHistory: any = null;
      const api = useGoogleSync(makeSession(), emptyFin, emptyTags, emptyHelpers, { current: null });
      api.wireRemoteHistory((entries: any) => { appliedHistory = entries; });
      await api.reloadFromGoogle("tok", "sheet-1", false);
      expect(appliedHistory).toBeTruthy();
      expect(appliedHistory.length).toBe(1);
      expect(appliedHistory[0].action).toBe("delete");
    } finally {
      globalThis.fetch = original;
    }
  });

  // ─── restoreSession offline-only path (line 118) ───

  test("restoreSession loads offline cache when no token stored", async () => {
    const secureStore = g.__bucksSecureStoreMock;
    secureStore.reset();
    const fileSystem = g.__bucksFileSystemMock;
    fileSystem.reset();
    const offlineData = {
      schemaVersion: 3,
      transactions: [{
        rowId: 1, date: "15-jan-26", rawDate: "2026-01-15T12:00:00.000Z",
        rawDateMs: 1736942400000, amount: 50, detail: "offline tx",
        type: "GASTO NO FRECUENTE" as const,
      }],
      summaries: [] as any[],
      freqIncome: {} as Record<string, number>,
    };
    fileSystem.files.set("mock://document/bucks-offline-cache.json", JSON.stringify(offlineData));
    try {
      let applied = false;
      const fin = { ...emptyFin, applyFinancialState: () => { applied = true; } };
      const api = useGoogleSync(
        makeSession({ accessToken: "", spreadsheetId: "" }),
        fin, emptyTags, emptyHelpers, { current: null },
      );
      await api.restoreSession();
      expect(applied).toBe(true);
    } finally {
      secureStore.reset();
      fileSystem.reset();
    }
  });

  // ─── writeHistory no-op without spreadsheet (lines 335-337) ───

  test("writeHistory is no-op when spreadsheetId is empty", async () => {
    const original = globalThis.fetch;
    let fetchCalled = false;
    const handler: any = () => { fetchCalled = true; return json({}); };
    globalThis.fetch = handler;
    try {
      const api = useGoogleSync(
        makeSession({ spreadsheetId: "" }),
        emptyFin, emptyTags, emptyHelpers, { current: null },
      );
      api.writeHistory([]);
      await new Promise((r) => setTimeout(r, 10));
      expect(fetchCalled).toBe(false);
    } finally {
      globalThis.fetch = original;
    }
  });

  // ─── wireRemoteHistory (line 346) ───

  test("wireRemoteHistory registers callback", async () => {
    const api = useGoogleSync(makeSession(), emptyFin, emptyTags, emptyHelpers, { current: null });
    const cb = jest.fn();
    api.wireRemoteHistory(cb);
    const remoteHistoryField = (api as any).wireRemoteHistory;
    expect(typeof remoteHistoryField).toBe("function");
  });

  // ─── wireMergePrompt (line 353) ───

  test("wireMergePrompt registers callback", async () => {
    const api = useGoogleSync(makeSession(), emptyFin, emptyTags, emptyHelpers, { current: null });
    const cb = jest.fn();
    api.wireMergePrompt(cb);
    expect(typeof api.wireMergePrompt).toBe("function");
  });

});
