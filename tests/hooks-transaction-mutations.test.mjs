import assert from "node:assert/strict";
import { test } from "node:test";
import "./setup.mjs";

const makeFinState = (overrides = {}) => {
  const state = {
    transactions: [],
    summaries: [],
    freqIncome: {},
    month: 0,
    year: 2026,
    selectedRows: [],
    searchActive: false,
    renumberTransactions: (items) => items.map((t, i) => ({ ...t, rowId: i + 2 })),
    persistFinancialState: () => {},
    ...overrides,
  };
  return {
    _state: state,
    get transactions() { return state.transactions; },
    setTransactions: (v) => { state.transactions = typeof v === "function" ? v(state.transactions) : v; },
    get summaries() { return state.summaries; },
    setSummaries: (v) => { state.summaries = typeof v === "function" ? v(state.summaries) : v; },
    get freqIncome() { return state.freqIncome; },
    get month() { return state.month; },
    get year() { return state.year; },
    setMonth: (v) => { state.month = v; },
    setYear: (v) => { state.year = v; },
    get selectedRows() { return state.selectedRows; },
    setSelectedRows: (v) => { state.selectedRows = typeof v === "function" ? v(state.selectedRows) : v; },
    setSearchActive: (v) => { state.searchActive = v; },
    renumberTransactions: state.renumberTransactions,
    persistFinancialState: state.persistFinancialState,
  };
};

const tx1 = {
  rowId: 2,
  date: "15-jan-26",
  rawDate: "2026-01-15T05:00:00.000Z",
  amount: -25,
  detail: "Comida",
  type: "GASTO NO FRECUENTE",
  createdAt: "2026-01-15T12:00:00.000Z",
  tags: [],
};

const tx2 = {
  rowId: 3,
  date: "20-feb-26",
  rawDate: "2026-02-20T05:00:00.000Z",
  amount: -50,
  detail: "Transporte",
  type: "GASTO FRECUENTE",
  createdAt: "2026-02-20T12:00:00.000Z",
  tags: [],
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

test("reconcilePeriod jumps to latest month when current month has no data", async () => {
  const fin = makeFinState({ month: 5, year: 2025 });
  const { useTransactionMutations } = await import("../src/hooks/useTransactionMutations.ts");
  const api = useTransactionMutations(fin, { accessToken: "", spreadsheetId: "" }, emptySync, { setHistoryEntries: () => {} }, emptyCopy);

  api.reconcilePeriod([tx1, tx2], 5, 2025);

  assert.equal(fin._state.month, 1);
  assert.equal(fin._state.year, 2026);
});

test("reconcilePeriod stays when current month still has data", async () => {
  const fin = makeFinState({ month: 0, year: 2026 });
  const { useTransactionMutations } = await import("../src/hooks/useTransactionMutations.ts");
  const api = useTransactionMutations(fin, { accessToken: "", spreadsheetId: "" }, emptySync, { setHistoryEntries: () => {} }, emptyCopy);

  api.reconcilePeriod([tx1, tx2], 0, 2026);

  assert.equal(fin._state.month, 0);
  assert.equal(fin._state.year, 2026);
});

test("reconcilePeriod falls back to today when no transactions exist", async () => {
  const fin = makeFinState({ month: 5, year: 2025 });
  const { useTransactionMutations } = await import("../src/hooks/useTransactionMutations.ts");
  const api = useTransactionMutations(fin, { accessToken: "", spreadsheetId: "" }, emptySync, { setHistoryEntries: () => {} }, emptyCopy);

  const now = new Date();
  api.reconcilePeriod([], 5, 2025);
  assert.equal(fin._state.month, now.getMonth());
  assert.equal(fin._state.year, now.getFullYear());
});

test("deleteTx removes transaction from list", async () => {
  const fin = makeFinState({ transactions: [tx1, tx2], summaries: [], month: 0, year: 2026 });
  const { useTransactionMutations } = await import("../src/hooks/useTransactionMutations.ts");
  const api = useTransactionMutations(fin, { accessToken: "", spreadsheetId: "" }, emptySync, { setHistoryEntries: () => {} }, emptyCopy);

  await api.deleteTx(tx1);

  assert.equal(fin._state.transactions.length, 1);
  assert.equal(fin._state.transactions[0].rowId, 2);
  assert.equal(fin._state.transactions[0].detail, "Transporte");
});

test("deleteTx clears selected row", async () => {
  const fin = makeFinState({ transactions: [tx1], selectedRows: [2], month: 0, year: 2026 });
  const { useTransactionMutations } = await import("../src/hooks/useTransactionMutations.ts");
  const api = useTransactionMutations(fin, { accessToken: "", spreadsheetId: "" }, emptySync, { setHistoryEntries: () => {} }, emptyCopy);

  await api.deleteTx(tx1);

  assert.equal(fin._state.selectedRows.length, 0);
});
