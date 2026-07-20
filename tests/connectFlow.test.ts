jest.mock("@/api/googleWorkspace", () => ({
  findCompatibleSheets: jest.fn(),
  createBucksSpreadsheet: jest.fn(),
  saveTransaction: jest.fn(),
}));

jest.mock("@/utils/tags", () => ({
  DEFAULT_TAGS: [
    { id: "default-salud", es: "Salud", en: "Health", color: "#f43f5e" },
    { id: "default-comida", es: "Comida", en: "Food", color: "#f59e0b" },
  ],
  labelForTagId: jest.fn((id: string) => id),
}));

jest.mock("@/utils/transactions", () => ({
  transactionToDraft: jest.fn((tx: unknown) => tx),
}));

jest.mock("@react-native-google-signin/google-signin", () => ({
  GoogleSignin: { getTokens: jest.fn(() => ({ accessToken: "mock-token" })) },
}));

import { findCompatibleSheets, createBucksSpreadsheet } from "@/api/googleWorkspace";

const mockFind = findCompatibleSheets as jest.Mock;
const mockCreate = createBucksSpreadsheet as jest.Mock;

import {
  combineTransactions,
  hashId,
  ensureTagsInCatalogue,
  findOrCreateSpreadsheet,
  scheduleBackgroundUpload,
  handleOfflineAfterConnect,
} from "@/hooks/connectFlow";

import type { Transaction, Tag } from "@/types";

