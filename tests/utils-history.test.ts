import { loadHistory, addHistoryEntry, removeHistoryEntry } from "@/utils/history";

const g = globalThis as any;

beforeEach(() => {
  g.__bucksSecureStoreMock.reset();
});

const validTx = {
  rowId: 2,
  date: "15-jan-26",
  rawDate: "2026-01-15T05:00:00.000Z",
  amount: -25,
  detail: "Comida",
  type: "GASTO NO FRECUENTE" as const,
};

describe("loadHistory", () => {
  test("returns empty array when no data stored", async () => {
    const result = await loadHistory();
    expect(result).toEqual([]);
  });

  test("returns parsed entries from store", async () => {
    const entries = [
      { id: "abc", timestamp: new Date().toISOString(), action: "delete" as const, transaction: validTx },
    ];
    await g.__bucksSecureStoreMock.setItemAsync("bucks_history", JSON.stringify(entries));
    const result = await loadHistory();
    expect(result.length).toBe(1);
    expect(result[0].id).toBe("abc");
  });

  test("prunes entries older than 30 days", async () => {
    const old = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString();
    const fresh = new Date().toISOString();
    const entries = [
      { id: "old", timestamp: old, action: "delete" as const, transaction: validTx },
      { id: "new", timestamp: fresh, action: "delete" as const, transaction: validTx },
    ];
    await g.__bucksSecureStoreMock.setItemAsync("bucks_history", JSON.stringify(entries));
    const result = await loadHistory();
    expect(result.length).toBe(1);
    expect(result[0].id).toBe("new");
  });

  test("returns empty on invalid JSON", async () => {
    await g.__bucksSecureStoreMock.setItemAsync("bucks_history", "not json");
    const result = await loadHistory();
    expect(result).toEqual([]);
  });

  test("returns empty when store throws", async () => {
    g.__bucksSecureStoreMock.getError = new Error("locked");
    const result = await loadHistory();
    expect(result).toEqual([]);
  });
});

describe("addHistoryEntry", () => {
  test("adds entry with id and timestamp", async () => {
    const entry = await addHistoryEntry({ action: "delete", transaction: validTx as any });
    expect(entry.id).toBeTruthy();
    expect(entry.timestamp).toBeTruthy();
    expect(entry.action).toBe("delete");
  });

  test("prepends to existing entries", async () => {
    const existing = { id: "old", timestamp: new Date().toISOString(), action: "delete" as const, transaction: validTx };
    await g.__bucksSecureStoreMock.setItemAsync("bucks_history", JSON.stringify([existing]));
    const newEntry = await addHistoryEntry({ action: "delete", transaction: validTx as any });
    const result = await loadHistory();
    expect(result[0].id).toBe(newEntry.id);
  });
});

describe("removeHistoryEntry", () => {
  test("removes entry by id", async () => {
    const entry1 = { id: "e1", timestamp: new Date().toISOString(), action: "delete" as const, transaction: validTx };
    const entry2 = { id: "e2", timestamp: new Date().toISOString(), action: "delete" as const, transaction: validTx };
    await g.__bucksSecureStoreMock.setItemAsync("bucks_history", JSON.stringify([entry1, entry2]));
    await removeHistoryEntry("e1");
    const result = await loadHistory();
    expect(result.length).toBe(1);
    expect(result[0].id).toBe("e2");
  });

  test("handles removing non-existent id", async () => {
    const entry = { id: "e1", timestamp: new Date().toISOString(), action: "delete" as const, transaction: validTx };
    await g.__bucksSecureStoreMock.setItemAsync("bucks_history", JSON.stringify([entry]));
    await removeHistoryEntry("nonexistent");
    const result = await loadHistory();
    expect(result.length).toBe(1);
  });
});

describe("isHistoryEntry validation", () => {
  test("rejects entries with missing id", async () => {
    const entries = [{ timestamp: new Date().toISOString(), action: "delete" as const, transaction: validTx }];
    await g.__bucksSecureStoreMock.setItemAsync("bucks_history", JSON.stringify(entries));
    expect(await loadHistory()).toEqual([]);
  });

  test("rejects entries with missing timestamp", async () => {
    const entries = [{ id: "abc", action: "delete" as const, transaction: validTx }];
    await g.__bucksSecureStoreMock.setItemAsync("bucks_history", JSON.stringify(entries));
    expect(await loadHistory()).toEqual([]);
  });

  test("rejects entries with wrong action type", async () => {
    const entries = [{ id: "abc", timestamp: new Date().toISOString(), action: "edit", transaction: validTx }];
    await g.__bucksSecureStoreMock.setItemAsync("bucks_history", JSON.stringify(entries));
    expect(await loadHistory()).toEqual([]);
  });

  test("rejects entries with missing transaction", async () => {
    const entries = [{ id: "abc", timestamp: new Date().toISOString(), action: "delete" as const }];
    await g.__bucksSecureStoreMock.setItemAsync("bucks_history", JSON.stringify(entries));
    expect(await loadHistory()).toEqual([]);
  });

  test("rejects entries with invalid rowId", async () => {
    const tx = { ...validTx, rowId: NaN };
    const entries = [{ id: "abc", timestamp: new Date().toISOString(), action: "delete" as const, transaction: tx }];
    await g.__bucksSecureStoreMock.setItemAsync("bucks_history", JSON.stringify(entries));
    expect(await loadHistory()).toEqual([]);
  });

  test("rejects entries with invalid rawDate", async () => {
    const tx = { ...validTx, rawDate: "not-a-date" };
    const entries = [{ id: "abc", timestamp: new Date().toISOString(), action: "delete" as const, transaction: tx }];
    await g.__bucksSecureStoreMock.setItemAsync("bucks_history", JSON.stringify(entries));
    expect(await loadHistory()).toEqual([]);
  });

  test("rejects entries with invalid amount", async () => {
    const tx = { ...validTx, amount: NaN };
    const entries = [{ id: "abc", timestamp: new Date().toISOString(), action: "delete" as const, transaction: tx }];
    await g.__bucksSecureStoreMock.setItemAsync("bucks_history", JSON.stringify(entries));
    expect(await loadHistory()).toEqual([]);
  });

  test("rejects entries with invalid detail type", async () => {
    const tx = { ...validTx, detail: 123 };
    const entries = [{ id: "abc", timestamp: new Date().toISOString(), action: "delete" as const, transaction: tx }];
    await g.__bucksSecureStoreMock.setItemAsync("bucks_history", JSON.stringify(entries));
    expect(await loadHistory()).toEqual([]);
  });

  test("rejects entries with invalid type", async () => {
    const tx = { ...validTx, type: "INVALID" };
    const entries = [{ id: "abc", timestamp: new Date().toISOString(), action: "delete" as const, transaction: tx }];
    await g.__bucksSecureStoreMock.setItemAsync("bucks_history", JSON.stringify(entries));
    expect(await loadHistory()).toEqual([]);
  });

  test("rejects non-object values", async () => {
    const entries = ["string", 123, null, true];
    await g.__bucksSecureStoreMock.setItemAsync("bucks_history", JSON.stringify(entries));
    expect(await loadHistory()).toEqual([]);
  });
});
