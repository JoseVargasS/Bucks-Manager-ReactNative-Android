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

describe("useTransactionMutations", () => {
  const g = globalThis as any;
  g.__bucksAlertMock = { alert: (...args: any[]) => { g.__lastAlertArgs = args; } };

  const makeFinState = (overrides: Record<string, any> = {}) => {
    const state: any = {
      transactions: [],
      summaries: [],
      freqIncome: {},
      month: 0,
      year: 2026,
      selectedRows: [],
      searchActive: false,
      renumberTransactions: (items: any[]) => items.map((t: any, i: number) => ({ ...t, rowId: i + 2 })),
      persistFinancialState: () => {},
      ...overrides,
    };
    return {
      _state: state,
      get transactions() { return state.transactions; },
      get summaries() { return state.summaries; },
      get freqIncome() { return state.freqIncome; },
      get month() { return state.month; },
      get year() { return state.year; },
      get selectedRows() { return state.selectedRows; },
      recalcAndReplaceTransactions: (next: any[], _affectedMonths: string[]) => {
        state.transactions = next;
      },
      setPeriod: (m: number, y: number) => { state.month = m; state.year = y; },
      toggleSearchActive: (active: boolean) => { state.searchActive = active; },
      clearSelection: () => { state.selectedRows = []; },
      removeFromSelection: (rowId: number) => { state.selectedRows = state.selectedRows.filter((r: number) => r !== rowId); },
      renumberTransactions: state.renumberTransactions,
      persistFinancialState: state.persistFinancialState,
    };
  };

  const tx1: any = {
    rowId: 2, date: "15-jan-26", rawDate: "2026-01-15T05:00:00.000Z",
    amount: -25, detail: "Comida", type: "GASTO NO FRECUENTE",
    createdAt: "2026-01-15T12:00:00.000Z", tags: [],
  };

  const tx2: any = {
    rowId: 3, date: "20-feb-26", rawDate: "2026-02-20T05:00:00.000Z",
    amount: -50, detail: "Transporte", type: "GASTO FRECUENTE",
    createdAt: "2026-02-20T12:00:00.000Z", tags: [],
  };

  const tx3: any = {
    rowId: 4, date: "10-mar-26", rawDate: "2026-03-10T05:00:00.000Z",
    amount: 100, detail: "Venta", type: "INGRESO FRECUENTE",
    createdAt: "2026-03-10T12:00:00.000Z", tags: [],
  };

  const emptyCopy = {
    incompleteData: "", completeRequired: "", editRecord: "", newRecord: "",
    deleteRecord: "", deleteSelection: "", moveRecord: "", moveRecordError: "", undoAction: "",
  };

  const emptySync = {
    reloadFromGoogle: async () => {},
    syncGoogleInBackground: () => {},
    pendingSyncRef: { current: false },
  };

  function makeSync(overrides: Record<string, any> = {}) { return { ...emptySync, ...overrides }; }
  function makeHistory(overrides: Record<string, any> = {}) { return { setHistoryEntries: () => {}, ...overrides }; }

  let useTransactionMutations: typeof import("../src/hooks/useTransactionMutations.ts").useTransactionMutations;

  beforeAll(async () => {
    const mod = await import("../src/hooks/useTransactionMutations.ts");
    useTransactionMutations = mod.useTransactionMutations;
  });

  // ─── reconcilePeriod ───

  test("reconcilePeriod jumps to latest month when current month has no data", async () => {
    const fin = makeFinState({ month: 5, year: 2025 });
    const api = useTransactionMutations(fin, { accessToken: "", spreadsheetId: "" }, emptySync, makeHistory(), emptyCopy);

    api.reconcilePeriod([tx1, tx2], 5, 2025);
    expect(fin._state.month).toBe(1);
    expect(fin._state.year).toBe(2026);
  });

  test("reconcilePeriod stays when current month still has data", async () => {
    const fin = makeFinState({ month: 0, year: 2026 });
    const api = useTransactionMutations(fin, { accessToken: "", spreadsheetId: "" }, emptySync, makeHistory(), emptyCopy);

    api.reconcilePeriod([tx1, tx2], 0, 2026);
    expect(fin._state.month).toBe(0);
    expect(fin._state.year).toBe(2026);
  });

  test("reconcilePeriod falls back to today when no transactions exist", async () => {
    const fin = makeFinState({ month: 5, year: 2025 });
    const api = useTransactionMutations(fin, { accessToken: "", spreadsheetId: "" }, emptySync, makeHistory(), emptyCopy);

    const now = new Date();
    api.reconcilePeriod([], 5, 2025);
    expect(fin._state.month).toBe(now.getMonth());
    expect(fin._state.year).toBe(now.getFullYear());
  });

  test("reconcilePeriod with rawDateMs uses milliseconds", async () => {
    const fin = makeFinState({ month: 5, year: 2025 });
    const txMs = { ...tx1, rawDateMs: new Date("2026-02-15").getTime() };
    const api = useTransactionMutations(fin, { accessToken: "", spreadsheetId: "" }, emptySync, makeHistory(), emptyCopy);

    api.reconcilePeriod([txMs], 5, 2025);
    expect(fin._state.month).toBe(1);
    expect(fin._state.year).toBe(2026);
  });

  test("reconcilePeriod with invalid dates falls back to today", async () => {
    const fin = makeFinState({ month: 5, year: 2025 });
    const badTx = { ...tx1, rawDate: "invalid-date", rawDateMs: NaN };
    const api = useTransactionMutations(fin, { accessToken: "", spreadsheetId: "" }, emptySync, makeHistory(), emptyCopy);

    const now = new Date();
    api.reconcilePeriod([badTx], 5, 2025);
    expect(fin._state.month).toBe(now.getMonth());
    expect(fin._state.year).toBe(now.getFullYear());
  });

  // ─── deleteTx ───

  test("deleteTx removes transaction from list", async () => {
    const fin = makeFinState({ transactions: [tx1, tx2], summaries: [], month: 0, year: 2026 });
    const api = useTransactionMutations(fin, { accessToken: "", spreadsheetId: "" }, emptySync, makeHistory(), emptyCopy);

    await api.deleteTx(tx1);
    expect(fin._state.transactions.length).toBe(1);
    expect(fin._state.transactions[0].detail).toBe("Transporte");
  });

  test("deleteTx clears selected row", async () => {
    const fin = makeFinState({ transactions: [tx1], selectedRows: [2], month: 0, year: 2026 });
    const api = useTransactionMutations(fin, { accessToken: "", spreadsheetId: "" }, emptySync, makeHistory(), emptyCopy);

    await api.deleteTx(tx1);
    expect(fin._state.selectedRows.length).toBe(0);
  });

  // ─── submitDraft ───

  test("submitDraft rejects empty date", async () => {
    const fin = makeFinState({ transactions: [] });
    const api = useTransactionMutations(fin, { accessToken: "", spreadsheetId: "" }, emptySync, makeHistory(), emptyCopy);

    const result = api.submitDraft({ date: "", amount: "100", detail: "Test", type: "INGRESO FRECUENTE" }, null);
    expect(result).toBe(false);
  });

  test("submitDraft rejects empty amount and detail for non-lineItems draft", async () => {
    const fin = makeFinState({ transactions: [] });
    const api = useTransactionMutations(fin, { accessToken: "", spreadsheetId: "" }, emptySync, makeHistory(), emptyCopy);

    const result = api.submitDraft({ date: "2026-01-15", amount: "", detail: "", type: "GASTO FRECUENTE" }, null);
    expect(result).toBe(false);
  });

  test("submitDraft rejects lineItems with no amounts", async () => {
    const fin = makeFinState({ transactions: [] });
    const api = useTransactionMutations(fin, { accessToken: "", spreadsheetId: "" }, emptySync, makeHistory(), emptyCopy);

    const draft = { date: "2026-01-15", amount: "0", detail: "Test", type: "GASTO FRECUENTE", lineItems: [{ id: "li-1", amount: "", description: "Item 1" }] };
    const result = api.submitDraft(draft as any, null);
    expect(result).toBe(false);
  });

  test("submitDraft adds transaction and persists", async () => {
    let persisted = false;
    const fin = makeFinState({ transactions: [], persistFinancialState: () => { persisted = true; } });
    const api = useTransactionMutations(fin, { accessToken: "", spreadsheetId: "" }, emptySync, makeHistory(), emptyCopy);

    const result = api.submitDraft({ date: "2026-01-15", amount: "100", detail: "Salary", type: "INGRESO FRECUENTE" }, null);
    expect(result).toBe(true);
    expect(fin._state.transactions.length).toBe(1);
    expect(fin._state.transactions[0].amount).toBe(100);
    expect(persisted).toBe(true);
  });

  test("submitDraft updates month and year to new transaction date", async () => {
    const fin = makeFinState({ transactions: [], month: 5, year: 2025 });
    const api = useTransactionMutations(fin, { accessToken: "", spreadsheetId: "" }, emptySync, makeHistory(), emptyCopy);

    api.submitDraft({ date: "2026-03-10", amount: "50", detail: "Test", type: "INGRESO FRECUENTE" }, null);
    expect(fin._state.month).toBe(2);
    expect(fin._state.year).toBe(2026);
  });

  test("submitDraft edits existing transaction", async () => {
    const fin = makeFinState({ transactions: [tx1] });
    const api = useTransactionMutations(fin, { accessToken: "", spreadsheetId: "" }, emptySync, makeHistory(), emptyCopy);

    const edit = { ...tx1, amount: -999 };
    const result = api.submitDraft({ date: "2026-01-15", amount: "-999", detail: "Edited", type: "GASTO NO FRECUENTE" }, edit);
    expect(result).toBe(true);
    expect(fin._state.transactions[0].detail).toBe("Edited");
    expect(fin._state.transactions[0].amount).toBe(-999);
  });

  test("submitDraft syncs to Google when token is present", async () => {
    let syncCalled = false;
    const sync = makeSync({ syncGoogleInBackground: () => { syncCalled = true; } });
    const fin = makeFinState({ transactions: [] });
    const api = useTransactionMutations(fin, { accessToken: "tok", spreadsheetId: "sheet-1" }, sync, makeHistory(), emptyCopy);

    api.submitDraft({ date: "2026-01-15", amount: "100", detail: "Test", type: "INGRESO FRECUENTE" }, null);
    expect(syncCalled).toBe(true);
    expect(sync.pendingSyncRef.current).toBe(true);
  });

  test("submitDraft does not sync when no token", async () => {
    let syncCalled = false;
    const sync = makeSync({ syncGoogleInBackground: () => { syncCalled = true; } });
    const fin = makeFinState({ transactions: [] });
    const api = useTransactionMutations(fin, { accessToken: "", spreadsheetId: "" }, sync, makeHistory(), emptyCopy);

    api.submitDraft({ date: "2026-01-15", amount: "100", detail: "Test", type: "INGRESO FRECUENTE" }, null);
    expect(syncCalled).toBe(false);
  });

  // ─── deleteSelectedRows ───

  test("deleteSelectedRows removes selected transactions", async () => {
    const fin = makeFinState({ transactions: [tx1, tx2, tx3], selectedRows: [2, 4], month: 0, year: 2026 });
    const api = useTransactionMutations(fin, { accessToken: "", spreadsheetId: "" }, emptySync, makeHistory(), emptyCopy);

    await api.deleteSelectedRows();
    expect(fin._state.transactions.length).toBe(1);
    expect(fin._state.transactions[0].detail).toBe("Transporte");
    expect(fin._state.selectedRows).toEqual([]);
  });

  test("deleteSelectedRows does nothing when no rows selected", async () => {
    const fin = makeFinState({ transactions: [tx1, tx2], selectedRows: [] });
    const api = useTransactionMutations(fin, { accessToken: "", spreadsheetId: "" }, emptySync, makeHistory(), emptyCopy);

    await api.deleteSelectedRows();
    expect(fin._state.transactions.length).toBe(2);
  });

  test("deleteSelectedRows syncs to Google when token present", async () => {
    let syncCalled = false;
    const sync = makeSync({ syncGoogleInBackground: () => { syncCalled = true; } });
    const fin = makeFinState({ transactions: [tx1, tx2], selectedRows: [2], month: 0, year: 2026 });
    const api = useTransactionMutations(fin, { accessToken: "tok", spreadsheetId: "sheet-1" }, sync, makeHistory(), emptyCopy);

    await api.deleteSelectedRows();
    expect(syncCalled).toBe(true);
  });

  // ─── moveTx ───

  test("moveTx swaps locally when no token", async () => {
    const fin = makeFinState({ transactions: [tx1, tx2] });
    const api = useTransactionMutations(fin, { accessToken: "", spreadsheetId: "" }, emptySync, makeHistory(), emptyCopy);

    await api.moveTx(tx1, "down");
    expect(fin._state.transactions[0].detail).toBe("Transporte");
    expect(fin._state.transactions[1].detail).toBe("Comida");
  });

  test("moveTx up swaps correctly", async () => {
    const fin = makeFinState({ transactions: [tx1, tx2] });
    const api = useTransactionMutations(fin, { accessToken: "", spreadsheetId: "" }, emptySync, makeHistory(), emptyCopy);

    await api.moveTx(tx2, "up");
    expect(fin._state.transactions[0].detail).toBe("Transporte");
    expect(fin._state.transactions[1].detail).toBe("Comida");
  });

  test("moveTx does nothing when at top boundary (up)", async () => {
    const fin = makeFinState({ transactions: [tx1, tx2] });
    const api = useTransactionMutations(fin, { accessToken: "", spreadsheetId: "" }, emptySync, makeHistory(), emptyCopy);

    await api.moveTx(tx1, "up");
    expect(fin._state.transactions[0].detail).toBe("Comida");
  });

  test("moveTx does nothing when at bottom boundary (down)", async () => {
    const fin = makeFinState({ transactions: [tx1, tx2] });
    const api = useTransactionMutations(fin, { accessToken: "", spreadsheetId: "" }, emptySync, makeHistory(), emptyCopy);

    await api.moveTx(tx2, "down");
    expect(fin._state.transactions[1].detail).toBe("Transporte");
  });

  test("moveTx syncs to Google when token present", async () => {
    let syncCalled = false;
    const sync = makeSync({ syncGoogleInBackground: () => { syncCalled = true; } });
    const fin = makeFinState({ transactions: [tx1, tx2] });
    const api = useTransactionMutations(fin, { accessToken: "tok", spreadsheetId: "sheet-1" }, sync, makeHistory(), emptyCopy);

    await api.moveTx(tx1, "down");
    expect(syncCalled).toBe(true);
  });

  test("moveTx handles error gracefully", async () => {
    const sync = makeSync({ syncGoogleInBackground: () => { throw new Error("network error"); } });
    const fin = makeFinState({ transactions: [tx1, tx2] });
    const api = useTransactionMutations(fin, { accessToken: "tok", spreadsheetId: "sheet-1" }, sync, makeHistory(), emptyCopy);

    await api.moveTx(tx1, "down");
    expect(g.__lastAlertArgs).toBeTruthy();
  });

  // ─── undoDeleteEntry ───

  test("undoDeleteEntry restores transaction", async () => {
    const entry = { id: "e1", action: "delete", transaction: tx1, timestamp: Date.now() };
    const fin = makeFinState({ transactions: [tx2] });
    const api = useTransactionMutations(fin, { accessToken: "", spreadsheetId: "" }, emptySync, makeHistory(), emptyCopy);

    await api.undoDeleteEntry(entry as any);
    expect(fin._state.transactions.length).toBe(2);
    const restored = fin._state.transactions.find((t: any) => t.detail === "Comida");
    expect(restored).toBeTruthy();
  });

  test("undoDeleteEntry removes entry from history", async () => {
    const entry = { id: "e1", action: "delete", transaction: tx1, timestamp: Date.now() };
    const fin = makeFinState({ transactions: [] });
    const history = { setHistoryEntries: () => {} };
    const api = useTransactionMutations(fin, { accessToken: "", spreadsheetId: "" }, emptySync, history, emptyCopy);

    await api.undoDeleteEntry(entry as any);
  });

  test("undoDeleteEntry syncs to Google when token present", async () => {
    let syncCalled = false;
    const sync = makeSync({ syncGoogleInBackground: () => { syncCalled = true; } });
    const entry = { id: "e1", action: "delete", transaction: tx1, timestamp: Date.now() };
    const fin = makeFinState({ transactions: [] });
    const api = useTransactionMutations(fin, { accessToken: "tok", spreadsheetId: "sheet-1" }, sync, makeHistory(), emptyCopy);

    await api.undoDeleteEntry(entry as any);
    expect(syncCalled).toBe(true);
  });

  test("undoDeleteEntry with lineItems restores detail correctly", async () => {
    const txWithItems = { ...tx1, lineItems: [{ id: "li-1", amount: 25, description: "Item 1", formula: "10+15", tags: ["tag-a"] }] };
    const entry = { id: "e1", action: "delete", transaction: txWithItems, timestamp: Date.now() };
    const fin = makeFinState({ transactions: [] });
    const api = useTransactionMutations(fin, { accessToken: "", spreadsheetId: "" }, emptySync, makeHistory(), emptyCopy);

    await api.undoDeleteEntry(entry as any);
    const restored = fin._state.transactions.find((t: any) => t.detail === "Comida");
    expect(restored).toBeTruthy();
    expect(restored.lineItems).toBeTruthy();
  });

  // ─── sync callback paths (syncGoogleInBackground executes callback) ───

  describe("sync callbacks", () => {
    test("submitDraft calls saveTransaction via sync callback", async () => {
      const sync = makeSync({
        syncGoogleInBackground: (task: any) => { task("fresh-tok"); },
      });
      // Mock the Google API modules that the callback imports
      jest.resetModules();
      const mockSave = jest.fn().mockResolvedValue(undefined);
      const mockReload = jest.fn().mockResolvedValue(undefined);
      jest.doMock("@/api/googleWorkspace", () => ({
        saveTransaction: (...args: any[]) => mockSave(...args),
        updateTransaction: jest.fn(),
        deleteTransaction: jest.fn(),
        moveTransaction: jest.fn(),
        insertTransactionAtRow: jest.fn(),
      }));
      const mod = await import("../src/hooks/useTransactionMutations.ts");
      const fin = makeFinState({ transactions: [], accessToken: "tok", spreadsheetId: "sheet-1" } as any);
      const api = mod.useTransactionMutations(
        fin,
        { accessToken: "tok", spreadsheetId: "sheet-1" },
        { ...sync, reloadFromGoogle: mockReload },
        makeHistory(),
        emptyCopy,
      );

      api.submitDraft({ date: "2026-01-15", amount: "100", detail: "Test", type: "INGRESO FRECUENTE" } as any, null);
      // The sync callback is fire-and-forget, so we need to flush
      await new Promise((r) => setTimeout(r, 50));
      expect(mockReload).toHaveBeenCalled();
    });

    test("submitDraft calls updateGoogleTransaction on edit via sync callback", async () => {
      const sync = makeSync({
        syncGoogleInBackground: (task: any) => { task("fresh-tok"); },
      });
      jest.resetModules();
      const mockUpdate = jest.fn().mockResolvedValue(undefined);
      const mockReload = jest.fn().mockResolvedValue(undefined);
      jest.doMock("@/api/googleWorkspace", () => ({
        saveTransaction: jest.fn(),
        updateTransaction: (...args: any[]) => { return mockUpdate(...args); },
        deleteTransaction: jest.fn(),
        moveTransaction: jest.fn(),
        insertTransactionAtRow: jest.fn(),
      }));
      const mod = await import("../src/hooks/useTransactionMutations.ts");
      const edit = { ...tx1 };
      const fin = makeFinState({ transactions: [edit] });
      const api = mod.useTransactionMutations(
        fin,
        { accessToken: "tok", spreadsheetId: "sheet-1" },
        { ...sync, reloadFromGoogle: mockReload },
        makeHistory(),
        emptyCopy,
      );

      api.submitDraft({ date: "2026-01-15", amount: "-999", detail: "Edited", type: "GASTO NO FRECUENTE" } as any, edit);
      await new Promise((r) => setTimeout(r, 50));
      expect(mockReload).toHaveBeenCalled();
    });

    test("deleteTx calls deleteGoogleTransaction via sync callback", async () => {
      let deletedRowId = 0;
      const sync = makeSync({
        syncGoogleInBackground: (task: any) => { task("fresh-tok"); },
      });
      jest.resetModules();
      const mockDelete = jest.fn().mockResolvedValue(undefined);
      const mockReload = jest.fn().mockResolvedValue(undefined);
      jest.doMock("@/api/googleWorkspace", () => ({
        saveTransaction: jest.fn(),
        updateTransaction: jest.fn(),
        deleteTransaction: (...args: any[]) => { deletedRowId = args[2]; return mockDelete(...args); },
        moveTransaction: jest.fn(),
        insertTransactionAtRow: jest.fn(),
      }));
      const mod = await import("../src/hooks/useTransactionMutations.ts");
      const fin = makeFinState({ transactions: [tx1] });
      const api = mod.useTransactionMutations(
        fin,
        { accessToken: "tok", spreadsheetId: "sheet-1" },
        { ...sync, reloadFromGoogle: mockReload },
        makeHistory(),
        emptyCopy,
      );

      await api.deleteTx(tx1);
      await new Promise((r) => setTimeout(r, 50));
      expect(deletedRowId).toBe(tx1.rowId);
      expect(mockReload).toHaveBeenCalled();
    });

    test("moveTx calls moveGoogleTransaction via sync callback", async () => {
      let movedRowId = 0;
      let movedDir = "";
      const sync = makeSync({
        syncGoogleInBackground: (task: any) => { task("fresh-tok"); },
      });
      jest.resetModules();
      const mockMove = jest.fn().mockResolvedValue(undefined);
      const mockReload = jest.fn().mockResolvedValue(undefined);
      jest.doMock("@/api/googleWorkspace", () => ({
        saveTransaction: jest.fn(),
        updateTransaction: jest.fn(),
        deleteTransaction: jest.fn(),
        moveTransaction: (...args: any[]) => { movedRowId = args[2]; movedDir = args[3]; return mockMove(...args); },
        insertTransactionAtRow: jest.fn(),
      }));
      const mod = await import("../src/hooks/useTransactionMutations.ts");
      const fin = makeFinState({ transactions: [tx1, tx2] });
      const api = mod.useTransactionMutations(
        fin,
        { accessToken: "tok", spreadsheetId: "sheet-1" },
        { ...sync, reloadFromGoogle: mockReload },
        makeHistory(),
        emptyCopy,
      );

      await api.moveTx(tx1, "down");
      await new Promise((r) => setTimeout(r, 50));
      expect(movedRowId).toBe(tx1.rowId);
      expect(movedDir).toBe("down");
      expect(mockReload).toHaveBeenCalled();
    });

    test("undoDeleteEntry calls insertTransactionAtRow via sync callback", async () => {
      const sync = makeSync({
        syncGoogleInBackground: (task: any) => { task("fresh-tok"); },
      });
      jest.resetModules();
      const mockInsert = jest.fn().mockResolvedValue(undefined);
      const mockReload = jest.fn().mockResolvedValue(undefined);
      jest.doMock("@/api/googleWorkspace", () => ({
        saveTransaction: jest.fn(),
        updateTransaction: jest.fn(),
        deleteTransaction: jest.fn(),
        moveTransaction: jest.fn(),
        insertTransactionAtRow: (...args: any[]) => { return mockInsert(...args); },
      }));
      const mod = await import("../src/hooks/useTransactionMutations.ts");
      const entry = { id: "e1", action: "delete" as const, transaction: tx1, timestamp: "2026-01-15T12:00:00.000Z" };
      const fin = makeFinState({ transactions: [] });
      const api = mod.useTransactionMutations(
        fin,
        { accessToken: "tok", spreadsheetId: "sheet-1" },
        { ...sync, reloadFromGoogle: mockReload },
        makeHistory(),
        emptyCopy,
      );

      await api.undoDeleteEntry(entry as any);
      await new Promise((r) => setTimeout(r, 50));
      expect(mockReload).toHaveBeenCalled();
    });
  });
});
