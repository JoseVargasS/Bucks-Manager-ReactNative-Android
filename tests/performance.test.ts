describe("performance", () => {
  let findCompatibleSheets: typeof import("../src/api/googleWorkspace.ts").findCompatibleSheets;
  let readTransactions: typeof import("../src/api/googleWorkspace.ts").readTransactions;
  let getAvailableMonthsForYear: typeof import("../src/utils/helpers.ts").getAvailableMonthsForYear;
  let getPeriodRange: typeof import("../src/utils/helpers.ts").getPeriodRange;
  let groupTransactionsByDate: typeof import("../src/utils/transactions.ts").groupTransactionsByDate;
  let sortTransactionsDesc: typeof import("../src/utils/transactions.ts").sortTransactionsDesc;

  beforeAll(async () => {
    const ws = await import("../src/api/googleWorkspace.ts");
    findCompatibleSheets = ws.findCompatibleSheets;
    readTransactions = ws.readTransactions;
    const helpers = await import("../src/utils/helpers.ts");
    getAvailableMonthsForYear = helpers.getAvailableMonthsForYear;
    getPeriodRange = helpers.getPeriodRange;
    const txUtils = await import("../src/utils/transactions.ts");
    groupTransactionsByDate = txUtils.groupTransactionsByDate;
    sortTransactionsDesc = txUtils.sortTransactionsDesc;
  });

  const transaction = (rowId: number, rawDate: string, createdAt = "") => ({
    rowId,
    rawDate,
    createdAt,
    amount: -rowId,
    detail: `tx-${rowId}`,
    type: "GASTO NO FRECUENTE" as const,
    tags: [] as string[],
  } as any);

  test("transaction grouping and sorting preserve the existing order contract", () => {
    const older = transaction(2, "2026-01-01T05:00:00.000Z", "08:00:00");
    const newerFirst = transaction(3, "2026-01-02T05:00:00.000Z", "09:00:00");
    const newerSecond = transaction(4, "2026-01-02T05:00:00.000Z", "10:00:00");
    const sorted = sortTransactionsDesc([older, newerFirst, newerSecond]);

    expect(sorted.map(({ rowId }) => rowId)).toEqual([3, 4, 2]);
    expect(
      groupTransactionsByDate(sorted).map((group) => ({ key: group.key, rows: group.items.map(({ rowId }: any) => rowId) })),
    ).toEqual([
      { key: "2026-01-02", rows: [3, 4] },
      { key: "2026-01-01", rows: [2] },
    ]);
  });

  test("period range is calculated once and reused for month options", () => {
    const range = getPeriodRange([
      transaction(2, "2024-03-01T05:00:00.000Z"),
      transaction(3, "2026-06-01T05:00:00.000Z"),
    ]);

    expect(range).toEqual({ minYear: 2024, minMonth: 2, maxYear: 2026, maxMonth: 5 });
    expect(getAvailableMonthsForYear(2024, range)).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    expect(getAvailableMonthsForYear(2026, range)).toEqual([0, 1, 2, 3, 4, 5]);
  });

  test("an existing tags header skips migration and formatting requests", async () => {
    const original = globalThis.fetch;
    const requests: { url: string; method: string }[] = [];
    globalThis.fetch = async (input: any, init: any = {}) => {
      const url = decodeURIComponent(String(input));
      requests.push({ url, method: init.method || "GET" });
      if (url.includes("valueRenderOption=FORMULA")) return json({ values: [["Date", "Amount", "Detail", "Type", "CREATION TIME", "Tags"], ["", "-10"]] });
      return json({
        values: [
          ["Date", "Amount", "Detail", "Type", "CREATION TIME", "Tags"],
          ["01-jan-26", "-10", "Comida", "GASTO NO FRECUENTE", "12:00:00", "Comida"],
        ],
      });
    };

    try {
      const rows = await readTransactions("token", "sheet-with-tags");
      expect(rows.length).toBe(1);
      expect(requests.length).toBe(2);
      expect(requests.every(({ method }) => method === "GET")).toBeTruthy();
    } finally {
      globalThis.fetch = original;
    }
  });

  test("Drive compatibility scans use bounded parallel batches and preserve order", async () => {
    const original = globalThis.fetch;
    const files = Array.from({ length: 12 }, (_, index) => ({ id: `sheet-${index}`, name: `Sheet ${index}` }));
    let active = 0;
    let maxActive = 0;
    globalThis.fetch = async (input: any) => {
      const url = decodeURIComponent(String(input));
      if (url.includes("/drive/v3/files?")) return json({ files });
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, 2));
      active -= 1;
      if (url.includes("fields=sheets.properties.title")) {
        return json({ sheets: [{ properties: { title: "INCOME AND EXPENSES" } }, { properties: { title: "MONTHLY SUMMARY" } }] });
      }
      return json({ valueRanges: [
        { values: [["Date", "Amount", "Detail", "Type"]] },
        { values: [["MONTH", "FREQUENT INCOME", "NON-FREQUENT INCOME", "TOTAL INCOME", "FREQUENT EXPENSE", "NON-FREQUENT EXPENSE", "TOTAL EXPENSES", "MONTHLY NET", "NET WITHOUT FREQUENT INCOME"]] },
      ] });
    };

    try {
      const compatible = await findCompatibleSheets("token");
      expect(compatible.map(({ id }) => id)).toEqual(files.map(({ id }) => id));
      expect(maxActive > 1 && maxActive <= 5).toBeTruthy();
    } finally {
      globalThis.fetch = original;
    }
  });

  function json(value: unknown) {
    return new Response(JSON.stringify(value), { status: 200, headers: { "content-type": "application/json" } });
  }
});
