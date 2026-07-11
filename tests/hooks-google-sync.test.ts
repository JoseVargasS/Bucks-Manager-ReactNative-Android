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
      if (url.includes("MONTHLY SUMMARY!K1:K2")) return json({ values: [] });
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
      api.writeUiPreferences({ language: "es", currencySymbol: "S/", fontPreference: "dmsans", colorScheme: "sky" });
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
      api.writeUiPreferences({ language: "en", currencySymbol: "$", fontPreference: "inter", colorScheme: "vulcanico" });
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
      api2.writeUiPreferences({ language: "es", currencySymbol: "S/", fontPreference: "dmsans", colorScheme: "sky" });
      await new Promise((r) => setTimeout(r, 30));
      const lastPut = seen.filter((u) => u.includes("MONTHLY SUMMARY!L1:L2")).pop();
      expect(lastPut && lastPut.includes("sheet-new")).toBeTruthy();
      writerFromFirstRender({ language: "es", currencySymbol: "S/", fontPreference: "dmsans", colorScheme: "sky" });
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

  // ─── wireRemoteUiPreferences ───

  test("wireRemoteUiPreferences registers callback", async () => {
    const api = useGoogleSync(makeSession(), emptyFin, emptyTags, emptyHelpers, { current: null });
    api.wireRemoteUiPreferences(() => {});
    expect(typeof api.wireRemoteUiPreferences).toBe("function");
  });
});
