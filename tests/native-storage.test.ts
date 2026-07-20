describe("nativeStorage", () => {
  const g = globalThis as any;
  const secureStore = g.__bucksSecureStoreMock;
  const fileSystem = g.__bucksFileSystemMock;

  let addHistoryEntry: typeof import("../src/utils/history.ts").addHistoryEntry;
  let loadHistory: typeof import("../src/utils/history.ts").loadHistory;
  let removeHistoryEntry: typeof import("../src/utils/history.ts").removeHistoryEntry;
  let clearPin: typeof import("../src/utils/pin.ts").clearPin;
  let isPinEnabled: typeof import("../src/utils/pin.ts").isPinEnabled;
  let savePin: typeof import("../src/utils/pin.ts").savePin;
  let verifyPin: typeof import("../src/utils/pin.ts").verifyPin;
  let abbreviateTag: typeof import("../src/utils/tags.ts").abbreviateTag;
  let loadTags: typeof import("../src/utils/tags.ts").loadTags;
  let saveTags: typeof import("../src/utils/tags.ts").saveTags;
  let tagTextColor: typeof import("../src/utils/tags.ts").tagTextColor;
  let migrateTagReferences: typeof import("../src/utils/tags.ts").migrateTagReferences;
  let migrateTransactionTags: typeof import("../src/utils/tags.ts").migrateTransactionTags;
  let slugifyTagLabel: typeof import("../src/utils/tags.ts").slugifyTagLabel;
  let labelForTagId: typeof import("../src/utils/tags.ts").labelForTagId;
  let findTagById: typeof import("../src/utils/tags.ts").findTagById;
  let deleteFinancialCache: typeof import("../src/data/localCache.ts").deleteFinancialCache;
  let loadFinancialCache: typeof import("../src/data/localCache.ts").loadFinancialCache;
  let saveFinancialCache: typeof import("../src/data/localCache.ts").saveFinancialCache;

  beforeAll(async () => {
    const hist = await import("../src/utils/history.ts");
    addHistoryEntry = hist.addHistoryEntry;
    loadHistory = hist.loadHistory;
    removeHistoryEntry = hist.removeHistoryEntry;
    const pin = await import("../src/utils/pin.ts");
    clearPin = pin.clearPin;
    isPinEnabled = pin.isPinEnabled;
    savePin = pin.savePin;
    verifyPin = pin.verifyPin;
    const tags = await import("../src/utils/tags.ts");
    abbreviateTag = tags.abbreviateTag;
    loadTags = tags.loadTags;
    saveTags = tags.saveTags;
    tagTextColor = tags.tagTextColor;
    migrateTagReferences = tags.migrateTagReferences;
    migrateTransactionTags = tags.migrateTransactionTags;
    slugifyTagLabel = tags.slugifyTagLabel;
    labelForTagId = tags.labelForTagId;
    findTagById = tags.findTagById;
    const cache = await import("../src/data/localCache.ts");
    deleteFinancialCache = cache.deleteFinancialCache;
    loadFinancialCache = cache.loadFinancialCache;
    saveFinancialCache = cache.saveFinancialCache;
  });

  beforeEach(() => {
    secureStore.reset();
    fileSystem.reset();
  });

  const transaction = {
    rowId: 2,
    date: "15-jan-26",
    rawDate: "2026-01-15T05:00:00.000Z",
    amount: -25,
    detail: "Comida",
    type: "GASTO NO FRECUENTE",
    createdAt: "2026-01-15T12:00:00.000Z",
    tags: ["Comida"],
  } as any;

  const summary = {
    monthYear: "January 2026",
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
    secureStore.values.set("bucks_history", JSON.stringify([
      { id: "valid", timestamp: new Date().toISOString(), action: "delete", transaction },
      { id: "expired", timestamp: "2020-01-01T00:00:00.000Z", action: "delete", transaction },
      { id: "corrupt", timestamp: new Date().toISOString(), action: "delete" },
      { id: "bad-type", timestamp: new Date().toISOString(), action: "delete", transaction: { ...transaction, type: "DESCONOCIDO" } },
    ]));

    expect((await loadHistory()).map(({ id }) => id)).toEqual(["valid"]);
    const added = await addHistoryEntry({ action: "delete", transaction });
    expect(typeof added.id === "string" && added.id.length > 0).toBeTruthy();
    expect((await loadHistory()).map(({ id }) => id)).toEqual([added.id, "valid"]);

    await removeHistoryEntry(added.id);
    expect((await loadHistory()).map(({ id }) => id)).toEqual(["valid"]);
  });

  test("history returns an empty list when secure storage is unreadable", async () => {
    secureStore.getError = new Error("locked");
    expect(await loadHistory()).toEqual([]);
  });

  test("PIN save, verify, and clear stay synchronized", async () => {
    expect(await isPinEnabled()).toBe(false);
    await savePin("1234");
    expect(await isPinEnabled()).toBe(true);
    expect(await verifyPin("1234")).toBe(true);
    expect(await verifyPin("0000")).toBe(false);
    await clearPin();
    expect(await isPinEnabled()).toBe(false);
    expect(await verifyPin("1234")).toBe(false);
  });

  test("tags merge defaults with saved values and deduplicate labels", async () => {
    secureStore.values.set("bucks_tags", JSON.stringify([
      { id: "custom-comida", label: "  Comida  ", color: "#ffffff" },
      { id: "custom", label: "Casa", color: "#000000" },
    ]));

    const tags = await loadTags();
    expect(tags.filter(({ label }) => label === "Comida").length).toBe(1);
    expect(tags.find(({ label }) => label === "Comida")!.id).toBe("custom-comida");
    expect(tags.some(({ label }) => label === "Casa")).toBeTruthy();
    expect(abbreviateTag("Trabajo")).toBe("Traba.");
    expect(tagTextColor("#ffffff")).toBe("#18202d");
    expect(tagTextColor("#000000")).toBe("#ffffff");

    await saveTags(tags);
    expect(JSON.parse(secureStore.values.get("bucks_tags"))).toEqual(tags);
  });

  test("tags read from SecureStore and translate defaults to current language", async () => {
    secureStore.values.set("bucks_tags", JSON.stringify([
      { id: "default-comida", label: "Comida", color: "#ffffff" },
      { id: "custom", label: "Home", color: "#000000" },
    ]));

    const tags = await loadTags("en");
    expect(tags.some(({ label }) => label === "Home")).toBeTruthy();
    expect(tags.some(({ label }) => label === "Food")).toBeTruthy();
    expect(tags.some(({ id }) => id === "default-comida")).toBeTruthy();
  });

  test("tags return defaults when saved JSON is corrupt", async () => {
    secureStore.values.set("bucks_tags", "not json");
    const tags = await loadTags();
    expect(tags.length).toEqual(6);
    expect(tags[0].id).toEqual("default-salud");
  });

  test("financial cache round-trips valid data and respects spreadsheet ownership", async () => {
    const cache = {
      spreadsheetId: "sheet-1",
      lastSyncedAt: "2026-01-15T12:00:00.000Z",
      transactions: [transaction],
      summaries: [summary],
      freqIncome: { "January 2026": 100 },
    };
    await saveFinancialCache(cache);
    expect(await loadFinancialCache("sheet-1")).toEqual({ ...cache, schemaVersion: 3 });
    expect(await loadFinancialCache("sheet-2")).toBeNull();

    await deleteFinancialCache();
    expect(await loadFinancialCache("sheet-1")).toBeNull();
  });

  test("financial cache rejects malformed JSON and corrupt nested records", async () => {
    fileSystem.files.set("mock://document/bucks-finance-cache.json", "not json");
    expect(await loadFinancialCache("sheet-1")).toBeNull();

    fileSystem.files.set("mock://document/bucks-finance-cache.json", JSON.stringify({
      schemaVersion: 1,
      spreadsheetId: "sheet-1",
      lastSyncedAt: null,
      transactions: [{}],
      summaries: [summary],
      freqIncome: {},
    }));
    expect(await loadFinancialCache("sheet-1")).toBeNull();
  });

  test("financial cache rejects summary with invalid numeric fields", async () => {
    fileSystem.files.set("mock://document/bucks-finance-cache.json", JSON.stringify({
      schemaVersion: 1,
      spreadsheetId: "sheet-1",
      lastSyncedAt: null,
      transactions: [],
      summaries: [{ monthYear: "Jan 2026", freqIncome: NaN, nonFreqIncome: 0, totalIncome: 0, freqExpense: 0, nonFreqExpense: 0, totalExpense: 0, netMonthly: 0, netNoFreq: 0 }],
      freqIncome: {},
    }));
    expect(await loadFinancialCache("sheet-1")).toBeNull();
  });

  test("financial cache rejects summary with missing monthYear", async () => {
    fileSystem.files.set("mock://document/bucks-finance-cache.json", JSON.stringify({
      schemaVersion: 1,
      spreadsheetId: "sheet-1",
      lastSyncedAt: null,
      transactions: [],
      summaries: [{ freqIncome: 0, nonFreqIncome: 0, totalIncome: 0, freqExpense: 0, nonFreqExpense: 0, totalExpense: 0, netMonthly: 0, netNoFreq: 0 }],
      freqIncome: {},
    }));
    expect(await loadFinancialCache("sheet-1")).toBeNull();
  });

  test("financial cache rejects non-object summary", async () => {
    fileSystem.files.set("mock://document/bucks-finance-cache.json", JSON.stringify({
      schemaVersion: 1,
      spreadsheetId: "sheet-1",
      lastSyncedAt: null,
      transactions: [],
      summaries: ["invalid"],
      freqIncome: {},
    }));
    expect(await loadFinancialCache("sheet-1")).toBeNull();
  });

  test("financial cache rejects transaction with invalid createdAt type", async () => {
    fileSystem.files.set("mock://document/bucks-finance-cache.json", JSON.stringify({
      schemaVersion: 1,
      spreadsheetId: "sheet-1",
      lastSyncedAt: null,
      transactions: [{
        rowId: 2, date: "15-jan-26", rawDate: "2026-01-15T05:00:00.000Z",
        amount: -25, detail: "Test", type: "GASTO NO FRECUENTE",
        createdAt: 12345,
      }],
      summaries: [summary],
      freqIncome: {},
    }));
    expect(await loadFinancialCache("sheet-1")).toBeNull();
  });

  test("financial cache rejects transaction with invalid tags type", async () => {
    fileSystem.files.set("mock://document/bucks-finance-cache.json", JSON.stringify({
      schemaVersion: 1,
      spreadsheetId: "sheet-1",
      lastSyncedAt: null,
      transactions: [{
        rowId: 2, date: "15-jan-26", rawDate: "2026-01-15T05:00:00.000Z",
        amount: -25, detail: "Test", type: "GASTO NO FRECUENTE",
        tags: "not-an-array",
      }],
      summaries: [summary],
      freqIncome: {},
    }));
    expect(await loadFinancialCache("sheet-1")).toBeNull();
  });

  test("financial cache rejects transaction with invalid formula type", async () => {
    fileSystem.files.set("mock://document/bucks-finance-cache.json", JSON.stringify({
      schemaVersion: 1,
      spreadsheetId: "sheet-1",
      lastSyncedAt: null,
      transactions: [{
        rowId: 2, date: "15-jan-26", rawDate: "2026-01-15T05:00:00.000Z",
        amount: -25, detail: "Test", type: "GASTO NO FRECUENTE",
        formula: 123,
      }],
      summaries: [summary],
      freqIncome: {},
    }));
    expect(await loadFinancialCache("sheet-1")).toBeNull();
  });

  test("financial cache rejects freqIncome with non-number values", async () => {
    fileSystem.files.set("mock://document/bucks-finance-cache.json", JSON.stringify({
      schemaVersion: 1,
      spreadsheetId: "sheet-1",
      lastSyncedAt: null,
      transactions: [],
      summaries: [],
      freqIncome: { "Jan 2026": "not-a-number" },
    }));
    expect(await loadFinancialCache("sheet-1")).toBeNull();
  });

  test("financial cache rejects freqIncome with Infinity", async () => {
    fileSystem.files.set("mock://document/bucks-finance-cache.json", JSON.stringify({
      schemaVersion: 1,
      spreadsheetId: "sheet-1",
      lastSyncedAt: null,
      transactions: [],
      summaries: [],
      freqIncome: { "Jan 2026": Infinity },
    }));
    expect(await loadFinancialCache("sheet-1")).toBeNull();
  });

  test("financial cache accepts valid empty cache shape", async () => {
    fileSystem.files.set("mock://document/bucks-finance-cache.json", JSON.stringify({
      schemaVersion: 3,
      spreadsheetId: "sheet-1",
      lastSyncedAt: null,
      transactions: [],
      summaries: [],
      freqIncome: {},
    }));
    const result = await loadFinancialCache("sheet-1");
    expect(result).toBeTruthy();
    expect(result!.schemaVersion).toBe(3);
  });

  test("financial cache accepts transaction with valid formula", async () => {
    fileSystem.files.set("mock://document/bucks-finance-cache.json", JSON.stringify({
      schemaVersion: 1,
      spreadsheetId: "sheet-1",
      lastSyncedAt: null,
      transactions: [{
        rowId: 2, date: "15-jan-26", rawDate: "2026-01-15T05:00:00.000Z",
        amount: -25, detail: "Test", type: "GASTO NO FRECUENTE",
        formula: "10+15",
      }],
      summaries: [],
      freqIncome: {},
    }));
    const result = await loadFinancialCache("sheet-1");
    expect(result).toBeTruthy();
  });

  test("financial cache rejects cache with non-array transactions", async () => {
    fileSystem.files.set("mock://document/bucks-finance-cache.json", JSON.stringify({
      schemaVersion: 1,
      spreadsheetId: "sheet-1",
      lastSyncedAt: null,
      transactions: "not-an-array",
      summaries: [],
      freqIncome: {},
    }));
    expect(await loadFinancialCache("sheet-1")).toBeNull();
  });

  test("financial cache rejects cache with non-array summaries", async () => {
    fileSystem.files.set("mock://document/bucks-finance-cache.json", JSON.stringify({
      schemaVersion: 1,
      spreadsheetId: "sheet-1",
      lastSyncedAt: null,
      transactions: [],
      summaries: "not-an-array",
      freqIncome: {},
    }));
    expect(await loadFinancialCache("sheet-1")).toBeNull();
  });

  test("financial cache rejects cache with non-string spreadsheetId", async () => {
    fileSystem.files.set("mock://document/bucks-finance-cache.json", JSON.stringify({
      schemaVersion: 1,
      spreadsheetId: 123,
      lastSyncedAt: null,
      transactions: [],
      summaries: [],
      freqIncome: {},
    }));
    expect(await loadFinancialCache("sheet-1")).toBeNull();
  });

  test("financial cache rejects cache with non-string lastSyncedAt", async () => {
    fileSystem.files.set("mock://document/bucks-finance-cache.json", JSON.stringify({
      schemaVersion: 1,
      spreadsheetId: "sheet-1",
      lastSyncedAt: 123,
      transactions: [],
      summaries: [],
      freqIncome: {},
    }));
    expect(await loadFinancialCache("sheet-1")).toBeNull();
  });

  test("financial cache rejects cache with non-object freqIncome", async () => {
    fileSystem.files.set("mock://document/bucks-finance-cache.json", JSON.stringify({
      schemaVersion: 1,
      spreadsheetId: "sheet-1",
      lastSyncedAt: null,
      transactions: [],
      summaries: [],
      freqIncome: "not-an-object",
    }));
    expect(await loadFinancialCache("sheet-1")).toBeNull();
  });

  test("financial cache rejects transaction with invalid lineItems structure", async () => {
    fileSystem.files.set("mock://document/bucks-finance-cache.json", JSON.stringify({
      schemaVersion: 1,
      spreadsheetId: "sheet-1",
      lastSyncedAt: "2026-01-15T12:00:00.000Z",
      transactions: [{
        rowId: 2, date: "15-jan-26", rawDate: "2026-01-15T05:00:00.000Z",
        amount: -25, detail: "Test", type: "GASTO NO FRECUENTE",
        lineItems: [{ id: "li-1", amount: "bad", description: "X", tags: "not-array" }],
      }],
      summaries: [summary],
      freqIncome: {},
    }));
    expect(await loadFinancialCache("sheet-1")).toBeNull();
  });

  test("financial cache accepts transaction with valid lineItems", async () => {
    fileSystem.files.set("mock://document/bucks-finance-cache.json", JSON.stringify({
      schemaVersion: 1,
      spreadsheetId: "sheet-1",
      lastSyncedAt: "2026-01-15T12:00:00.000Z",
      transactions: [{
        rowId: 2, date: "15-jan-26", rawDate: "2026-01-15T05:00:00.000Z",
        amount: -25, detail: "Test", type: "GASTO NO FRECUENTE",
        lineItems: [{ id: "li-1", amount: 25, description: "X", tags: [] }],
      }],
      summaries: [summary],
      freqIncome: {},
    }));
    const cache = await loadFinancialCache("sheet-1");
    expect(cache).toBeTruthy();
    expect(cache!.transactions.length).toBe(1);
  });

  test("financial cache exposes write failures instead of reporting a false save", async () => {
    fileSystem.writeError = new Error("disk full");
    await expect(
      saveFinancialCache({ spreadsheetId: "sheet-1", lastSyncedAt: null, transactions: [], summaries: [], freqIncome: {} }),
    ).rejects.toThrow(/disk full/);
  });

  const tagsCatalog = [
    { id: "default-comida", label: "Comida", color: "#111111" },
    { id: "default-salud", label: "Salud", color: "#222222" },
    { id: "custom-vacaciones", label: "Vacaciones", color: "#333333" },
  ];

  test("slugifyTagLabel produces stable id from label", () => {
    expect(slugifyTagLabel("Mi Tag Personal")).toBe("custom-mi-tag-personal");
    expect(slugifyTagLabel("Café & Paseo")).toBe("custom-cafe-paseo");
    expect(slugifyTagLabel("")).toBe("custom-");
    expect(slugifyTagLabel("Educación")).toBe("custom-educacion");
  });

  test("migrateTagReferences resolves existing ids unchanged", () => {
    const result = migrateTagReferences(["default-comida", "custom-vacaciones"], tagsCatalog);
    expect(result).toEqual(["default-comida", "custom-vacaciones"]);
  });

  test("migrateTagReferences migrates legacy labels to ids keeping color via id", () => {
    const result = migrateTagReferences(["Food", "Vacaciones"], tagsCatalog);
    expect(result).toEqual(["default-comida", "custom-vacaciones"]);
  });

  test("migrateTagReferences creates orphan id for unknown label preserving the text", () => {
    const result = migrateTagReferences(["Bono extra"], tagsCatalog);
    expect(result).toEqual(["custom-bono-extra"]);
  });

  test("migrateTagReferences deduplicates when legacy and id point to the same tag", () => {
    const result = migrateTagReferences(["Comida", "default-comida"], tagsCatalog);
    expect(result).toEqual(["default-comida"]);
  });

  test("migrateTagReferences handles empty input safely", () => {
    expect(migrateTagReferences([], tagsCatalog)).toEqual([]);
    expect(migrateTagReferences(["Comida"], [])).toEqual(["Comida"]);
  });

  test("labelForTagId falls back to id when tag was deleted", () => {
    expect(labelForTagId("default-comida", tagsCatalog)).toBe("Comida");
    expect(labelForTagId("ghost-id", tagsCatalog)).toBe("ghost-id");
  });

  test("findTagById returns the tag or undefined", () => {
    expect(findTagById("default-comida", tagsCatalog)).toEqual(tagsCatalog[0]);
    expect(findTagById("ghost", tagsCatalog)).toBeUndefined();
  });

  test("migrateTransactionTags resolves legacy labels to ids without touching unrelated rows", () => {
    const txs = [
      { rowId: 1, date: "", rawDate: "", amount: 0, detail: "A", type: "GASTO FRECUENTE", createdAt: "", tags: ["Comida"] },
      { rowId: 2, date: "", rawDate: "", amount: 0, detail: "B", type: "GASTO FRECUENTE", createdAt: "", tags: ["default-comida"] },
      { rowId: 3, date: "", rawDate: "", amount: 0, detail: "C", type: "INGRESO FRECUENTE", createdAt: "" },
    ] as any;
    const migrated = migrateTransactionTags(txs, tagsCatalog);
    expect(migrated[0].tags![0]).toBe("default-comida");
    expect(migrated[1].tags![0]).toBe("default-comida");
    expect(migrated[2].tags).toBeUndefined();
  });

  test("migrateTransactionTags returns the same array when nothing changes", () => {
    const txs = [
      { rowId: 1, date: "", rawDate: "", amount: 0, detail: "A", type: "GASTO FRECUENTE", createdAt: "", tags: ["default-comida"] },
    ] as any;
    expect(migrateTransactionTags(txs, tagsCatalog)).toBe(txs);
  });

  // ─── Offline cache ────────────────────────────────────────────────

  test("loadOfflineCache returns null when file does not exist", async () => {
    const { loadOfflineCache } = await import("../src/data/localCache");
    expect(await loadOfflineCache()).toBeNull();
  });

  test("loadOfflineCache returns parsed data when file exists", async () => {
    const { loadOfflineCache, saveOfflineCache } = await import("../src/data/localCache");
    await saveOfflineCache([], [], {});
    const result = await loadOfflineCache();
    expect(result).toBeTruthy();
    expect(result!.transactions).toEqual([]);
  });

  test("loadOfflineCache returns null for corrupt JSON", async () => {
    fileSystem.files.set("mock://document/bucks-offline-cache.json", "not-json");
    const { loadOfflineCache } = await import("../src/data/localCache");
    expect(await loadOfflineCache()).toBeNull();
  });

  test("loadOfflineCache returns null for invalid shape", async () => {
    fileSystem.files.set("mock://document/bucks-offline-cache.json", JSON.stringify({ schemaVersion: 3, transactions: "bad", summaries: [], freqIncome: {} }));
    const { loadOfflineCache } = await import("../src/data/localCache");
    expect(await loadOfflineCache()).toBeNull();
  });

  test("deleteOfflineCache removes the file", async () => {
    const { deleteOfflineCache, loadOfflineCache, saveOfflineCache } = await import("../src/data/localCache");
    await saveOfflineCache([], [], {});
    await deleteOfflineCache();
    expect(await loadOfflineCache()).toBeNull();
  });
});