const makeTx = (overrides: Partial<Transaction> = {}): Transaction => ({
  rowId: 1, date: "15-jan-26", rawDate: "2026-01-15T12:00:00.000Z", amount: 100,
  detail: "Test", type: "INGRESO FRECUENTE", ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe("combineTransactions", () => {
  test("merges local and remote, sorts by rawDate then createdAtMs", () => {
    const local = [
      makeTx({ rowId: 1, rawDate: "2026-01-15T12:00:00.000Z", createdAtMs: 2 }),
      makeTx({ rowId: 2, rawDate: "2026-01-10T12:00:00.000Z", createdAtMs: 1 }),
    ];
    const remote = [
      makeTx({ rowId: 3, rawDate: "2026-01-15T12:00:00.000Z", createdAtMs: 1 }),
    ];
    const result = combineTransactions(local, remote);
    expect(result.map((r) => r.rowId)).toEqual([2, 3, 1]);
  });

  test("returns empty for empty inputs", () => {
    expect(combineTransactions([], [])).toEqual([]);
  });

  test("uses createdAt string fallback when createdAtMs missing", () => {
    const a = makeTx({ rowId: 1, rawDate: "2026-01-15T12:00:00.000Z", createdAt: "2", createdAtMs: undefined });
    const b = makeTx({ rowId: 2, rawDate: "2026-01-15T12:00:00.000Z", createdAt: "1", createdAtMs: undefined });
    expect(combineTransactions([a], [b]).map((r) => r.rowId)).toEqual([2, 1]);
  });
});

describe("hashId", () => {
  test("returns deterministic positive number", () => {
    const h1 = hashId("default-comida");
    const h2 = hashId("default-comida");
    expect(h1).toBe(h2);
    expect(h1).toBeGreaterThanOrEqual(0);
  });

  test("produces different hashes for different inputs", () => {
    expect(hashId("a")).not.toBe(hashId("b"));
  });
});

describe("ensureTagsInCatalogue", () => {
  const currentTags: Tag[] = [
    { id: "default-salud", label: "Salud", color: "#f43f5e" },
  ];

  test("adds default tag not in catalogue", () => {
    const txs = [makeTx({ tags: ["default-comida"] })];
    const result = ensureTagsInCatalogue(txs, currentTags, "es", ["#f59e0b"]);
    expect(result.length).toBe(2);
    expect(result.find((t) => t.id === "default-comida")?.label).toBe("Comida");
  });

  test("adds custom tag not in catalogue", () => {
    const txs = [makeTx({ tags: ["custom-vacaciones"] })];
    const result = ensureTagsInCatalogue(txs, currentTags, "es", ["#888"]);
    expect(result.length).toBe(2);
    expect(result.find((t) => t.id === "custom-vacaciones")).toBeTruthy();
  });

  test("ignores tags already in catalogue", () => {
    const txs = [makeTx({ tags: ["default-salud"] })];
    const result = ensureTagsInCatalogue(txs, currentTags, "es", ["#f43f5e"]);
    expect(result).toBe(currentTags);
  });

  test("handles transactions with no tags", () => {
    const txs = [makeTx({ tags: undefined })];
    expect(ensureTagsInCatalogue(txs, currentTags, "es", [])).toBe(currentTags);
  });
});

describe("findOrCreateSpreadsheet", () => {
  test("returns existing sheet with matching name", async () => {
    mockFind.mockResolvedValueOnce([{ id: "s1", name: "INCOME AND EXPENSES" }]);
    const { sheetId, isNewSheet } = await findOrCreateSpreadsheet("tok");
    expect(sheetId).toBe("s1");
    expect(isNewSheet).toBe(false);
  });

  test("falls back to first candidate when no named match", async () => {
    mockFind.mockResolvedValueOnce([{ id: "s2", name: "My Sheet" }]);
    const { sheetId, isNewSheet } = await findOrCreateSpreadsheet("tok");
    expect(sheetId).toBe("s2");
    expect(isNewSheet).toBe(false);
  });

  test("creates sheet when no candidates exist", async () => {
    mockFind.mockResolvedValueOnce([]);
    mockCreate.mockResolvedValueOnce("new-sheet-id");
    const { sheetId, isNewSheet } = await findOrCreateSpreadsheet("tok");
    expect(sheetId).toBe("new-sheet-id");
    expect(isNewSheet).toBe(true);
  });

  test("creates sheet when candidates is empty array", async () => {
    mockFind.mockResolvedValueOnce([]);
    mockCreate.mockResolvedValueOnce("created-id");
    const { sheetId } = await findOrCreateSpreadsheet("tok");
    expect(sheetId).toBe("created-id");
  });
});

describe("scheduleBackgroundUpload", () => {
  test("queues transactions via syncQueue", async () => {
    let resolveQueue: () => void;
    const queuePromise = new Promise<void>((r) => { resolveQueue = r; });
    const syncQueueRef = { current: queuePromise };
    const setPendingSync = jest.fn();
    const pendingSyncRef = { current: false };
    const reloadFromGoogle = jest.fn().mockResolvedValue(undefined);

    scheduleBackgroundUpload(
      [makeTx()],
      "sheet-1",
      { syncQueueRef, setPendingSync, pendingSyncRef, reloadFromGoogle },
    );

    await new Promise((r) => setTimeout(r, 50));
    resolveQueue!();
    await new Promise((r) => setTimeout(r, 50));

    expect(reloadFromGoogle).toHaveBeenCalled();
  });
});

describe("handleOfflineAfterConnect", () => {
  const deps = {
    syncQueueRef: { current: Promise.resolve() },
    setPendingSync: jest.fn(),
    pendingSyncRef: { current: false },
    reloadFromGoogle: jest.fn(),
  };

  test("returns early when no offline transactions", async () => {
    const sessionSetters = { setConnectionStatus: jest.fn(), setOffline: jest.fn() };
    await handleOfflineAfterConnect(
      [], false, "sheet-1",
      { applyFinancialState: jest.fn(), persistFinancialState: jest.fn(), freqIncomeRef: { current: {} } },
      { tagsListRef: { current: [] }, setTagsList: jest.fn() },
      { tagColors: [], language: "es" },
      deps,
      sessionSetters,
      { current: null },
      { current: { count: 0, txs: [] } },
    );
    expect(sessionSetters.setOffline).toHaveBeenCalledWith(false);
  });
});
