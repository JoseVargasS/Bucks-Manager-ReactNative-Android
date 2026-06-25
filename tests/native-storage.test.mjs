import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { fileSystemMock, secureStoreMock } from "./setup.mjs";

const { addHistoryEntry, loadHistory, removeHistoryEntry } = await import("../src/utils/history.ts");
const { clearPin, isPinEnabled, savePin, verifyPin } = await import("../src/utils/pin.ts");
const { abbreviateTag, loadTags, saveTags, tagTextColor } = await import("../src/utils/tags.ts");
const { deleteFinancialCache, loadFinancialCache, saveFinancialCache } = await import("../src/data/localCache.ts");

beforeEach(() => {
  secureStoreMock.reset();
  fileSystemMock.reset();
});

const transaction = {
  rowId: 2,
  date: "15-ene-26",
  rawDate: "2026-01-15T05:00:00.000Z",
  amount: -25,
  detail: "Comida",
  type: "GASTO NO FRECUENTE",
  createdAt: "2026-01-15T12:00:00.000Z",
  tags: ["Comida"],
};

const summary = {
  monthYear: "Enero 2026",
  freqIncome: 100,
  nonFreqIncome: 0,
  totalIncome: 100,
  freqExpense: 0,
  nonFreqExpense: -25,
  totalExpense: -25,
  netMonthly: 75,
  netNoFreq: -25,
};

test("history ignores expired or corrupt entries and persists add/remove flows", async () => {
  secureStoreMock.values.set("bucks_history", JSON.stringify([
    { id: "valid", timestamp: new Date().toISOString(), action: "delete", transaction },
    { id: "expired", timestamp: "2020-01-01T00:00:00.000Z", action: "delete", transaction },
    { id: "corrupt", timestamp: new Date().toISOString(), action: "delete" },
    { id: "bad-type", timestamp: new Date().toISOString(), action: "delete", transaction: { ...transaction, type: "DESCONOCIDO" } },
  ]));

  assert.deepEqual((await loadHistory()).map(({ id }) => id), ["valid"]);
  const added = await addHistoryEntry({ action: "create", transaction });
  assert.match(added.id, /^[0-9a-f-]{36}$/i);
  assert.deepEqual((await loadHistory()).map(({ id }) => id), [added.id, "valid"]);

  await removeHistoryEntry(added.id);
  assert.deepEqual((await loadHistory()).map(({ id }) => id), ["valid"]);
});

test("history returns an empty list when secure storage is unreadable", async () => {
  secureStoreMock.getError = new Error("locked");
  assert.deepEqual(await loadHistory(), []);
});

test("PIN save, verify, and clear stay synchronized", async () => {
  assert.equal(await isPinEnabled(), false);
  await savePin("1234");
  assert.equal(await isPinEnabled(), true);
  assert.equal(await verifyPin("1234"), true);
  assert.equal(await verifyPin("0000"), false);
  await clearPin();
  assert.equal(await isPinEnabled(), false);
  assert.equal(await verifyPin("1234"), false);
});

test("tags merge defaults with saved values and deduplicate labels", async () => {
  secureStoreMock.values.set("bucks_tags", JSON.stringify([
    { id: "custom-comida", label: "  Comida  ", color: "#ffffff" },
    { id: "custom", label: "Casa", color: "#000000" },
  ]));

  const tags = await loadTags();
  assert.equal(tags.filter(({ label }) => label === "Comida").length, 1);
  assert.equal(tags.find(({ label }) => label === "Comida").id, "custom-comida");
  assert.ok(tags.some(({ label }) => label === "Casa"));
  assert.equal(abbreviateTag("Trabajo"), "Traba.");
  assert.equal(tagTextColor("#ffffff"), "#18202d");
  assert.equal(tagTextColor("#000000"), "#ffffff");

  await saveTags(tags);
  assert.deepEqual(JSON.parse(secureStoreMock.values.get("bucks_tags")), tags);
});

test("tags localize default labels for English", async () => {
  secureStoreMock.values.set("bucks_tags", JSON.stringify([
    { id: "default-comida", label: "Comida", color: "#ffffff" },
    { id: "custom", label: "Home", color: "#000000" },
  ]));

  const tags = await loadTags("en");
  assert.ok(tags.some(({ label }) => label === "Food"));
  assert.ok(tags.some(({ label }) => label === "Health"));
  assert.ok(tags.some(({ label }) => label === "Home"));
  assert.equal(tags.some(({ label }) => label === "Comida"), false);
});

test("tags fall back to defaults when saved JSON is corrupt", async () => {
  secureStoreMock.values.set("bucks_tags", "not json");
  const tags = await loadTags();
  assert.ok(tags.length >= 6);
  assert.ok(tags.some(({ label }) => label === "Salud"));
});

test("financial cache round-trips valid data and respects spreadsheet ownership", async () => {
  const cache = {
    spreadsheetId: "sheet-1",
    lastSyncedAt: "2026-01-15T12:00:00.000Z",
    transactions: [transaction],
    summaries: [summary],
    freqIncome: { "Enero 2026": 100 },
  };
  await saveFinancialCache(cache);
  assert.deepEqual(await loadFinancialCache("sheet-1"), { ...cache, schemaVersion: 1 });
  assert.equal(await loadFinancialCache("sheet-2"), null);

  await deleteFinancialCache();
  assert.equal(await loadFinancialCache("sheet-1"), null);
});

test("financial cache rejects malformed JSON and corrupt nested records", async () => {
  fileSystemMock.files.set("mock://document/bucks-finance-cache.json", "not json");
  assert.equal(await loadFinancialCache("sheet-1"), null);

  fileSystemMock.files.set("mock://document/bucks-finance-cache.json", JSON.stringify({
    schemaVersion: 1,
    spreadsheetId: "sheet-1",
    lastSyncedAt: null,
    transactions: [{}],
    summaries: [summary],
    freqIncome: {},
  }));
  assert.equal(await loadFinancialCache("sheet-1"), null);
});

test("financial cache exposes write failures instead of reporting a false save", async () => {
  fileSystemMock.writeError = new Error("disk full");
  await assert.rejects(
    saveFinancialCache({ spreadsheetId: "sheet-1", lastSyncedAt: null, transactions: [], summaries: [], freqIncome: {} }),
    /disk full/,
  );
});
