describe("transactions", () => {
  let getBlankDraft: typeof import("../src/utils/transactions").getBlankDraft;
  let sortTransactionsDesc: typeof import("../src/utils/transactions").sortTransactionsDesc;
  let filterTransactionsByRollingPeriod: typeof import("../src/utils/transactions").filterTransactionsByRollingPeriod;
  let groupTransactionsByDate: typeof import("../src/utils/transactions").groupTransactionsByDate;
  let transactionToDraft: typeof import("../src/utils/transactions").transactionToDraft;
  let computeLineItemsTotal: typeof import("../src/utils/transactions").computeLineItemsTotal;

  beforeAll(async () => {
    const mod = await import("../src/utils/transactions");
    getBlankDraft = mod.getBlankDraft;
    sortTransactionsDesc = mod.sortTransactionsDesc;
    filterTransactionsByRollingPeriod = mod.filterTransactionsByRollingPeriod;
    groupTransactionsByDate = mod.groupTransactionsByDate;
    transactionToDraft = mod.transactionToDraft;
    computeLineItemsTotal = mod.computeLineItemsTotal;
  });

  // --- getBlankDraft ---
  test("getBlankDraft creates empty draft with default type", () => {
    const draft = getBlankDraft();
    expect(draft.type).toBe("GASTO NO FRECUENTE");
    expect(draft.amount).toBe("");
    expect(draft.detail).toBe("");
    expect(draft.date).toBeTruthy();
  });

  test("getBlankDraft creates draft with specified type", () => {
    const draft = getBlankDraft("INGRESO FRECUENTE");
    expect(draft.type).toBe("INGRESO FRECUENTE");
  });

  // --- sortTransactionsDesc ---
  test("sortTransactionsDesc sorts by date descending", () => {
    const transactions = [
      {
        rowId: 1,
        rawDate: "2026-01-10T12:00:00.000Z",
        amount: 100,
        detail: "A",
        type: "INGRESO FRECUENTE",
        createdAt: "",
      },
      {
        rowId: 2,
        rawDate: "2026-01-15T12:00:00.000Z",
        amount: -50,
        detail: "B",
        type: "GASTO NO FRECUENTE",
        createdAt: "",
      },
      {
        rowId: 3,
        rawDate: "2026-01-12T12:00:00.000Z",
        amount: -30,
        detail: "C",
        type: "GASTO FRECUENTE",
        createdAt: "",
      },
    ];
    const sorted = sortTransactionsDesc(transactions as any);
    expect(sorted.map((t) => t.rowId)).toEqual([2, 3, 1]);
  });

  test("sortTransactionsDesc resolves ties by createdAt", () => {
    const transactions = [
      {
        rowId: 1,
        rawDate: "2026-01-15T12:00:00.000Z",
        amount: 100,
        detail: "A",
        type: "INGRESO FRECUENTE",
        createdAt: "2026-01-15T08:00:00.000Z",
      },
      {
        rowId: 2,
        rawDate: "2026-01-15T12:00:00.000Z",
        amount: -50,
        detail: "B",
        type: "GASTO NO FRECUENTE",
        createdAt: "2026-01-15T12:00:00.000Z",
      },
      {
        rowId: 3,
        rawDate: "2026-01-15T12:00:00.000Z",
        amount: -30,
        detail: "C",
        type: "GASTO FRECUENTE",
        createdAt: "2026-01-15T11:00:00.000Z",
      },
    ];
    const sorted = sortTransactionsDesc(transactions as any);
    expect(sorted.map((t) => t.rowId)).toEqual([2, 3, 1]);
  });

  test("sortTransactionsDesc resolves ties by original index when createdAt matches", () => {
    const transactions = [
      {
        rowId: 1,
        rawDate: "2026-01-15T12:00:00.000Z",
        amount: 100,
        detail: "A",
        type: "INGRESO FRECUENTE",
        createdAt: "10:00:00",
      },
      {
        rowId: 2,
        rawDate: "2026-01-15T12:00:00.000Z",
        amount: -50,
        detail: "B",
        type: "GASTO NO FRECUENTE",
        createdAt: "10:00:00",
      },
    ];
    const sorted = sortTransactionsDesc(transactions as any);
    expect(sorted.map((t) => t.rowId)).toEqual([1, 2]);
  });

  // --- filterTransactionsByRollingPeriod ---
  test("filterTransactionsByRollingPeriod filters by 1-month window", () => {
    const transactions = [
      {
        rowId: 1,
        rawDate: "2025-12-15T12:00:00.000Z",
        amount: 100,
        detail: "A",
        type: "INGRESO FRECUENTE",
        createdAt: "",
      },
      {
        rowId: 2,
        rawDate: "2026-01-10T12:00:00.000Z",
        amount: -50,
        detail: "B",
        type: "GASTO NO FRECUENTE",
        createdAt: "",
      },
      {
        rowId: 3,
        rawDate: "2026-01-20T12:00:00.000Z",
        amount: -30,
        detail: "C",
        type: "GASTO FRECUENTE",
        createdAt: "",
      },
      {
        rowId: 4,
        rawDate: "2026-02-05T12:00:00.000Z",
        amount: 200,
        detail: "D",
        type: "INGRESO NO FRECUENTE",
        createdAt: "",
      },
    ];
    const filtered = filterTransactionsByRollingPeriod(transactions as any, 0, 2026, 1);
    expect(filtered.length).toBe(2);
    expect(filtered.map((t) => t.rowId)).toEqual([2, 3]);
  });

  test("filterTransactionsByRollingPeriod includes multiple months", () => {
    const transactions = [
      {
        rowId: 1,
        rawDate: "2025-12-15T12:00:00.000Z",
        amount: 100,
        detail: "A",
        type: "INGRESO FRECUENTE",
        createdAt: "",
      },
      {
        rowId: 2,
        rawDate: "2026-01-10T12:00:00.000Z",
        amount: -50,
        detail: "B",
        type: "GASTO NO FRECUENTE",
        createdAt: "",
      },
      {
        rowId: 3,
        rawDate: "2026-02-20T12:00:00.000Z",
        amount: -30,
        detail: "C",
        type: "GASTO FRECUENTE",
        createdAt: "",
      },
    ];
    const filtered = filterTransactionsByRollingPeriod(transactions as any, 1, 2026, 3);
    expect(filtered.length).toBe(3);
  });

  test("filterTransactionsByRollingPeriod returns empty array for no matches", () => {
    const transactions = [
      {
        rowId: 1,
        rawDate: "2025-01-15T12:00:00.000Z",
        amount: 100,
        detail: "A",
        type: "INGRESO FRECUENTE",
        createdAt: "",
      },
    ];
    const filtered = filterTransactionsByRollingPeriod(transactions as any, 6, 2026, 1);
    expect(filtered.length).toBe(0);
  });

  // --- groupTransactionsByDate ---
  test("groupTransactionsByDate groups transactions by ISO date", () => {
    const transactions = [
      {
        rowId: 1,
        rawDate: "2026-06-15T12:00:00.000Z",
        amount: 100,
        detail: "A",
        type: "INGRESO FRECUENTE",
        createdAt: "",
      },
      {
        rowId: 2,
        rawDate: "2026-06-15T12:00:00.000Z",
        amount: -50,
        detail: "B",
        type: "GASTO NO FRECUENTE",
        createdAt: "",
      },
      {
        rowId: 3,
        rawDate: "2026-06-16T12:00:00.000Z",
        amount: -30,
        detail: "C",
        type: "GASTO FRECUENTE",
        createdAt: "",
      },
    ];
    const groups = groupTransactionsByDate(transactions as any);
    expect(groups.length).toBe(2);
    expect(groups[0].key).toBe("2026-06-15");
    expect(groups[0].items.length).toBe(2);
    expect(groups[1].key).toBe("2026-06-16");
    expect(groups[1].items.length).toBe(1);
  });

  test("groupTransactionsByDate preserves the input order inside each group", () => {
    const transactions = [
      {
        rowId: 1,
        rawDate: "2026-06-15T08:00:00.000Z",
        amount: 100,
        detail: "A",
        type: "INGRESO FRECUENTE",
        createdAt: "08:00:00",
      },
      {
        rowId: 2,
        rawDate: "2026-06-15T10:00:00.000Z",
        amount: -50,
        detail: "B",
        type: "GASTO NO FRECUENTE",
        createdAt: "10:00:00",
      },
    ];
    const groups = groupTransactionsByDate(transactions as any);
    expect(groups[0].items.length).toBe(2);
    expect(groups[0].items.map((t) => t.rowId)).toEqual([1, 2]);
  });

  test("groupTransactionsByDate generates correct labels", () => {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const transactions = [
      {
        rowId: 1,
        rawDate: today.toISOString(),
        amount: 100,
        detail: "A",
        type: "INGRESO FRECUENTE",
        createdAt: "",
      },
    ];
    const groups = groupTransactionsByDate(transactions as any);
    expect(
      groups[0].label.includes("HOY") || groups[0].label.includes("TODAY"),
    ).toBeTruthy();
  });

  // --- transactionToDraft ---

  test("transactionToDraft converts simple transaction to draft", () => {
    const tx = {
      rowId: 2, date: "15-jan-26", rawDate: "2026-01-15T05:00:00.000Z",
      amount: -25, detail: "Comida del día", type: "GASTO NO FRECUENTE",
      createdAt: "2026-01-15T12:00:00.000Z", tags: [],
    };
    const draft: any = transactionToDraft(tx as any);
    expect(draft.date).toBe("2026-01-15");
    expect(draft.amount).toBe("25");
    expect(draft.detail).toBe("Comida del día");
    expect(draft.type).toBe("GASTO NO FRECUENTE");
    expect(draft.concepto).toBe("Comida del día");
    expect(draft.lineItems?.length).toBe(1);
    expect(draft.lineItems[0].amount).toBe("25");
    expect(draft.lineItems[0].description).toBe("");
  });

  test("transactionToDraft with lineItems extracts concepto", () => {
    const tx: any = {
      rowId: 2, date: "15-jan-26", rawDate: "2026-01-15T05:00:00.000Z",
      amount: -50, detail: "Supermercado: frutas, verduras",
      type: "GASTO NO FRECUENTE", createdAt: "", tags: [],
      lineItems: [
        { id: "li-1", amount: -30, description: "Frutas", tags: [], formula: "10+20" },
        { id: "li-2", amount: -20, description: "Verduras", tags: ["default-comida"] },
      ],
    };
    const draft: any = transactionToDraft(tx);
    expect(draft.concepto).toBe("Supermercado");
    expect(draft.lineItems.length).toBe(2);
    expect(draft.lineItems[0].amount).toBe("=10+20");
    expect(draft.lineItems[0].description).toBe("Frutas");
    expect(draft.lineItems[1].amount).toBe("20");
  });

  test("transactionToDraft handles formula in amount", () => {
    const tx = {
      rowId: 3, date: "20-feb-26", rawDate: "2026-02-20T05:00:00.000Z",
      amount: 100, detail: "Venta", type: "INGRESO FRECUENTE",
      createdAt: "", tags: [], formula: "50+50",
    };
    const draft: any = transactionToDraft(tx as any);
    expect(draft.amount).toBe("=50+50");
    expect(draft.lineItems[0].amount).toBe("=50+50");
  });

  // --- computeLineItemsTotal ---
  test("computeLineItemsTotal sums amounts and returns errors", () => {
    const valid = [
      { id: "li-1", amount: "100", description: "A", tags: [] },
      { id: "li-2", amount: "50", description: "B", tags: [] },
    ];
    expect(computeLineItemsTotal(valid)).toEqual({ total: 150, error: null });
  });

  test("computeLineItemsTotal handles amounts gracefully", () => {
    const result = computeLineItemsTotal([{ id: "li-1", amount: "1/0", description: "A", tags: [] }]);
    expect(result.error).toBe(null);
    expect(result.total).toBe(0);
  });

  test("computeLineItemsTotal handles empty items", () => {
    expect(computeLineItemsTotal([])).toEqual({ total: 0, error: null });
    expect(computeLineItemsTotal([{ id: "li-1", amount: "", description: "A", tags: [] }])).toEqual({ total: 0, error: null });
  });
});
