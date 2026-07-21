jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
}));

import * as SecureStore from "expo-secure-store";
import { loadCurrentHistory, mergeHistoryFromSheet } from "@/utils/history";
import type { HistoryEntry, Transaction } from "@/types";

const mockGetItem = SecureStore.getItemAsync as jest.Mock;

const validEntry = (overrides: Partial<HistoryEntry> = {}): HistoryEntry => ({
  id: "test-id",
  timestamp: new Date().toISOString(),
  action: "delete" as const,
  transaction: {
    rowId: 1,
    date: "15-ene-26",
    rawDate: "2026-01-15T12:00:00.000Z",
    amount: -50,
    detail: "Test",
    type: "GASTO NO FRECUENTE",
  } as Transaction,
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockGetItem.mockResolvedValue(null);
});

describe("loadCurrentHistory", () => {
  test("delegates to loadHistory and returns empty when no data", async () => {
    const result = await loadCurrentHistory();
    expect(result).toEqual([]);
  });

  test("delegates to loadHistory and returns parsed entries", async () => {
    const entries = [validEntry()];
    mockGetItem.mockResolvedValue(JSON.stringify(entries));
    const result = await loadCurrentHistory();
    expect(result.length).toBe(1);
    expect(result[0].id).toBe("test-id");
  });
});

describe("mergeHistoryFromSheet", () => {
  test("returns localEntries when sheetEntries is empty", () => {
    const local = [validEntry({ id: "local-1" })];
    const result = mergeHistoryFromSheet(local, []);
    expect(result).toEqual(local);
  });

  test("returns pruned sheetEntries when localEntries is empty", () => {
    const sheet = [validEntry({ id: "sheet-1" })];
    const result = mergeHistoryFromSheet([], sheet);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("sheet-1");
  });

  test("merges by id, sheet wins duplicates", () => {
    const local = [validEntry({ id: "dup-id" })];
    const sheet = [
      validEntry({ id: "dup-id" }),
      validEntry({ id: "sheet-only" }),
    ];
    const result = mergeHistoryFromSheet(local, sheet);
    expect(result).toHaveLength(2);
    expect(result.some((e) => e.id === "dup-id")).toBeTruthy();
    expect(result.some((e) => e.id === "sheet-only")).toBeTruthy();
  });

  test("filters expired entries after merge", async () => {
    const oldDate = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
    const local = [validEntry({ id: "recent" })];
    const sheet = [validEntry({ id: "expired", timestamp: oldDate })];
    const result = mergeHistoryFromSheet(local, sheet);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("recent");
  });
});
